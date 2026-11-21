import { db } from './base'
import { stockParArticle } from './stock'
import type { MouvementStock } from './types'

export interface LigneMouvement {
  id: string
  date: string
  type: MouvementStock['type']
  document: string // ex. « Ticket n° 12 », « Réception BL-0004 (Librairie de France) »
  code: string
  designation: string
  categorieId: string
  entree: number // quantité entrée (0 si sortie)
  sortie: number // quantité sortie, en positif (0 si entrée)
}

const NOMS_TYPES: Record<MouvementStock['type'], string> = {
  vente: 'Vente',
  achat: 'Réception',
  retour: 'Annulation de vente',
  perte: 'Perte',
  ajustement: 'Ajustement',
  inventaire: 'Inventaire',
}
export const nomType = (t: MouvementStock['type']) => NOMS_TYPES[t]

// Tous les mouvements de stock d'une période [debut, fin[, du plus ancien au plus récent,
// avec le document d'origine écrit en clair.
export async function journalMouvements(debut: string, fin: string): Promise<LigneMouvement[]> {
  const mouvements = await db.mouvementsStock.where('date').between(debut, fin, true, false).sortBy('date')
  const articles = new Map((await db.articles.toArray()).map((a) => [a.id, a]))
  const ventes = new Map((await db.ventes.toArray()).map((v) => [v.id, v]))
  const achats = new Map((await db.achats.toArray()).map((a) => [a.id, a]))
  const fournisseurs = new Map((await db.fournisseurs.toArray()).map((f) => [f.id, f.nom]))
  const inventaires = new Map((await db.inventaires.toArray()).map((i) => [i.id, i]))

  function document(m: MouvementStock): string {
    if (m.type === 'vente' || m.type === 'retour') {
      const v = m.documentId ? ventes.get(m.documentId) : undefined
      if (!v) return nomType(m.type)
      if (v.annuleVenteId) return `Annulation du ticket n° ${ventes.get(v.annuleVenteId)?.numero ?? '?'} (ticket n° ${v.numero})`
      return `Ticket n° ${v.numero}`
    }
    if (m.type === 'achat') {
      const a = m.documentId ? achats.get(m.documentId) : undefined
      const f = a?.fournisseurId ? fournisseurs.get(a.fournisseurId) : undefined
      return ['Réception', a?.reference, f && `(${f})`].filter(Boolean).join(' ')
    }
    if (m.type === 'inventaire') {
      const i = m.documentId ? inventaires.get(m.documentId) : undefined
      return i?.note ?? 'Inventaire'
    }
    return nomType(m.type)
  }

  return mouvements.map((m) => {
    const a = articles.get(m.articleId)
    return {
      id: m.id,
      date: m.date,
      type: m.type,
      document: document(m),
      code: a?.code ?? '?',
      designation: a?.designation ?? 'Article supprimé',
      categorieId: a?.categorieId ?? '',
      entree: m.quantite > 0 ? m.quantite : 0,
      sortie: m.quantite < 0 ? -m.quantite : 0,
    }
  })
}

export interface LigneEtatStock {
  code: string
  designation: string
  categorieId: string
  stock: number
  coutMoyen: number | null
  prixVente: number | null
  seuilAlerte: number | null
}

// L'inventaire théorique : le stock calculé de chaque produit actif, à l'instant présent.
export async function etatStock(): Promise<LigneEtatStock[]> {
  const articles = await db.articles.orderBy('code').filter((a) => a.actif).toArray()
  const stocks = await stockParArticle()
  return articles.map((a) => ({
    code: a.code, designation: a.designation, categorieId: a.categorieId,
    stock: stocks.get(a.id) ?? 0, coutMoyen: a.coutMoyen, prixVente: a.prixVente, seuilAlerte: a.seuilAlerte,
  }))
}
