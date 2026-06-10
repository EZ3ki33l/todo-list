# App native — beta (EAS + Google + API prod)

Prérequis : backend en prod (`https://todolist.ez3ki33l.ovh`), OAuth web OK.

## 1. Compte et projet EAS

```bash
cd apps/native
npx eas-cli login
npx eas init
```

`eas init` ajoute `extra.eas.projectId` dans `app.json` — commit ce changement.

## 2. Variables d’environnement (build)

Les `EXPO_PUBLIC_*` sont **figées au build**. Modèle : `env.example`.

### Build cloud (recommandé)

Variables pour l’environnement **preview** (sinon le build part sans API URL) :

```bash
cd apps/native
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "TON_CLIENT_WEB.apps.googleusercontent.com"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

(Répéter pour `production` avant un build Play Store.)

### Build local

```bash
cp env.example .env
# éditer .env
eas build --platform android --profile preview --local
```

## 3. Google Cloud — client Android

> **Erreur `DEVELOPER_ERROR` sur le téléphone** = le client **Android** est absent ou mal configuré.
> La capture d’écran du client **Web** (origines JavaScript / redirect URI) ne suffit pas.

### Client Web (déjà OK si le site fonctionne)

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = ID du client **Application Web** (ex. `782595741716-7t6o….apps.googleusercontent.com`)
- **Ne pas** mettre l’ID du client Android ici.

### Client Android (obligatoire pour l’app native)

1. Google Cloud → **API et services** → **Identifiants** → **Créer** → **ID client OAuth** → **Android**
2. **Nom du package** : `com.ez3ki33l.todolist` (pas `com.todolist`)
3. **Empreinte SHA-1** : en ajouter **deux** sur le même client (ou créer deux clients si tu préfères) :

| Build | SHA-1 | Où le trouver |
|-------|-------|----------------|
| `pnpm android` (debug local) | `54:40:61:09:64:FF:CD:14:BB:6F:99:22:01:C8:4B:B7:F0:E2:18:E1` | `apps/native/.env` → `GOOGLE_SHA1_DEBUG` |
| EAS / Play Store | `9A:29:56:1B:3D:53:35:8F:91:1B:93:46:0D:43:11:A2:E7:9A:0F:28` | `eas credentials -p android` ou `GOOGLE_SHA1_EAS` |

4. Enregistrer, attendre **2–5 min** (propagation Google), puis **réinstaller** l’APK (`pnpm android`).

### Vérification rapide

- [ ] Client **Android** existe, package `com.ez3ki33l.todolist`
- [ ] SHA-1 **debug** présent (sinon `pnpm android` → `DEVELOPER_ERROR`)
- [ ] SHA-1 **EAS** présent (sinon APK/AAB cloud → `DEVELOPER_ERROR`)
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = client **Web** uniquement

## 4. Premier build Android (test interne)

APK installable sans Play Store :

```bash
cd apps/native
eas build --platform android --profile preview
```

Lien de téléchargement sur [expo.dev](https://expo.dev) → installer sur les téléphones des testeurs.

## 5. Play Store — tests internes (beta)

### 5.1 Variables EAS **production**

Mêmes valeurs que preview, environnement `production` :

```bash
cd apps/native
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "TON_CLIENT_WEB.apps.googleusercontent.com"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

(Type **Plain text** pour les trois.)

### 5.2 Build AAB

```bash
npx eas-cli build --platform android --profile production
```

Keystore : **non** (réutilise celui déjà créé → `n`).

→ télécharger le `.aab` sur expo.dev ou :

```bash
npx eas-cli submit --platform android --profile production
```

(après liaison Play Console / clé de service)

### 5.3 Google Play Console

