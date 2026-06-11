# Guide déploiement v1.0 — serveur + Expo + Play Store

Ordre recommandé : **1. Base** → **2. Serveur web** → **3. APK test** → **4. Play Store**.

---

## 1. Base de données (Neon)

Nouvelles tables v1.0 : `ActivityEvent`, `NotificationPreferences`, `WebPushSubscription`.

**Depuis ton PC** (avec `packages/db/.env` ou `DATABASE_URL` prod) :

```bash
cd "/chemin/vers/todo list"
git checkout main && git pull
pnpm --filter @repo/db db:push
```

---

## 2. Serveur web (Debian + Docker)

### 2.1 Mettre à jour le code

```bash
ssh ton-serveur
cd /srv/docker/todolist/source
git pull origin main
```

### 2.2 Compléter `.env` (nouveau en v1.0)

Éditer `/srv/docker/todolist/.env` — modèle : [deploy/todolist/.env.example](todolist/.env.example).

Ajouter si absent :

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:r.rousset31@gmail.com
MISTRAL_API_KEY=...   # suggestions « Idées repas » (optionnel)
```

Générer les clés (PC) :

```bash
npx web-push generate-vapid-keys
```

### 2.3 Rebuild + redémarrage

```bash
cd /srv/docker/todolist
docker compose build
docker compose up -d
docker compose logs -f web
```

Vérifier :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
curl -sI "https://todolist.ez3ki33l.ovh/api/trpc" | head -3
```

### 2.4 Google Console (web)

Origines + redirections **prod** (déjà fait normalement) :

- `https://todolist.ez3ki33l.ovh`
- `https://todolist.ez3ki33l.ovh/api/auth/callback/google`
- `https://todolist.ez3ki33l.ovh/api/auth/mobile/callback`

---

## 3. App native — build Expo (test)

### 3.1 Prérequis

```bash
cd apps/native
npx eas-cli login
```

### 3.2 Variables EAS (preview = APK test)

```bash
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "TON_CLIENT_WEB.apps.googleusercontent.com"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

(Remplacer par ton vrai client Web Google — celui de `GOOGLE_CLIENT_ID` dans `apps/web/.env`.)

### 3.3 SHA-1 Android → Google Cloud

```bash
npx eas-cli credentials -p android
```

Copier le SHA-1 → Google Cloud → **ID client OAuth Android** → package `com.ez3ki33l.todolist`.

### 3.4 Build APK (testeurs)

```bash
cd apps/native
npx eas-cli build --platform android --profile preview
```

Télécharger l’APK sur [expo.dev](https://expo.dev) → installer sur le téléphone.

---

## 4. Play Store (tests internes)

### 4.1 Compte développeur

[play.google.com/console](https://play.google.com/console) — frais unique ~25 € si pas encore fait.

### 4.2 Variables EAS production

```bash
cd apps/native
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://todolist.ez3ki33l.ovh"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "TON_CLIENT_WEB.apps.googleusercontent.com"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_EAS_PROJECT_ID --value "7880f051-0127-48d4-a656-b19916a7e1f4"
```

### 4.3 Build AAB (Play Store)

```bash
npx eas-cli build --platform android --profile production
```

Keystore : répondre **non** si EAS propose d’en créer un nouveau (réutiliser l’existant).

### 4.4 Envoyer sur Play Console

**Option A — manuel** : télécharger le `.aab` sur expo.dev → Play Console → Tests internes → Créer version → upload.

**Option B — EAS Submit** (après config service account) :

```bash
npx eas-cli submit --platform android --profile production
```

### 4.5 Play Console — checklist minimale

- [ ] Créer l’app « Todo List »
- [ ] Tests → **Tests internes** → uploader le `.aab`
- [ ] Fiche store (description courte, icône 512×512, captures)
- [ ] Politique de confidentialité (URL du site suffit)
- [ ] Questionnaire contenu + classification
- [ ] Ajouter emails testeurs → publier la piste interne

---

## Récap des commandes (copier-coller)

```bash
# PC — DB
pnpm --filter @repo/db db:push

# Serveur
cd /srv/docker/todolist/source && git pull
cd /srv/docker/todolist && docker compose build && docker compose up -d

# Native — APK test
cd apps/native
npx eas-cli build --platform android --profile preview

# Native — Play Store
npx eas-cli build --platform android --profile production
```

---

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| Login Google web `redirect_uri_mismatch` | Ajouter `http://localhost:3000/...` **ou** `AUTH_URL` = URL réelle |
| Réglages notifs « chargement » | `db:push` + redémarrer Docker |
| Google Sign-In mobile échoue | SHA-1 EAS dans client OAuth **Android** |
| Build EAS échoue install | `git pull main`, Node 22, voir [apps/native/DEPLOY.md](../apps/native/DEPLOY.md) |

Docs détaillées : [deploy/todolist/README.md](todolist/README.md) · [apps/native/DEPLOY.md](../apps/native/DEPLOY.md)
