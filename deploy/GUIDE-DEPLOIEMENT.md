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

### 2.2 Compléter `.env` (Clerk obligatoire depuis v2.0.0)

Éditer **`/srv/docker/todolist/.env`** (pas `apps/web/.env`) — modèle : [deploy/todolist/.env.example](todolist/.env.example).

Variables **obligatoires** :

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...

# Clerk — dashboard.clerk.com → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` doit être dans ce `.env` **avant** `docker compose build` (inlinée au build Next.js).

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

### 2.4 Clerk (dashboard)

Dans [Clerk Dashboard](https://dashboard.clerk.com/) → **API Keys** : copier la publishable key et la secret key dans `/srv/docker/todolist/.env`, puis **rebuild** (voir §2.3).

---

## 3. App native — build Expo (test)

### 3.1 Prérequis

```bash
cd apps/native
npx eas-cli login
```

### 3.2 Variables EAS (preview = APK test)

```bash
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://your-api.example.com"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_test_..."
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-eas-project-id"
```

(Clé Clerk : dashboard Clerk → API Keys.)

### 3.3 Build APK (testeurs)

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
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://your-api.example.com"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
npx eas-cli env:create --environment production --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-eas-project-id"
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
| `Missing publishableKey` (Clerk) | Ajouter `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` dans `/srv/docker/todolist/.env`, puis `docker compose build --no-cache && docker compose up -d` |
| `clerkMiddleware` / `auth()` | Souvent conséquence de l’absence de clés Clerk — corriger le `.env` ci-dessus |
| Connexion Clerk échoue | Vérifier clés Clerk (web + native) |
| Réglages notifs « chargement » | `db:push` + redémarrer Docker |
| Build EAS échoue install | `git pull main`, Node 22, voir [apps/native/DEPLOY.md](../apps/native/DEPLOY.md) |

Docs détaillées : [deploy/todolist/README.md](todolist/README.md) · [apps/native/DEPLOY.md](../apps/native/DEPLOY.md)
