#!/bin/bash
# deploy-prod.sh — Deploy de prod.chagra.app a alpha
#
# Uso: bash scripts/deploy-prod.sh
#
# El script:
#   1. Ejecuta build:prod (index-prod.html → main-prod.jsx → ProdChagraApp)
#   2. Verifica que dist-prod/ tenga index.html + assets/ + sw.js
#   3. Si hay una variable DEPLOY_HOST configurada, rsync a producción
#   4. Si no, copia local a /var/www/prod.chagra.app (modo local)
#
# Requiere: VITE_FARMOS_CLIENT_ID en .env o CI secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
DIST="$ROOT/dist-prod"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/prod.chagra.app}"

echo "=== Deploy prod.chagra.app ==="

# 1. Build
echo "[1/3] Building..."
cd "$ROOT"
npm run build:prod

# 2. Verify
echo "[2/3] Verifying dist-prod..."
if [ ! -f "$DIST/index.html" ]; then
  echo "ERROR: dist-prod/index.html not found. Build may have failed."
  exit 1
fi
if [ ! -f "$DIST/sw.js" ]; then
  echo "ERROR: dist-prod/sw.js not found."
  exit 1
fi
if [ ! -d "$DIST/assets" ]; then
  echo "ERROR: dist-prod/assets/ not found."
  exit 1
fi

SIZE=$(du -sh "$DIST" | cut -f1)
echo "  dist-prod size: $SIZE"
echo "  OK"

# 3. Deploy
echo "[3/3] Deploying..."
if [ -n "$DEPLOY_HOST" ]; then
  echo "  rsync → $DEPLOY_HOST:$DEPLOY_PATH"
  rsync -avz --delete "$DIST/" "$DEPLOY_HOST:$DEPLOY_PATH/"
else
  # Local deploy (dev mode)
  echo "  No DEPLOY_HOST set. Copying locally to $DEPLOY_PATH..."
  mkdir -p "$DEPLOY_PATH"
  rsync -a --delete "$DIST/" "$DEPLOY_PATH/"
fi

echo "=== Deploy complete ==="
echo "SHA: $(git rev-parse --short HEAD)"
echo "Time: $(date -Iseconds)"
