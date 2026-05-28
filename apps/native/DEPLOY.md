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

1. **Identifiants** → **Créer** → **ID client OAuth** → **Android**
2. Package : `com.todolist`
3. SHA-1 : certificat de signature du build EAS :

```bash
cd apps/native
eas credentials -p android
```

(Copier le SHA-1 **upload key** / release utilisé par EAS.)

4. Garder le client **Web** pour `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (pas l’ID Android).

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

SHA-1 du **même** keystore EAS (`eas credentials -p android`) → client OAuth Android, package `com.todolist`.

## 6. iOS (TestFlight)

1. `ios.bundleIdentifier` dans `app.json`
2. Client OAuth **iOS** dans Google Cloud
3. `eas build --platform ios --profile production`
4. App Store Connect → TestFlight

## 7. Test partage avec ta compagne

1. Elle installe l’APK / lien Play interne
2. Connexion Google (compte dans **utilisateurs de test** OAuth si app en mode Test)
3. Toi : partager une liste avec **son email Gmail exact**
4. Notifications : **Activer les notifications** sur une liste partagée (les deux)

## Dépannage

| Problème | Piste |
|----------|--------|
| **Install dependencies** failed | Monorepo : `eas.json` avec `node` 22 + `corepack: true`, script `eas-build-pre-install`. `.git` à la racine du monorepo. |
| `installCommand is not allowed` | Retiré de `eas.json` (schéma EAS récent) — utiliser corepack + `packageManager` racine. |
| `No environment variables` pour preview | `eas env:create --environment preview` (pas seulement `.env` local). |
| Google Sign-In échoue sur l’APK | SHA-1 Android + package `com.todolist` |
| API / réseau | `EXPO_PUBLIC_API_URL` sans slash final |
| `EXPO_PUBLIC_EAS_PROJECT_ID manquant` | Secret EAS ou `.env` avant build |
