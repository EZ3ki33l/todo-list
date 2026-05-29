# Todo List

Monorepo **todo-lists + courses** : app mobile Expo, dashboard Next.js, API tRPC, base PostgreSQL (Neon).

## Stack

| Couche | Techno |
|--------|--------|
| Mobile | Expo SDK 55, React Native, tRPC |
| Web | Next.js 16, Auth.js, tRPC |
| API | tRPC v11, `@repo/api` |
| DB | Prisma 7, Neon (`db push`) |
| Monorepo | pnpm workspaces, Turborepo |

## Prérequis

- **Node.js 22** (voir `.nvmrc`) — Prisma 7 ne supporte pas Node 26 en prod
- **pnpm 11.4** (`corepack enable` puis `corepack prepare pnpm@11.4.0 --activate`)
- Compte **Neon** + variables OAuth Google (web + mobile)

## Structure

```text
apps/
  native/     Expo (Android / iOS)
  web/        Next.js (dashboard + auth)
packages/
  api/        Router tRPC partagé
  db/         Prisma schema + client
  ui/         Composants RN partagés (web + native)
deploy/todolist/   Docker + doc serveur Debian
```

## Démarrage local

```bash
pnpm install
```

### Base de données

Créer `packages/db/.env` avec `DATABASE_URL` (Neon), puis :

```bash
pnpm --filter @repo/db db:push
```

### Web

Créer `apps/web/.env` (`DATABASE_URL`, `AUTH_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL=http://localhost:3000`).

```bash
pnpm --filter web dev
```

→ [http://localhost:3000](http://localhost:3000)

### Native

Configurer `apps/native/.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, …). Voir [apps/native/DEPLOY.md](apps/native/DEPLOY.md) pour EAS et Google Android.

```bash
pnpm --filter native dev
```

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance tous les apps en dev (turbo) |
| `pnpm --filter web build` | Build production Next.js |
| `pnpm --filter @repo/db db:push` | Sync schéma Prisma → Neon |
| `pnpm --filter @repo/db db:studio` | Prisma Studio |
| `pnpm --filter @repo/api typecheck` | Vérif TypeScript API |
| `pnpm docker:build` | Test image Docker web en local |

## Déploiement

- **Serveur web (Debian + Docker)** : [deploy/todolist/README.md](deploy/todolist/README.md)
- **App Android (EAS)** : [apps/native/DEPLOY.md](apps/native/DEPLOY.md)

Prod web : `https://todolist.ez3ki33l.ovh`

## Notes

- Pas de `prisma migrate deploy` : workflow **`db push`** uniquement.
- Le client Prisma est généré dans `packages/db/src/generated/` au `postinstall`.
- Native : ne pas monter `react-native-worklets` sans vérifier la compat Expo SDK 55.
