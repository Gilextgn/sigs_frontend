# SIGS Admin — Frontend (React + Vite + TS + Tailwind)

Frontend **séparé** du backend Laravel, organisé **par feature** (une
fonctionnalité métier = un dossier), consomme l'API via Sanctum (auth SPA
par cookie de session).

## Structure

```
src/
├── app/                (réservé : providers globaux futurs)
├── shared/
│   ├── components/      Sidebar, Topbar, StatCard, ModulePlaceholder...
│   ├── layouts/          AppLayout (sidebar + topbar + <Outlet />)
│   └── lib/              apiClient (axios + config Sanctum)
└── features/
    ├── auth/             LoginPage + carrousel + AuthContext
    ├── dashboard/         KPI, graphiques, activité récente
    ├── students/          référence complète (liste + recherche + API)
    ├── classes/ tranches/ fees/ payments/ debtors/
    ├── teachers/ payroll/ users/ security/   (emplacements prêts,
    │                                           API déjà branchée côté backend)
```

Chaque nouveau module suit le même schéma que `features/students` :
un hook `use<Module>.ts` (react-query) + une page `<Module>Page.tsx`.

## Installation

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev
```

## Design

Thème "registre scolaire" : fond `#F5F6FA`, encre `#1B2340`, bleu encre
`#2B4C7E` (primaire), vert `#2F8F6F` (recouvrement), brique `#B5502E`
(débiteurs), ocre `#D9A441`. Titres en *Fraunces* (serif), UI en *IBM Plex
Sans*, montants/matricules en *IBM Plex Mono* — tokens définis dans
`src/index.css` (`@theme`), réutilisables comme classes Tailwind
(`bg-primary`, `text-ink`, `font-display`...).

## Carrousel de connexion

Dépose jusqu'à 5 photos dans `public/images/login-carousel/` (voir le
README de ce dossier) : `slide-1.jpg` à `slide-5.jpg`. Le composant
`LoginCarousel` défile automatiquement et applique un voile de couleur
(encre bleu en dégradé) par-dessus pour garder le formulaire lisible.

## Dashboard

Les 6 cartes KPI sont désormais compactes (`StatCard`), en grille
`auto-fit`, avec un coin de couleur au lieu d'un gros bloc plein — fini
l'effet "collé". Le taux de recouvrement et la répartition par cycle sont
maintenant des vrais graphiques (recharts).
