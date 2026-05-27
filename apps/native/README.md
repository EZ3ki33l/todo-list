# Native

A [react-native](https://reactnative.dev/) app built using [expo](https://docs.expo.dev/)

## Notifications push (listes de courses partagées)

1. `pnpm install` à la racine du monorepo
2. Créer un projet EAS si besoin : `npx eas init` (dans `apps/native`)
3. Ajouter dans `apps/native/.env` : `EXPO_PUBLIC_EAS_PROJECT_ID=<uuid du projet EAS>`
4. `pnpm prisma db push` (table `PushToken`)
5. Rebuild natif : `npx expo prebuild --platform android` puis `pnpm android`

Les notifications partagées nécessitent un build natif (pas Expo Go). Chaque utilisateur (propriétaire ou membre) doit appuyer sur **Activer les notifications** sur une liste partagée. Les ajouts rapides sont regroupés en **une seule notification** ~45 s après le dernier article.
