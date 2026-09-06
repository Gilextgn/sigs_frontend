# SIGS Admin — v3 (Laravel + React, architecture modulaire)

Réorganisation complète du prototype `gestion-ecole-pro` (un seul
`index.html` + `app.js`) vers deux projets séparés, chacun structuré
**par domaine métier**, sans rien retirer des fonctionnalités et règles
existantes.

```
gestion-ecole-pro/
├── backend/     API Laravel 11 (app/Modules/<Domaine>/...)
└── frontend/    React + Vite + TypeScript + Tailwind (src/features/<domaine>/...)
```

## Démarrage rapide

```bash
# Backend
cd backend
composer install
cp .env.example .env && php artisan key:generate
# renseigner DB_* dans .env
php artisan migrate --seed
php artisan serve   # http://localhost:8000

# Frontend (autre terminal)
cd frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Compte de démarrage : `admin@schoolflow.local` / `ChangeMoi!2026`.

## Ce qui a changé par rapport au prototype

- **Structure** : chaque métier (élèves, classes, tranches, frais,
  paiements, débiteurs, enseignants, paie, utilisateurs, sécurité,
  dashboard) est désormais dans **son propre dossier**, côté backend
  (`app/Modules/`) comme côté frontend (`src/features/`).
- **Backend** : PHP procédural → API REST Laravel (Eloquent, migrations,
  form requests, Sanctum). Toutes les règles métier du README d'origine
  sont conservées (voir `backend/README.md`).
- **Frontend** : `index.html` unique → app React routée, par feature.
- **Dashboard** : cartes KPI compactes et aérées (au lieu des 6 blocs
  collés), vrais graphiques (taux de recouvrement, répartition par
  cycle), au lieu de simples chiffres statiques.
- **Connexion** : nouveau fond en carrousel (jusqu'à 5 images, à déposer
  dans `frontend/public/images/login-carousel/`) avec un voile de
  couleur qui garde le formulaire lisible.

## État d'avancement du frontend

Tous les modules sont construits et branchés sur l'API :

- **Auth** : connexion (carrousel + overlay), déconnexion, garde de route
- **Dashboard** : KPI compacts, taux de recouvrement, répartition par
  cycle, derniers paiements, top débiteurs
- **Élèves** : liste, recherche par matricule
- **Classes** : CRUD (cycle, code, libellé, scolarité)
- **Tranches** : CRUD par classe, erreur affichée si dépassement du
  plafond de scolarité
- **Autres frais** : CRUD, affectation à plusieurs classes en un clic
- **Paiements** : encaissement multi-lignes (tranches + autres frais),
  reste dû calculé en direct, suppression (libère les montants)
- **Débiteurs** : filtrage par classe / tranche, total, impression
- **Enseignants** : CRUD
- **Paie** : fiches par période, marquage "payée"
- **Utilisateurs** : CRUD, rôle + permissions individuelles par checkbox
  (pré-remplies à l'édition)
- **Sécurité** : rappel de la politique de sécurité + journal d'audit
  filtrable

Build de production vérifié (`npm run build`, aucune erreur TypeScript).
