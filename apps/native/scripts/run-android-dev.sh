#!/usr/bin/env bash
set -euo pipefail

NATIVE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$NATIVE_DIR"

# Le projet est souvent sur /mnt/… et ~/.gradle sur le disque système : les hard links
# échouent et Gradle recopie libreactnative.so à chaque module natif (très lent).
# Placer le cache Gradle sur le même volume que le repo évite ces copies.
if [[ -z "${GRADLE_USER_HOME:-}" ]]; then
  export GRADLE_USER_HOME="$NATIVE_DIR/.gradle-user-home"
fi
mkdir -p "$GRADLE_USER_HOME"

# Une seule ABI en dev (voir android/gradle.properties).
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ORG_GRADLE_PROJECT_reactNativeArchitectures:-arm64-v8a}"

exec pnpm exec expo run:android --app-id com.ez3ki33l.todolist "$@"
