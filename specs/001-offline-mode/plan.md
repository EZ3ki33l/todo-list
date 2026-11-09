# Implementation Plan: Mode hors-ligne (courses et tâches)

**Branch**: `feat/offline-mode` (à créer depuis `main` à jour, voir « Prérequis git ») | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-offline-mode/spec.md`

## Summary

Les listes déjà consultées s'ouvrent sans réseau et les changements faits hors-ligne sont envoyés au retour du réseau, sur Android puis sur le web.

Approche retenue (détail et alternatives écartées dans [research.md](./research.md)) :

1. **Lecture** : le cache TanStack Query existant est rendu persistant (stockage local), sans changer les écrans.
2. **Écriture** : une **file d'envoi maison** (« outbox ») en TypeScript pur, dans `packages/domain`, indépendante de React. Elle stocke des opérations simples, les rejoue dans l'ordre avec le client tRPC, et classe les erreurs. Elle est partagée par Android, web et, plus tard, le widget `004`, qui tourne hors de l'arbre React.
3. **Serveur** : les procédures d'écriture deviennent **rejouables sans effet de bord** (identifiant d'article fourni par le client, `setChecked`/`setDone` explicites à la place de `toggle`, suppression idempotente) et appliquent **« le plus récent gagne »** par élément via une colonne `lwwAt`. Les procédures actuelles restent, car des versions déjà publiées de l'app les appellent.

**Livraison en deux jalons** (réponse à la question du brief) :

| Jalon | Contenu | Version | Pourquoi ce découpage |
|---|---|---|---|
| **J1** | contrat serveur + Android | 2.4.0 | Débloque le widget `004`. Le serveur doit être déployé **avant** le build Android. |
| **J2** | web | 2.5.0 | Demande un service worker et une refonte de la page tâches : risque et effort propres, indépendants d'Android. |

## Technical Context

**Language/Version**: TypeScript (monorepo pnpm 11 + Turborepo, Node 22)

**Primary Dependencies**: Expo 57 / React Native 0.86, Next.js 16.3, tRPC 11.18, TanStack Query 5.103, Prisma 7, zod 4. **Ajouts** : `expo-sqlite` (stockage clé-valeur via `expo-sqlite/kv-store`), `expo-network` (état du réseau), `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` (natif et web), `idb-keyval` (web ; déjà présent en transitif dans le lockfile, à déclarer).

**Storage**: Android : `expo-sqlite/kv-store` (remplaçant direct d'AsyncStorage, API conforme à la doc Expo). Web : IndexedDB via `idb-keyval`. Serveur : PostgreSQL/Neon, 2 colonnes ajoutées (`lwwAt`).

**Testing**: vitest 5. Tests unitaires de la file et des règles de fusion (`packages/domain`), tests de routeur pour l'idempotence et la règle « le plus récent gagne » (`packages/api/src/__tests__/router`). Scénarios appareil dans [quickstart.md](./quickstart.md).

**Target Platform**: Android (EAS) pour J1 ; navigateurs récents (service worker + IndexedDB) pour J2.

**Project Type**: monorepo mobile + web + API (voir « Structure »).

**Performance Goals**: SC-001 liste affichée en moins de 2 s hors-ligne ; SC-003 cochage visible en moins de 300 ms (mise à jour du cache avant tout envoi réseau).

**Constraints**: hors-ligne par défaut ; une opération ne doit jamais être perdue silencieusement ; aucune donnée d'un utilisateur ne survit à sa déconnexion sur l'appareil.

**Scale/Scope**: foyer de 1 à quelques utilisateurs, quelques listes de quelques dizaines d'éléments ; file plafonnée à 500 opérations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Justification |
|---|---|---|
| I. Logique partagée | ✅ | File, règles de fusion et classification d'erreurs dans `packages/domain/src/offline/`. Les apps n'ajoutent que l'adaptateur de stockage et le branchement réseau. |
| II. Rôles de partage | ✅ | Chaque procédure rejouée repasse par `findAccessibleShoppingItem` / `findAccessibleTodoList` ; un `invité` est refusé à l'envoi (FORBIDDEN → opération « refusée »). Côté client, l'interface désactive déjà l'édition pour un invité. |
| III. Validation | ✅ | Nouveaux champs (`id`, `clientAt`, `checked`, `done`) validés par zod dans `schemas.ts`. |
| IV. Test | ✅ | Logique non triviale (file, fusion, rejeu idempotent) couverte par vitest. |
| V. Simplicité | ⚠️ justifiée | File maison au lieu des mutations en pause de TanStack, colonne `lwwAt`, service worker web : voir « Complexity Tracking ». |
| VI. Honnêteté sur le natif | ✅ | `expo-sqlite` et `expo-network` sont des modules natifs ; selon la doc Expo ils sont inclus dans Expo Go, mais la release exige un nouveau build EAS. Le serveur doit passer en production avant. |

**Écarts entre ce plan et le spec** (reportés dans le spec le 2026-11-09 : FR-009 étendu, FR-011 ajouté, rétention de 30 jours) :
- Hors-ligne, *réordonner*, *vider les articles cochés* et *créer, modifier ou supprimer une tâche* restent réservés au réseau (FR-002 ne couvre que les articles et le cochage des tâches). À ajouter à FR-009.
- La déconnexion doit **purger** copie locale et file : exigence absente du spec, à ajouter (FR-011).
- Copie locale conservée **30 jours** et non « sans limite » : c'est aussi la durée de vie du jeton API, au-delà les données ne seraient de toute façon plus synchronisables.

## Project Structure

### Documentation (this feature)

```text
specs/001-offline-mode/
├── plan.md              # Ce fichier
├── research.md          # Décisions et alternatives écartées
├── data-model.md        # Colonnes serveur, opération de file, états
├── quickstart.md        # Scénarios de validation
├── contracts/
│   ├── api.md           # Procédures tRPC nouvelles ou modifiées
│   └── outbox.md        # Format d'opération, algorithme d'envoi, classes d'erreur
└── tasks.md             # Produit par /speckit-tasks (pas par ce plan)
```

### Source Code (repository root)

```text
packages/db/prisma/schema.prisma            # + lwwAt sur ShoppingItem et Action
packages/domain/src/offline/                # NOUVEAU : outbox.ts, classify-error.ts, types.ts, index
packages/domain/src/__tests__/offline/      # NOUVEAU : tests vitest de la file
packages/domain/package.json                # + export "./offline"
packages/api/src/schemas.ts                 # + schémas des nouveaux champs
packages/api/src/lib/lww.ts                 # NOUVEAU : règle « le plus récent gagne »
packages/api/src/router/shoppingItems.ts    # create/update/delete rejouables, + setChecked
packages/api/src/router/actions.ts          # + setDone
packages/api/src/lib/perform-action-toggle.ts  # extrait la logique pour setDone
packages/api/src/__tests__/router/          # tests d'idempotence et de LWW

