import { db, nouvelId } from './base'

// Année scolaire en cours : à partir d'août, on passe à l'année suivante (ex. 2026-2027).
export function anneeScolaire(d = new Date()) {
  const a = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `${a}-${a + 1}`
}

export interface SaisieListe {
  ecole: string
  classe: string
  annee: string
  lignes: { articleId: string; quantite: number }[]
}

// Crée ou remplace une liste scolaire (ce sont des modèles : on peut les modifier librement,
// car les ventes faites avec gardent leurs propres lignes).
export async function enregistrerListe(id: string | null, s: SaisieListe): Promise<string> {
  const ecole = s.ecole.trim(), classe = s.classe.trim(), annee = s.annee.trim()
  if (!ecole || !classe) throw new Error("L'école et la classe sont obligatoires.")
  if (s.lignes.length === 0) throw new Error('Ajoute au moins un article à la liste.')
  if (s.lignes.some((l) => !Number.isInteger(l.quantite) || l.quantite <= 0)) throw new Error('Chaque quantité doit être un nombre entier supérieur à 0.')
  return db.transaction('rw', [db.listesScolaires, db.lignesListeScolaire], async () => {
    const doublon = (await db.listesScolaires.toArray()).find((l) =>
      l.id !== id && l.ecole.toLowerCase() === ecole.toLowerCase() && l.classe.toLowerCase() === classe.toLowerCase() && l.annee === annee)
    if (doublon) throw new Error(`La liste « ${ecole} – ${classe} (${annee}) » existe déjà.`)
    const listeId = id ?? nouvelId()
    await db.listesScolaires.put({ id: listeId, ecole, classe, annee })
    await db.lignesListeScolaire.where('listeId').equals(listeId).delete()
    await db.lignesListeScolaire.bulkAdd(s.lignes.map((l) => ({ id: nouvelId(), listeId, articleId: l.articleId, quantite: l.quantite })))
    return listeId
  })
}

export async function supprimerListe(id: string) {
  await db.transaction('rw', [db.listesScolaires, db.lignesListeScolaire], async () => {
    await db.lignesListeScolaire.where('listeId').equals(id).delete()
    await db.listesScolaires.delete(id)
  })
}
