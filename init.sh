#!/usr/bin/env bash
set -euo pipefail

echo "[init.sh] Sembrando sustrato A para chagra..."

# Node deps
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "  → npm install"
  npm install 2>&1 | tail -3
else
  echo "  ✓ node_modules ya existe"
fi

# ESLint (fail-closed para leftthook)
if npx eslint --version >/dev/null 2>&1; then
  echo "  ✓ eslint ok ($(npx eslint --version))"
else
  echo "  ✗ eslint no disponible"
  exit 1
fi

echo "[init.sh] Sustrato A listo."
