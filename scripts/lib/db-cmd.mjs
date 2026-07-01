/**
 * scripts/lib/db-cmd.mjs
 *
 * Helper para construir el comando de psql dentro de podman sin hardcodear
 * valores de infra en el repo publico.
 */

const REQUIRED_VARS = ['CHAGRA_DB_CONTAINER', 'CHAGRA_DB_USER', 'CHAGRA_DB_NAME'];

function formatMissingEnv(missing) {
  return (
    `Faltan variables de entorno requeridas: ${missing.join(', ')}. ` +
    'Configura el perfil privado de ops de Chagra para exportar ' +
    'CHAGRA_DB_CONTAINER, CHAGRA_DB_USER y CHAGRA_DB_NAME antes de ejecutar ' +
    'este script.'
  );
}

/**
 * Devuelve la invocacion base de psql dentro de podman.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {{file:string,args:string[]}}
 */
export function getDbCmd(env = process.env) {
  const container = env.CHAGRA_DB_CONTAINER;
  const user = env.CHAGRA_DB_USER;
  const db = env.CHAGRA_DB_NAME;
  const missing = REQUIRED_VARS.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(formatMissingEnv(missing));
  }

  return {
    file: 'sudo',
    args: ['podman', 'exec', '-i', container, 'psql', '-U', user, '-d', db],
  };
}
