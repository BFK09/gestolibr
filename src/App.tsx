import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/base'
import Configuration from './configuration/Configuration'
import Catalogue from './catalogue/Catalogue'
import Reception from './reception/Reception'
import Vente from './vente/Vente'
import Inventaire from './stock/Inventaire'
import Sauvegarde from './sauvegarde/Sauvegarde'
import RappelSauvegarde from './sauvegarde/RappelSauvegarde'
import TableauDeBord from './tableau/TableauDeBord'
import Rapports from './rapports/Rapports'
import Clients from './clients/Clients'

type Ecran = 'tableau' | 'vente' | 'catalogue' | 'reception' | 'inventaire' | 'clients' | 'rapports' | 'sauvegarde'

// Le composant principal : la barre du haut, puis l'écran choisi.
// Les autres écrans (Sauvegarde, Tableau de bord…) s'ajouteront ici au fil des étapes.
function App() {
  const [ecran, setEcran] = useState<Ecran>('vente')
  // null = pas encore configurée ; undefined = lecture en cours.
  const boutique = useLiveQuery(async () => (await db.boutique.get('principale')) ?? null, [])
  if (boutique === undefined) return null
  // Tant que la librairie n'est pas configurée, on affiche l'assistant de démarrage.
  if (boutique === null) return <Configuration />

  return (
    <>
      <header className="barre">
        <strong>{boutique.nom}</strong>
        <nav>
          <button className={ecran === 'tableau' ? 'actif' : ''} onClick={() => setEcran('tableau')}>Tableau de bord</button>
          <button className={ecran === 'vente' ? 'actif' : ''} onClick={() => setEcran('vente')}>Vente</button>
          <button className={ecran === 'catalogue' ? 'actif' : ''} onClick={() => setEcran('catalogue')}>Catalogue</button>
          <button className={ecran === 'reception' ? 'actif' : ''} onClick={() => setEcran('reception')}>Réception</button>
          <button className={ecran === 'inventaire' ? 'actif' : ''} onClick={() => setEcran('inventaire')}>Inventaire</button>
          <button className={ecran === 'clients' ? 'actif' : ''} onClick={() => setEcran('clients')}>Clients</button>
          <button className={ecran === 'rapports' ? 'actif' : ''} onClick={() => setEcran('rapports')}>Rapports</button>
          <button className={ecran === 'sauvegarde' ? 'actif' : ''} onClick={() => setEcran('sauvegarde')}>Sauvegarde</button>
        </nav>
      </header>
      <main className="page">
        {ecran !== 'sauvegarde' && ecran !== 'rapports' && <RappelSauvegarde onOuvrir={() => setEcran('sauvegarde')} />}
        {ecran === 'tableau' && <TableauDeBord onVoirCatalogue={() => setEcran('catalogue')} />}
        {ecran === 'vente' && <Vente />}
        {ecran === 'catalogue' && <Catalogue />}
        {ecran === 'reception' && <Reception />}
        {ecran === 'inventaire' && <Inventaire />}
        {ecran === 'clients' && <Clients />}
        {ecran === 'rapports' && <Rapports />}
        {ecran === 'sauvegarde' && <Sauvegarde />}
      </main>
    </>
  )
}

export default App
