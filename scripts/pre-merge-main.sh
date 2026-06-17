#!/bin/bash
# pre-merge-main.sh — Comando unico de validacion pre-merge a main.
#
# Ejecuta smoke, contratos y boundary audit. No depende de archivos vetados.
# TAREA 164 + 171. Uso: bash scripts/pre-merge-main.sh

set -e

echo "=== Pre-merge validation ==="
echo ""

# Smoke de contratos reparados (117-131)
echo "[1/3] Smoke contratos..."
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/smoke-final-142.test.js \
  --reporter=verbose 2>&1 | tail -3

# Contratos de alias animales (134, 139, 148, 149)  
echo "[2/3] Contratos alias..."
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/animalAlias.test.js \
  tests/unit/animalSelectorContract.test.js \
  --reporter=verbose 2>&1 | tail -3

# Boundary audit (135, 147, 157)
echo "[3/3] Boundary audit..."
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/boundaryAudit.test.js \
  --reporter=verbose 2>&1 | tail -3

echo ""
echo "=== Pre-merge validation complete ==="
echo "Run: git merge origin/wip/autosave-integrate-opencode-69-116-alpha"
