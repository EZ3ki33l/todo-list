# Déploiement Todo List sur Debian

Backend **web seul** (Next.js + tRPC). La base reste sur **Neon**. Nginx sur l’hôte fait le HTTPS et le proxy.

## Arborescence sur le serveur

```text
/srv/docker/todolist/
├── docker-compose.yml    ← copié depuis ce dossier
├── .env                  ← secrets (jamais dans git)
└── source/               ← clone git du monorepo
    ├── apps/web/
    ├── deploy/todolist/Dockerfile
    └── …
```

---

## Étape 1 — Dossier sur le serveur

```bash
sudo mkdir -p /srv/docker/todolist
sudo chown "$USER:$USER" /srv/docker/todolist
cd /srv/docker/todolist
```

Copier `docker-compose.yml` depuis le repo (après push) :

```bash
cp deploy/todolist/docker-compose.yml /srv/docker/todolist/
nano /srv/docker/todolist/.env   # créer le fichier (voir étape 3)
```

---

## Étape 2 — Code source

```bash
cd /srv/docker/todolist
git clone <URL_DE_TON_REPO> source
cd source
git checkout main   # ou la branche à déployer
```

Le `docker-compose.yml` attend le repo dans `./source` (voir `context: ./source`).

---

## Étape 3 — Fichier `.env`

Créer `/srv/docker/todolist/.env` avec au minimum :

| Variable | Où la trouver |
|----------|----------------|
| `DATABASE_URL` | Dashboard Neon → Connection string |
| `JWT_SECRET` | Même valeur qu’en dev (ou `openssl rand -base64 32`) |
| `AUTH_SECRET` | Idem (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `AUTH_URL` | `https://todolist.ez3ki33l.ovh` (après HTTPS ; en test HTTP temporaire possible) |

**Schéma Neon** (après changement Prisma, depuis ton PC ou le serveur avec Node) :

```bash
cd source/packages/db
DATABASE_URL="..." pnpm db:push
```

(`prisma db push` — pas de fichiers migrate dans ce projet.)

---

## Tester le build Docker en local (avant le serveur)

Sur ta machine, à la racine du monorepo (Docker installé) :

```bash
pnpm docker:build
```

Même Dockerfile que sur le serveur. Si ça passe en local, `docker compose build` sur le Debian devrait passer aussi.

`pnpm --filter web build` seul **ne suffit pas** : il utilise ton `apps/web/.env`, alors que l’image Docker n’a pas de `.env` au moment du build.

---

## Étape 4 — Build et démarrage Docker

```bash
cd /srv/docker/todolist
docker compose build
docker compose up -d
docker compose logs -f web
```

Premier build : plusieurs minutes (install + `next build`).

Vérifier **sur le serveur** :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```

Tu dois obtenir `200` ou `307` (redirection), pas `000`.

---

## Étape 5 — Nginx (reverse proxy)

Configurer un `server` nginx qui proxy vers `http://127.0.0.1:3000`, avec `server_name todolist.ez3ki33l.ovh;`, puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test navigateur : `http://todolist.ez3ki33l.ovh` — la page d’accueil Next doit s’afficher (plus le 404 nginx par défaut).

---

## Étape 6 — HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d todolist.ez3ki33l.ovh
```

Mettre à jour `.env` si besoin :

```env
AUTH_URL=https://todolist.ez3ki33l.ovh
```

Puis redémarrer le conteneur :

```bash
cd /srv/docker/todolist
docker compose up -d
```

Test API mobile :

```bash
curl -sI "https://todolist.ez3ki33l.ovh/api/trpc" | head -5
```

---

## Étape 7 — App native (plus tard)

Dans le build EAS / `.env` native :

```env
EXPO_PUBLIC_API_URL=https://todolist.ez3ki33l.ovh
```

---

## Mettre à jour l’app

```bash
cd /srv/docker/todolist/source
git pull
cd ..
docker compose build
docker compose up -d
```

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| `curl 127.0.0.1:3000` → connection refused | Conteneur arrêté : `docker compose ps` / `logs` |
| 404 nginx | Proxy pas activé ou mauvais `server_name` |
| 502 Bad Gateway | App pas prête ou crash au démarrage : `docker compose logs web` |
| Erreur DB au login | `DATABASE_URL` incorrecte ou Neon inaccessible depuis le serveur |
