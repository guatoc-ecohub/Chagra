#!/bin/bash
# run-nocturno-validacion-stg.sh — Ejecuta E2E nocturno validación en staging HEADED

set -e

echo "🌙 Iniciando E2E NOCTURNO validación en STAGING (HEADED)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar credenciales desde ~/.config/chagra-demo-creds.env
CREDS_FILE="$HOME/.config/chagra-demo-creds.env"
if [ -f "$CREDS_FILE" ]; then
  echo "📋 Cargando credenciales desde $CREDS_FILE"
  export $(grep -v '^#' "$CREDS_FILE" | xargs)
else
  echo "❌ Error: No se encontró $CREDS_FILE"
  exit 1
fi

# URL de staging (ajustar según la URL real del staging STG)
STG_URL="${CHAGRA_STG_URL:-https://staging.chagra.app}"

echo "🌐 URL de staging: $STG_URL"
echo "👤 Usuario: $CHAGRA_USER"
echo ""

# Crear directorio de screenshots
mkdir -p screenshots/nocturno-validacion

# Ejecutar test en modo HEADED
echo "🚀 Ejecutando test en modo HEADED..."
npx playwright test tests/e2e-nocturno-validacion.spec.js \
  --headed \
  --project=chromium \
  --timeout=60000 \
  --retries=0 \
  --workers=1 \
  --reporter=list \
  --env \
    RUN_NOCTURNO_VALIDACION=1 \
    PLAYWRIGHT_BASE_URL="$STG_URL" \
    CHAGRA_USER="$CHAGRA_USER" \
    CHAGRA_PASS="$CHAGRA_PASS"

echo ""
echo "✅ Test completado"
echo "📁 Screenshots guardados en: screenshots/nocturno-validacion/"
echo "📊 Reporte JSON: screenshots/nocturno-validacion/validation-report.json"
echo ""
echo "🌐 Para ver el reporte HTML:"
echo "   npx playwright show-report playwright-report"
