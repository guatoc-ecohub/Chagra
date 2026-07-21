/**
 * swRegistration.js — registro del Service Worker + AUTO-UPDATE seguro.
 *
 * Extraído de main.jsx (antes inline) para poder testear el flujo de
 * actualización en vitest sin montar todo el árbol React.
 *
 * ── Cambio de comportamiento (2026-06-15): consent-only → AUTO-UPDATE ──────
 * ANTES: cuando había un SW nuevo en `waiting`, SOLO se mostraba el banner
 * "nueva versión disponible" y el operador debía dar click "Actualizar". El
 * operador llevaba SEMANAS viendo el build viejo porque ese banner no le
 * funcionaba (red flaky, banner suprimido por el ack, no lo veía, etc.).
 *
 * AHORA: al detectar un SW en `waiting` disparamos AUTOMÁTICAMENTE el MISMO
 * flujo que dispara el botón del banner:
 *   1. `chagra:sw-update-requested`  → el guard de controllerchange recargará
 *      SIEMPRE (incluso si la página arrancó sin controller — caso first
 *      reload no controlado).
 *   2. `waiting.postMessage({type:'SKIP_WAITING'})` → el SW nuevo activa,
 *      hace `clients.claim()` → dispara `controllerchange` → recargamos UNA
 *      sola vez.
 * Se aplica con un pequeño delay (AUTO_UPDATE_DELAY_MS) para no cortar una
 * acción del usuario en curso. El UpdateAvailableBanner se mantiene como
 * fallback VISIBLE (por si el auto-update no llega a recargar, p.ej. red que
 * cuelga el activate).
 *
 * ── Seguridad anti-loop (NO romper) ───────────────────────────────────────
 * El guard original sigue intacto:
 *   - `reloading`: una sola recarga por vida de la página.
 *   - `hadController`: NO recargar en first install (clients.claim() dispara
 *     controllerchange por primera vez aunque sea instalación inicial).
 *   - `userUpdateRequested` (vía evento chagra:sw-update-requested): cuando la
 *     actualización la pidió alguien (banner o este auto-update), la PRÓXIMA
 *     controllerchange SIEMPRE recarga, aun sin controller previo.
 *   - `autoUpdateTriggered`: el auto-update se dispara UNA sola vez por
 *     registro (no re-disparar SKIP_WAITING si ya lo mandamos).
 *
 * Trabajo sin guardar: NO bloqueamos el auto-update por la cola del agente —
 * `agentRequestQueue` es DURABLE (IndexedDB, v20): sobrevive a la recarga. Si
 * en el futuro hay estado volátil no-durable que proteger, este es el punto
 * para gatear (ver `isReloadSafe`).
 */

import {
  shouldShowUpdateBanner,
  readAckedVersion,
  seedFirstInstallAck,
} from './swUpdateAck';
import { reloadPage } from './pageReload';

// Delay antes de aplicar el auto-update: ventana para no cortar una acción del
// usuario en curso (submit de form, etc.). Corto a propósito: el objetivo es
// que el deploy se VEA pronto, no postergarlo. La recarga es de todos modos
// segura (cola durable).
export const AUTO_UPDATE_DELAY_MS = 2000;

/**
 * Pregunta CACHE_NAME al SW vía MessageChannel con timeout corto. Devuelve
 * null si no responde (no bloquear UI ni spammear toast).
 */
export function getSwVersion(sw, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!sw || typeof MessageChannel === 'undefined') {
      resolve(null);
      return;
    }
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.version ?? null);
    };
    try {
      sw.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    } catch (_) {
      clearTimeout(timer);
      channel.port1.close();
      resolve(null);
    }
  });
}

/**
 * ¿Es seguro recargar ahora? Hoy SIEMPRE true: el único estado de trabajo en
 * vuelo (cola de requests del agente) es durable (IndexedDB). Punto de
 * extensión si en el futuro hay estado volátil que proteger.
 */
export function isReloadSafe() {
  return true;
}

/**
 * Desregistra el SW activo sin tocar IndexedDB ni limpiar site data.
 *
 * @param {object} [deps]
 * @param {() => Promise<ServiceWorkerRegistration|null>} [deps.getRegistration]
 * @returns {Promise<boolean>} true si se encontró una registration y se intentó desregistrar.
 */
