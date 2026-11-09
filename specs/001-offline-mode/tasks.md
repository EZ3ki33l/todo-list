---

description: "Liste de tâches du chantier 001 : mode hors-ligne (courses et tâches)"
---

# Tasks: Mode hors-ligne (courses et tâches)

**Input**: `specs/001-offline-mode/` (plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/outbox.md, quickstart.md)

**Prerequisites**: plan.md, spec.md. Constitution : [.specify/memory/constitution.md](../../.specify/memory/constitution.md).

**Tests**: INCLUS. La constitution (principe IV) exige un test pour toute logique non triviale : file, fusion, rejeu. L'UI pure n'en exige pas.

**Organization**: groupées par user story. Les phases sont en plus rangées par **jalon de livraison** :

| Jalon | Phases | Livre |
|---|---|---|
| **J1** (2.4.0) | 0 à 7 | contrat serveur + Android. **Livrable seul**, débloque le widget `004`. |
| **J2** (2.5.0) | 8 | web |

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, aucune dépendance en cours).
- **[Story]** : US1 consulter hors-ligne · US2 agir hors-ligne · US3 indicateur d'état · US4 liste partagée et conflits.
- Chemins relatifs à la racine du dépôt. Règle git : une branche `feat/offline-mode` depuis `main`, jamais de commit sur `main`.

---

## Phase 0 : Spike Clerk hors-ligne (avant tout développement)

**But**: lever le risque R1 du plan. Résultat attendu : oui/non, en 5 minutes sur appareil.

- [ ] T001 Sur un build de développement Android : se connecter, ouvrir une liste de courses, fermer l'app, passer en mode avion, **tuer** puis relancer l'app. Noter dans `specs/001-offline-mode/research.md` (section R-08, « Reste à vérifier ») : l'écran des listes s'affiche-t-il, y a-t-il déconnexion, combien de secondes d'attente ?
- [ ] T002 **Seulement si T001 échoue** : dans `apps/native/app/_layout.tsx` (`AuthGuard`), ne plus attendre le chargement de Clerk (`isLoaded`) pour afficher l'app quand un jeton API est déjà lu en stockage (`useAuth().token`). Refaire T001 jusqu'au succès.

**Checkpoint**: le démarrage à froid hors-ligne atteint l'écran des listes. Sinon, ne pas continuer.

---

## Phase 1 : Setup

- [ ] T003 Créer la branche `feat/offline-mode` depuis `main` à jour (`git checkout main && git pull && git checkout -b feat/offline-mode`). L'arbre doit être propre : mettre de côté ou commiter avant les modifications sans rapport.
- [ ] T004 [P] Ajouter les dépendances natives dans `apps/native/package.json` : `pnpm --filter native exec expo install expo-sqlite expo-network` (versions compatibles Expo 57) puis `pnpm --filter native add @tanstack/react-query-persist-client @tanstack/query-async-storage-persister`. Aligner `@tanstack/react-query` sur la version déjà utilisée (5.103.x).
- [ ] T005 [P] Créer le squelette `packages/domain/src/offline/index.ts` (exports vides) et ajouter `"./offline": "./src/offline/index.ts"` aux `exports` de `packages/domain/package.json`.

---

## Phase 2 : Fondations J1 (bloquent US2 à US4 ; US1 n'en dépend pas)

**⚠️ Le contrat serveur (T006 à T018) doit être déployé en production avant tout build Android qui l'utilise.**

### Contrat serveur rétrocompatible (PR 1)

