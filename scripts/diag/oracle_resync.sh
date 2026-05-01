#!/usr/bin/env bash
# oracle_resync.sh — sync /var/lib/oracle-lab/code/backend desde origin/main
# de chagra-pro. Workaround temporal para el caso en que el liveReloadPath NO
# es git repo (initialized via cp -r en el setup en lugar de git clone).
#
# Lo que hace:
#   1. Clone temporal --depth 1 de chagra-pro main
#   2. rsync de modules/oracle-lab/backend/static/ → liveReloadPath/backend/static/
#      (incluye VERSION.json + bundle Vite + iconos PNG nuevos)
#   3. rsync de modules/oracle-lab/backend/collectors/ → idem
#   4. chown -R oracle-lab:oracle-lab
#   5. systemctl restart oracle-lab
#   6. Imprime VERSION.json post-resync para verificar
#
# Uso (en alpha, requiere sudo):
#   cd ~/guatoc-nixos-stable && git pull && sudo bash scripts/diag/oracle_resync.sh
#
# TODO permanente: PR al módulo oracle-lab.nix que detecte si liveReloadPath/.git
# falta y haga git clone automático en el bootstrap. Hasta entonces, este script.
set -euo pipefail

LIVE_PATH="/var/lib/oracle-lab/code"
REPO_URL="https://github.com/guatoc-ecohub/chagra-pro.git"

if [ "${EUID}" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo (necesita rsync + chown + systemctl)" >&2
  exit 1
fi

if [ ! -d "$LIVE_PATH/backend" ]; then
  echo "ERROR: $LIVE_PATH/backend no existe — ¿oracle-lab está bootstrappeado?" >&2
  exit 2
fi

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
chown oracle-lab:oracle-lab $TMP

echo "→ git clone --depth 1 chagra-pro a $TMP"
sudo -u oracle-lab git clone --depth 1 "$REPO_URL" "$TMP" 2>&1 | tail -3

echo "→ rsync static (frontend bundle + VERSION.json + iconos)"
rsync -a --delete "$TMP/modules/oracle-lab/backend/static/" "$LIVE_PATH/backend/static/"

echo "→ rsync collectors (backend python — HA collector regex actualizado)"
rsync -a "$TMP/modules/oracle-lab/backend/collectors/" "$LIVE_PATH/backend/collectors/"

echo "→ chown oracle-lab:oracle-lab $LIVE_PATH/backend"
chown -R oracle-lab:oracle-lab "$LIVE_PATH/backend"

echo "→ systemctl restart oracle-lab"
systemctl restart oracle-lab
sleep 2

echo
echo "=== VERSION.json post-resync ==="
cat "$LIVE_PATH/backend/static/VERSION.json" | head -10

echo
echo "=== oracle-lab status ==="
systemctl is-active oracle-lab

echo
echo "✅ resync completo. Refresh navegador HYTA con Ctrl+Shift+R."
