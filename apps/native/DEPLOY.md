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

```bash
cd apps/native
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "TON_CLIENT_WEB.apps.googleusercontent.com"
eas secret:create --scope project --name EXPO_PUBLIC_EAS_PROJECT_ID --value "UUID_EAS"
```

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

## 5. Play Store — tests internes (optionnel)

```bash
eas build --platform android --profile production
```

→ fichier `.aab` → Play Console → **Tests internes** → inviter par email Gmail.

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
| Google Sign-In échoue sur l’APK | SHA-1 Android + package `com.todolist` |
| API / réseau | `EXPO_PUBLIC_API_URL` sans slash final |
| `EXPO_PUBLIC_EAS_PROJECT_ID manquant` | Secret EAS ou `.env` avant build |