- [ ] T006 Ajouter `lwwAt DateTime @default(now())` aux modèles `ShoppingItem` et `Action` dans `packages/db/prisma/schema.prisma`, puis `pnpm --filter @repo/db db:push` sur une base **de développement** et `pnpm --filter @repo/db db:generate`.
- [ ] T007 [P] Ajouter `findFirst: vi.fn()` au mock `shoppingItem` dans `packages/api/src/__tests__/helpers/mock-prisma.ts` (le routeur d'articles l'utilise dans `create`).
- [ ] T008 [P] Écrire les tests de la règle LWW dans `packages/api/src/lib/lww.test.ts` : `clientAt` absent → heure courante ; `clientAt` dans le futur → borné à maintenant ; appliqué si `effectiveAt >= lwwAt` ; ignoré sinon. Ils doivent échouer.
- [ ] T009 Implémenter `packages/api/src/lib/lww.ts` (`resolveEffectiveAt(clientAt, now)` et `isStale(effectiveAt, lwwAt)`) jusqu'à faire passer T008.
- [ ] T010 [P] Ajouter dans `packages/api/src/schemas.ts` : `clientAtSchema` (ISO 8601 optionnel), `clientItemIdSchema` (UUID), `setCheckedInput` (`itemId`, `checked`, `clientAt?`), `setDoneInput` (`actionId`, `done`, `clientAt?`), et les champs optionnels `id`/`clientAt` des entrées de création, modification et suppression d'article. Réexporter ce qui est importé depuis `packages/api/src/trpc.ts`.
- [ ] T011 Écrire `packages/api/src/__tests__/router/shoppingItems.test.ts` (doivent échouer d'abord) : `create` avec le même `id` ne crée qu'un article ; `id` pris par une autre liste → `CONFLICT` ; `setChecked` rejoué sans effet ; opération plus ancienne que `lwwAt` ignorée ; `delete` d'un article absent → succès ; `delete` périmé ignoré ; rôle `invité` → `FORBIDDEN` ; `toggle` historique inchangé.
- [ ] T012 Modifier `packages/api/src/router/shoppingItems.ts` : `create` (UUID client, rejeu idempotent via la contrainte d'unicité), `update` et `delete` (LWW, suppression idempotente), nouvelle `setChecked`. **Toute écriture existante pose `lwwAt`** (`toggle`, `update`) pour que « le plus récent gagne » reste juste face aux anciennes versions. Garder `toggle`, `clearChecked`, `reorder`.
- [ ] T013 Écrire `packages/api/src/__tests__/router/actions.test.ts` pour `setDone` (doivent échouer d'abord) : état déjà atteint → aucun effet ni double comptage de série ; LWW ; `invité` → `FORBIDDEN` ; `toggle` historique inchangé.
- [ ] T014 Modifier `packages/api/src/lib/perform-action-toggle.ts` pour accepter un état voulu (`desiredDone`) et un `effectiveAt`, puis ajouter `actions.setDone` dans `packages/api/src/router/actions.ts`. `toggle` et `update` posent `lwwAt`.
- [ ] T015 [P] Écrire `packages/api/src/__tests__/router/lww-scenarios.test.ts` : scénario A (10:00) / B (10:30) synchronisés dans l'ordre inverse → le geste de 10:30 gagne, avec un faux article à état conservé entre appels (`mockImplementation`).
- [ ] T016 Vérifier : `pnpm --filter @repo/api test && pnpm --filter @repo/api typecheck && pnpm --filter web typecheck`. Tout doit passer.
- [ ] T017 **Porte PR 1** : pousser la branche, ouvrir la PR « feat(api): écritures rejouables et dernier écrit gagnant » vers `main`. Après approbation et merge : `db:push` sur la base de **production** **avant** le déploiement web (la colonne est ajoutée avec une valeur par défaut, l'ancien code l'ignore), puis déploiement Docker web. **Demander la confirmation de l'utilisateur avant le `db:push` de production.**
- [ ] T018 Contrôler en production que l'ancienne app fonctionne toujours : cocher un article et une tâche avec la version Play Store (`toggle`).

### Cœur de la file dans `packages/domain`

- [ ] T019 [P] Définir les types dans `packages/domain/src/offline/types.ts` (`OutboxOp`, `OutboxState`, `OutboxStorage`, `SendOp`, états `pending|rejected`) conformément à `contracts/outbox.md` et `data-model.md`, avec une fonction de validation écrite à la main (le paquet `domain` n'a pas zod).
- [ ] T020 [P] Écrire `packages/domain/src/__tests__/offline/classify-error.test.ts` : réseau/délai/5xx → `retry` ; `UNAUTHORIZED` → `pause-auth` ; `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BAD_REQUEST` → `reject`. Doivent échouer.
- [ ] T021 Implémenter `packages/domain/src/offline/classify-error.ts` (reconnaît la forme `error.data.code` d'une erreur tRPC sans importer tRPC).
- [ ] T022 [P] Écrire `packages/domain/src/__tests__/offline/outbox.test.ts` avec un stockage en mémoire : persistance entre deux instances, ordre FIFO, isolation par `userId`, non-perte sur `retry` et `pause-auth`, un refus n'arrête pas les suivants, un seul envoi à la fois, plafond de 500, `dismissRejected`, `clear`. Doivent échouer.
- [ ] T023 Implémenter `packages/domain/src/offline/outbox.ts` (`createOutbox`, `enqueue`, `flush`, `pause`, `resume`, `getState`, `subscribe`, `dismissRejected`, `clear`, attente 5 s doublée jusqu'à 5 min) et brancher `packages/domain/src/offline/index.ts`.
- [ ] T024 [P] Écrire `packages/domain/src/__tests__/offline/apply-op.test.ts` : application d'une opération à une liste d'articles ou de tâches (création, modification, cochage, suppression, `setDone`). Doivent échouer.
- [ ] T025 Implémenter `packages/domain/src/offline/apply-op.ts` (fonctions pures utilisées pour la mise à jour optimiste du cache, SC-003).
- [ ] T026 Vérifier : `pnpm --filter @repo/domain test`. Tout passe.

**Checkpoint**: serveur déployé et rétrocompatible, file testée. Les stories peuvent démarrer.

---

## Phase 3 : User Story 1 (P1) 🎯 MVP : consulter mes listes sans réseau (Android)

**Goal**: les listes et tâches déjà ouvertes s'affichent sans réseau.

**Independent Test**: quickstart §3 scénarios A et B (liste ouverte puis mode avion et relance ; liste jamais ouverte).

- [ ] T027 [P] [US1] Créer `apps/native/lib/offline/storage.ts` : adaptateur `OutboxStorage` et stockage du persisteur au-dessus de `expo-sqlite/kv-store`.
- [ ] T028 [P] [US1] Créer `apps/native/lib/offline/network.ts` : branche `onlineManager` de TanStack sur `expo-network` (`getNetworkStateAsync` au démarrage, `addNetworkStateListener`, joignable = `isInternetReachable`) et exporte le hook `useIsOnline()`.
- [ ] T029 [US1] Déplacer le `QueryClient` de `apps/native/app/_layout.tsx` vers `apps/native/lib/query-client.ts` (singleton exportable, pour la purge) avec `gcTime` de 30 jours.
- [ ] T030 [US1] Dans `apps/native/app/_layout.tsx`, remplacer `QueryClientProvider` par `PersistQueryClientProvider` : `createAsyncStoragePersister` sur la clé `todolist.query-cache.v1`, `maxAge` de 30 jours, `buster` dérivé de la version de l'app, et `shouldDehydrateQuery` limité à `shoppingLists.*`, `shoppingItems.getByList`, `lists.*`, `actions.getByList`, `auth.me`.
- [ ] T031 [US1] Afficher « Liste non disponible hors-ligne » quand `fetchStatus === "paused"` et qu'il n'y a pas de données, dans `apps/native/components/shopping-list-detail.tsx` et `apps/native/app/(app)/lists/[listId].tsx`, au lieu d'un chargement infini.
- [ ] T032 [US1] Valider sur appareil les scénarios A et B (quickstart §3) et mesurer SC-001 (moins de 2 s).

**Checkpoint**: lecture hors-ligne fonctionnelle sur Android.

---

## Phase 4 : User Story 2 (P1) : cocher, ajouter, modifier hors-ligne (Android)

**Goal**: les gestes hors-ligne sont visibles tout de suite, conservés, puis envoyés seuls.

**Independent Test**: quickstart scénarios C, D, E, F, G, K.

- [ ] T033 [US2] Créer `apps/native/lib/offline/outbox-provider.tsx` : instancie la file (`createOutbox`) par utilisateur et par jeton, avec `send` qui appelle `setChecked`, `create`, `update`, `delete` et `setDone` du client tRPC sans React (étendre `apps/native/lib/trpc.ts` pour exposer ce client), expose `useOutbox()`, et l'insère dans `apps/native/app/_layout.tsx` sous `PersistQueryClientProvider`.
- [ ] T034 [US2] Dans ce provider, lancer `flush()` au démarrage, au retour au premier plan (`AppState`), au retour du réseau (`onlineManager`) et après `enqueue` si le réseau est joignable ; invalider ensuite les caches des listes touchées et `shoppingItems.getFrequent`.
- [ ] T035 [US2] Gérer `pause-auth` : sur `UNAUTHORIZED`, mettre la file en pause et la reprendre quand `token` change dans `apps/native/lib/auth-context.tsx` (renouvellement existant via `ClerkSessionBridge`).
- [ ] T036 [US2] Créer `apps/native/lib/offline/use-offline-mutations.ts` : `enqueueAndApply(op)` met à jour le cache (`utils.*.setData` via `applyOp` de `@repo/domain/offline`) **puis** met en file, refuse l'écriture sur une liste en lecture seule (rôle `invité`) et génère l'UUID d'un nouvel article avec `expo-crypto`.
- [ ] T037 [US2] Remplacer les mutations de `apps/native/components/shopping-list-detail.tsx` (création, modification, cochage, suppression d'un article) par `enqueueAndApply` ; garder `clearChecked` et `reorder` tels quels (réservés au réseau).
- [ ] T038 [US2] Remplacer `trpc.actions.toggle` par un `setDone` en file dans `apps/native/lib/use-toggle-action.ts` (l'état voulu = inverse de l'état effectif lu dans le cache au moment du geste). Vérifier les deux appelants : `apps/native/app/(app)/lists/[listId].tsx` et `apps/native/components/day-week-view.tsx`. La série affichée se met à jour après synchronisation.
- [ ] T039 [US2] Implémenter la purge FR-011 : créer `apps/native/lib/offline/purge.ts` (supprime `todolist.query-cache.v1` et `todolist.outbox.v1`, vide le `QueryClient` et la file) et l'appeler depuis `signOut` de `apps/native/lib/auth-context.tsx` (couvre aussi la déconnexion forcée par `useMeValidation`).
- [ ] T040 [US2] Avertir avant la déconnexion s'il reste des changements en attente (`Alert`) dans `apps/native/components/menu-bottom-sheet.tsx`.
- [ ] T041 [US2] Valider sur appareil C, D, E, F, G, K et M (quickstart §3). Mesurer SC-003 (cochage visible en moins de 300 ms) et SC-004 (aucun doublon après trois coupures).

**Checkpoint**: ajout et cochage hors-ligne de bout en bout.

---

## Phase 5 : User Story 3 (P2) : savoir où j'en suis (Android)

**Goal**: état hors-ligne, compteur et refus toujours visibles ; actions réseau désactivées proprement.

**Independent Test**: quickstart scénarios C (bandeau) et N.

- [ ] T042 [P] [US3] Créer `apps/native/components/offline-banner.tsx` : lit `useOutboxState` (via `subscribe`) et `useIsOnline()`, affiche « Hors-ligne », « N en attente » et « N refusés » avec liste et bouton pour ignorer chaque refus (`dismissRejected`). Thème via `getPalette`.
- [ ] T043 [US3] Monter le bandeau dans `apps/native/app/(app)/_layout.tsx`.
- [ ] T044 [P] [US3] Créer `apps/native/lib/offline/require-online.ts` (renvoie un message « Indisponible hors-ligne » et empêche l'action) et l'appliquer au partage et au Chef IA : `apps/native/components/todo-list-share-modal.tsx`, `apps/native/components/share-shopping-list-modal.tsx`, `apps/native/components/recipe-chef-chat.tsx`, `apps/native/components/recipe-catalog.tsx`.
- [ ] T045 [P] [US3] Appliquer `require-online` à la création et suppression de listes (`apps/native/app/(app)/index.tsx`, `apps/native/app/(app)/shopping/index.tsx`), à « vider les cochés » et à la réorganisation (`apps/native/components/shopping-list-detail.tsx`, `apps/native/app/(app)/lists/[listId].tsx`).
- [ ] T046 [P] [US3] Appliquer `require-online` à la création, modification et suppression de tâches : `apps/native/components/add-action-form.tsx`, `apps/native/components/add-action-detail-modal.tsx`, `apps/native/components/action-item-row.tsx`.
- [ ] T047 [US3] Valider sur appareil le bandeau, le compteur et le scénario N (quickstart §3).

**Checkpoint**: l'utilisateur sait toujours ce qui est envoyé, en attente ou refusé.

---

## Phase 6 : User Story 4 (P3) : liste partagée modifiée par quelqu'un d'autre (Android)

**Goal**: les changements concurrents sont conservés ; les conflits sont réglés sans erreur bloquante. La règle serveur est déjà livrée en phase 2 (T009 à T015).

**Independent Test**: quickstart scénarios H, I, J, L avec deux appareils.

- [ ] T048 [P] [US4] Écrire `packages/domain/src/__tests__/offline/format-rejection.test.ts` : message en français pour `FORBIDDEN` (lecture seule ou accès retiré), `NOT_FOUND` (l'élément n'existe plus), `CONFLICT`, `BAD_REQUEST`. Doit échouer.
- [ ] T049 [US4] Implémenter `packages/domain/src/offline/format-rejection.ts` et l'utiliser dans `apps/native/components/offline-banner.tsx` pour afficher la raison d'un refus.
- [ ] T050 [US4] Après chaque `flush`, rafraîchir les listes touchées pour afficher les changements des autres membres (vérifier que T034 couvre `shoppingItems.getByList` et `actions.getByList` pour chaque `listId` d'une opération).
- [ ] T051 [US4] Valider avec deux appareils H, I, J et L (quickstart §3).

**Checkpoint**: tous les scénarios A à N passent sur Android.

---

## Phase 7 : Livraison J1 (Android)

- [ ] T052 [P] Ajouter l'entrée `2.4.0` dans `CHANGELOG.md` (tableau d'ensemble et détail, selon la convention du fichier) et incrémenter `android.versionCode` (4 → 5) dans `apps/native/app.json`.
- [ ] T053 Vérifier : `pnpm test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter @repo/api typecheck`, `pnpm --filter native exec tsc --noEmit`.
- [ ] T054 Lancer le build EAS Android de test (`eas.json`, profil `preview`) et rejouer quickstart §3 en entier puis §5 (compatibilité ancienne app). **Demander la confirmation de l'utilisateur avant de lancer le build.**
- [ ] T055 Ouvrir la PR Android (« feat(native): mode hors-ligne ») vers `main` et la faire valider.

### ═══ FRONTIÈRE J1 / J2 : J1 est livrable seul ═══
*Le widget `004` peut démarrer ici. Le web continue en J2.*

---

## Phase 8 : Jalon J2 : mode hors-ligne web (US1 à US3)

**Prérequis**: J1 mergé. Branche `feat/offline-web` depuis `main`.

### Setup web

- [ ] T056 Créer la branche `feat/offline-web` depuis `main` à jour.
- [ ] T057 [P] Ajouter dans `apps/web/package.json` : `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval` (déjà présent en transitif, à déclarer).

### US1 web : consulter sans réseau

- [ ] T058 [P] [US1] Créer `apps/web/lib/offline/storage.ts` : adaptateur `OutboxStorage` et stockage du persisteur au-dessus de `idb-keyval`, protégé côté serveur (`typeof indexedDB`).
- [ ] T059 [P] [US1] Créer `apps/web/lib/offline/network.ts` avec `useIsOnline()` (événements `online`/`offline`).
- [ ] T060 [US1] Dans `apps/web/components/trpc-provider.tsx`, passer à `PersistQueryClientProvider` (clé `todolist.query-cache.v1`, `maxAge` et `gcTime` de 30 jours, même liste blanche de requêtes que T030). **Ne pas persister le jeton API** : il est recherché via `/api/auth/trpc-token` au retour du réseau.
- [ ] T061 [US1] Étendre `apps/web/public/sw.js` en gardant les gestionnaires `push` et `notificationclick` : précache de `/offline`, cache-first de `/_next/static/**`, navigation vers `/dashboard/**` en réseau d'abord puis repli sur `/offline?to=<chemin d'origine>`. Nommer le cache avec une version et supprimer les anciens à l'activation.
- [ ] T062 [US1] Enregistrer le service worker au démarrage de l'app (aujourd'hui seulement à l'activation des notifications dans `apps/web/lib/web-push-subscribe.ts`) via un petit composant client monté dans `apps/web/app/(shell)/layout.tsx`.
- [ ] T063 [US1] Créer `apps/web/app/offline/layout.tsx` (avec `TrpcProvider` sans jeton serveur) et `apps/web/app/offline/page.tsx` : coquille cliente qui lit `to` et affiche `ShoppingListDetail` ou le panneau des tâches (`apps/web/components/action-list-panel.tsx`) depuis le cache local ; l'identifiant utilisateur vient de `auth.me` persisté. Ajouter `/offline` aux routes publiques de `apps/web/proxy.ts` (aucune donnée serveur).
- [ ] T064 [US1] Afficher « non disponible hors-ligne » quand il n'y a pas de données et que la requête est en pause, dans `apps/web/components/shopping-list-detail.tsx` et `apps/web/components/action-list-panel.tsx`. Vérifier que `apps/web/app/(shell)/dashboard/lists/[listId]/page.tsx` n'impose pas les props serveur à la coquille `/offline`.

### US2 web : agir hors-ligne

- [ ] T065 [US2] Créer `apps/web/lib/offline/outbox-provider.tsx` (même contrat que T033/T034, `send` via le client tRPC web, UUID via `crypto.randomUUID()`) et le monter dans `apps/web/components/trpc-provider.tsx`. Sur `UNAUTHORIZED` ou jeton absent, mettre en pause puis reprendre après un nouveau `/api/auth/trpc-token`.
- [ ] T066 [US2] Remplacer les mutations d'articles de `apps/web/components/shopping-list-detail.tsx` par la file (création, modification, cochage via `setChecked`, suppression).
- [ ] T067 [US2] Remplacer `toggle` par `setDone` en file dans `apps/web/lib/use-toggle-action.ts` (utilisé par `apps/web/components/action-toggle-button.tsx`).
- [ ] T068 [US2] Purge FR-011 web : créer `apps/web/lib/offline/purge.ts` (efface IndexedDB, la file et `caches.keys()` du service worker) et l'appeler avant `signOut()` dans `apps/web/components/user-dropdown.tsx`, avec avertissement s'il reste des changements en attente.

### US3 web : indicateur et actions réseau

- [ ] T069 [P] [US3] Créer `apps/web/components/offline-banner.tsx` (mêmes états que T042, `format-rejection` de `@repo/domain/offline`) et le monter dans `apps/web/app/(shell)/dashboard/layout.tsx` et dans `apps/web/app/offline/layout.tsx`.
- [ ] T070 [P] [US3] Désactiver hors-ligne les actions réseau avec `useIsOnline()` : partage (`apps/web/components/share-todo-list-panel.tsx`, `apps/web/components/share-shopping-list-panel.tsx`), Chef IA (`apps/web/components/recipe-chef-chat.tsx`), catalogue (`apps/web/components/recipe-catalog.tsx`), création et suppression de listes, « vider les cochés », réorganisation, création, modification et suppression de tâches (`apps/web/components/add-action-form.tsx`, `apps/web/components/add-action-detail-modal.tsx`, `apps/web/components/action-item.tsx`).

### Validation et livraison J2

- [ ] T071 Valider dans un navigateur (outils de développement, « Hors connexion ») les scénarios A à N puis le §4 du quickstart : rechargement hors-ligne de `/dashboard/shopping/<id>`, caches vides après déconnexion.
- [ ] T072 [P] Ajouter l'entrée `2.5.0` dans `CHANGELOG.md`.
- [ ] T073 Vérifier : `pnpm test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`, build Docker (`pnpm docker:build`), puis ouvrir la PR « feat(web): mode hors-ligne » vers `main`.

---

## Dependencies & Execution Order

```text
Phase 0 (spike) ─▶ Phase 1 (setup) ─┬─▶ Phase 3 US1 ────────────────────┐
                                    └─▶ Phase 2 fondations (serveur ‖ domaine)
                                              │  (PR 1 mergée et déployée)
                                              ▼
                              Phase 4 US2 ─▶ Phase 5 US3 ─▶ Phase 6 US4 ─▶ Phase 7 (J1)
                                                                              │
                                                                  ═ frontière ═
                                                                              ▼
                                                                       Phase 8 (J2 web)
```

- **US1** dépend seulement des phases 0 et 1 (la lecture n'utilise ni file ni procédures nouvelles).
- **US2** dépend de la phase 2 entière, **y compris le déploiement du serveur (T017)**.
- **US3** dépend d'US2 (état de la file). **US4** dépend d'US2 et des tests serveur de la phase 2.
- Dans la phase 2, la partie serveur (T006 à T018) et la partie domaine (T019 à T026) sont **indépendantes** et parallélisables.

### Parallel opportunities

- T004, T005 ensemble ; T007, T008, T010, T015, T019, T020, T022, T024 sur des fichiers distincts.
- T027 ‖ T028 ; T042 ‖ T044 ‖ T045 ‖ T046 ; T058 ‖ T059 ; T069 ‖ T070.
- Une fois US2 terminée, US3 et US4 peuvent avancer en parallèle.

## Implementation Strategy

1. **MVP = Phase 0 à 3 (US1)** : lecture hors-ligne, déjà utile en magasin, livrable sans toucher au serveur.
2. **Phase 2 puis US2** : le gain principal (ajouter et cocher sans réseau). Le serveur part en premier, seul et rétrocompatible.
3. **US3 puis US4** : confort et conflits.
4. **J1 livré (2.4.0)** : le widget `004` démarre.
5. **J2 web (2.5.0)** : même logique, adaptateurs différents, service worker en plus.

Chaque story se valide seule avec ses scénarios du [quickstart.md](./quickstart.md). Un refus ou un conflit ne doit jamais perdre un changement en silence.
