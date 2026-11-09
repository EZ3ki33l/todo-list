# Todo List (EZ3) Constitution

Assistant du quotidien : listes de tâches et listes de courses, mobile Android (Expo) et web (Next.js), API tRPC partagée.

## Core Principles

### I. Logique métier partagée, jamais dupliquée
Les règles métier (récurrences, séries, quantités, catégories, droits d'accès) vivent dans `packages/domain` et `packages/api`. Les apps `native` et `web` ne font que les afficher. Une règle copiée dans les deux apps est un défaut à corriger.

### II. Les rôles de partage s'appliquent partout
Un `invité` est en lecture seule, un `membre` peut modifier, le `Propriétaire` gère la liste. Toute nouvelle voie d'écriture (file hors-ligne, widget, partage vers l'app) revérifie ce droit côté serveur. Le client n'est jamais la source de vérité des permissions.

### III. Validation aux frontières
Toute entrée serveur passe par un schéma zod (`packages/api/src/schemas.ts`). L'auth passe par Clerk ; les accès aux listes passent par `todo-list-access` et `shopping-list-access`.

### IV. Logique non triviale = test
Toute logique nouvelle (tri, fusion, file de synchronisation, analyse de texte) est couverte par un test vitest. L'UI pure n'en exige pas. `pnpm test`, le lint et le typecheck doivent passer avant une PR.

### V. Simplicité d'abord
Réutiliser l'existant (composants, hooks, `getPalette`, `trpc`) avant d'ajouter une dépendance ou une abstraction. Pas de fonctionnalité « pour plus tard ». Un raccourci assumé est marqué par un commentaire `shortcut:`.

### VI. Android d'abord, honnêteté sur le natif
La cible principale est Android via EAS. Une fonctionnalité qui exige un module natif (widget, intent de partage) est signalée comme telle dans son spec : elle demande un build de développement et ne se teste pas dans Expo Go.

## Contraintes du projet

- Interface en **français**, thème **Catppuccin** via `@repo/theme`.
- Stack : Expo SDK 55, Next.js 16, tRPC v11, Prisma 7 sur Neon, pnpm 11 + Turborepo, Node 22.
- Chaque jalon fonctionnel visible reçoit une entrée dans `CHANGELOG.md` (semver : MINOR = fonctionnalité, PATCH = correctif).

## Workflow de développement

- Jamais de commit direct sur `main` : une branche par chantier (`feat/…`), PR vers `main`, pas de merge sans demande explicite.
- Ordre des chantiers : `001` hors-ligne, `002` ordre par rayon, `003` partage vers l'app, `004` widget Android. Le `004` dépend du `001`.
- Un spec par chantier dans `specs/NNN-nom/`, puis plan, tâches, implémentation.

## Governance

Cette constitution prime sur les habitudes locales. Un amendement se fait par PR, avec la raison du changement. Toute PR vérifie la conformité aux principes I à VI ; une exception est justifiée par écrit dans le plan du chantier.

**Version**: 1.0.0 | **Ratified**: 2026-11-09 | **Last Amended**: 2026-11-09