export async function unregisterRegisteredServiceWorker({
  getRegistration = () =>
    navigator.serviceWorker.getRegistration(),
} = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registration = await getRegistration();
    if (!registration) return false;
    if (typeof registration.unregister === 'function') {
      await registration.unregister();
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Registra el Service Worker e instala el flujo de AUTO-UPDATE seguro.
 *
 * Idempotente respecto al guard interno por llamada (cada `registerServiceWorker`
 * crea su propio estado). En prod se llama UNA vez desde main.jsx.
 *
 * @param {object} [opts]
 * @param {(version:string)=>void} [opts.onUpdateAvailable] - callback opcional
 *   cuando hay versión nueva (además del CustomEvent del banner). Para tests.
 * @param {boolean} [opts.autoUpdate=true] - si false, vuelve a consent-only
 *   (solo banner, sin skipWaiting automático). Permite al operador desactivar
 *   el comportamiento sin revertir código (ver tradeoff en el PR).
 * @param {number} [opts.autoUpdateDelayMs=AUTO_UPDATE_DELAY_MS]
 */
export function registerServiceWorker(opts = {}) {
  const {
    autoUpdate = true,
    autoUpdateDelayMs = AUTO_UPDATE_DELAY_MS,
  } = opts;

  if (!('serviceWorker' in navigator)) return;

  // ── Banner "nueva versión disponible" (fallback VISIBLE) ─────────────────
  // SOLO cuando hay un SW nuevo en waiting. NUNCA por controllerchange: ese
  // evento significa que la actualización YA se aplicó. First install (sin ack
  // previo) → suprimir y sembrar el ack para que la primera notif real dispare.
  const maybeDispatchUpdateAvailable = async (sw) => {
    if (!sw) return;
    try {
      const version = await getSwVersion(sw);
      if (!version) return;
      const lastAcked = readAckedVersion();
      if (lastAcked === null) {
        seedFirstInstallAck(version);
        return;
      }
      if (shouldShowUpdateBanner(version, lastAcked)) {
        window.dispatchEvent(
          new CustomEvent('chagra:update-available', { detail: { version } })
        );
      }
    } catch (_) {
      // SW no responde / MessageChannel timeout → no spammear toast.
    }
  };

  // ── Guard anti-loop de recarga (patrón Workbox) ──────────────────────────
  // `reloading` evita bucles; `hadController` evita recargar en first install
  // (clients.claim() dispara controllerchange aunque sea instalación inicial);
  // `userUpdateRequested` fuerza recarga cuando la actualización la pidió el
  // banner O este auto-update (chagra:sw-update-requested), incluso si la
  // página arrancó sin controller.
  let reloading = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let userUpdateRequested = false;
  let autoUpdateTriggered = false;

  window.addEventListener('chagra:sw-update-requested', () => {
    userUpdateRequested = true;
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController && !userUpdateRequested) {
      hadController = true; // primer claim en first install — sin recarga
      return;
    }
    if (reloading) return;
    reloading = true;
    reloadPage();
  });

  // ── AUTO-UPDATE: aplica el waiting automáticamente (mismo flujo que el botón)
  // Dispara `chagra:sw-update-requested` (para que controllerchange recargue
  // SIEMPRE) y manda SKIP_WAITING al SW en waiting, tras un pequeño delay.
  // Una sola vez por registro (autoUpdateTriggered). El banner sigue visible
  // como fallback.
  const applyWaitingUpdate = (waiting) => {
    if (!autoUpdate || autoUpdateTriggered || !waiting) return;
    if (!isReloadSafe()) return;
    autoUpdateTriggered = true;
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('chagra:sw-update-requested'));
      } catch (_) { /* CustomEvent siempre existe en browsers soportados */ }
      try {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } catch (_) {
        // El SW no acepta el mensaje (raro): el banner sigue como fallback y,
        // si todo lo demás falla, el próximo arranque trae el SW nuevo.
      }
    }, autoUpdateDelayMs);
  };

  // Cuando hay un SW nuevo en waiting: banner (fallback visible) + auto-update.
  const onWaiting = (waiting) => {
    if (!waiting) return;
    maybeDispatchUpdateAvailable(waiting);
    if (typeof opts.onUpdateAvailable === 'function') {
      getSwVersion(waiting).then((v) => { if (v) opts.onUpdateAvailable(v); }).catch(() => {});
    }
    applyWaitingUpdate(waiting);
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.info('Service Worker registrado:', registration.scope);
        if (typeof registration.update === 'function') {
          registration.update().catch(() => {});
        }
      })
      .catch((error) => {
        console.error('Error registrando Service Worker:', error);
      });

    // Esperar a que el SW esté activo antes de registrar background sync.
    navigator.serviceWorker.ready.then((registration) => {
      if (/** @type {any} */ (registration).sync) {
        /** @type {any} */ (registration).sync.register('sync-pending-transactions').catch((e) => {
          console.warn('Background Sync no disponible:', e.message);
        });
      }
      console.info('[SW] Service Worker activo y listo.');
    });
  });

  // NOTA: el listener de mensajes SYNC_REQUESTED (→ syncManager.syncAll) vive
  // en main.jsx, donde syncManager ya está importado. Este módulo se ocupa solo
  // del registro + actualización del SW.

  // Detección de SW nuevo en waiting: fuente del banner + del auto-update.
  navigator.serviceWorker.ready.then((registration) => {
    // First install: sembrar el ack con la versión del SW activo SIN disparar
    // banner ni auto-update (la actualización ya está aplicada).
    const activeSw = navigator.serviceWorker.controller || registration.active;
    if (activeSw && readAckedVersion() === null) {
      getSwVersion(activeSw)
        .then((version) => { if (version) seedFirstInstallAck(version); })
        .catch(() => { });
    }
    if (registration.waiting) {
      onWaiting(registration.waiting);
    }
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (installing) {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && registration.waiting) {
            onWaiting(registration.waiting);
          }
        });
      } else if (registration.waiting) {
        onWaiting(registration.waiting);
      }
    });
  });
}
