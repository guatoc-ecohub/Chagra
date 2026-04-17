<?php
/**
 * settings.php para desarrollo — fuerza driver PostgreSQL.
 * Montado en /opt/drupal/web/sites/default/settings.php
 */

// Base de datos PostgreSQL leída desde variables de entorno
$databases['default']['default'] = [
  'driver'   => 'pgsql',
  'database' => getenv('FARMOS_DB_NAME'),
  'username' => getenv('FARMOS_DB_USER'),
  'password' => getenv('FARMOS_DB_PASS'),
  'host'     => getenv('FARMOS_DB_HOST'),
  'port'     => getenv('FARMOS_DB_PORT') ?: '5432',
  'prefix'   => '',
  'namespace' => 'Drupal\\pgsql\\Driver\\Database\\pgsql',
  'autoload'  => 'core/modules/pgsql/src/Driver/Database/pgsql/',
];

// Hash salt fijo para dev (no usar en producción)
$settings['hash_salt'] = 'chagra-dev-hash-salt-not-for-production';

// Permitir acceso desde localhost
$settings['trusted_host_patterns'] = [
  '^localhost$',
  '^127\.0\.0\.1$',
];

// Directorio de archivos
$settings['file_public_path'] = 'sites/default/files';
$settings['file_private_path'] = '';

// Config sync (requerido por Drupal)
$settings['config_sync_directory'] = '../config/sync';

// Deshabilitar caché de twig en dev
$settings['cache']['bins']['render'] = 'cache.backend.null';
$config['system.logging']['error_level'] = 'verbose';
