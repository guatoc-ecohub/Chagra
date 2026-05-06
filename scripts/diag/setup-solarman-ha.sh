#!/usr/bin/env bash
# scripts/diag/setup-solarman-ha.sh
# =============================================================================
# Instala ha-solarman custom component en Home Assistant container en alpha.
# Repo: https://github.com/StephanJouberts/home_assistant_solarman
#
# IMPORTANTE — el component SOLO soporta config entries via UI (no YAML).
# Este script clona el repo + reinicia HA. La configuracion (IP, puerto,
# serial logger, lookup_file) se agrega desde la UI:
#   http://alpha:8123 → Settings → Devices & Services → Add Integration → Solarman
#
# Lookup file disponibles en:
#   /mnt/fast/appdata/homeassistant/custom_components/solarman/inverter_definitions/
# Ejemplos: deye_hybrid.yaml, deye_string_g3.yaml, deye_4mppt.yaml,
# deye_3phase_hv.yaml, deye_3phase_lv.yaml.
#
# Uso:
#   bash scripts/diag/setup-solarman-ha.sh        # solo clona + reinicia
# =============================================================================

set -euo pipefail

CUSTOM_COMPONENTS="/mnt/fast/appdata/homeassistant/custom_components"
SOLARMAN_DIR="$CUSTOM_COMPONENTS/solarman"

echo "=== Paso 1: Instalar/actualizar ha-solarman custom component ==="

if [ -d "$SOLARMAN_DIR/.git" ]; then
  echo "solarman ya existe — actualizando..."
  ssh alpha "cd $SOLARMAN_DIR && sudo git pull"
else
  echo "Clonando ha-solarman..."
  ssh alpha "sudo git clone https://github.com/StephanJouberts/home_assistant_solarman.git $SOLARMAN_DIR"
fi
echo "✓ Solarman custom component instalado en $SOLARMAN_DIR"

echo ""
echo "=== Paso 2: Reiniciar Home Assistant ==="
ssh alpha 'sudo systemctl restart podman-homeassistant' || {
  echo "⚠ No se pudo reiniciar via SSH. Reiniciar manualmente:"
  echo "  ssh alpha 'sudo systemctl restart podman-homeassistant'"
}

echo ""
echo "=== Paso 3: Configurar via UI (NO yaml) ==="
echo "El component NO soporta configuracion YAML — solo UI config entries."
echo ""
echo "1. Esperar ~30s a que HA arranque."
echo "2. Abrir: http://alpha:8123"
echo "3. Settings → Devices & Services → Add Integration → buscar 'Solarman'"
echo "4. Llenar:"
echo "   - Name: Deye Inverter"
echo "   - IP: <IP del WiFi stick> (ej. 192.168.1.111)"
echo "   - Port: 8899"
echo "   - Serial: <serial DEL LOGGER, no del inversor>"
echo "   - Lookup file: deye_hybrid.yaml (ajustar segun modelo)"
echo "5. Submit. Deberia aparecer 'Deye Inverter' con entidades:"
echo "   - Potencia PV (W) | Bateria SOC (%) | Grid import/export | Inv temp"
echo ""
echo "Si falla — diagnosticar con:"
echo "  bash scripts/diag/check-solarman.sh <IP> <SERIAL>"
echo ""
echo "Bug conocido (typo deye_hybert.yaml en config entry):"
echo "  bash scripts/diag/fix-solarman.sh"
