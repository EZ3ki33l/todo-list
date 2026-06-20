# Historique des versions — Todo List

Application **todo-lists + courses** (web Next.js, mobile Expo, API tRPC, PostgreSQL Neon).  
Prod web : [https://todolist.ez3ki33l.ovh](https://todolist.ez3ki33l.ovh)

## Convention

| Type | Signification |
|------|----------------|
| **MAJOR** | Changement majeur de périmètre ou breaking change |
| **MINOR** | Nouvelle fonctionnalité visible |
| **PATCH** | Correctif, perf, déploiement, dette technique |

Les versions sont regroupées par jalons fonctionnels (pas une release npm par commit).  
Chaque entrée cite la PR GitHub quand elle existe.

---

## Vue d’ensemble

| Version | Date | Résumé |
|---------|------|--------|
| [0.1.0](#010---2026-05-25) | 2026-05-25 | Monorepo initial |
| [0.2.0](#020---2026-05-27) | 2026-05-27 | Auth Google + base Neon |
| [0.3.0](#030---2026-05-27) | 2026-05-27 | Stabilisation native (refresh, session) |
| [0.4.0](#040---2026-05-27) | 2026-05-27 | Sélecteurs date/heure natifs |
| [0.5.0](#050---2026-05-27) | 2026-05-27 | Listes de courses — schéma & API |
| [0.6.0](#060---2026-05-27) | 2026-05-27 | Listes de courses — UI mobile |
| [0.7.0](#070---2026-05-27) | 2026-05-27 | Notifications push courses (Expo) |
| [0.8.0](#080---2026-05-27) | 2026-05-27 | Tests unitaires + CI |
| [0.9.0](#090---2026-05-27) | 2026-05-27 | Articles fréquents & mémoire catégories |
| [0.10.0](#0100---2026-05-27) | 2026-05-27 | Suggestions & catalogue liste partagée |
| [0.11.0](#0110---2026-05-28) | 2026-05-28 | Garde d’auth native |
| [0.12.0](#0120---2026-05-28) | 2026-05-28 | Glisser-déposer (réordonnancement) |
| [0.13.0](#0130---2026-05-28) | 2026-05-28 | Déploiement Docker web |
| [0.14.0](#0140---2026-05-28) | 2026-05-28 | Build EAS Android + correctifs deploy |
| [0.15.0](#0150---2026-05-28) | 2026-05-28 | Modal partage native |
| [0.16.0](#0160---2026-05-29) | 2026-05-29 | Courses web + Prisma 7 + séries tâches |
| [0.17.0](#0170---2026-05-29) | 2026-05-29 | Parité web courses & partage |
| [0.18.0](#0180---2026-05-29) | 2026-05-29 | Refonte dashboard tâches (web + native) |
| [0.19.0](#0190---2026-06-09) | 2026-06-09 | Sécurité API & perf dashboard |
| [1.0.0](#100---2026-06-09) | 2026-06-09 | Notifications in-app, SSE, Web Push, perf tRPC |
| [1.0.1](#101---2026-06-10) | 2026-06-10 | Play Store, légal web, parité native tâches & push |
| [1.1.0](#110---2026-06-11) | 2026-06-11 | Chef IA (Mistral) — recettes & produits de saison |
| [1.1.1](#111---2026-06-11) | 2026-06-11 | Google Sign-In Play Store (OAuth, EAS, diagnostic) |
| [1.1.2](#112---2026-06-12) | 2026-06-12 | Rôles lecture/écriture native + push partage |
| [2.0.0](#200---2026-06-15) | 2026-06-15 | Migration auth **Clerk** (web + native) |
| [2.0.1](#201---2026-06-15) | 2026-06-15 | Sécurité dépôt + politique confidentialité Clerk |
| [2.1.0](#210---2026-06-16) | 2026-06-16 | Branding EZ3 (logos, splash, skeletons) |
| [2.2.0](#220---2026-06-18) | 2026-06-18 | Charte graphique Catppuccin (native + web) |
| [2.3.0](#230---2026-06-19) | 2026-06-19 | Détails tâches (++), rappels, Google Agenda |
| [2.3.1](#231---2026-06-20) | 2026-06-20 | Suppression listes partagées + confirmations |
| [2.3.2](#232---2026-06-20) | 2026-06-20 | Suppression compte Clerk => purge totale des données |

---

## Détail par version

### 0.1.0 — 2026-05-25

**Monorepo initial**

- Structure Turborepo : `apps/web`, `apps/native`, `packages/api`, `packages/db`, `packages/ui`
- Todo-lists de base (listes, actions, récurrence ponctuelle / quotidienne / hebdomadaire)
- Premiers écrans web et mobile

---

### 0.2.0 — 2026-05-27

**Auth Google + base Neon**

- Auth.js (web) : connexion Google, sessions JWT
- Schéma Prisma sur PostgreSQL (Neon)
- Modèles : `User`, `TodoList`, `Action`, membres partagés (`TodoListMember`)
- Rôles liste : propriétaire, membre, invité
- Statuts liste : active, archivée, terminée

---

### 0.3.0 — 2026-05-27

**Stabilisation native (refresh, session)** — PR [#1](https://github.com/EZ3ki33l/todo-list/pull/1), [#2](https://github.com/EZ3ki33l/todo-list/pull/2)

- Rafraîchissement des requêtes accueil après mutation sur une tâche
- Déconnexion automatique si le token JWT est invalide (`auth.me`)

---

### 0.4.0 — 2026-05-27

**Sélecteurs date/heure natifs** — PR [#3](https://github.com/EZ3ki33l/todo-list/pull/3)

- Remplacement des champs texte date/heure par des pickers natifs (iOS / Android)
- Meilleure UX pour tâches ponctuelles et récurrences

---

### 0.5.0 — 2026-05-27

**Listes de courses — schéma & API** — PR [#4](https://github.com/EZ3ki33l/todo-list/pull/4)

- Modèles Prisma : `ShoppingList`, `ShoppingItem`, `ShoppingListMember`
- Catégories courses (`GroceryCategory`) : légumes, fruits, viande, etc.
- Router tRPC `shoppingLists` + `shoppingItems` (CRUD, toggle, partage)
- Listes personnelles + listes partagées (même modèle que les todos)

---

### 0.6.0 — 2026-05-27

**Listes de courses — UI mobile** — PR [#5](https://github.com/EZ3ki33l/todo-list/pull/5)

- Onglets courses sur l’app native
- Détection automatique de catégorie à la saisie
- Partage de listes courses entre utilisateurs
- Icônes par catégorie

---

### 0.7.0 — 2026-05-27

**Notifications push courses (Expo)** — PR [#6](https://github.com/EZ3ki33l/todo-list/pull/6)

- Modèle `PushToken` (tokens Expo)
- Notifications aux membres quand des articles sont ajoutés sur une liste partagée
- Regroupement des ajouts rapides (`ShoppingNotifyBatch`, ~45 s) pour éviter le spam
- Notification au partage d’une liste courses

---

### 0.8.0 — 2026-05-27

**Tests unitaires + CI** — PR [#7](https://github.com/EZ3ki33l/todo-list/pull/7), [#8](https://github.com/EZ3ki33l/todo-list/pull/8)

- Vitest sur la logique métier partagée (`@repo/api`)
- Workflow GitHub Actions (CI)
- Mise à jour ESLint / Next 16, nettoyage dépendances obsolètes

---

### 0.9.0 — 2026-05-27

**Articles fréquents & mémoire catégories** — PR [#9](https://github.com/EZ3ki33l/todo-list/pull/9)

- Modèle `ShoppingItemStat` : habitudes d’achat par utilisateur
- Suggestions d’articles fréquents à l’ajout
- Mémorisation catégorie / quantité / unité par titre

---

### 0.10.0 — 2026-05-27

**Suggestions & catalogue liste partagée**

- Catalogue des articles déjà vus sur une liste partagée (tous les membres)
- Autocomplétion titre à l’ajout / édition
- Correctifs de rafraîchissement après mutations courses

---

### 0.11.0 — 2026-05-28

**Garde d’auth native**

- `AuthGuard` attend la réponse `auth.me` avant de router (évite écran vide ou redirection prématurée)

---

### 0.12.0 — 2026-05-28

**Glisser-déposer (réordonnancement)** — PR [#10](https://github.com/EZ3ki33l/todo-list/pull/10)

- Réordonnancement drag & drop des **tâches** (web + native)
- Réordonnancement drag & drop des **articles courses** (web + native)
- Mutations tRPC `actions.reorder` / `shoppingItems.reorder`
- Correctifs Reanimated 4 / worklets sur native

---

### 0.13.0 — 2026-05-28

**Déploiement Docker web** — PR [#11](https://github.com/EZ3ki33l/todo-list/pull/11)

- Dockerfile multi-stage (`deploy/todolist/`)
- Guide déploiement Debian + HTTPS pour `todolist.ez3ki33l.ovh`
- Build Next.js `standalone`, Node 22, variables d’environnement documentées
- Correctifs build : `jose`, `DATABASE_URL` factice au build, dossier `public/`

---

### 0.14.0 — 2026-05-28

**Build EAS Android + correctifs deploy**

- Configuration EAS (`eas.json`), guide build beta (`apps/native/DEPLOY.md`)
- Alignement Expo SDK 55, Metro monorepo, pnpm 11.3
- Résolution conflits Corepack sur CI EAS

---

### 0.15.0 — 2026-05-28

**Modal partage native** — PR [#12](https://github.com/EZ3ki33l/todo-list/pull/12)

- Clavier géré correctement dans la modal de partage
- Opt-in explicite pour les notifications push
- Rafraîchissement liste après partage
- Confirmation avant suppression de liste (native)

---

### 0.16.0 — 2026-05-29

**Courses web + Prisma 7 + séries tâches** — PR [#13](https://github.com/EZ3ki33l/todo-list/pull/13)

- **Web** : hub courses, listes personnelles / partagées / archivées
- Migration **Prisma 7** (client généré, adapter Neon)
- **Séries** (`streakCount`, `bestStreak`) sur tâches récurrentes
- Notification manquante au partage liste courses (`shopping-list-share-notify`)
- Auth mobile : callback OAuth dédié (`/api/auth/mobile`)

---

### 0.17.0 — 2026-05-29

**Parité web courses & partage** — PR [#14](https://github.com/EZ3ki33l/todo-list/pull/14)

- Détail liste courses web aligné sur le natif (édition, suggestions, catégories)
- Partage listes courses depuis le web
- Suggestions d’articles sur le web

---

### 0.18.0 — 2026-05-29

**Refonte dashboard tâches (web + native)**

- **Web** : vue « Aujourd’hui / Cette semaine / Plus loin » avec agenda par période
- Calendrier de période personnalisable
- Colonnes à défilement, regroupement par jour
- **Native** : même logique d’agenda et colonnes
- Correction série (streak) au décochage d’une tâche récurrente
- Toggle tâches corrigé sur native

---

### 0.19.0 — 2026-06-09

**Sécurité API & perf dashboard** — PR [#15](https://github.com/EZ3ki33l/todo-list/pull/15)

- Rate limiting IP + utilisateur sur tRPC
- Session JWT mise en cache par requête RSC (`getCachedAuthSession`)
- `TrpcProvider` : skeleton au chargement, plus de boucles de requêtes
- `staleTime` / invalidations ciblées (web + native)
- Requêtes groupées stats listes (`batch-list-stats`)
- Toggle courses optimiste (web + native)
- Index Prisma (`ownerId+status`, `listId` membres)
- Scheduler notifications courses : flush DB max 1×/30 s
- Script benchmark web (`scripts/bench-web.mjs`)
- Docker : copie schéma Prisma avant `pnpm install`

---

### 1.0.0 — 2026-06-09

**Notifications in-app, SSE, Web Push, perf tRPC** — PR [#17](https://github.com/EZ3ki33l/todo-list/pull/17)

#### Notifications & activité

- Modèles `ActivityEvent`, `NotificationPreferences`, `WebPushSubscription`
- Types d’événements : articles ajoutés, partage liste courses, partage liste tâches
- Router tRPC `activity` : `unreadCount`, `list`, `markRead`, `markAllRead`
- Router `notifications` : préférences granulaires, tokens Expo, abonnements Web Push
- **Web** : cloche avec onglets Historique / Réglages, badge non-lus, alertes navigateur, compteur dans le titre d’onglet
- **Native** : cloche + panneau historique + réglages
- **SSE** : `GET /api/activity/stream` remplace le polling de la cloche (web)
- **Web Push** : service worker `public/sw.js`, clés VAPID, envoi hors onglet

#### Performance & architecture API

- Fusion accès liste + requête (`findAccessibleTodoList` / `findAccessibleShoppingList`) — 1 aller-retour DB
- `React.memo` sur lignes tâches / courses (web + native)
- Mutations tâches **100 % tRPC** : create, toggle, update, delete, reorder (suppression Server Actions `action.ts`)
- Toggle / edit / delete optimistes côté web
- Split `@repo/api` / `@repo/api/server` (évite bundling `web-push` côté client)
- Constantes notifications client-safe (`@repo/api/notification-constants`)

#### Correctifs UX

- Hydratation React : `ClientOnly` (cloche), dates locales différées, SVG tolérants extensions (Dark Reader)
- Réglages notifications : chargement / erreur / réessayer (fix 500 `WebPushSubscription`)

#### Déploiement

Variables supplémentaires en prod :

```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:votre@email.fr
```

Migration :

```bash
pnpm --filter @repo/db db:push
```

---

### 1.0.1 — 2026-06-10

**Play Store, légal web, parité native tâches & push**

#### Web

- Page **politique de confidentialité** (`/politique-de-confidentialite`) + lien footer
- Section **suppression de compte** (procédure e-mail, conformité Play Console)
- **Favicon** et icône Apple (`app/icon.png`, `app/apple-icon.png`)

#### Native — préparation Play Store

- Package Android : `com.ez3ki33l.todolist` (remplace `com.todolist`)
- Client OAuth Google + `google-services.json` (FCM) documentés dans `DEPLOY.md`
- Guide déploiement v1.0 : [deploy/GUIDE-DEPLOIEMENT.md](deploy/GUIDE-DEPLOIEMENT.md)

#### Native — tâches & partage

- **Partage** des listes de tâches (`TodoListShareModal`) + bouton header « Partager »
- **Édition / suppression** des tâches sur le dashboard (avant : listes partagées seulement)
- Sync PC → mobile : `refetchOnWindowFocus`, polling 30 s, `useRefetchTasksOnFocus`

#### Native — notifications push

- Chip **« Alertes »** (cloche + libellé + pastille) sur listes courses et tâches partagées
- Fix cache tRPC (`getPreferences` / `isPushRegistered`) à l’activation via la cloche
- Messages d’aide distincts courses / tâches (`listKind` sur `PushOptInCard`)

---

### 1.1.0 — 2026-06-11

**Chef IA (Mistral) — recettes & produits de saison**

- Router tRPC **`recipes`** : suggestions de plats, chat culinaire, ajout d’articles à la liste depuis l’IA
- Intégration **Mistral** (`mistral-client`, `recipe-chat`, `recipe-suggestions`)
- Mode **saison** : fruits et légumes par période (`french-season`, sources saisonnières) — sans proposer de plats complets
- **Web + native** : `RecipeChefChat`, `RecipeSuggestions`, bouton flottant « Chef IA » sur les listes courses
- Asset `chef-ia.png` (web `public/`, native `assets/`)
- Correctif build Android : conversion en vrai PNG — PR [#20](https://github.com/EZ3ki33l/todo-list/pull/20)

---

### 1.1.1 — 2026-06-11

**Google Sign-In Play Store (OAuth, EAS, diagnostic)** — PR [#21](https://github.com/EZ3ki33l/todo-list/pull/21), [#22](https://github.com/EZ3ki33l/todo-list/pull/22)

- Mise à jour **`google-services.json`** pour la signature Play Store
- Alignement config **OAuth Google** native (`eas.json`, `app.config`, manifests Gradle)
- Erreurs **Google Sign-In détaillées** affichées à l’écran (diagnostic appareil)
- Verrouillage des builds / résolution conflits dépendances OAuth

---

### 1.1.2 — 2026-06-12

**Rôles lecture/écriture native + push partage**

- UI **lecture seule / écriture** sur listes partagées (tâches + courses) selon le rôle membre
- Modales de partage : choix du rôle à l’invitation (`share-roles`)
- Correctifs **notifications push** au partage de liste (todo + shopping)
- Fix build Docker TypeScript (`google-oauth-audiences`)

---

### 2.0.0 — 2026-06-15

**Migration auth Clerk (web + native)** — PR [#23](https://github.com/EZ3ki33l/todo-list/pull/23)

> **Breaking change** : Auth.js / NextAuth remplacé par **Clerk** sur le web ; flux OAuth Google natif custom remplacé par `@clerk/expo`.

#### Web

- `@clerk/nextjs` : `ClerkProvider`, `proxy.ts` (`clerkMiddleware`), pages login / sign-up
- Suppression routes Auth.js (`[...nextauth]`, mobile OAuth callback)
- Session Clerk → JWT tRPC via `getAppUser` / `ensureUserFromClerk` (`@repo/api`)
- Mise à jour pages dashboard et routes API protégées

#### Native

- `@clerk/expo` : écrans login / sign-up, `ClerkSessionBridge`, échange session → JWT API
- Bouton **Google Sign-In** via Clerk (`clerk-google-sign-in-button`, `clerk-google-native-auth`)
- Styles auth dédiés (`clerk-auth-styles.ts`)
- Suppression scripts `verify-google-oauth` / `google-oauth-verify` (ancien flux)

#### Infra

- Schéma Prisma / contexte API adaptés au modèle utilisateur Clerk
- Variables d’environnement : `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, clients Google Clerk, etc.

---

### 2.0.1 — 2026-06-15

**Sécurité dépôt + politique confidentialité Clerk** — PR [#24](https://github.com/EZ3ki33l/todo-list/pull/24), [#25](https://github.com/EZ3ki33l/todo-list/pull/25)

- Retrait des **identifiants réels** des exemples et de l’historique Git (`chore/security-sanitize-env`)
- Mise à jour **politique de confidentialité** : sous-traitant Clerk, date du 15 juin 2026
- Correctifs TypeScript post-migration

---

### 2.1.0 — 2026-06-16

**Branding EZ3 (logos, splash, skeletons)** — PR [#26](https://github.com/EZ3ki33l/todo-list/pull/26)

- Assets marque : `logo.png`, `ez3-todolist.png`, `ez3-caddie.png`
- **`LoadingLogo`** animé (auth + écrans de chargement)
- **`AuthLoadingOverlay`** + skeletons hubs (`TodoHubSkeleton`, `ShoppingHubSkeleton`, `SharedListsSkeleton`)
- Icônes onglets **Tâches / Courses** personnalisées (`TabBarIcon`)
- Améliorations UX auth (overlay boot, correctifs bugs connexion post-Clerk)
- Mise à jour `app.config` / splash

---

### 2.2.0 — 2026-06-18

**Charte graphique Catppuccin (native + web)** — branche `feat/graphicChart`

#### Native — thème & UI

- Intégration **Tamagui** (provider, config latte/mocha alignée sur Catppuccin)
- **`ThemeModeProvider`** : bascule clair / sombre (latte / mocha), persistance `SecureStore` / `localStorage`
- Toggle 🌙 / 🌤️ dans le header des hubs tâches & courses
- Palette sémantique (`bg`, `text`, `primary`, `skeleton`, etc.) appliquée aux écrans principaux : hubs listes/courses, auth Clerk, skeletons, onglets, formulaires
- **`tintColor`** des logos PNG en mode sombre (sans fond ajouté)
- Barre système Android : **`SystemBars`** + `react-native-edge-to-edge` (remplace `expo-navigation-bar` incompatible edge-to-edge)
- **Branding launcher** : nom « TodoList By EZ3 », icône EZ3 sur fond `#F3FBF6`, prebuild Android
- Correctifs : crash `ClerkAuthDivider` (`styles` hors scope), skeletons blancs en dark, flash latte → mocha au démarrage

#### Web — thème & UI

- Package partagé **`@repo/theme`** (palette latte/mocha commune au monorepo)
- Variables CSS + tokens Tailwind (`bg-app-*`, `text-app-*`, etc.)
- **`ThemeModeProvider`**, script anti-flash, toggle dans le header
- Migration des composants web vers les tokens sémantiques (dashboard, courses, partage, activité, chat chef, skeletons…)
- Écrans Clerk (**SignIn** / **SignUp**) thémés via `appearance`
- Correctifs : résolution module thème sous Turbopack, `NextResponse.redirect` dans le proxy Clerk (Next.js 16)

#### Packages

- **`packages/theme`** : `getPalette`, `THEME_STORAGE_KEY` (`ui_theme_name` — synchro possible web ↔ mobile sur même origine)

---

### 2.3.0 — 2026-06-19

**Détails tâches (++), rappels et Google Agenda**

#### Formulaire & modal « ++ » (web + native)

- Bouton **++** à côté de l’ajout rapide : lieu (nom + adresse, lien navigation Maps), notes, rappel, option Google Agenda
- **Date obligatoire** pour les tâches ponctuelles ; **heure facultative** (sans heure : stockage à minuit, non affichée)
- Date/heure modifiables dans le modal ; **brouillon persistant** (fermer le modal ne efface plus lieu / notes / rappel)
- Helpers partagés `packages/api/src/lib/action-form.ts` : validation planning, presets rappel, fusion brouillon

#### Base de données & API

- Champs `Action` : `locationLabel`, `locationAddress`, `notes`, `remindBeforeMinutes`, `remindAt`, `remindSentAt`, `googleCalendarEventId`
- Migrations : `20260619120000_action_location`, `20260619140000_action_notes_reminder`
- **Rappels serveur** : `action-reminder.ts` — calcul `remindAt`, envoi Web Push + Expo à l’échéance
- **Google Agenda** : `google-calendar.ts` — création d’événement via jeton OAuth Clerk (`calendar.events`), messages d’erreur explicites (scope, API Google Cloud)
- Query **`auth.googleCalendarStatus`** : détection jeton + scope Agenda avant création

#### Web

- `add-action-detail-modal.tsx`, intégration dans `add-action-form.tsx`
- Avertissement si l’ajout Agenda échoue (tâche créée quand même)
- Correctif **SSE activité** : auth JWT via `?token=`, route publique dans `proxy.ts`, repli polling tRPC
- Correctif hydratation **ThemeToggle** (placeholder tant que le thème n’est pas prêt)

#### Native

- Parité modal ++ et formulaire ; **rappels locaux** (`expo-notifications`, `action-local-reminder.ts`)
- Alertes si Google Agenda refuse l’événement

#### Configuration Google Agenda (credentials Clerk personnalisées)

- Scope Clerk : `https://www.googleapis.com/auth/calendar.events`
- Activation de l’**API Google Calendar** dans le projet Google Cloud lié au Client ID OAuth
- Reconnexion Google après ajout du scope

#### Légal

- Mise à jour **politique de confidentialité** : lieu/notes/rappels, Google Agenda, stockage préférence thème

---

### 2.3.1 — 2026-06-20

**Suppression des listes partagées et confirmations définitives**

#### Listes partagées (web + native)

- Icône **corbeille** sur les listes de tâches et de courses partagées (réservée au **propriétaire**)
- Composants `SharedListRow` (web) / `shared-list-row` (native) sur les hubs Tâches et Courses

#### Confirmations avant suppression

- Message unifié : *« Cette suppression est définitive et ne pourra pas être annulée »*
- Helpers partagés `packages/api/src/lib/confirm-delete.ts`
- Web : `window.confirm` ; native : `Alert.alert` (Annuler / Supprimer)
- S’applique aux tâches, articles de courses, listes, vidage des articles cochés

#### Correctifs native

- **`ThemeModeProvider`** : ne bloque plus le rendu avec `return null` au démarrage (erreur React « state update on unmounted component » avec SecureStore)
- Stabilisation des effets `usePersonalTodoList` / `usePersonalShoppingList`

#### Google Agenda (complément 2.3.0)

- Messages d’erreur détaillés (scope insuffisant, API Calendar désactivée dans Google Cloud)
- Vérification des scopes du jeton OAuth avant appel à l’API

#### Légal

- Précision **politique de confidentialité** : suppression volontaire d’une liste par son propriétaire

---

### 2.3.2 — 2026-06-20

**Suppression de compte Clerk : purge complète des données utilisateur**

- Ajout d&apos;un webhook Clerk `user.deleted` sur `POST /api/webhooks/clerk`
- Vérification de signature webhook côté serveur (`@clerk/nextjs/webhooks`)
- Suppression de l&apos;utilisateur applicatif par `clerkId`
- Suppression automatique en cascade de toutes les données liées (listes,
  tâches, courses, partages, notifications, tokens push/web-push, etc.) via
  les relations Prisma `onDelete: Cascade`
- Route webhook rendue publique dans le middleware/proxy Clerk
- Mise à jour de la politique de confidentialité : suppression self-service
  depuis Clerk (Manage account > Delete account) + purge automatique

---

## Prochaines pistes (non versionnées)

- Build production EAS (`com.ez3ki33l.todolist`) + upload Play Store tests internes
- Déploiement prod page politique de confidentialité
- Tests e2e notifications
- Benchmarks automatisés en CI

---

## Liens utiles

- [README](README.md) — démarrage local
- [Déploiement web](deploy/todolist/README.md)
- [Déploiement native](apps/native/DEPLOY.md)
- [Dépôt GitHub](https://github.com/EZ3ki33l/todo-list)
