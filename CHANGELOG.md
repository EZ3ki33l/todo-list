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
| [1.1.0](#110---2026-06-11) | 2026-06-11 | Chef IA courses, correctif Google Sign-In Play Store |

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

**Chef IA courses & publication Play Store** — PR [#20](https://github.com/EZ3ki33l/todo-list/pull/20), [#21](https://github.com/EZ3ki33l/todo-list/pull/21)

#### Nouveautés — Chef IA (Mistral)

- Assistant **Chef IA** sur les listes de courses (web + native) : chat flottant + modale
- **Recettes** à partir des articles déjà sur la liste (`from_list`)
- **Articles à acheter** pour un plat décrit (`suggest_items`)
- **Produits de saison** : calendrier fruits/légumes par saison — sans recettes (`seasonal_produce`)
- Ajout d’articles en un clic (`itemsToAdd` → `shoppingItems.create`)
- Sources cliquables (Manger Bouger, Interfel, Agence Bio)
- API : `recipes.chat`, `recipes.chatWelcome`, `recipes.suggestFromList`
- Politique de confidentialité : mention du traitement Mistral AI

#### Native — Play Store

- **Connexion Google** corrigée sur l’app installée depuis le Play Store (`google-services.json` avec empreintes Play + debug)
- `chef-ia.png` converti en vrai PNG (évite l’échec AAPT au build Android)
- `versionCode` 4, `autoIncrement` EAS production

#### Déploiement

- Variable serveur `MISTRAL_API_KEY` documentée (`deploy/todolist/README.md`, `deploy/GUIDE-DEPLOIEMENT.md`)

---

## Prochaines pistes (non versionnées)

- Déploiement prod Chef IA (`MISTRAL_API_KEY` sur le serveur)
- Tests e2e notifications
- Benchmarks automatisés en CI

---

## Liens utiles

- [README](README.md) — démarrage local
- [Déploiement web](deploy/todolist/README.md)
- [Déploiement native](apps/native/DEPLOY.md)
- [Dépôt GitHub](https://github.com/EZ3ki33l/todo-list)
