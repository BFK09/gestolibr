import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/base'
import { dettesParClient } from '../db/clients'
import { fcfa } from '../outils/format'
import { sansAccents } from '../outils/texte'
import FicheClient from './FicheClient'

// Écran Clients : la liste des clients avec ce que chacun doit.
export default function Clients() {
  const [recherche, setRecherche] = useState('')
  const [seulementDettes, setSeulementDettes] = useState(false)
  const [ouvert, setOuvert] = useState<string | null>(null) // id, 'nouveau' ou null

  const clients = useLiveQuery(() => db.clients.orderBy('nom').toArray(), [])
  const dettes = useLiveQuery(() => dettesParClient(), [])
  if (!clients || !dettes) return <p>Chargement…</p>
  if (ouvert) return <FicheClient clientId={ouvert} onFermer={() => setOuvert(null)} />

  const texte = sansAccents(recherche.trim())
  const visibles = clients.filter((c) =>
    (!texte || sansAccents(`${c.nom} ${c.telephone ?? ''}`).includes(texte)) &&
    (!seulementDettes || (dettes.get(c.id) ?? 0) > 0))
  const totalDettes = [...dettes.values()].reduce((s, d) => s + Math.max(d, 0), 0)
  const nbDebiteurs = [...dettes.values()].filter((d) => d > 0).length

  return (
    <section>
      <div className="entete-ecran">
        <h2>Clients</h2>
        <button className="principal" onClick={() => setOuvert('nouveau')}>+ Nouveau client</button>
      </div>
      <div className="tuiles">
        <div className="tuile"><small>Total des crédits à recouvrer</small><strong>{fcfa(totalDettes)}</strong></div>
        <div className="tuile"><small>Clients qui doivent</small><strong>{nbDebiteurs}</strong></div>
      </div>
      <div className="filtres">
        <input type="search" placeholder="Nom ou téléphone…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <label className="case"><input type="checkbox" checked={seulementDettes} onChange={(e) => setSeulementDettes(e.target.checked)} />Seulement ceux qui doivent</label>
      </div>
      {visibles.length === 0 ? <p className="info">Aucun client. Les clients sont aussi créés automatiquement lors d'une vente à crédit.</p> : (
        <ul className="liste-articles">
          {visibles.map((c) => {
            const d = dettes.get(c.id) ?? 0
            const depasse = c.plafondCredit > 0 && d > c.plafondCredit
            return (
              <li key={c.id}>
                <button onClick={() => setOuvert(c.id)}>
                  <span className="code">{c.type === 'ecole' ? 'École' : c.type === 'entreprise' ? 'Entreprise' : 'Particulier'}</span>
                  <span className="nom">{c.nom}<small>{c.telephone ?? 'Pas de téléphone'}{c.plafondCredit > 0 && ` · plafond ${fcfa(c.plafondCredit)}`}</small></span>
                  <span className="chiffres">
                    {d > 0 ? <strong className={depasse ? 'alerte' : ''}>doit {fcfa(d)}</strong> : <small>à jour</small>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
