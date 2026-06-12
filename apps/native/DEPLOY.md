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
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "782595741716-6ebvh8k73pbeta3hpcqapq4jj7lrtk6d.apps.googleusercontent.com"
# Client Web Firebase (6ebvh8…), pas l’ancien NextAuth (7t6oc4…)
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

(Répéter pour `production` avant un build Play Store.)

### Dev local (`pnpm android`)

```bash
cp env.example .env
```

- **API prod** : laisser `EXPO_PUBLIC_API_URL=https://todolist.ez3ki33l.ovh`
- **API locale** (nouvelles routes non déployées) : `EXPO_PUBLIC_API_URL=http://VOTRE_IP_LAN:3000` + `pnpm --filter web dev` dans un autre terminal
- Après toute modification de `.env` : `npx expo start -c` ou relancer `pnpm android`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = client **Web Firebase** `6ebvh8…` (pas l’ancien client NextAuth `7t6oc4…`)

Erreur `[Google Sign-In API] Network request failed` = Google OK, mais l’API injoignable (serveur local arrêté, mauvaise IP, ou Metro pas redémarré).

### Build local EAS

```bash
cp env.example .env
# éditer .env
eas build --platform android --profile preview --local
```

## 3. Google Cloud — client Android

> **Erreur `DEVELOPER_ERROR` sur le téléphone** = le client **Android** est absent ou mal configuré.
> La capture d’écran du client **Web** (origines JavaScript / redirect URI) ne suffit pas.

### Client Web (déjà OK si le site fonctionne)

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = client **Web Firebase** (`client_type: 3` dans `google-services.json`, pas le client Android)
- **Ne pas** mettre l’ID du client Android ici.

### Client Android (obligatoire pour l’app native)

1. Google Cloud → **API et services** → **Identifiants** → **Créer** → **ID client OAuth** → **Android**
2. **Nom du package** : `com.ez3ki33l.todolist` (pas `com.todolist`)
3. **Vérification sans build** (local ou CI) :

```bash
cd apps/native
pnpm test:oauth      # batterie Vitest (12+ cas)
pnpm check:google-oauth   # même règles, sortie CLI (hook EAS)
```

4. **Empreinte SHA-1** : chaque mode d’installation utilise un certificat **différent** — tous doivent figurer dans Firebase → `google-services.json` :

| Build | SHA-1 | Où le trouver |
|-------|-------|----------------|
| `pnpm android` (debug) | `54:40:61:09:64:FF:CD:14:BB:6F:99:22:01:C8:4B:B7:F0:E2:18:E1` | voir commande ci‑dessous |
| EAS preview (APK direct) | `9A:29:56:1B:3D:53:35:8F:91:1B:93:46:0D:43:11:A2:E7:9A:0F:28` | `eas credentials -p android` (upload key) |
| **Play Store** (test interne / prod) | `63:B7:1F:21:26:78:AC:54:78:AF:14:50:9F:C1:C4:CB:AF:F5:79:18` | Play Console → Intégrité → **Certificat de signature d’app** |
| Play legacy | `07:23:BE:39:85:4F:1F:CE:71:96:88:89:29:FB:34:F2:CE:FF:C0:45` | Play Console → Intégrité → certificat legacy (si affiché) |
| Partage interne Play (IAS) | `A7:5D:04:91:…` et `B1:AF:3A:0B:…` | `pnpm inspect:device-oauth` sur l’APK installé |

SHA-1 debug (Java 26 : `keytool -list -v` peut planter — utiliser openssl) :

```bash
keytool -exportcert -alias androiddebugkey \
  -keystore android/app/debug.keystore -storepass android \
| openssl x509 -fingerprint -sha1 -noout
```

5. **Diagnostic sur appareil** (gratuit, sans config-doctor payant) :

```bash
cd apps/native
pnpm inspect:device-oauth   # téléphone USB + adb
```

Compare le SHA-1 réel de l’APK installé avec les clients dans `google-services.json`. Si ❌ « AUCUN client OAuth », ajouter le SHA dans Firebase → retélécharger `google-services.json` → commit (attendre 5–30 min, pas de rebuild obligatoire pour Play).

6. **Préférer la piste test interne** Play au **partage interne d’apps (IAS)** : l’IAS re-signe avec des clés Google distinctes (`A7:5D…`, `B1:AF…`), source fréquente de `DEVELOPER_ERROR` (code 10).

7. Enregistrer, attendre **5–30 min** (propagation Google), puis réessayer.

### Vérification rapide

```bash
cd apps/native
pnpm check:google-oauth
```

- [ ] Client **Android** existe, package `com.ez3ki33l.todolist`
- [ ] SHA-1 **debug**, **EAS** et **Play** présents dans `google-services.json`
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = client **Web Firebase** (`client_type: 3` dans `google-services.json`, actuellement `6ebvh8…`)
- [ ] `app.json` + `AndroidManifest.xml` : schéma `com.googleusercontent.apps.<WEB_CLIENT_ID>` identique au client Web ci-dessus

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

1. Ouvrir l’app → cloche → **Réglages** → activer **Notifications push** (obligatoire — pas d’alerte système sans cet opt-in)
2. Sur une liste partagée, activer aussi la carte **Notifications** si proposée
3. Le switch reste activé sans erreur Firebase
4. Le backend enregistre le token (`notifications.registerPushToken`)
5. **Les deux téléphones** (vous + votre compagne) doivent activer les notifications chacun de leur côté

**Alertes disponibles sur mobile :**
- Partage d’une liste (courses ou tâches)
- Articles ajoutés sur une liste courses partagée (~45 s après le dernier ajout)

Sans clé **FCM V1** sur EAS (`eas credentials -p android`), les tokens s’enregistrent mais Expo ne délivre pas les push.

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
| `DEVELOPER_ERROR` (code 10) | `pnpm inspect:device-oauth` → SHA de l’APK installé absent de Firebase. Souvent IAS au lieu de test interne. |
| Google OK puis `Network request failed` | API injoignable : `EXPO_PUBLIC_API_URL`, serveur local (`pnpm --filter web dev`), redémarrer Metro (`expo start -c`) |
| Google Sign-In échoue sur l’APK | SHA-1 Android + package `com.ez3ki33l.todolist` |
| API / réseau | `EXPO_PUBLIC_API_URL` sans slash final |
| `EXPO_PUBLIC_EAS_PROJECT_ID manquant` | Secret EAS ou `.env` avant build |
| `FirebaseApp is not initialized` / FCM | `google-services.json` dans `android/app/` + rebuild. Clé FCM V1 sur EAS pour l’envoi. Voir §6.5. |
