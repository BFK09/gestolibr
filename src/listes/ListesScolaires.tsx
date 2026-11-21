import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/base'
import { fcfa } from '../outils/format'
import { sansAccents } from '../outils/texte'
import FicheListe from './FicheListe'

// Écran Listes scolaires : une liste d'articles par école et par classe,
// qu'on ajoute ensuite d'un coup au panier depuis la caisse.
export default function ListesScolaires() {
  const [recherche, setRecherche] = useState('')
  // null = liste des listes ; { id } = modifier ; { copieDe } = nouvelle liste à partir d'une autre
  const [ouvert, setOuvert] = useState<{ id: string | null; copieDe?: string } | null>(null)

  const d = useLiveQuery(async () => {
    const listes = await db.listesScolaires.toArray()
    const lignes = await db.lignesListeScolaire.toArray()
    const articles = new Map((await db.articles.toArray()).map((a) => [a.id, a]))
    return listes.map((l) => {
      const ls = lignes.filter((x) => x.listeId === l.id)
      return { ...l, nbArticles: ls.reduce((s, x) => s + x.quantite, 0), total: ls.reduce((s, x) => s + x.quantite * (articles.get(x.articleId)?.prixVente ?? 0), 0) }
    }).sort((a, b) => b.annee.localeCompare(a.annee) || a.ecole.localeCompare(b.ecole) || a.classe.localeCompare(b.classe, 'fr', { numeric: true }))
  }, [])
  if (!d) return <p>Chargement…</p>
  if (ouvert) return <FicheListe listeId={ouvert.id} copieDe={ouvert.copieDe} onFermer={() => setOuvert(null)} onCopier={(id) => setOuvert({ id: null, copieDe: id })} />

  const texte = sansAccents(recherche.trim())
  const visibles = d.filter((l) => !texte || sansAccents(`${l.ecole} ${l.classe} ${l.annee}`).includes(texte))
  // Regroupées par école pour s'y retrouver.
  const ecoles = [...new Set(visibles.map((l) => l.ecole))]

  return (
    <section>
      <div className="entete-ecran">
        <h2>Listes scolaires</h2>
        <button className="principal" onClick={() => setOuvert({ id: null })}>+ Nouvelle liste</button>
      </div>
      <p className="info">
        Saisis une liste la première fois qu'un parent te l'apporte. Ensuite, à la caisse, « Ajouter une liste scolaire »
        met tous ses articles dans le panier d'un coup.
      </p>
      <div className="filtres"><input type="search" placeholder="École ou classe…" value={recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
      {visibles.length === 0 && <p className="info">Aucune liste pour l'instant.</p>}
      {ecoles.map((e) => (
        <div key={e} className="groupe-ecole">
          <h3>{e}</h3>
          <ul className="liste-articles">
            {visibles.filter((l) => l.ecole === e).map((l) => (
              <li key={l.id}>
                <button onClick={() => setOuvert({ id: l.id })}>
                  <span className="code">{l.annee}</span>
                  <span className="nom">{l.classe}<small>{l.nbArticles} article(s)</small></span>
                  <span className="chiffres">{fcfa(l.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
