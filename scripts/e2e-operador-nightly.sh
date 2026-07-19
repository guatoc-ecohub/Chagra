#!/usr/bin/env bash
#
# e2e-operador-nightly.sh — PRUEBA E2E FAITHFUL DEL OPERADOR (cron 3am).
#
# Reproduce EXACTAMENTE lo que ve el operador real (no un `admin` sin datos):
# login real + datos reales contra el farmOS de producción, con el bundle de
# PROD construido para que el usuario de test sea OPERADOR (ve todos los
# módulos). Verifica: sin error de token, datos cargan, todos los botones
# visibles + funcionales al tap real, y el selector de área al agregar planta.
#
# ES IDEMPOTENTE: crea/repara el usuario de test y siembra los datos solo si
# faltan; se puede correr todas las noches sin acumular basura.
#
# NO toca la cuenta ni los datos del operador real (kortux). Usa un usuario
# dedicado de test (`e2e-operador`), claramente marcado, con datos de prueba.
#
# Uso:
#   scripts/e2e-operador-nightly.sh
#
# Variables de entorno (todas con default sensato):
#   E2E_OPERADOR_USER   usuario de test          (def: e2e-operador)
#   E2E_OPERADOR_PASS   contraseña del test       (def: lee /run/secrets o genera)
#   FARMOS_BASE         backend real              (def: https://chagra.guatoc.co)
#   E2E_PORT            puerto del server local   (def: 4188)
#   FARMOS_CLIENT_ID    OAuth client              (def: farm)
#   CHROMIUM_PATH       chromium del nix-store    (def: autodetect)
#   SKIP_SEED=1         saltar el seed (solo correr la prueba)
#
# Salida: 0 si la prueba pasa; !=0 si falla (con artefactos en test-results/).
#
# Español colombiano (tú/usted). NUNCA voseo argentino.

set -euo pipefail

# ── Ubicación: este script vive en <repo>/scripts/ ──────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

# ── Config ──────────────────────────────────────────────────────────────────
E2E_OPERADOR_USER="${E2E_OPERADOR_USER:-e2e-operador}"
FARMOS_BASE="${FARMOS_BASE:-https://chagra.guatoc.co}"
E2E_PORT="${E2E_PORT:-4188}"
FARMOS_CLIENT_ID="${FARMOS_CLIENT_ID:-farm}"
TEST_EMAIL="e2e-operador@test.chagra.invalid"
# sudo del PATH: en NixOS el `sudo` que resuelve el PATH normal (o uno
# contaminado por un wrapper que antepone /run/current-system/sw/bin) es un
# symlink al store SIN el bit setuid — falla con "debe ser propiedad del uid 0
# y tener el bit setuid establecido" y el E2E nunca corre (bug 2026-07-19: el
# cron de las 3am nunca ejecutó por esto). El sudo con setuid real vive en
# /run/wrappers/bin/sudo. Usamos la ruta absoluta si existe (NixOS); si no
# (otros hosts/CI), caemos al `sudo` del PATH.
SUDO_BIN="sudo"
[[ -x /run/wrappers/bin/sudo ]] && SUDO_BIN="/run/wrappers/bin/sudo"
DRUSH="$SUDO_BIN podman exec -e HOME=/tmp farmos /opt/drupal/vendor/bin/drush"

# Guardarraíl: NUNCA usar el usuario real del operador como cuenta de test.
case "$E2E_OPERADOR_USER" in
  kortux|admin)
    echo "FATAL: E2E_OPERADOR_USER='$E2E_OPERADOR_USER' está prohibido (cuenta real/admin)." >&2
    exit 2
    ;;
esac

# Herramientas de red vía nix-shell (NixOS: curl/jq no están en PATH del cron).
NIX_NET="nix-shell -p curl jq --run"

# ── Contraseña del usuario de test ───────────────────────────────────────────
# Preferencia: env explícita > secret persistido > generar una fuerte y
# guardarla 600 (para que el seed y la prueba usen la misma entre corridas).
PASS_FILE="${E2E_OPERADOR_PASS_FILE:-$HOME/.config/chagra-e2e-operador.pass}"
if [[ -z "${E2E_OPERADOR_PASS:-}" ]]; then
  if [[ -f "$PASS_FILE" ]]; then
    E2E_OPERADOR_PASS="$(cat "$PASS_FILE")"
  else
    mkdir -p "$(dirname "$PASS_FILE")"
    E2E_OPERADOR_PASS="E2e-$(head -c16 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c20)!"
    umask 077; printf '%s' "$E2E_OPERADOR_PASS" > "$PASS_FILE"
    echo "[seed] contraseña de test generada y guardada 600 en $PASS_FILE"
  fi
fi
export E2E_OPERADOR_PASS

