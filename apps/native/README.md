# Native

A [react-native](https://reactnative.dev/) app built using [expo](https://docs.expo.dev/)

## Notifications push (listes de courses partagées)

1. `pnpm install` à la racine du monorepo
2. Créer un projet EAS si besoin : `npx eas init` (dans `apps/native`)
3. Ajouter dans `apps/native/.env` : `EXPO_PUBLIC_EAS_PROJECT_ID=<uuid du projet EAS>`
4. **Firebase** : télécharger `google-services.json` (package `com.ez3ki33l.todolist`) → `android/app/google-services.json` (voir `google-services.json.example` et `DEPLOY.md` §6.5)
5. Clé **FCM V1** sur EAS : `npx eas credentials -p android`
6. Rebuild : `pnpm android` (ou build EAS)

Les notifications nécessitent un build natif (pas Expo Go). Chaque utilisateur active **Notifications push** dans la cloche → Réglages.
