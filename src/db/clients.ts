import { db, nouvelId } from './base'
import type { Encaissement } from './types'

// La dette d'un client = tout ce qu'il a pris à crédit − tout ce qu'il a remboursé.
// (Une annulation de ticket crée un « rendu » négatif en crédit : la dette baisse d'elle-même.)
export async function detteClient(clientId: string): Promise<number> {
  const credit = await modeCredit()
  let dette = 0
  await db.encaissements.where('clientId').equals(clientId).each((e) => {
    if (e.type === 'remboursement_credit') dette -= e.montant
    else if (e.modePaiementId === credit?.id) dette += e.montant
  })
  return dette
}

export async function modeCredit() {
  return (await db.modesPaiement.toArray()).find((m) => m.nature === 'credit')
}

// Dette de tous les clients d'un coup (pour la liste).
export async function dettesParClient(): Promise<Map<string, number>> {
  const credit = await modeCredit()
  const dettes = new Map<string, number>()
  await db.encaissements.filter((e) => !!e.clientId).each((e) => {
    const signe = e.type === 'remboursement_credit' ? -1 : e.modePaiementId === credit?.id ? 1 : 0
    if (signe) dettes.set(e.clientId!, (dettes.get(e.clientId!) ?? 0) + signe * e.montant)
  })
  return dettes
}

// Le client règle tout ou partie de sa dette. Renvoie l'encaissement créé (pour le reçu).
export async function enregistrerRemboursement(clientId: string, montant: number, modePaiementId: string): Promise<Encaissement> {
  return db.transaction('rw', [db.encaissements, db.modesPaiement, db.clients], async () => {
    if (!Number.isInteger(montant) || montant <= 0) throw new Error('Le montant doit être un nombre entier supérieur à 0.')
    const mode = await db.modesPaiement.get(modePaiementId)
    if (!mode || mode.nature === 'credit') throw new Error('Choisis comment le client paie (espèces, mobile money…).')
    const dette = await detteClient(clientId)
    if (montant > dette) throw new Error(`Le client ne doit que ${dette} FCFA.`)
    const e: Encaissement = { id: nouvelId(), date: new Date().toISOString(), type: 'remboursement_credit', modePaiementId, montant, clientId }
    await db.encaissements.add(e)
    return e
  })
}

export interface LigneHistorique {
  id: string
  date: string
  libelle: string
  credit: number // ce qui augmente la dette
  remboursement: number // ce qui la diminue
}

// L'historique du compte d'un client : ventes à crédit, annulations et remboursements.
export async function historiqueClient(clientId: string): Promise<LigneHistorique[]> {
  const credit = await modeCredit()
  const modes = new Map((await db.modesPaiement.toArray()).map((m) => [m.id, m.nom]))
  const encaissements = await db.encaissements.where('clientId').equals(clientId).sortBy('date')
  const ventes = new Map((await db.ventes.where('clientId').equals(clientId).toArray()).map((v) => [v.id, v]))
  const lignes: LigneHistorique[] = []
  for (const e of encaissements) {
    if (e.type === 'remboursement_credit') {
      lignes.push({ id: e.id, date: e.date, libelle: `Remboursement (${modes.get(e.modePaiementId)})`, credit: 0, remboursement: e.montant })
    } else if (e.modePaiementId === credit?.id) {
      const v = e.venteId ? ventes.get(e.venteId) : undefined
      const libelle = v?.annuleVenteId ? `Annulation (ticket n° ${v.numero})` : `Achat à crédit (ticket n° ${v?.numero ?? '?'})`
      if (e.montant >= 0) lignes.push({ id: e.id, date: e.date, libelle, credit: e.montant, remboursement: 0 })
      else lignes.push({ id: e.id, date: e.date, libelle, credit: 0, remboursement: -e.montant })
    }
  }
  return lignes
}
