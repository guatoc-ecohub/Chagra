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

  # Módulos de farm (tipos de activo y log que usa Chagra)
  "$DRUSH" --root="$DRUPAL_ROOT" pm:enable \
    farm_plant farm_land farm_structure farm_equipment farm_material \
    farm_seeding farm_harvest farm_input \
    farm_quantity farm_location \
    --yes 2>/dev/null || true

  # Módulos OAuth
  "$DRUSH" --root="$DRUPAL_ROOT" pm:enable simple_oauth simple_oauth_password_grant --yes 2>/dev/null || true

  # Claves RSA para firmar tokens JWT
  mkdir -p /opt/drupal/keys
  "$DRUSH" --root="$DRUPAL_ROOT" simple-oauth:generate-keys /opt/drupal/keys
  chown www-data:www-data /opt/drupal/keys/private.key /opt/drupal/keys/public.key
  chmod 640 /opt/drupal/keys/private.key
  chmod 644 /opt/drupal/keys/public.key
  "$DRUSH" --root="$DRUPAL_ROOT" php:eval "
    \$c = Drupal::configFactory()->getEditable('simple_oauth.settings');
    \$c->set('public_key', '/opt/drupal/keys/public.key');
    \$c->set('private_key', '/opt/drupal/keys/private.key');
    \$c->save();
  "

  # OAuth Consumer para la app Chagra
  "$DRUSH" --root="$DRUPAL_ROOT" php:eval "
    \$consumer = Drupal::entityTypeManager()->getStorage('consumer')->create([
      'label' => 'Chagra App',
      'client_id' => '${FARMOS_CLIENT_ID:-chagra}',
      'confidential' => FALSE,
      'is_default' => TRUE,
      'user_id' => 1,
      'grant_types' => ['password', 'refresh_token'],
      'scopes' => ['farm_manager'],
    ]);
    \$consumer->save();
    echo 'OAuth consumer creado: ' . \$consumer->get('client_id')->value;
  "

  # Hosts permitidos para desarrollo local
  SETTINGS_FILE="$DRUPAL_ROOT/sites/default/settings.php"
  chmod u+w "$SETTINGS_FILE"
  cat >> "$SETTINGS_FILE" <<'EOF'

// Hosts permitidos para desarrollo local
$settings['trusted_host_patterns'] = [
  '^localhost$',
  '^127\.0\.0\.1$',
];
EOF
  chmod 444 "$SETTINGS_FILE"
  echo "[farmos-init] Setup completo: OAuth, claves RSA, trusted hosts."

  # Datos semilla: parcelas y estructuras base para que la app tenga ubicaciones desde el primer uso
  echo "[farmos-init] Creando datos semilla (parcelas, invernaderos)..."
  "$DRUSH" --root="$DRUPAL_ROOT" php:eval "
    \$storage = Drupal::entityTypeManager()->getStorage('asset');

    \$items = [
      ['type' => 'land',      'name' => 'Parcela Principal', 'land_type' => 'field'],
      ['type' => 'land',      'name' => 'Zona Fresas',       'land_type' => 'bed'],
      ['type' => 'land',      'name' => 'Zona Hortalizas',   'land_type' => 'bed'],
      ['type' => 'structure', 'name' => 'Invernadero 1',     'structure_type' => 'greenhouse'],
      ['type' => 'structure', 'name' => 'Invernadero 2',     'structure_type' => 'greenhouse'],
    ];

    foreach (\$items as \$item) {
      \$fields = ['type' => \$item['type'], 'name' => \$item['name'], 'status' => 'active'];
      if (isset(\$item['land_type']))      \$fields['land_type']      = \$item['land_type'];
      if (isset(\$item['structure_type'])) \$fields['structure_type'] = \$item['structure_type'];
      \$asset = \$storage->create(\$fields);
      \$asset->save();
      echo '[seed] Creado: ' . \$item['name'] . ' (' . \$item['type'] . ')' . PHP_EOL;
    }
  " 2>/dev/null || echo "[farmos-init] Advertencia: seed de activos falló (continuando)."
  echo "[farmos-init] Datos semilla listos."

  # Taxonomía plant_type: cultivos comunes de la finca (requerido por asset--plant)
  echo "[farmos-init] Creando taxonomía plant_type..."
  "$DRUSH" --root="$DRUPAL_ROOT" php:eval "
    \$storage = Drupal::entityTypeManager()->getStorage('taxonomy_term');
    \$crops = [
      'Fresa','Lechuga','Mora','Arándano','Café','Uchuva','Gulupa',
      'Cilantro','Tomate de Árbol','Maíz','Frijol','Arveja',
      'Espinaca','Repollo','Kale','Apio','Quinua','Amaranto',
    ];
    foreach (\$crops as \$name) {
      \$term = \$storage->create(['vid' => 'plant_type', 'name' => \$name, 'status' => TRUE]);
      \$term->save();
      echo '[seed] plant_type: ' . \$name . PHP_EOL;
    }
  " 2>/dev/null || echo "[farmos-init] Advertencia: seed de taxonomía falló (continuando)."
  echo "[farmos-init] Taxonomía plant_type lista."

else
  echo "[farmos-init] farmOS ya instalado, verificando módulos Chagra..."
  "$DRUSH" --root="$DRUPAL_ROOT" pm:enable \
    farm_plant farm_land farm_structure farm_equipment farm_material \
    farm_seeding farm_harvest farm_input \
    farm_quantity farm_location \
    simple_oauth simple_oauth_password_grant \
    --yes 2>/dev/null || true
fi

exec apache2-foreground
