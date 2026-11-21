# Application Librairie (étape 8 : tableau de bord et rapports)

## Lancer l'application sur ce PC
Il faut Node.js (version 20 ou plus). Dans PowerShell, depuis ce dossier `app` :
```
npm install      # télécharge les bibliothèques (une seule fois)
npm run dev      # lance l'application, puis ouvrir l'adresse affichée
npm run build    # fabrique la version finale dans le dossier dist
```

## À quoi sert chaque fichier
- `package.json` : la fiche d'identité du projet, avec la liste des bibliothèques (React, Vite...) et les commandes.
- `package-lock.json` : les versions exactes installées, pour avoir le même résultat partout.
- `index.html` : la seule page HTML. React vient dessiner l'écran dans `<div id="root">`.
- `vite.config.ts` : réglages de Vite, l'outil qui construit l'application. C'est ici qu'on la rend installable et hors ligne (PWA) : nom, couleurs, icônes.
- `src/main.tsx` : le point de départ, qui branche React sur la page.
- `src/App.tsx` : l'écran principal. Les futurs écrans (catalogue, vente...) partiront d'ici.
- `src/db/types.ts` : la forme de chaque table (article, vente, ligne de vente, encaissement, achat, mouvement de stock, inventaire, liste scolaire…).
- `src/db/base.ts` : la base locale Dexie, ses 15 tables et les champs sur lesquels on cherche.
- `src/db/depart.ts` : au tout premier lancement, lit le CSV et crée les catégories, les 111 articles et les 3 modes de paiement.
- `src/db/stock.ts` : calcule le stock de chaque article en additionnant le journal des mouvements.
- `src/catalogue/Catalogue.tsx` : l'écran Catalogue (liste, recherche, filtres par catégorie, sans prix, inactifs).
- `src/catalogue/FicheArticle.tsx` : le formulaire pour ajouter ou modifier un article, avec les vérifications (code unique, prix en nombre entier…).
- `src/catalogue/codeSuivant.ts` : propose le prochain code libre d'une catégorie (ex. CAH-019).
- `src/db/reception.ts` : enregistre une réception en une seule fois (achat, lignes, entrées dans le journal de stock, nouveau coût moyen pondéré de chaque article).
- `src/reception/Reception.tsx` : l'écran Réception, avec ses deux onglets.
- `src/reception/NouvelleReception.tsx` : la saisie d'une livraison (fournisseur, date, référence, articles, quantités, coûts).
- `src/reception/HistoriqueReceptions.tsx` : la liste des réceptions passées et leur détail.
- `src/db/vente.ts` : enregistre une vente en une seule fois (ticket numéroté, lignes avec prix et coût figés, sorties de stock, encaissements par mode de paiement, client créé si besoin).
- `src/vente/Vente.tsx` : l'écran Vente, avec ses onglets Caisse et Ventes du jour.
- `src/vente/Caisse.tsx` : le panier, le total, le paiement partagé, la monnaie à rendre et le client pour un crédit.
- `src/vente/Ticket.tsx` : le ticket affiché après la vente, avec un bouton pour l'imprimer.
- `src/vente/VentesDuJour.tsx` : les tickets du jour et les totaux par mode de paiement.
- `src/configuration/Configuration.tsx` : l'assistant du premier lancement (1. identification de la librairie, 2. choix des produits avec stock, prix d'achat et prix de vente, 3. vérification et validation).
- `src/db/configuration.ts` : enregistre la fin de l'assistant (identité, produits activés, stock de départ).
- `src/stock/Inventaire.tsx` et `src/db/inventaire.ts` : recompter le stock réel ; l'écart est ajouté au journal.
- Annulation de ticket : `annulerVente` dans `src/db/vente.ts` crée un contre-ticket (rien n'est supprimé) ; le bouton est sur le ticket (`src/vente/Ticket.tsx`).
- `src/db/sauvegarde.ts` : fabrique le fichier de sauvegarde (toutes les tables en JSON), le vérifie et le recharge.
- `src/sauvegarde/Sauvegarde.tsx` : l'écran Sauvegarde (télécharger, partager, restaurer).
- `src/sauvegarde/RappelSauvegarde.tsx` : le bandeau qui rappelle de sauvegarder après 7 jours.
- `src/db/statistiques.ts` : les calculs du tableau de bord (chiffre d'affaires net, marge, tickets, panier moyen, meilleurs produits, alertes de stock, valeur du stock).
- `src/tableau/TableauDeBord.tsx` : l'écran Tableau de bord.
- `src/db/rapports.ts` : prépare le journal des mouvements (avec le document d'origine) et l'état du stock.
- `src/rapports/` : l'écran Rapports (mouvements par période, état du stock, feuille de comptage), imprimable en PDF ; `periodes.ts` calcule les dates des périodes.
- `src/outils/texte.ts` : recherche sans tenir compte des accents.
- `src/outils/format.ts` : affichage des montants en FCFA et lecture des nombres saisis.
- `src/data/catalogue_depart.csv` : copie du catalogue de départ, incluse dans l'application pour marcher hors ligne.
- `src/index.css` : les styles (couleurs, marges).
- `public/` : les icônes de l'application.
- `tsconfig*.json`, `eslint.config.js`, `src/vite-env.d.ts` : réglages de TypeScript et du vérificateur de code. On n'y touche presque jamais.
- `.gitignore` : les dossiers que Git ne doit pas sauvegarder (`node_modules`, `dist`).
