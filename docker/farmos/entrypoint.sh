#!/bin/bash
# Entrypoint de FarmOS para desarrollo: instala automáticamente en el primer arranque.
set -e

DRUSH="/opt/drupal/vendor/bin/drush"
DRUPAL_ROOT="/opt/drupal/web"

echo "[farmos-init] Esperando base de datos PostgreSQL..."
until php -r "
  try {
    new PDO(
      'pgsql:host=${FARMOS_DB_HOST};port=${FARMOS_DB_PORT};dbname=${FARMOS_DB_NAME}',
      '${FARMOS_DB_USER}',
      '${FARMOS_DB_PASS}'
    );
    exit(0);
  } catch (Exception \$e) { exit(1); }
" 2>/dev/null; do
  sleep 3
done
echo "[farmos-init] Base de datos lista."

cd /opt/drupal

# Solo instala si Drupal no está inicializado aún
if ! "$DRUSH" --root="$DRUPAL_ROOT" status --field=bootstrap 2>/dev/null | grep -q "Successful"; then
  echo "[farmos-init] Instalando farmOS con PostgreSQL (esto puede tardar 1-2 min)..."
  "$DRUSH" --root="$DRUPAL_ROOT" site:install farm \
    --db-url="pgsql://${FARMOS_DB_USER}:${FARMOS_DB_PASS}@${FARMOS_DB_HOST}:${FARMOS_DB_PORT}/${FARMOS_DB_NAME}" \
    --account-name="${FARMOS_ADMIN_USER}" \
    --account-pass="${FARMOS_ADMIN_PASS}" \
    --account-mail="${FARMOS_ADMIN_EMAIL}" \
    --site-name="${FARMOS_SITE_NAME}" \
    --yes
  echo "[farmos-init] farmOS instalado correctamente."

  "$DRUSH" --root="$DRUPAL_ROOT" pm:enable simple_oauth --yes 2>/dev/null || true
  echo "[farmos-init] Módulos adicionales habilitados."
else
  echo "[farmos-init] farmOS ya instalado, saltando setup."
fi

exec apache2-foreground
