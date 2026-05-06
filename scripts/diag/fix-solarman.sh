#!/usr/bin/env bash
# scripts/diag/fix-solarman.sh
# =============================================================================
# Aplica los 3 fixes precisos para el bug de inicializacion silenciosa de
# ha-solarman:
#
#  Fix 1: typo en .storage/core.config_entries
#         "deye_hybert.yaml" -> "deye_hybrid.yaml"
#
#  Fix 2: remover bloque solarman obsoleto de configuration.yaml
#         (el component solo soporta config entries via UI, no YAML)
#
#  Fix 3: bug _LOGGER no definido en custom_components/solarman/solarman.py
#         _LOGGER -> log (ya que la variable definida es
#         "log = logging.getLogger(__name__)")
#
# Uso (correr EN alpha como root):
#   sudo bash /tmp/fix-solarman.sh
#
# Para correr desde stg (pegar este one-liner en konsole):
#   ssh alpha 'sudo bash -s' < scripts/diag/fix-solarman.sh
# =============================================================================

set -euo pipefail

HA_DIR="/mnt/fast/appdata/homeassistant"
STORAGE_FILE="$HA_DIR/.storage/core.config_entries"
CONFIG_YAML="$HA_DIR/configuration.yaml"
SOLARMAN_PY="$HA_DIR/custom_components/solarman/solarman.py"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HA_DIR/.fix-solarman-backup-$TS"

echo "=== fix-solarman.sh @ $TS ==="
echo ""

# ─── Pre-flight ──────────────────────────────────────────────────────────────
[ -f "$STORAGE_FILE" ] || { echo "FAIL: $STORAGE_FILE no existe"; exit 1; }
[ -f "$CONFIG_YAML" ]  || { echo "FAIL: $CONFIG_YAML no existe"; exit 1; }
[ -f "$SOLARMAN_PY" ]  || { echo "FAIL: $SOLARMAN_PY no existe"; exit 1; }

mkdir -p "$BACKUP_DIR"
cp -p "$STORAGE_FILE" "$BACKUP_DIR/core.config_entries.bak"
cp -p "$CONFIG_YAML"  "$BACKUP_DIR/configuration.yaml.bak"
cp -p "$SOLARMAN_PY"  "$BACKUP_DIR/solarman.py.bak"
echo "✓ Backups en $BACKUP_DIR"
echo ""

# ─── Stop HA antes de tocar .storage/ ────────────────────────────────────────
echo "=== Stopping podman-homeassistant ==="
systemctl stop podman-homeassistant
sleep 2
echo ""

# ─── Fix 1: typo deye_hybert -> deye_hybrid en .storage/core.config_entries ─
echo "=== Fix 1: typo lookup_file en core.config_entries ==="
if grep -q '"lookup_file":"deye_hybert\.yaml"' "$STORAGE_FILE"; then
  sed -i 's/"lookup_file":"deye_hybert\.yaml"/"lookup_file":"deye_hybrid.yaml"/g' "$STORAGE_FILE"
  echo "✓ Reemplazado deye_hybert.yaml -> deye_hybrid.yaml"
elif grep -q '"lookup_file":"deye_hybrid\.yaml"' "$STORAGE_FILE"; then
  echo "⊘ Ya estaba correcto (deye_hybrid.yaml)"
else
  echo "⚠ No encontre lookup_file en config entry. Verificar manualmente:"
  echo "  grep -i lookup_file $STORAGE_FILE"
fi
echo ""

# ─── Fix 2: remover bloque YAML obsoleto de configuration.yaml ───────────────
echo "=== Fix 2: remover bloque YAML solarman en configuration.yaml ==="
if grep -q "^solarman:" "$CONFIG_YAML" || grep -q "Deye/Solarman Inverter" "$CONFIG_YAML"; then
  python3 - <<'PY' "$CONFIG_YAML"
import re, sys, pathlib
path = pathlib.Path(sys.argv[1])
text = path.read_text()
# Remove the "── Deye/Solarman Inverter ──" header and the solarman: block
# (until next top-level key or blank-line + non-indented line).
pattern = re.compile(
    r"\n*#\s*──\s*Deye/Solarman Inverter\s*──\s*\n"        # comment header (optional)
    r"(?:#.*\n)*"                                            # any leading comments
    r"solarman:\s*\n"                                        # solarman key
    r"(?:[ \t].*\n|\s*\n)*",                                 # indented body + blanks
    re.MULTILINE,
)
new = pattern.sub("\n", text)
# Fallback: remove a bare 'solarman:' block if header was different
if "solarman:" in new:
    pattern2 = re.compile(
        r"\n*solarman:\s*\n(?:[ \t].*\n|\s*\n)*",
        re.MULTILINE,
    )
    new = pattern2.sub("\n", new)
path.write_text(new)
print("✓ Bloque solarman removido")
PY
else
  echo "⊘ No habia bloque solarman en configuration.yaml"
fi
echo ""

# ─── Fix 3: _LOGGER -> log en custom_components/solarman/solarman.py ─────────
echo "=== Fix 3: _LOGGER -> log en solarman.py ==="
if grep -q "_LOGGER" "$SOLARMAN_PY"; then
  if grep -qE "^_LOGGER\s*=" "$SOLARMAN_PY"; then
    echo "⚠ _LOGGER esta DEFINIDO en solarman.py — no aplicar fix 3 ciegamente."
    echo "  Verificar manualmente:"
    grep -n "_LOGGER" "$SOLARMAN_PY" | head -10
  else
    COUNT=$(grep -c "_LOGGER" "$SOLARMAN_PY" || true)
    sed -i 's/\b_LOGGER\b/log/g' "$SOLARMAN_PY"
    echo "✓ Reemplazado $COUNT referencias _LOGGER -> log"
  fi
else
  echo "⊘ No hay referencias _LOGGER en solarman.py (ya corregido)"
fi
echo ""

# ─── Restart HA ──────────────────────────────────────────────────────────────
echo "=== Starting podman-homeassistant ==="
systemctl start podman-homeassistant
echo "Esperando 30s a que HA arranque..."
sleep 30
echo ""

# ─── Verificacion ────────────────────────────────────────────────────────────
echo "=== Estado del servicio ==="
systemctl is-active podman-homeassistant
echo ""

echo "=== Logs ultimos 40 lineas (filtrado solarman + ERROR) ==="
journalctl -u podman-homeassistant --no-pager -n 200 \
  | grep -E "solarman|ERROR|deye" \
  | tail -40 || echo "(sin matches solarman/ERROR — buena señal)"
echo ""

echo "=== Done ==="
echo "Verificar en navegador: http://alpha:8123 → Settings → Devices & Services"
echo "Debe aparecer 'Deye Inverter' con entidades conectadas (solar power, battery SOC, etc)."
echo ""
echo "Si entities siguen disconnected:"
echo "  1. Verificar IP/puerto del logger: ssh alpha 'nc -zv 192.168.1.111 8899'"
echo "  2. App Solarman Smart en celular cerrada (single-socket lock)"
echo "  3. Revisar log completo: journalctl -u podman-homeassistant -f | grep -i solarman"
echo ""
echo "Rollback:"
echo "  systemctl stop podman-homeassistant"
echo "  cp $BACKUP_DIR/* $HA_DIR/  # cuidado con paths anidados"
echo "  systemctl start podman-homeassistant"
