/**
 * test-utils/online.js — Helper compartido para tests offline/online.
 *
 * Stubea navigator.onLine en tests jsdom sin depender de red real.
 * Usado en 7+ tests de servicios que validan contratos offline-first.
 *
 * @module test-utils/online
 */

/**
 * Configura navigator.onLine para tests.
 * @param {boolean} value - true para simular online, false para offline.
 */
export function setOnline(value) {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}
