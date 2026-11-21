import Dexie, { type EntityTable } from 'dexie'
import type {
  Achat, Article, Boutique, Categorie, Client, Encaissement, Fournisseur, Inventaire,
  LigneAchat, LigneInventaire, LigneListeScolaire, LigneVente, ListeScolaire,
  ModePaiement, MouvementStock, Vente,
} from './types'
import { chargerDonneesDeDepart } from './depart'

// La base de données locale, enregistrée dans le navigateur (IndexedDB).
// Elle reste sur l'appareil et fonctionne sans internet.
export class BaseLibrairie extends Dexie {
  boutique!: EntityTable<Boutique, 'id'>
  categories!: EntityTable<Categorie, 'id'>
  fournisseurs!: EntityTable<Fournisseur, 'id'>
  articles!: EntityTable<Article, 'id'>
  modesPaiement!: EntityTable<ModePaiement, 'id'>
  clients!: EntityTable<Client, 'id'>
  ventes!: EntityTable<Vente, 'id'>
  lignesVente!: EntityTable<LigneVente, 'id'>
  encaissements!: EntityTable<Encaissement, 'id'>
  achats!: EntityTable<Achat, 'id'>
  lignesAchat!: EntityTable<LigneAchat, 'id'>
  mouvementsStock!: EntityTable<MouvementStock, 'id'>
  inventaires!: EntityTable<Inventaire, 'id'>
  lignesInventaire!: EntityTable<LigneInventaire, 'id'>
  listesScolaires!: EntityTable<ListeScolaire, 'id'>
  lignesListeScolaire!: EntityTable<LigneListeScolaire, 'id'>

  constructor() {
    super('librairie')

    // Version 1 du plan de la base.
    // Pour chaque table : le premier champ est l'identifiant,
    // les suivants sont les champs sur lesquels on veut chercher ou trier.
    // "&" veut dire "unique" (deux articles ne peuvent pas avoir le même code).
    this.version(1).stores({
      categories: 'id, &nom',
      fournisseurs: 'id, nom',
      articles: 'id, &code, designation, categorieId, fournisseurId',
      modesPaiement: 'id, &nom',
      clients: 'id, nom, telephone',
      ventes: 'id, &numero, date, clientId',
      lignesVente: 'id, venteId, articleId',
      encaissements: 'id, date, venteId, clientId, modePaiementId',
      achats: 'id, date, fournisseurId',
      lignesAchat: 'id, achatId, articleId',
      mouvementsStock: 'id, date, articleId, type, documentId',
      inventaires: 'id, date',
      lignesInventaire: 'id, inventaireId, articleId',
      listesScolaires: 'id, ecole, [ecole+classe]',
      lignesListeScolaire: 'id, listeId, articleId',
    })

    // Version 2 : on peut retrouver rapidement le contre-ticket d'une vente annulée,
    // et on ajoute la table de l'identité de la librairie.
    // Dexie garde les données existantes : seuls les changements sont appliqués.
    this.version(2).stores({
      ventes: 'id, &numero, date, clientId, annuleVenteId',
      boutique: 'id',
    })

    // "populate" ne s'exécute qu'une fois : à la toute première ouverture.
    this.on('populate', () => chargerDonneesDeDepart(this))
  }
}

export const db = new BaseLibrairie()

// Donne un identifiant unique à chaque nouvel élément.
export const nouvelId = () => crypto.randomUUID()
