#!/usr/bin/env bash
# =============================================================================
# SEED: Inyección de tareas agroecológicas en FarmOS v2
# Requiere: token OAuth válido y acceso a la API de FarmOS
# Uso: FARMOS_URL=http://192.168.1.100:8081 FARMOS_TOKEN=<token> ./seed-tasks.sh
# =============================================================================
set -euo pipefail

FARMOS_URL="${FARMOS_URL:-http://127.0.0.1:8081}"
FARMOS_TOKEN="${FARMOS_TOKEN:?Error: defina FARMOS_TOKEN con un Bearer token válido}"

post_log() {
  local payload="$1"
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "${FARMOS_URL}/api/log/activity" \
    -H "Accept: application/vnd.api+json" \
    -H "Content-Type: application/vnd.api+json" \
    -H "Authorization: Bearer ${FARMOS_TOKEN}" \
    -d "$payload")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "201" ]]; then
    local name
    name=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['attributes']['name'])" 2>/dev/null || echo "?")
    echo "[OK] Tarea creada: ${name}"
  else
    echo "[ERROR] HTTP ${http_code}"
    echo "$body" | head -5
  fi
}

# Calcular timestamps UNIX en segundos
TOMORROW=$(( $(date +%s) + 86400 ))
IN_3_DAYS=$(( $(date +%s) + 259200 ))
IN_7_DAYS=$(( $(date +%s) + 604800 ))

echo "=== Inyectando tareas agroecológicas en FarmOS ==="
echo "Servidor: ${FARMOS_URL}"
echo ""

# 1. Volteo de compostera
post_log '{
  "data": {
    "type": "log--activity",
    "attributes": {
      "name": "Volteo y control de humedad en Compostera Principal",
      "timestamp": "'"${TOMORROW}"'",
      "status": "pending",
      "notes": {
        "value": "Realizar volteo aeróbico. Verificar que la humedad esté al 60% (prueba del puño). Añadir material seco si hay lixiviados excesivos.",
        "format": "default"
      }
    }
  }
}'

# 2. Aplicación de Biol
post_log '{
  "data": {
    "type": "log--activity",
    "attributes": {
      "name": "Aplicación de Biol foliar en Invernadero",
      "timestamp": "'"${IN_3_DAYS}"'",
      "status": "pending",
      "notes": {
        "value": "Aplicación al 10% en bomba de espalda a primera hora de la mañana para evitar quemaduras por sol.",
        "format": "default"
      }
    }
  }
}'

# 3. Monitoreo de arvenses
post_log '{
  "data": {
    "type": "log--activity",
    "attributes": {
      "name": "Monitoreo de arvenses y linderos",
      "timestamp": "'"${IN_7_DAYS}"'",
      "status": "pending",
      "notes": {
        "value": "Revisión de coberturas vivas. Cortar con machete (no arrancar) arvenses competidoras altas y dejarlas como chop and drop en el sitio.",
        "format": "default"
      }
    }
  }
}'

echo ""
echo "=== Inyección completada ==="
