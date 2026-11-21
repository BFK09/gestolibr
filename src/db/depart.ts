import type { BaseLibrairie } from './base'
import type { Article, Categorie, ModePaiement } from './types'
// "?raw" : le fichier CSV est inclus tel quel dans l'application,
// il est donc disponible même hors ligne.
import catalogueCsv from '../data/catalogue_depart.csv?raw'

// Lit le CSV (séparateur ";") et renvoie une ligne par article.
export function lireCatalogue(texte: string) {
  const lignes = texte
    .replace(/^\uFEFF/, '') // enlève le BOM ajouté par Excel
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
  return lignes.slice(1).map((ligne) => {
    const [code, designation, categorie, unite] = ligne.split(';').map((c) => c.trim())
    return { code, designation, categorie, unite }
  })
}

// Remplit la base au premier lancement : catégories, articles, modes de paiement.
export async function chargerDonneesDeDepart(db: BaseLibrairie) {
  const lignes = lireCatalogue(catalogueCsv)

  // Une catégorie par nom différent trouvé dans le CSV.
  const categories = new Map<string, Categorie>()
  for (const l of lignes) {
    if (!categories.has(l.categorie)) {
      categories.set(l.categorie, { id: crypto.randomUUID(), nom: l.categorie })
    }
  }

  const articles: Article[] = lignes.map((l) => ({
    id: crypto.randomUUID(),
    code: l.code,
    designation: l.designation,
    categorieId: categories.get(l.categorie)!.id,
    unite: l.unite,
    prixVente: null,
    seuilAlerte: null,
    coutMoyen: null,
    actif: true,
  }))

  const modes: ModePaiement[] = ['Espèces', 'Mobile money', 'Crédit'].map((nom, i) => ({
    id: crypto.randomUUID(),
    nom,
    ordre: i + 1,
    actif: true,
  }))

  await db.categories.bulkAdd([...categories.values()])
  await db.articles.bulkAdd(articles)
  await db.modesPaiement.bulkAdd(modes)
}
