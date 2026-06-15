/**
 * swRegistration.test.js — TDD del AUTO-UPDATE seguro del Service Worker
 * (2026-06-15: consent-only → auto-update).
 *
 * Contrato:
 *  1. SW nuevo en `waiting` (detectado en load) → tras AUTO_UPDATE_DELAY_MS se
 *     dispara `chagra:sw-update-requested` + `SKIP_WAITING` al waiting.
 *  2. El SW nuevo activa → `controllerchange` → reload UNA sola vez.
 *  3. NO doble-reload ni loop: un segundo controllerchange NO recarga otra vez.
 *  4. First install (página SIN controller, claim-only) → controllerchange NO
 *     recarga (lo absorbe el guard hadController).
 *  5. `updatefound → installed` con waiting → mismo auto-update.
 *  6. autoUpdate:false → consent-only (NO skipWaiting automático, solo banner).
 *  7. El SKIP_WAITING se manda UNA sola vez aunque haya varias señales de
 *     waiting (autoUpdateTriggered).
 *
 * Modelamos navigator.serviceWorker como un EventTarget (controllerchange,
 * message) + `ready` (Promise) + `register`. El waiting es un objeto con
 * postMessage espiado y un puerto GET_VERSION para getSwVersion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerServiceWorker,
  AUTO_UPDATE_DELAY_MS,
} from '../swRegistration';
import { ACK_STORAGE_KEY } from '../swUpdateAck';
import { reloadPage } from '../pageReload';

// location.reload es non-configurable en jsdom — recarga vía pageReload.
vi.mock('../../services/pageReload', () => ({ reloadPage: vi.fn() }));
vi.mock('../pageReload', () => ({ reloadPage: vi.fn() }));

// ── Fake SW worker: responde GET_VERSION por MessageChannel y espía postMessage.
function makeWorker(version = 'chagra-v999') {
  return {
    version,
    postMessage: vi.fn(function (msg, transfer) {
      // Responder GET_VERSION por el puerto (como el SW real) para getSwVersion.
      if (msg && msg.type === 'GET_VERSION' && transfer && transfer[0]) {
        transfer[0].postMessage({ type: 'VERSION', version });
      }
    }),
  };
}

// ── Fake registration: waiting/installing + updatefound listeners.
function makeRegistration({ waiting = null, active = null } = {}) {
  const listeners = {};
  return {
    scope: '/',
    waiting,
    installing: null,
    active,
    sync: null,
    addEventListener: (type, cb) => {
      (listeners[type] ||= []).push(cb);
    },
    _emit: (type, evt) => (listeners[type] || []).forEach((cb) => cb(evt)),
  };
}

// ── Fake navigator.serviceWorker: EventTarget-ish + ready + register.
function installFakeSW({ controller = null, registration } = {}) {
  const listeners = {};
  const sw = {
    controller,
    register: vi.fn(async () => registration),
    ready: Promise.resolve(registration),
    addEventListener: (type, cb) => {
      (listeners[type] ||= []).push(cb);
    },
    removeEventListener: () => {},
    _emit: (type, evt) => (listeners[type] || []).forEach((cb) => cb(evt)),
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: sw,
  });
  return sw;
}

// Dispara window 'load' (registerServiceWorker engancha register ahí).
function fireLoad() {
  window.dispatchEvent(new Event('load'));
}

// Espera a que se resuelvan las promesas pendientes (ready.then encadenados).
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('swRegistration — AUTO-UPDATE seguro', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete navigator.serviceWorker;
    vi.useRealTimers();
  });

  it('SW en waiting → auto SKIP_WAITING tras el delay y UN solo reload por controllerchange', async () => {
    vi.useFakeTimers();
    // Ack previo distinto → no es first-install (banner permitido), y la página
    // YA tiene controller (sesión normal) → controllerchange debe recargar.
    localStorage.setItem(ACK_STORAGE_KEY, 'chagra-v100');
    const waiting = makeWorker('chagra-v999');
    const reg = makeRegistration({ waiting });
    const sw = installFakeSW({ controller: {}, registration: reg });

    registerServiceWorker();
    fireLoad();
    await flushMicrotasks();

    // Antes del delay: nada todavía.
    expect(waiting.postMessage).not.toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 10);

    // Auto-update mandó SKIP_WAITING al waiting.
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    // El SW nuevo activa → controllerchange → UN reload.
    sw._emit('controllerchange');
    expect(reloadPage).toHaveBeenCalledTimes(1);

    // Segundo controllerchange (no debería pasar, pero si pasa) → NO recarga
    // otra vez (guard `reloading`). Sin doble-reload ni loop.
    sw._emit('controllerchange');
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('first install (página SIN controller, claim-only) → NO recarga', async () => {
    vi.useFakeTimers();
    // Sin waiting (instalación inicial): el activate hace clients.claim() →
    // controllerchange por primera vez. NO debe recargar.
    const reg = makeRegistration({ waiting: null, active: makeWorker('chagra-v999') });
    const sw = installFakeSW({ controller: null, registration: reg });

    registerServiceWorker();
    fireLoad();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 10);

    // No hubo waiting → no se mandó SKIP_WAITING.
    // (el único worker es el active, no un waiting)
    expect(reg.active.postMessage).not.toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    // claim dispara controllerchange en first install → guard hadController lo
    // absorbe → NO reload.
    sw._emit('controllerchange');
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('updatefound → installed con waiting → auto SKIP_WAITING', async () => {
    vi.useFakeTimers();
    localStorage.setItem(ACK_STORAGE_KEY, 'chagra-v100');
    const reg = makeRegistration({ waiting: null });
    installFakeSW({ controller: {}, registration: reg });

    registerServiceWorker();
    fireLoad();
    await flushMicrotasks();

    // Simular ciclo de instalación de un SW nuevo.
    const installing = makeWorker('chagra-v999');
    const stateListeners = [];
    installing.addEventListener = (type, cb) => {
      if (type === 'statechange') stateListeners.push(cb);
    };
    installing.state = 'installing';
    reg.installing = installing;
    reg._emit('updatefound', {});

    // El SW termina de instalar → queda en waiting → statechange.
    installing.state = 'installed';
    reg.waiting = installing;
    stateListeners.forEach((cb) => cb());

    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 10);

    expect(installing.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('autoUpdate:false → consent-only (NO skipWaiting automático)', async () => {
    vi.useFakeTimers();
    localStorage.setItem(ACK_STORAGE_KEY, 'chagra-v100');
    const waiting = makeWorker('chagra-v999');
    const reg = makeRegistration({ waiting });
    installFakeSW({ controller: {}, registration: reg });

    registerServiceWorker({ autoUpdate: false });
    fireLoad();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 50);

    // Con auto-update apagado, NO se manda SKIP_WAITING (solo banner visible).
    expect(waiting.postMessage).not.toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('SKIP_WAITING se manda UNA sola vez aunque haya varias señales de waiting', async () => {
    vi.useFakeTimers();
    localStorage.setItem(ACK_STORAGE_KEY, 'chagra-v100');
    const waiting = makeWorker('chagra-v999');
    const reg = makeRegistration({ waiting });
    installFakeSW({ controller: {}, registration: reg });

    registerServiceWorker();
    fireLoad();
    await flushMicrotasks();

    // Segunda señal de waiting (p.ej. otro updatefound con el mismo waiting).
    reg._emit('updatefound', {});
    await flushMicrotasks();

    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 10);

    const skipCalls = waiting.postMessage.mock.calls.filter(
      ([msg]) => msg && msg.type === 'SKIP_WAITING'
    );
    expect(skipCalls).toHaveLength(1);
  });

  it('auto-update dispara chagra:sw-update-requested (controllerchange recarga SIEMPRE, aun sin controller previo)', async () => {
    vi.useFakeTimers();
    localStorage.setItem(ACK_STORAGE_KEY, 'chagra-v100');
    const waiting = makeWorker('chagra-v999');
    const reg = makeRegistration({ waiting });
    // Página arrancó SIN controller (hard reload / carga no controlada) PERO
    // hay un waiting. El auto-update debe forzar la recarga vía el evento.
    const sw = installFakeSW({ controller: null, registration: reg });

    const requested = vi.fn();
    window.addEventListener('chagra:sw-update-requested', requested);

    registerServiceWorker();
    fireLoad();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(AUTO_UPDATE_DELAY_MS + 10);

    expect(requested).toHaveBeenCalled();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    // controllerchange: aunque no había controller, userUpdateRequested=true →
    // recarga (no se traga el evento como first-install).
    sw._emit('controllerchange');
    expect(reloadPage).toHaveBeenCalledTimes(1);

    window.removeEventListener('chagra:sw-update-requested', requested);
  });

  it('SIN serviceWorker en navigator → no-op (no lanza)', () => {
    // Asegurar que no existe.
    delete navigator.serviceWorker;
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
