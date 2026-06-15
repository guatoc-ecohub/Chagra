/**
 * test-utils/fetch-mocks.js — Factories de Response mock para tests.
 *
 * Evita duplicar las funciones okResponse/errResponse en 33+ archivos
 * de test que stubbean fetch global.
 *
 * @module test-utils/fetch-mocks
 */

/**
 * Crea una Response mock exitosa (200 OK).
 * @param {*} json - objeto que retornara response.json().
 * @returns {{ ok: true, status: 200, statusText: string, json: () => Promise<*> }}
 */
export function okResponse(json) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => json };
}

/**
 * Crea una Response mock de error HTTP.
 * @param {number} status - codigo HTTP (ej. 500, 404).
 * @param {string} [statusText='Error'] - texto del status.
 * @param {*} [jsonBody={}] - cuerpo opcional para response.json().
 * @returns {{ ok: false, status: number, statusText: string, json: () => Promise<*> }}
 */
export function errResponse(status, statusText = 'Error', jsonBody = {}) {
  return { ok: false, status, statusText, json: async () => jsonBody };
}

/**
 * Crea una Response mock con headers (para Content-Type etc.).
 * @param {object} overrides - propiedades adicionales de la Response mock.
 * @returns {object}
 */
export function customResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    text: async () => '',
    headers: { get: () => null },
    ...overrides,
  };
}