apps/native/lib/offline/                    # NOUVEAU : storage.ts, network.ts, outbox-provider.tsx
apps/native/lib/trpc.ts                     # client vanilla exposé pour la file
apps/native/app/_layout.tsx                 # PersistQueryClientProvider + démarrage de la file
apps/native/components/offline-banner.tsx   # NOUVEAU : état hors-ligne + compteur + refusés
apps/native/components/shopping-list-detail.tsx   # mutations -> file
apps/native/lib/use-toggle-action.ts        # toggle -> setDone via la file

apps/web/lib/offline/                       # J2 : storage IndexedDB, réseau, provider
apps/web/components/trpc-provider.tsx       # J2 : persistance + file
apps/web/public/sw.js                       # J2 : + coquille hors-ligne (push conservé)
apps/web/app/offline/page.tsx               # J2 : coquille cliente alimentée par le cache local
apps/web/proxy.ts                           # J2 : route /offline publique (aucune donnée serveur)
```

**Structure Decision**: pas de nouveau paquet. Le cœur de la file va dans `packages/domain` (déjà le lieu de la logique partagée, avec export par sous-chemin), les adaptateurs dans chaque app, le contrat dans `packages/api`.

## Phases de livraison

**J1 — Serveur + Android (2.4.0)**
1. *Spike Clerk hors-ligne* (R1) : avant tout code, vérifier sur appareil qu'un démarrage à froid en mode avion atteint l'écran des listes.
2. Schéma `lwwAt` + procédures rejouables + tests de routeur. Rétrocompatible, déployable seul : **PR 1, merge et déploiement web avant la suite**.
3. Cœur de la file dans `packages/domain` + tests.
4. Android : persistance du cache, adaptateurs, branchement des mutations de courses et de cochage de tâches, bandeau d'état, purge à la déconnexion.

**J2 — Web (2.5.0)**
5. Persistance IndexedDB et file côté web, mêmes règles.
6. Coquille hors-ligne par service worker, page `/offline`, refonte de la page tâches pour lire via tRPC au lieu des props serveur.

## Risques

| # | Risque | Parade |
|---|---|---|
| R1 | `ClerkProvider` peut bloquer au démarrage à froid sans réseau. `useMeValidation` tolère déjà l'échec réseau (seul `UNAUTHORIZED` déconnecte) mais Clerk n'est pas vérifié. | Spike en tâche 0 ; si bloquant, ne pas attendre Clerk pour afficher l'écran quand un jeton API est déjà en stockage. |
| R2 | Horloge du téléphone décalée : fausse la règle « le plus récent gagne ». | Le serveur borne `clientAt` à l'heure serveur. `shortcut: pas de mesure du décalage, à ajouter si un conflit absurde est signalé.` |
| R3 | Service worker et middleware Clerk du web (`proxy.ts`) : une navigation hors-ligne vers `/dashboard/**` échoue. | Route `/offline` publique et précachée, sans donnée serveur ; les données viennent uniquement du stockage local. |
| R4 | Données persistées lisibles après déconnexion sur un appareil partagé. | Purge complète (cache, file, caches du service worker) dans `signOut`. |
| R5 | Anciennes versions de l'app déjà publiées appellent `toggle` et `create` sans `clientAt`. | Procédures conservées ; sans `clientAt`, le serveur utilise l'heure courante. |

## Complexity Tracking

| Écart | Pourquoi nécessaire | Alternative plus simple écartée parce que |
|---|---|---|
| File d'envoi maison au lieu des mutations en pause de TanStack Query | Le widget `004` s'exécute hors de l'arbre React et doit pouvoir lire et vider la même file ; il faut aussi un état « refusé » visible et un ordre garanti. | Les mutations persistées de TanStack exigent un `mutationFn` enregistré par clé pour chaque mutation et vivent dans le `QueryClient` : inutilisables sans React, et les échecs ne sont pas conservés. |
| Colonne `lwwAt` sur `ShoppingItem` et `Action` | `updatedAt` est réécrit à chaque écriture : un envoi tardif d'une opération ancienne ferait gagner à tort le mauvais auteur (voir research.md, R-03). | Comparer avec `updatedAt` : correct dans le cas simple mais faux dès que deux appareils se synchronisent dans le désordre. |
| Service worker avec coquille hors-ligne (web) | Sans lui, un rechargement hors-ligne d'une page rendue côté serveur échoue. | Mettre en cache le HTML des pages : stockerait des données personnelles dans un cache navigateur. |
