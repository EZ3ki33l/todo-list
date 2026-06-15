# App native — beta (EAS + Clerk + API prod)

Prérequis : backend en prod (`https://todolist.ez3ki33l.ovh`), Clerk configuré (web + mobile).

## 1. Compte et projet EAS

```bash
cd apps/native
npx eas-cli login
npx eas init
```

`eas init` ajoute `extra.eas.projectId` dans `app.json` — commit ce changement.

## 2. Clerk

Application Clerk : `app_3FAwyTNQFE1SCPrhIapjbSoal5o`

1. [Clerk Dashboard](https://dashboard.clerk.com/) → ton application → **User & authentication**
2. Récupérer la **Publishable key** (`pk_test_…` ou `pk_live_…`)
3. **SSO connections** → **Google** activé avec **Use custom credentials** (obligatoire pour le natif mobile)
4. **Native applications** → Android :
   - Package : `com.ez3ki33l.todolist`
   - SHA-256 debug : `97:F9:A0:84:82:8A:28:09:E4:EF:D3:B6:D5:6E:B1:C2:9F:16:F5:1B:89:CE:8F:15:E1:30:1D:CB:3E:43:96:B3`
   - (Release : `npx eas credentials -p android` pour l’empreinte du keystore EAS)
5. **Google Cloud** → client OAuth **Android** avec le même package + SHA-256 (sinon `DEVELOPER_ERROR` au sign-in natif). Le client **Web** reste celui configuré dans Clerk SSO.

Côté serveur (web + API), la même app Clerk doit exposer `CLERK_SECRET_KEY` et `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (voir `apps/web/env.example`). En dev local, `CLERK_SECRET_KEY` dans `apps/web/.env` doit correspondre à la même instance que `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` du mobile.

## 3. Variables d’environnement (build)

Les `EXPO_PUBLIC_*` sont **figées au build**. Modèle : `env.example`.

### Build cloud (recommandé)

```bash
cd apps/native
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_test_..."
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

(Répéter pour `production` avant un build Play Store.)

### Dev local (`pnpm android`)

```bash
cp env.example .env
```

- **API prod** : laisser `EXPO_PUBLIC_API_URL=https://todolist.ez3ki33l.ovh`
- **API locale** : `EXPO_PUBLIC_API_URL=http://VOTRE_IP_LAN:3000` + `pnpm --filter web dev`
- Après toute modification de `.env` : `npx expo start -c` ou relancer `pnpm android`

Erreur réseau après connexion = session Clerk OK, mais l’API injoignable (serveur local arrêté, mauvaise IP, ou Metro pas redémarré).

## 4. Premier build Android (test interne)

```bash
cd apps/native
eas build --platform android --profile preview
```

Lien de téléchargement sur [expo.dev](https://expo.dev) → installer sur les téléphones des testeurs.

## 5. Play Store — tests internes (beta)

### Variables EAS **production**

```bash
cd apps/native
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
npx eas-cli env:create --environment production --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

### Build AAB

```bash
npx eas-cli build --platform android --profile production
```

## 6. Notifications push Android (Firebase / FCM)

Sans Firebase, `getExpoPushTokenAsync` échoue avec `FirebaseApp is not initialized`.

### A. Projet Firebase + `google-services.json`

1. [Firebase Console](https://console.firebase.google.com/) → créer ou ouvrir un projet
2. **Ajouter une app Android** — package : `com.ez3ki33l.todolist`
3. Télécharger **`google-services.json`** → `apps/native/android/app/google-services.json`
4. **Rebuild obligatoire** : `pnpm android` ou build EAS

### B. Clé FCM V1 sur EAS

```bash
cd apps/native
npx eas-cli credentials -p android
```

→ **Google Service Account Key for FCM V1** → uploader le JSON du compte de service Firebase

### C. Build EAS si `google-services.json` n’est pas dans git

```bash
npx eas-cli env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./android/app/google-services.json
```

### D. Vérification

1. Ouvrir l’app → cloche → **Réglages** → activer **Notifications push**
2. Sur une liste partagée, activer aussi la carte **Notifications** si proposée
3. **Les deux téléphones** doivent activer les notifications chacun de leur côté

## 7. Test partage

1. Installer l’APK / lien Play interne
2. Connexion via Clerk (e-mail / mot de passe)
3. Partager une liste avec **l’email exact** du compte invité
4. Activer les notifications sur les listes partagées

## Workflow natif (android/ versionné)

Après modification de `app.json` ou d’un plugin Expo :

```bash
cd apps/native
npx expo prebuild --platform android
```

## Dépannage

| Problème | Piste |
|----------|--------|
| Connexion échoue | Vérifier `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (EAS + `.env`) |
| Réseau après connexion | `EXPO_PUBLIC_API_URL`, serveur local, `expo start -c` |
| `EXPO_PUBLIC_EAS_PROJECT_ID manquant` | Secret EAS ou `.env` avant build |
| `FirebaseApp is not initialized` | `google-services.json` + rebuild + clé FCM V1 sur EAS |
| Install dependencies failed (`DATABASE_URL`) | `eas.json` définit une `DATABASE_URL` factice pour le build |
