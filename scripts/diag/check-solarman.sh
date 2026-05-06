#!/usr/bin/env bash
# scripts/diag/check-solarman.sh
# =============================================================================
# Diagnostico ha-solarman cuando el log muestra "Querying [3 - 112]..." en
# loop sin respuesta (patron de timeout silencioso).
#
# Uso (en stg, con SSH a alpha):
#   bash scripts/diag/check-solarman.sh <LOGGER_IP> <LOGGER_SERIAL>
# =============================================================================

set -euo pipefail

LOGGER_IP="${1:-${SOLARMAN_LOGGER_IP:-}}"
LOGGER_SERIAL="${2:-${SOLARMAN_LOGGER_SERIAL:-}}"

if [ -z "$LOGGER_IP" ] || [ -z "$LOGGER_SERIAL" ]; then
  echo "Error: definir LOGGER_IP y LOGGER_SERIAL"
  echo "  bash scripts/diag/check-solarman.sh 192.168.1.50 2401234567"
  exit 1
fi

echo "=== 1. Conectividad TCP al logger en :8899 ==="
ssh alpha "nc -zv $LOGGER_IP 8899" 2>&1 || {
  echo "FAIL: no llega TCP al logger"
  echo "  - Verificar IP en router (DHCP del WiFi stick)"
  echo "  - Verificar que no este en otra subnet"
  echo "  - HA container debe tener network_mode: host (no bridge)"
  exit 2
}

echo ""
echo "=== 2. Sockets activos al logger (single-socket lock) ==="
ssh alpha "ss -tn dst $LOGGER_IP" 2>&1
echo ""
echo "Si aparece >1 conexion, una de ellas bloquea HA. Casos comunes:"
echo "  - App Solarman Smart abierta en celular (cerrarla)"
echo "  - solarmanpv.com cloud pollando (configurable solo desde app)"
echo "  - Otra integracion HA (deye_inverter_modbus) compitiendo"

echo ""
echo "=== 3. Lookups disponibles en el custom_component ==="
ssh alpha "ls /mnt/fast/appdata/homeassistant/custom_components/solarman/inverter_definitions/" 2>&1
echo ""
echo "deye_hybrid asume bateria + grid-tie. Si tu inversor es:"
echo "  - String/grid-tie sin bateria → usar 'deye_string_g3' o 'deye_4mppt'"
echo "  - Microinversor → usar 'deye_micro' (si existe)"
echo "  - Trifasico industrial → usar 'deye_3phase_lv' / 'deye_3phase_hv'"

echo ""
echo "=== 4. Serial logger en config actual ==="
ssh alpha "grep -A2 'serial_number' /mnt/fast/appdata/homeassistant/configuration.yaml" 2>&1
echo ""
echo "Verificar contra app Solarman Smart → planta → dispositivo →"
echo "  'Logger' (10 digitos), NO 'Inversor' (otro numero)."
echo "  Ambos empiezan con prefijo de fabrica pero son distintos."

echo ""
echo "=== 5. Test directo PySolarmanV5 (bypass HA) ==="
echo "Para confirmar si el problema es del logger o del component:"
echo "  ssh alpha 'podman exec -it homeassistant python3 -c \""
echo "from pysolarmanv5 import PySolarmanV5"
echo "m = PySolarmanV5(\"$LOGGER_IP\", $LOGGER_SERIAL, port=8899, mb_slave_id=1, verbose=True)"
echo "print(m.read_holding_registers(register_addr=3, quantity=10))"
echo "\"'"
echo ""
echo "Si timeout → problema logger/serial/lock"
echo "Si retorna lista de 10 ints → problema lookup (cambiar a deye_string_g3)"
