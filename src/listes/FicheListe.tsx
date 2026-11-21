import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/base'
import type { Article } from '../db/types'
import { anneeScolaire, enregistrerListe, supprimerListe } from '../db/listes'
import { fcfa, lireEntier } from '../outils/format'
import { sansAccents } from '../outils/texte'
import { texteRecherche } from '../outils/codeBarre'

interface Props {
  listeId: string | null // null = nouvelle liste
  copieDe?: string // id d'une liste à copier
  onFermer: () => void
  onCopier: (id: string) => void
}

interface Ligne { article: Article; quantite: string }

// Créer, modifier, copier ou supprimer une liste scolaire.
export default function FicheListe({ listeId, copieDe, onFermer, onCopier }: Props) {
  const [ecole, setEcole] = useState('')
  const [classe, setClasse] = useState('')
  const [annee, setAnnee] = useState(anneeScolaire())
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [recherche, setRecherche] = useState('')
  const [erreur, setErreur] = useState('')
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)

  const articles = useLiveQuery(() => db.articles.orderBy('code').toArray(), [])
  const ecoles = useLiveQuery(async () => [...new Set((await db.listesScolaires.toArray()).map((l) => l.ecole))].sort(), [])

  // Au chargement : on remplit avec la liste existante, ou avec celle qu'on copie.
  useEffect(() => {
    const source = listeId ?? copieDe
    if (!source) return
    ;(async () => {
      const l = await db.listesScolaires.get(source)
      const ls = await db.lignesListeScolaire.where('listeId').equals(source).toArray()
      const arts = await db.articles.bulkGet(ls.map((x) => x.articleId))
      if (!l) return
      setEcole(l.ecole)
      setClasse(listeId ? l.classe : '') // une copie garde l'école, on change la classe
      setAnnee(listeId ? l.annee : anneeScolaire())
      setLignes(ls.flatMap((x, i) => (arts[i] ? [{ article: arts[i]!, quantite: String(x.quantite) }] : [])))
    })()
  }, [listeId, copieDe])

  if (!articles || !ecoles) return <p>Chargement…</p>

  const texte = sansAccents(recherche.trim())
  const suggestions = texte ? articles.filter((a) => a.actif && sansAccents(texteRecherche(a)).includes(texte)).slice(0, 8) : []
  const total = lignes.reduce((s, l) => s + (lireEntier(l.quantite) || 0) * (l.article.prixVente ?? 0), 0)

  function ajouter(a: Article) {
    const i = lignes.findIndex((l) => l.article.id === a.id)
    if (i >= 0) setLignes(lignes.map((l, j) => (j === i ? { ...l, quantite: String((lireEntier(l.quantite) || 0) + 1) } : l)))
    else setLignes([...lignes, { article: a, quantite: '1' }])
    setRecherche('')
  }

  async function enregistrer() {
    setErreur('')
    try {
      await enregistrerListe(listeId, { ecole, classe, annee, lignes: lignes.map((l) => ({ articleId: l.article.id, quantite: lireEntier(l.quantite) ?? 0 })) })
      onFermer()
    } catch (x) {
      setErreur((x as Error).message)
    }
  }

  return (
    <section className="fiche-client">
      <div className="entete-ecran">
        <h2>{listeId ? 'Modifier la liste' : copieDe ? 'Copie de liste' : 'Nouvelle liste'}</h2>
        <button onClick={onFermer}>← Listes</button>
      </div>
      {erreur && <p className="erreurs">{erreur}</p>}
      <div className="carte">
        <label>École *<input list="ecoles" value={ecole} onChange={(e) => setEcole(e.target.value)} placeholder="ex. Lycée Moderne de Cocody" /></label>
        <datalist id="ecoles">{ecoles.map((e) => <option key={e} value={e} />)}</datalist>
        <div className="deux">
          <label>Classe *<input value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="ex. 2nde C, CM1, 6e 2" /></label>
          <label>Année scolaire<input value={annee} onChange={(e) => setAnnee(e.target.value)} /></label>
        </div>
      </div>

      <div className="carte">
        <label className="recherche-article">
          Ajouter un article
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Tape un code ou un nom…" />
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((a) => (
                <li key={a.id}><button type="button" onClick={() => ajouter(a)}><span className="code">{a.code}</span> {a.designation}<span className="prix-suggestion">{fcfa(a.prixVente)}</span></button></li>
              ))}
            </ul>
          )}
        </label>
        {lignes.length === 0 ? <p className="info">La liste est vide.</p> : (
          <table className="tableau-simple">
            <tbody>
              {lignes.map((l, i) => (
                <tr key={l.article.id}>
                  <td>{l.article.designation}{!l.article.actif && <small className="alerte"> (inactif)</small>}<br /><small>{fcfa(l.article.prixVente)} l'unité</small></td>
                  <td><input className="petit" inputMode="numeric" value={l.quantite} onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, quantite: e.target.value } : x)))} /></td>
                  <td><button className="retirer" onClick={() => setLignes(lignes.filter((_, j) => j !== i))} aria-label="Retirer">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="total-caisse">Total de la liste <strong>{fcfa(total)}</strong></div>
      </div>

      {confirmerSuppression ? (
        <div className="confirmation">
          <p>Supprimer cette liste ? Les ventes déjà faites avec ne sont pas touchées.</p>
          <div className="boutons">
            <button onClick={() => setConfirmerSuppression(false)}>Non</button>
            <button className="danger" onClick={async () => { await supprimerListe(listeId!); onFermer() }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="boutons gauche">
          {listeId && <button className="danger" onClick={() => setConfirmerSuppression(true)}>Supprimer</button>}
          {listeId && <button onClick={() => onCopier(listeId)}>Copier pour une autre classe</button>}
          <button className="principal" onClick={enregistrer}>Enregistrer la liste</button>
        </div>
      )}
    </section>
  )
}
