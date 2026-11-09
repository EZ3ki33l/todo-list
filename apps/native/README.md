# Native

A [react-native](https://reactnative.dev/) app built using [expo](https://docs.expo.dev/)

## Build Android local (perf)

Le repo est souvent sur `/mnt/SSDMedias` alors que `~/.gradle` est sur le disque système. Gradle ne peut pas faire de hard links entre les deux volumes et recopie `libreactnative.so` pour chaque module natif — d’où les centaines de lignes `Hard link … failed. Doing a slower copy instead.` et des builds longs.

**Commande recommandée en dev :**

```bash
cd apps/native
pnpm android:dev
```

Ce script place le cache Gradle dans `apps/native/.gradle-user-home/` (même volume que le projet) et force une seule ABI (`arm64-v8a`).

| Symptôme | Cause | Action |
|---|---|---|
| `Hard link … failed` | Projet et cache Gradle sur des disques différents | `pnpm android:dev` ou `export GRADLE_USER_HOME=…` sur le SSD |
| Build CMake pour `arm64-v8a` **et** `armeabi-v7a` | ABI non filtrée sur certains modules | `abiFilters` dans `android/app/build.gradle` + `reactNativeArchitectures=arm64-v8a` |
| `google-services.json absent` | Push FCM non configuré en local | Normal en dev ; voir DEPLOY.md §6.5 pour activer les notifs |
| `CXX5304` SDK XML version | Outils Android Studio vs CLI désalignés | `sdkmanager --update` ou mettre à jour le SDK via Android Studio |
| Warnings C++ `nodiscard` dans expo-modules-core | Upstream Expo/RN | Sans impact, ignorables |
| `Deprecated Gradle features` | Plugins Expo/RN | Sans impact tant que Gradle 9 fonctionne |
| Réinstall pnpm complète (~50 s) | `node_modules` invalidé (changement de branche, store…) | Ponctuel ; ne pas relancer `pnpm install` inutilement |

Build release multi-ABI (Play Store) : `eas build` ou `./gradlew -PreactNativeArchitectures=armeabi-v7a,arm64-v8a assembleRelease`.

## Notifications push (listes de courses partagées)

1. `pnpm install` à la racine du monorepo
2. Créer un projet EAS si besoin : `npx eas init` (dans `apps/native`)
3. Ajouter dans `apps/native/.env` : `EXPO_PUBLIC_EAS_PROJECT_ID=<uuid du projet EAS>`
4. **Firebase** : télécharger `google-services.json` (package `com.ez3ki33l.todolist`) → `android/app/google-services.json` (voir `google-services.json.example` et `DEPLOY.md` §6.5)
5. Clé **FCM V1** sur EAS : `npx eas credentials -p android`
6. Rebuild : `pnpm android` (ou build EAS)

Les notifications nécessitent un build natif (pas Expo Go). Chaque utilisateur active **Notifications push** dans la cloche → Réglages.