1. [play.google.com/console](https://play.google.com/console) — compte développeur (~25 € une fois)
2. **Créer une application** → nom « Todo List » (ou autre)
3. **Tests** → **Tests internes** → **Créer une version**
4. Uploader le `.aab` (ou via `eas submit`)
5. Renseigner au minimum : fiche store minimale, politique de confidentialité (URL de ton site si besoin), questionnaire contenu
6. **Testeurs** → liste d’emails (ta compagne + toi) → copier le **lien d’adhésion**
7. Publier la version sur la piste **Tests internes** (pas la prod publique)

### 5.4 Google OAuth Android

SHA-1 du **même** keystore EAS (`eas credentials -p android`) → client OAuth Android, package `com.ez3ki33l.todolist`.

## 6. iOS (TestFlight)

1. `ios.bundleIdentifier` dans `app.json`
2. Client OAuth **iOS** dans Google Cloud
3. `eas build --platform ios --profile production`
4. App Store Connect → TestFlight

## 6.5 Notifications push Android (Firebase / FCM)

Sans Firebase, `getExpoPushTokenAsync` échoue avec `FirebaseApp is not initialized`.

### A. Projet Firebase + `google-services.json`

1. [Firebase Console](https://console.firebase.google.com/) → créer ou ouvrir un projet
2. **Ajouter une app Android** :
   - Package : `com.ez3ki33l.todolist` (identique à `android/app/build.gradle`)
   - Pas besoin de SHA-1 pour FCM (le SHA-1 Google OAuth reste séparé)
3. Télécharger **`google-services.json`**
4. Le placer ici :

```
apps/native/android/app/google-services.json
```

(`app.json` pointe déjà vers ce chemin via `android.googleServicesFile`.)

5. **Rebuild obligatoire** (le fichier natif n’est pas lu par Metro seul) :

```bash
cd apps/native
pnpm android
# ou build EAS preview/production
```

### B. Clé FCM V1 sur EAS (build cloud + envoi des notifs)

Pour que **Expo** puisse délivrer les push vers tes téléphones :

```bash
cd apps/native
npx eas-cli credentials -p android
```

→ **Google Service Account Key for FCM V1** → uploader le JSON du compte de service Firebase  
(Guide : [FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/))

Firebase → ⚙️ Paramètres du projet → **Comptes de service** → **Générer une nouvelle clé privée**.

### C. Build EAS si `google-services.json` n’est pas dans git

```bash
cd apps/native
npx eas-cli env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./android/app/google-services.json
```

Répéter pour `production`. Ou committer `google-services.json` (identifiants publics Firebase — acceptable pour un projet perso).

### D. Vérification

1. Ouvrir l’app → cloche → **Réglages** → activer **Notifications push**
2. Le switch reste activé sans erreur Firebase
3. Le backend enregistre le token (`notifications.registerPushToken`)

## 7. Test partage avec ta compagne

1. Elle installe l’APK / lien Play interne
2. Connexion Google (compte dans **utilisateurs de test** OAuth si app en mode Test)
3. Toi : partager une liste avec **son email Gmail exact**
4. Notifications : **Activer les notifications** sur une liste partagée (les deux)

## Workflow natif (android/ versionné)

Le dossier `apps/native/android` est **commité** (pas de CNG pur). EAS ne resynchronise pas automatiquement `app.json` (plugins, icône, intentFilters Google, etc.) vers le natif.

Après modification de `app.json` ou d’un plugin Expo :

```bash
cd apps/native
npx expo prebuild --platform android
```

Puis vérifier / committer les changements sous `android/` si besoin.

## Dépannage

| Problème | Piste |
|----------|--------|
| **Install dependencies** failed (`DATABASE_URL`) | `prisma generate` au postinstall de `@repo/db` : `eas.json` définit une `DATABASE_URL` factice (voir profils preview/production). |
| **Install dependencies** failed (autre) | Monorepo : `eas.json` avec `node` 22 + `pnpm` 11.4. Lancer `eas build` depuis `apps/native`. |
| `installCommand is not allowed` | Retiré de `eas.json` (schéma EAS récent) — utiliser corepack + `packageManager` racine. |
| `No environment variables` pour preview | `eas env:create --environment preview` (pas seulement `.env` local). |
| Crash `prototype` of undefined après connexion | Souvent `Intl.RelativeTimeFormat` au top-level (`format-activity-time.ts`) — initialisation paresseuse + repli. Aussi : pas de `react-native-draggable-flatlist` en import statique des routes → `@/lib/lazy-draggable-flatlist`. |
| Google Sign-In échoue sur l’APK | SHA-1 Android + package `com.ez3ki33l.todolist` |
| API / réseau | `EXPO_PUBLIC_API_URL` sans slash final |
| `EXPO_PUBLIC_EAS_PROJECT_ID manquant` | Secret EAS ou `.env` avant build |
| `FirebaseApp is not initialized` / FCM | `google-services.json` dans `android/app/` + rebuild. Clé FCM V1 sur EAS pour l’envoi. Voir §6.5. |
