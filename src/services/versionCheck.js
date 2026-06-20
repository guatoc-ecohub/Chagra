/**
 * versionCheck.js — auto-recuperación por versión (self-heal del bundle stale).
 *
 * ── PROBLEMA RAÍZ (prod 2026-06-18) ───────────────────────────────────────
 * El Service Worker nuevo queda en `waiting` hasta que el cliente decide
 * activarlo. El auto-update de swRegistration.js dispara SKIP_WAITING cuando
 * DETECTA el waiting (vía `updatefound`/`registration.waiting`). Pero hay un
 * hueco: si el SW activo NUNCA vuelve a chequear `/sw.js` (no hay re-register
 * en esta sesión, la red estaba caída cuando se detectó el waiting, o el
 * navegador sirvió el `sw.js` viejo de su HTTP cache), el cliente se queda en
 * el bundle VIEJO indefinidamente. Quien NO ve/clickea el UpdateAvailableBanner
 * nunca recibe fixes críticos (ej. el refresh de token #1664) → sesión zombi →
 * "failed to fetch" → el home cae al onboarding "¿dónde está su finca?".
 *
 * ── LA CURA (no depende del ciclo de vida del SW) ─────────────────────────
 * El bundle lleva embebido su propio SHA de build (`__BUILD_SHA__`, inyectado
 * por Vite `define`). Al arrancar CON conexión, el cliente hace fetch `no-store`
 * a `/version.json` (lo emite el deploy con el SHA desplegado). Si el SHA que
 * está CORRIENDO ≠ el SHA DESPLEGADO → hay un bundle nuevo en el servidor que
 * este cliente no tomó: mandamos SKIP_WAITING al SW en waiting y recargamos UNA
 * sola vez. Tras la recarga, el navegador pide el index.html fresco
 * (Network-First en el SW) → bundle nuevo → SHA coincide → no recarga otra vez.
 *
 * Es belt-and-suspenders del auto-update: si éste ya recargó, el SHA coincide y
 * acá no pasa nada. Si el auto-update falló, esta ruta lo rescata.
 *
 * ── ANTI-LOOP (crítico) ───────────────────────────────────────────────────
 * Guard por sessionStorage (`chagra:self-heal-reloaded`): recargamos como mucho
 * UNA vez por pestaña/sesión. Si tras recargar el SHA SIGUE sin coincidir
 * (deploy a medias, /version.json adelantado del bundle servido, SW que sirve
 * un index.html cacheado viejo), NO entramos en bucle de recarga: marcamos y
 * paramos. El banner queda como camino visible y el próximo arranque reintenta.
 *
 * ── OFFLINE-FIRST (no romper) ─────────────────────────────────────────────
 * TODO el chequeo es no-op si no hay red (`navigator.onLine === false`) o si el
 * fetch de `/version.json` falla (timeout/offline). El campesino sin señal
 * NUNCA se ve forzado a recargar ni pierde la app. `/version.json` se sirve
 * network-only en el SW (no se cachea) para que el chequeo refleje el servidor,
 * no una copia vieja.
 *
 * Funciones puras + helpers para que versionCheck.test.js cubra los casos sin
 * mockear navigator entero.
 */

/**
 * SHA del build embebido en el bundle. Lo inyecta Vite `define` desde
 * `VITE_BUILD_SHA` (deploy.yml: `git rev-parse --short HEAD`). En dev / tests
 * sin define cae a 'dev' (string), nunca undefined → el chequeo es no-op
 * inofensivo (compara contra sí mismo o el fetch falla limpio).
 */
/* global __BUILD_SHA__ */
export const RUNNING_BUILD_SHA =
  typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

export const SELF_HEAL_GUARD_KEY = 'chagra:self-heal-reloaded';
export const PENDING_UPDATE_SHA_KEY = 'chagra:self-heal-pending-sha';
export const VERSION_ENDPOINT = '/version.json';
// Timeout corto: el self-heal NO debe bloquear el boot ni colgarse en red rural.
export const VERSION_FETCH_TIMEOUT_MS = 4000;

