import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/base'

// Nom, responsable et coordonnées de la librairie (affichés sur les tickets et les rapports).
export default function Identite() {
  const boutique = useLiveQuery(() => db.boutique.get('principale'), [])
  const [s, setS] = useState({ nom: '', responsable: '', telephone: '', adresse: '' })
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (boutique) setS({ nom: boutique.nom, responsable: boutique.responsable, telephone: boutique.telephone ?? '', adresse: boutique.adresse ?? '' })
  }, [boutique])

  async function enregistrer() {
    setMessage(''); setErreur('')
    if (!s.nom.trim() || !s.responsable.trim()) return setErreur('Le nom et le responsable sont obligatoires.')
    await db.boutique.update('principale', {
      nom: s.nom.trim(), responsable: s.responsable.trim(),
      telephone: s.telephone.trim() || undefined, adresse: s.adresse.trim() || undefined,
    })
    setMessage('Informations enregistrées.')
  }

  return (
    <div className="carte">
      {message && <p className="succes">{message}</p>}
      {erreur && <p className="erreurs">{erreur}</p>}
      <label>Nom de la librairie *<input value={s.nom} onChange={(e) => setS({ ...s, nom: e.target.value })} /></label>
      <label>Responsable *<input value={s.responsable} onChange={(e) => setS({ ...s, responsable: e.target.value })} /></label>
      <label>Téléphone<input inputMode="tel" value={s.telephone} onChange={(e) => setS({ ...s, telephone: e.target.value })} /></label>
      <label>Adresse / ville<input value={s.adresse} onChange={(e) => setS({ ...s, adresse: e.target.value })} /></label>
      <div className="boutons gauche"><button className="principal" onClick={enregistrer}>Enregistrer</button></div>
    </div>
  )
}
