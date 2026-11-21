import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/base'
import { annulerVente } from '../db/vente'
import { fcfa } from '../outils/format'
import type { LignePanier } from './Caisse'

interface Props {
  venteId: string
  onNouvelleVente?: () => void
  onRefaire?: (lignes: LignePanier[]) => void // recharge les articles dans la caisse
}

// Le ticket d'une vente, prêt à être imprimé, avec la possibilité de l'annuler.
export default function Ticket({ venteId, onNouvelleVente, onRefaire }: Props) {
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState('')
  const d = useLiveQuery(async () => {
    const vente = await db.ventes.get(venteId)
    const lignes = await db.lignesVente.where('venteId').equals(venteId).toArray()
    const encaissements = await db.encaissements.where('venteId').equals(venteId).toArray()
    const modes = new Map((await db.modesPaiement.toArray()).map((m) => [m.id, m.nom]))
    const boutique = await db.boutique.get('principale')
    const client = vente?.clientId ? await db.clients.get(vente.clientId) : undefined
    // Liens entre un ticket et son annulation, dans les deux sens.
    const annulePar = await db.ventes.where('annuleVenteId').equals(venteId).first()
    const original = vente?.annuleVenteId ? await db.ventes.get(vente.annuleVenteId) : undefined
    return { vente, lignes, encaissements, modes, client, annulePar, original, boutique }
  }, [venteId])
  if (!d?.vente) return <p>Chargement…</p>
  const { vente, lignes, encaissements, modes, client, annulePar, original, boutique } = d
  const estAnnulation = !!vente.annuleVenteId

  async function annuler(puisRefaire: boolean) {
    setErreur('')
    try {
      await annulerVente(venteId)
      setConfirmer(false)
      if (puisRefaire && onRefaire) {
        // On recharge les articles actuels (avec leur prix du moment) dans la caisse.
        const articles = await db.articles.bulkGet(lignes.map((l) => l.articleId))
        onRefaire(lignes.flatMap((l, i) => (articles[i] ? [{ article: articles[i]!, quantite: l.quantite }] : [])))
      }
    } catch (e) {
      setErreur((e as Error).message)
    }
  }

  return (
    <div className="zone-ticket">
      <div className={`ticket ${annulePar ? 'ticket-annule' : ''}`}>
        <p className="ticket-titre">
          {boutique?.nom.toUpperCase() ?? 'LIBRAIRIE'}
          {boutique?.adresse && <><br /><small>{boutique.adresse}</small></>}
          {boutique?.telephone && <><br /><small>Tél. {boutique.telephone}</small></>}
        </p>
        {estAnnulation && <p className="ticket-annulation">ANNULATION du ticket n° {original?.numero}</p>}
        <p>Ticket n° {vente.numero}<br />{new Date(vente.date).toLocaleString('fr-FR')}</p>
        {client && <p>Client : {client.nom}</p>}
        <table>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td>{l.designation}<br /><small>{l.quantite} × {fcfa(l.prixUnitaire)}</small></td>
                <td>{fcfa(l.quantite * l.prixUnitaire)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ticket-total">TOTAL <span>{fcfa(vente.total)}</span></p>
        {encaissements.map((e) => (
          <p key={e.id} className="ticket-ligne">
            {e.type === 'rendu' ? 'Rendu ' : ''}{modes.get(e.modePaiementId)} <span>{fcfa(e.montant)}</span>
          </p>
        ))}
        {annulePar && <p className="ticket-annulation">ANNULÉ (ticket n° {annulePar.numero})</p>}
        {!estAnnulation && <p className="ticket-merci">Merci de votre visite !</p>}
      </div>

      {erreur && <p className="erreurs">{erreur}</p>}

      {confirmer ? (
        <div className="confirmation sans-impression">
          <p>
            Annuler le ticket n° {vente.numero} ({fcfa(vente.total)}) ? Les articles reviennent en stock
            et le montant est compté comme rendu au client. Le ticket reste visible, marqué « annulé ».
          </p>
          <div className="boutons">
            <button onClick={() => setConfirmer(false)}>Non, garder</button>
            <button className="danger" onClick={() => annuler(false)}>Annuler le ticket</button>
            {onRefaire && <button className="principal" onClick={() => annuler(true)}>Annuler et refaire</button>}
          </div>
        </div>
      ) : (
        <div className="boutons sans-impression">
          <button onClick={() => window.print()}>Imprimer</button>
          {!estAnnulation && !annulePar && <button className="danger" onClick={() => setConfirmer(true)}>Annuler ce ticket…</button>}
          {onNouvelleVente && <button className="principal" onClick={onNouvelleVente}>Nouvelle vente</button>}
        </div>
      )}
    </div>
  )
}