/**
 * Normaliza un SHA para comparar (trim, lowercase). Acepta short o full SHA y
 * los compara por prefijo: si uno es prefijo del otro se consideran iguales
 * (deploy emite short, el bundle puede traer short o full según el define).
 *
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 * @returns {boolean} true si representan el mismo build.
 */
export function shasMatch(a, b) {
  const na = (a ?? '').toString().trim().toLowerCase();
  const nb = (b ?? '').toString().trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Prefijo: 'a1b2c3d' vs 'a1b2c3d4e5...' → mismo build.
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  // Evitar falsos positivos por prefijos triviales: exigir >=7 chars (short SHA).
  if (shorter.length < 7) return false;
  return longer.startsWith(shorter);
}

/**
 * Decide si el cliente debe auto-recuperarse (recargar) por desfase de versión.
 * Función pura: toda la política de decisión vive acá para testearla aislada.
 *
 * @param {object} params
 * @param {string} params.runningSha — SHA embebido en el bundle corriendo.
 * @param {string|null} params.deployedSha — SHA reportado por /version.json.
 * @param {boolean} params.alreadyReloaded — ya recargamos en esta sesión.
 * @param {boolean} [params.online=true] — hay conexión.
 * @returns {boolean} true → mandar SKIP_WAITING + recargar UNA vez.
 */
export function shouldSelfHeal({ runningSha, deployedSha, alreadyReloaded, online = true }) {
  if (!online) return false;               // offline-first: nunca forzar nada
  if (alreadyReloaded) return false;       // anti-loop: una recarga por sesión
  if (!deployedSha) return false;          // sin info del server → no actuar
  if (!runningSha || runningSha === 'dev') return false; // dev/sin SHA → no-op
  // Solo si difieren explícitamente.
  return !shasMatch(runningSha, deployedSha);
}

/**
 * Lee /version.json con timeout y cache-busting (no-store). Devuelve el SHA
 * desplegado o null si no se pudo obtener (offline/timeout/JSON inválido).
 * NUNCA lanza.
 *
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl=globalThis.fetch]
 * @param {number} [opts.timeoutMs=VERSION_FETCH_TIMEOUT_MS]
 * @returns {Promise<string|null>}
 */
export async function fetchDeployedSha({
  fetchImpl = globalThis.fetch,
  timeoutMs = VERSION_FETCH_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') return null;
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    const res = await fetchImpl(VERSION_ENDPOINT, {
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });
    if (!res || !res.ok) return null;
    const data = await res.json();
    const sha = data && (data.sha || data.commit || data.build);
    return sha ? String(sha) : null;
  } catch (_) {
    // offline / timeout / version.json ausente o no-JSON → no-op silencioso.
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeSessionStorage() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.sessionStorage : null;
  } catch (_) {
    return null;
  }
}

function safeLocalStorage() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
  } catch (_) {
    return null;
  }
}

/** @returns {boolean} true si ya recargamos por self-heal en esta sesión. */
export function hasSelfHealReloaded(storage = safeSessionStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(SELF_HEAL_GUARD_KEY) === '1';
  } catch (_) {
    return false;
  }
}

/** Marca que ya recargamos por self-heal en esta sesión (anti-loop). */
export function markSelfHealReloaded(storage = safeSessionStorage()) {
  if (!storage) return;
  try {
    storage.setItem(SELF_HEAL_GUARD_KEY, '1');
  } catch (_) {
    /* quota / modo privado — el reload directo igual ocurre; sin marca
       podría re-disparar, pero shouldSelfHeal exige diferencia de SHA y el
       index.html fresco post-reload ya coincide, así que no hay loop real. */
  }
}

export function readPendingUpdateSha(storage = safeLocalStorage()) {
  if (!storage) return null;
  try {
    return storage.getItem(PENDING_UPDATE_SHA_KEY);
  } catch (_) {
    return null;
  }
}

export function writePendingUpdateSha(sha, storage = safeLocalStorage()) {
  if (!storage || !sha) return;
  try {
    storage.setItem(PENDING_UPDATE_SHA_KEY, String(sha));
  } catch (_) {
    /* storage no disponible: el self-heal sigue funcionando en la sesión actual. */
  }
}

export function clearPendingUpdateSha(storage = safeLocalStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(PENDING_UPDATE_SHA_KEY);
  } catch (_) {
    /* no-op */
  }
}

