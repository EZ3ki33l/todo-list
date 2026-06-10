#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:-Feat/Notifications}"
BASE="${2:-main}"

echo "→ Push $BRANCH..."
git push -u origin "$BRANCH"

URL="https://github.com/EZ3ki33l/todo-list/compare/${BASE}...${BRANCH}?expand=1&title=feat(notifications)%3A%20cloche%2C%20pr%C3%A9f%C3%A9rences%2C%20SSE%2FWeb%20Push%20et%20perf%20tRPC"

echo ""
echo "→ Ouvre GitHub pour créer la PR (bouton vert « Create pull request ») :"
echo "$URL"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL"
fi
