import { db, nouvelId } from './base'

export interface LignePanier {
  articleId: string
  quantite: number
}

export interface Paiement {
  modePaiementId: string
  montant: number
}

export interface NouvelleVente {
  lignes: LignePanier[]
  paiements: Paiement[] // leur somme doit être égale au total (paiement partagé possible)
  clientNom?: string // obligatoire si une partie est payée à crédit
  clientTelephone?: string
}

// Enregistre une vente en un seul bloc (transaction) et renvoie l'id du ticket.
export async function enregistrerVente(v: NouvelleVente): Promise<string> {
  if (v.lignes.length === 0) throw new Error('Le panier est vide.')

  return db.transaction(
    'rw',
    [db.ventes, db.lignesVente, db.mouvementsStock, db.encaissements, db.articles, db.clients, db.modesPaiement],
    async () => {
      // 1. Le prix et le coût sont lus MAINTENANT et copiés dans la ligne (valeurs figées).
      const articles = await db.articles.bulkGet(v.lignes.map((l) => l.articleId))
      let total = 0
      const lignes = v.lignes.map((l, i) => {
        const a = articles[i]
        if (!a) throw new Error('Article introuvable.')
        if (a.prixVente === null) throw new Error(`${a.code} n'a pas de prix de vente.`)
        total += a.prixVente * l.quantite
        return { article: a, quantite: l.quantite }
      })

      // 2. Les paiements doivent couvrir exactement le total.
      const paye = v.paiements.reduce((s, p) => s + p.montant, 0)
      if (paye !== total) throw new Error(`Les paiements (${paye}) ne correspondent pas au total (${total}).`)

      // 3. Le client : obligatoire pour un crédit. Retrouvé par son nom, sinon créé.
      const modes = await db.modesPaiement.toArray()
      const credit = modes.find((m) => m.nom === 'Crédit')
      const aCredit = v.paiements.some((p) => p.modePaiementId === credit?.id && p.montant > 0)
      let clientId: string | undefined
      const nom = v.clientNom?.trim()
      if (aCredit && !nom) throw new Error('Un paiement à crédit demande le nom du client.')
      if (nom) {
        const existant = (await db.clients.toArray()).find((c) => c.nom.toLowerCase() === nom.toLowerCase())
        clientId = existant?.id ?? (await db.clients.add({
          id: nouvelId(), nom, type: 'particulier', telephone: v.clientTelephone?.trim() || undefined, plafondCredit: 0,
        }))
      }

      // 4. Le ticket, avec le numéro suivant.
      const dernier = await db.ventes.orderBy('numero').last()
      const venteId = nouvelId()
      const date = new Date().toISOString()
      await db.ventes.add({ id: venteId, numero: (dernier?.numero ?? 0) + 1, date, clientId, total })

      // 5. Les lignes de vente et les sorties de stock (quantité négative).
      for (const { article, quantite } of lignes) {
        await db.lignesVente.add({
          id: nouvelId(), venteId, articleId: article.id,
          designation: article.designation, categorieId: article.categorieId,
          quantite, prixUnitaire: article.prixVente!, coutUnitaire: article.coutMoyen ?? 0,
        })
        await db.mouvementsStock.add({ id: nouvelId(), date, articleId: article.id, quantite: -quantite, type: 'vente', documentId: venteId })
      }

      // 6. Les encaissements : un par mode de paiement utilisé.
      for (const p of v.paiements.filter((p) => p.montant > 0)) {
        await db.encaissements.add({ id: nouvelId(), date, type: 'paiement', modePaiementId: p.modePaiementId, montant: p.montant, venteId, clientId })
      }
      return venteId
    },
  )
}

// Annule un ticket entier en créant un contre-ticket (on ne supprime jamais rien) :
// - quantités et montants négatifs, avec le même prix et le même coût que l'original ;
// - le stock revient (mouvement « retour », quantité positive) ;
// - l'argent est rendu par le même mode de paiement (encaissement « rendu », négatif).
export async function annulerVente(venteId: string): Promise<string> {
  return db.transaction(
    'rw',
    [db.ventes, db.lignesVente, db.mouvementsStock, db.encaissements],
    async () => {
      const vente = await db.ventes.get(venteId)
      if (!vente) throw new Error('Ticket introuvable.')
      if (vente.annuleVenteId) throw new Error("Un ticket d'annulation ne peut pas être annulé.")
      const deja = await db.ventes.where('annuleVenteId').equals(venteId).first()
      if (deja) throw new Error(`Ce ticket est déjà annulé (ticket n° ${deja.numero}).`)

      const dernier = await db.ventes.orderBy('numero').last()
      const contreId = nouvelId()
      const date = new Date().toISOString()
      await db.ventes.add({
        id: contreId, numero: (dernier?.numero ?? 0) + 1, date,
        clientId: vente.clientId, total: -vente.total, annuleVenteId: venteId,
      })

      const lignes = await db.lignesVente.where('venteId').equals(venteId).toArray()
      for (const l of lignes) {
        await db.lignesVente.add({ ...l, id: nouvelId(), venteId: contreId, quantite: -l.quantite })
        await db.mouvementsStock.add({ id: nouvelId(), date, articleId: l.articleId, quantite: l.quantite, type: 'retour', documentId: contreId })
      }

      const encaissements = await db.encaissements.where('venteId').equals(venteId).toArray()
      for (const e of encaissements) {
        await db.encaissements.add({ ...e, id: nouvelId(), date, type: 'rendu', montant: -e.montant, venteId: contreId })
      }
      return contreId
    },
  )
}