# ── 1) SEED idempotente: usuario OPERADOR (rol farm_manager) + datos ─────────
seed() {
  echo "=== [seed] usuario $E2E_OPERADOR_USER (farm_manager) + datos de prueba ==="

  # Usuario (idempotente).
  if $DRUSH user:information "$E2E_OPERADOR_USER" >/dev/null 2>&1; then
    echo "[seed] usuario ya existe"
  else
    $DRUSH user:create "$E2E_OPERADOR_USER" --mail="$TEST_EMAIL" --password="$E2E_OPERADOR_PASS" >/dev/null
    echo "[seed] usuario creado"
  fi
  # Asegurar contraseña conocida + rol operador (farm_manager).
  $DRUSH user:password "$E2E_OPERADOR_USER" "$E2E_OPERADOR_PASS" >/dev/null
  $DRUSH user:role:add farm_manager "$E2E_OPERADOR_USER" >/dev/null 2>&1 || true

  # Token del usuario de test (password grant, mismo flujo que la PWA).
  local TOK
  TOK=$($NIX_NET "curl -sS -X POST '$FARMOS_BASE/oauth/token' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'grant_type=password' \
    --data-urlencode 'client_id=$FARMOS_CLIENT_ID' \
    --data-urlencode 'username=$E2E_OPERADOR_USER' \
    --data-urlencode 'password=$E2E_OPERADOR_PASS' \
    --data-urlencode 'scope=farm_manager' | jq -r .access_token")
  if [[ -z "$TOK" || "$TOK" == "null" ]]; then
    echo "FATAL: no se pudo obtener token para $E2E_OPERADOR_USER (¿pass mal? ¿oauth caído?)." >&2
    exit 3
  fi

  local API="$FARMOS_BASE/api"
  local FILTER="filter%5Buid.name%5D=$E2E_OPERADOR_USER"

  # Zona/land (idempotente: solo si no hay ninguna).
  local NLANDS
  NLANDS=$($NIX_NET "curl -sS '$API/asset/land?$FILTER' -H 'Authorization: Bearer $TOK' -H 'Accept: application/vnd.api+json' | jq '.data|length'")
  if [[ "${NLANDS:-0}" -lt 1 ]]; then
    $NIX_NET "curl -sS -X POST '$API/asset/land' -H 'Authorization: Bearer $TOK' \
      -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/vnd.api+json' \
      -d '{\"data\":{\"type\":\"asset--land\",\"attributes\":{\"name\":\"Lote E2E (prueba)\",\"land_type\":\"field\",\"status\":\"active\"}}}'" >/dev/null
    echo "[seed] zona (land) sembrada"
  else
    echo "[seed] ya hay $NLANDS zona(s)"
  fi

  # plant_type term (find-or-create) — requerido por el backend para crear plantas.
  local PT_ID
  PT_ID=$($NIX_NET "curl -sS '$API/taxonomy_term/plant_type?filter%5Bname%5D=Tomate%20E2E' -H 'Authorization: Bearer $TOK' -H 'Accept: application/vnd.api+json' | jq -r '.data[0].id // empty'")
  if [[ -z "$PT_ID" ]]; then
    PT_ID=$($NIX_NET "curl -sS -X POST '$API/taxonomy_term/plant_type' -H 'Authorization: Bearer $TOK' \
      -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/vnd.api+json' \
      -d '{\"data\":{\"type\":\"taxonomy_term--plant_type\",\"attributes\":{\"name\":\"Tomate E2E\"}}}' | jq -r .data.id")
  fi

  # Plantas (idempotente: solo si hay <1).
  local NPLANTS
  NPLANTS=$($NIX_NET "curl -sS '$API/asset/plant?$FILTER' -H 'Authorization: Bearer $TOK' -H 'Accept: application/vnd.api+json' | jq '.data|length'")
  if [[ "${NPLANTS:-0}" -lt 1 ]]; then
    local LAND_ID
    LAND_ID=$($NIX_NET "curl -sS '$API/asset/land?$FILTER' -H 'Authorization: Bearer $TOK' -H 'Accept: application/vnd.api+json' | jq -r '.data[0].id'")
    $NIX_NET "curl -sS -X POST '$API/asset/plant' -H 'Authorization: Bearer $TOK' \
      -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/vnd.api+json' \
      -d '{\"data\":{\"type\":\"asset--plant\",\"attributes\":{\"name\":\"Tomate de prueba E2E\",\"status\":\"active\"},\"relationships\":{\"plant_type\":{\"data\":[{\"type\":\"taxonomy_term--plant_type\",\"id\":\"$PT_ID\"}]},\"location\":{\"data\":[{\"type\":\"asset--land\",\"id\":\"$LAND_ID\"}]}}}}'" >/dev/null
    $NIX_NET "curl -sS -X POST '$API/asset/plant' -H 'Authorization: Bearer $TOK' \
      -H 'Content-Type: application/vnd.api+json' -H 'Accept: application/vnd.api+json' \
      -d '{\"data\":{\"type\":\"asset--plant\",\"attributes\":{\"name\":\"Mora de prueba E2E\",\"status\":\"active\"},\"relationships\":{\"plant_type\":{\"data\":[{\"type\":\"taxonomy_term--plant_type\",\"id\":\"$PT_ID\"}]}}}}'" >/dev/null
    echo "[seed] 2 plantas sembradas"
  else
    echo "[seed] ya hay $NPLANTS planta(s)"
  fi
}