function defaultNotifyUpdateAvailable(version) {
  try {
    window.dispatchEvent(
      new CustomEvent('chagra:update-available', { detail: { version } }),
    );
  } catch (_) {
    /* entorno sin window/CustomEvent: no-op */
  }
}

/**
 * Orquesta el self-heal: lee /version.json, decide, y si procede manda
 * SKIP_WAITING al SW en waiting + recarga UNA sola vez (marcando el guard).
 *
 * Dependencias inyectables para test (sin tocar navigator/location reales).
 *
 * @param {object} [deps]
 * @param {string} [deps.runningSha=RUNNING_BUILD_SHA]
 * @param {() => Promise<string|null>} [deps.getDeployedSha]
 * @param {() => boolean} [deps.isOnline]
 * @param {() => boolean} [deps.alreadyReloaded]
 * @param {() => void} [deps.markReloaded]
 * @param {() => string|null} [deps.readPending]
 * @param {(sha:string) => void} [deps.writePending]
 * @param {() => void} [deps.clearPending]
 * @param {(version:string) => void} [deps.notifyUpdateAvailable]
 * @param {() => Promise<void>} [deps.skipWaiting] — manda SKIP_WAITING al SW.
 * @param {() => void} [deps.reload] — recarga la página.
 * @returns {Promise<{healed: boolean, reason: string}>}
 */
export async function runSelfHealCheck(deps = {}) {
  const {
    runningSha = RUNNING_BUILD_SHA,
    getDeployedSha = fetchDeployedSha,
    isOnline = () =>
      typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    alreadyReloaded = () => hasSelfHealReloaded(),
    markReloaded = () => markSelfHealReloaded(),
    readPending = () => readPendingUpdateSha(),
    writePending = (sha) => writePendingUpdateSha(sha),
    clearPending = () => clearPendingUpdateSha(),
    notifyUpdateAvailable = defaultNotifyUpdateAvailable,
    skipWaiting = defaultSkipWaiting,
    reload = defaultReload,
  } = deps;

  if (!isOnline()) return { healed: false, reason: 'offline' };
  if (alreadyReloaded()) return { healed: false, reason: 'already-reloaded' };

  const deployedSha = await getDeployedSha();
  if (deployedSha && shasMatch(runningSha, deployedSha)) {
    clearPending();
  }
  const decision = shouldSelfHeal({
    runningSha,
    deployedSha,
    alreadyReloaded: alreadyReloaded(),
    online: isOnline(),
  });
  if (!decision) return { healed: false, reason: 'in-sync-or-unknown' };

  const pendingSha = readPending();
  const wasPendingFromPreviousStart = shasMatch(pendingSha, deployedSha);
  writePending(deployedSha);
  notifyUpdateAvailable(deployedSha);
  try {
    await skipWaiting();
  } catch (_) {
    /* SW no disponible: el próximo arranque sigue protegido por pendingSha. */
  }

  if (!wasPendingFromPreviousStart) {
    return { healed: false, reason: 'update-pending' };
  }

  // Marcar ANTES de recargar: si la recarga es instantánea, el guard ya quedó
  // escrito para que el próximo arranque no re-dispare en bucle.
  markReloaded();
  reload();
  return { healed: true, reason: 'sha-mismatch' };
}

/**
 * Manda SKIP_WAITING al SW en `waiting` (si lo hay). Reusa el mismo flujo que
 * el botón del banner: dispara `chagra:sw-update-requested` para que el guard
 * de controllerchange de swRegistration recargue, por si el reload directo de
 * abajo no alcanzara. No-op si no hay SW / waiting.
 */
async function defaultSkipWaiting() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    window.dispatchEvent(new CustomEvent('chagra:sw-update-requested'));
  } catch (_) { /* CustomEvent existe en todos los browsers soportados */ }
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

function defaultReload() {
  // Indirección vía import dinámico para reusar pageReload (mockeable en test).
  // Import estático arriba crearía un ciclo innecesario; acá basta location.
  try {
    window.location.reload();
  } catch (_) { /* entorno sin window (SSR/test) — no-op */ }
}
