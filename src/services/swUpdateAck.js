/**
 * swUpdateAck.js — persistencia del "ack de versión" del Service Worker.
 *
 * Bug Antigravity QA #18: la notificación "nueva versión disponible" se
 * mostraba cada reload aunque el usuario ya hubiera clickeado "Actualizar".
 * El SW dispara `controllerchange`/`updatefound` con cada activación nueva
 * y el cliente no recordaba que el usuario ya había aceptado esa versión.
 *
 * Estrategia:
 *  - Cuando el usuario click "Actualizar" → guardamos `currentVersion` en
 *    localStorage clave `sw:last-acked-version`.
 *  - Al boot (o al recibir notif del SW) preguntamos si debemos mostrar el
 *    banner: solo si `currentVersion !== lastAcked` y no es first-install.
 *  - First install (`lastAcked === null`) → NO mostramos toast; es la primera
 *    vez que el usuario abre la app, no es "actualización".
 *  - Cambio de versión (incluido rollback con SHA distinto) → SÍ mostramos.
 *
 * Este módulo expone funciones puras + helpers de localStorage para que
 * `swUpdateAck.test.js` pueda cubrir los 3 casos sin mockear navigator.
 *
 * Refs: Antigravity QA #18, task #128.
 */

export const ACK_STORAGE_KEY = 'sw:last-acked-version';

/**
 * Decide si mostrar el banner "nueva versión disponible".
 *
 * @param {string|null|undefined} currentVersion — versión reportada por el SW
 *   activo (ej. `CACHE_NAME` `chagra-v210` o `chagra-<sha>`).
 * @param {string|null|undefined} lastAcked — última versión que el usuario
 *   aceptó (de localStorage).
 * @returns {boolean} true si se debe mostrar el banner.
 */
export function shouldShowUpdateBanner(currentVersion, lastAcked) {
  // Sin versión actual conocida (SW aún no respondió o sin SW) → no mostrar.
  if (!currentVersion) return false;
  // First install: el usuario nunca aceptó ninguna versión. NO es "update",
  // es la primera vez que abre la app. Persistimos el current como acked
  // para que la primera notif real (cuando haya un update) sí dispare.
  if (lastAcked === null || lastAcked === undefined || lastAcked === '') {
    return false;
  }
  // Misma versión ya aceptada → no repetir el toast aunque el SW redispare
  // controllerchange/updatefound al refresh.
  if (currentVersion === lastAcked) return false;
  // Cualquier otro caso (upgrade, downgrade/rollback, cache name distinto)
  // → mostrar banner. El operador decide reload.
  return true;
}

/**
 * Lee el ack persistido. Devuelve null si no hay o si localStorage no está
 * disponible (e.g. modo privado con restricciones).
 *
 * @param {Storage} [storage=globalThis.localStorage]
 * @returns {string|null}
 */
export function readAckedVersion(storage = safeLocalStorage()) {
  if (!storage) return null;
  try {
    return storage.getItem(ACK_STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

/**
 * Persiste el ack. Idempotente, swallow errors (quota / Safari private).
 *
 * @param {string} version
 * @param {Storage} [storage=globalThis.localStorage]
 */
export function writeAckedVersion(version, storage = safeLocalStorage()) {
  if (!storage || !version) return;
  try {
    storage.setItem(ACK_STORAGE_KEY, version);
  } catch (_) {
    /* quota / private mode — silent */
  }
}

/**
 * Persiste el ack al boot para suprimir el toast "first install" en sesiones
 * futuras. Solo escribe si no hay ack previo (lastAcked === null).
 *
 * @param {string} currentVersion
 * @param {Storage} [storage=globalThis.localStorage]
 * @returns {boolean} true si seedió, false si ya existía un ack.
 */
export function seedFirstInstallAck(currentVersion, storage = safeLocalStorage()) {
  if (!currentVersion) return false;
  const existing = readAckedVersion(storage);
  if (existing !== null && existing !== undefined && existing !== '') return false;
  writeAckedVersion(currentVersion, storage);
  return true;
}

function safeLocalStorage() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
  } catch (_) {
    return null;
  }
}
