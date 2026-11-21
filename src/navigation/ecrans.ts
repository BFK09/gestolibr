import { BookOpen, ChartColumn, ClipboardList, DatabaseBackup, LayoutDashboard, PackagePlus, Settings, ShoppingCart, Boxes, Users, type LucideIcon } from 'lucide-react'

export type Ecran = 'tableau' | 'vente' | 'catalogue' | 'reception' | 'inventaire' | 'clients' | 'listes' | 'rapports' | 'sauvegarde' | 'parametres'

export interface InfoEcran { id: Ecran; nom: string; court: string; icone: LucideIcon; description: string }

// Tous les écrans, dans l'ordre du menu. « court » = le nom affiché sous l'icône du menu du bas.
export const ECRANS: InfoEcran[] = [
  { id: 'vente', nom: 'Vente', court: 'Vente', icone: ShoppingCart, description: 'Caisse et tickets du jour' },
  { id: 'tableau', nom: 'Tableau de bord', court: 'Accueil', icone: LayoutDashboard, description: 'Chiffres du jour, alertes' },
  { id: 'catalogue', nom: 'Catalogue', court: 'Catalogue', icone: BookOpen, description: 'Articles, prix, codes-barres' },
  { id: 'clients', nom: 'Clients', court: 'Clients', icone: Users, description: 'Crédits et remboursements' },
  { id: 'reception', nom: 'Réception', court: 'Réception', icone: PackagePlus, description: 'Marchandise reçue' },
  { id: 'inventaire', nom: 'Stock', court: 'Stock', icone: Boxes, description: 'Inventaire, pertes et casse' },
  { id: 'listes', nom: 'Listes scolaires', court: 'Listes', icone: ClipboardList, description: 'Listes par école et classe' },
  { id: 'rapports', nom: 'Rapports', court: 'Rapports', icone: ChartColumn, description: 'Ventes, mouvements, PDF, Excel' },
  { id: 'sauvegarde', nom: 'Sauvegarde', court: 'Sauvegarde', icone: DatabaseBackup, description: 'Sauvegarder, restaurer' },
  { id: 'parametres', nom: 'Paramètres', court: 'Réglages', icone: Settings, description: 'Librairie, catégories, paiements' },
]

// Les 4 écrans les plus utilisés, toujours visibles dans le menu du bas ; les autres sont dans « Plus ».
export const PRINCIPAUX: Ecran[] = ['vente', 'tableau', 'catalogue', 'clients']

export const infoEcran = (id: Ecran) => ECRANS.find((e) => e.id === id)!
