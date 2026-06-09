#!/usr/bin/env bash
# Mise à jour de l'app sur le serveur Debian (/srv/docker/todolist).
# Usage (sur le serveur) :
#   cd /srv/docker/todolist && bash source/deploy/todolist/update.sh
# Ou depuis ce dossier après git pull :
#   ./update.sh [branche]
set -euo pipefail

BRANCH="${1:-main}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ ! -f "$ROOT/../docker-compose.yml" && -f "/srv/docker/todolist/docker-compose.yml" ]]; then
  cd /srv/docker/todolist
  ROOT="/srv/docker/todolist/source"
fi

if [[ -d "$ROOT/.git" ]]; then
  echo "→ git fetch + checkout $BRANCH"
  git -C "$ROOT" fetch origin
  git -C "$ROOT" checkout "$BRANCH"
  git -C "$ROOT" pull origin "$BRANCH"
else
  echo "Erreur: repo introuvable ($ROOT)" >&2
  exit 1
fi

COMPOSE_DIR="$(dirname "$ROOT")"
if [[ -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
  cd "$COMPOSE_DIR"
  echo "→ docker compose build"
  docker compose build
  echo "→ docker compose up -d"
  docker compose up -d
  echo "→ logs (dernières lignes)"
  docker compose logs --tail=20 web
  echo "→ healthcheck local"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || true
else
  echo "Erreur: docker-compose.yml introuvable dans $COMPOSE_DIR" >&2
  exit 1
fi

echo "✓ Déploiement terminé ($BRANCH)"