[[ "${SKIP_SEED:-0}" == "1" ]] || seed

# ── 2) BUILD del bundle de PROD con el usuario de test como OPERADOR ─────────
# VITE_FARMOS_URL="" → OAuth relativo (proxyado). El dist/fincas-publicas.json
# se parchea a endpoint "" → las llamadas a la API también salen relativas.
echo "=== [build] bundle prod con VITE_OPERATOR_USERNAME=$E2E_OPERADOR_USER ==="
node scripts/generate-cycle-content-manifest.mjs >/dev/null 2>&1 || true
VITE_FARMOS_URL="" \
VITE_FARMOS_CLIENT_ID="$FARMOS_CLIENT_ID" \
VITE_OPERATOR_USERNAME="$E2E_OPERADOR_USER" \
VITE_USE_SIDECAR_AGRO_MCP="false" \
  node_modules/.bin/vite build >/tmp/e2e-operador-build.log 2>&1 || {
    echo "FATAL: build falló. Cola del log:" >&2; tail -20 /tmp/e2e-operador-build.log >&2; exit 4;
  }

# Parchear el endpoint de farmOS a "" para que getActiveEndpoint() retorne
# relativo → todas las llamadas API pasan por el proxy local (same-origin).
node -e '
  const fs=require("fs"); const f="dist/fincas-publicas.json";
  try { const a=JSON.parse(fs.readFileSync(f,"utf8"));
    for (const x of a) x.farmos_endpoint="";
    fs.writeFileSync(f, JSON.stringify(a));
    console.log("[build] fincas-publicas.json → endpoint relativo");
  } catch(e){ console.warn("[build] no se pudo parchear fincas-publicas.json:", e.message); }
'

# ── 3) SERVE dist + proxy → farmOS real, en localhost (same-origin, sin CORS) ─
echo "=== [serve] dist en http://127.0.0.1:$E2E_PORT (proxy → $FARMOS_BASE) ==="
node scripts/lib/e2e-operador-server.mjs "$REPO_DIR/dist" "$E2E_PORT" "$FARMOS_BASE" >/tmp/e2e-operador-server.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Esperar a que el server responda.
for i in $(seq 1 30); do
  CODE=$($NIX_NET "curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:$E2E_PORT/ 2>/dev/null" 2>/dev/null || echo 000)
  [[ "$CODE" == "200" ]] && { echo "[serve] arriba (200) tras ${i}s"; break; }
  sleep 1
  [[ "$i" == "30" ]] && { echo "FATAL: el server no respondió. Log:" >&2; tail -10 /tmp/e2e-operador-server.log >&2; exit 5; }
done

# ── 4) CHROMIUM del nix-store (NixOS: bundled de Playwright falla por libs) ───
if [[ -z "${CHROMIUM_PATH:-}" ]]; then
  for p in /nix/store/*chromium*/bin/chromium; do [[ -x "$p" ]] && CHROMIUM_PATH="$p"; done
  [[ -z "${CHROMIUM_PATH:-}" ]] && CHROMIUM_PATH="$(nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1)"
fi
export PLAYWRIGHT_CHROMIUM_PATH="${CHROMIUM_PATH}"
echo "[run] chromium=$PLAYWRIGHT_CHROMIUM_PATH"

# ── 5) Correr la prueba contra el server local ───────────────────────────────
echo "=== [run] playwright operador-todo-visible-funciona.spec.js ==="
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:$E2E_PORT"
# NO usar PLAYWRIGHT_SINGLE_PROCESS: el chromium del nix-store en single-process
# se desestabiliza al crear varios contextos (un test por contexto) y aborta con
# "browserContext.newPage: timeout". En multi-proceso (default) es estable en
# alpha — `--no-sandbox` de playwright.config alcanza para el nix-store.
unset PLAYWRIGHT_SINGLE_PROCESS
set +e
node_modules/.bin/playwright test tests/operador-todo-visible-funciona.spec.js \
  --project=chromium --reporter=list --workers=1
RC=$?
set -e

if [[ $RC -eq 0 ]]; then
  echo "✅ PRUEBA OPERADOR OK — login fresco sin error de token, datos cargan, botones visibles+funcionales, selector de área presente."
else
  echo "❌ PRUEBA OPERADOR FALLÓ (rc=$RC) — revisa test-results/ (screenshots + traza) para el diagnóstico."
fi
exit $RC
