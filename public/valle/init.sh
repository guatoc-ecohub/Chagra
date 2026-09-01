#!/usr/bin/env bash
# init.sh — Sensor computacional de valle (sustrato A del gate).
# Valida la integridad básica del proyecto antes de gatear.
# No hay tests ni build en valle; es un catálogo estático.
# Exit 0 si todo está ok, exit 1 si hay error.

set -uo pipefail

REPO="$(basename "$(pwd)")"
INIT_BASE_REF="${INIT_BASE_REF:-origin/dev}"

echo "[init.sh:$REPO] Iniciando validación del sustrato..."

# Verificar que existan los archivos de índice HTML principales
if [ ! -f "index.html" ]; then
  echo "[ERROR] No hay index.html en $REPO" >&2
  exit 1
fi

# Sintaxis de JS básica: node --check en los .js principales (no inyectar en minificados)
for js_file in *.js; do
  [ -f "$js_file" ] || continue
  # Skip archivos de respaldo
  [[ "$js_file" == *.bak* ]] && continue
  echo "[check] $js_file"
  node --check "$js_file" 2>&1 || {
    echo "[ERROR] Sintaxis JS inválida en $js_file" >&2
    exit 1
  }
done

echo "[init.sh:$REPO] ✓ Sustrato validado (archivos estáticos ok)"
exit 0
