/**
 * pilotTelemetryService.js — Telemetría anónima de pilotos (v1 2026-06-16).
 *
 * Registra eventos de uso anónimos para monitorear adopción y uso de Chagra
 * durante el piloto. Sigue el patrón IndexedDB + /ingest de llmTelemetryService.
 *
 * Privacy (innegociable):
 * - NUNCA persiste user_id, nombres, emails, GPS coords, teléfonos.
 * - NUNCA persiste texto de prompt, respuesta, ni conversación.
 * - Solo timestamp, event_type, y metadata numérica/categórica.
 * - Falla silente si IndexedDB no está disponible (console.warn, return null).
 *
 * Schema del evento:
 *   {
 *     id: 'pt_<ts36><rand36>',
 *     event_type: string,
 *     metadata: { ... } (solo valores numéricos, booleanos o strings categóricos),
 *     session_id: 'as_<ts36><rand>',  // id de SESIÓN anónima y efímera
 *     created_at: ISO,
 *     synced: false,
 *   }
 *
 * Sobre `session_id` (privacy): es un identificador ANÓNIMO y EFÍMERO de la
 * sesión del navegador (sessionStorage; rota al cerrar la pestaña). NO es PII:
 * no se deriva de username, email ni de ningún dato del usuario. Su único uso
 * es contar SESIONES DISTINTAS de forma agregada en el sidecar
 * (active_sessions). Nunca permite re-identificar a una persona.
 */

import { openDB, STORES } from '../db/dbCore.js';

/**
 * Genera un sufijo aleatorio opaco (base36) usando un PRNG criptográficamente
 * seguro (`crypto.getRandomValues`). Se usa para los ids de evento (`pt_*`) y
 * de sesión anónima (`as_*`).
 *
 * Aunque estos ids son anónimos y efímeros, un `session_id` es un valor
 * sensible a la seguridad (CodeQL js/insecure-randomness): si fuera predecible,
 * un atacante podría adivinar/falsificar sesiones en la telemetría agregada.
 * Por eso NO usamos `Math.random()`. Caemos a `Math.random()` solo si la
 * Web Crypto API no está disponible (entornos muy antiguos / SSR sin polyfill),
 * para no romper la UX — la telemetría nunca debe lanzar.
 *
 * @param {number} len - cantidad de caracteres base36 a producir.
 * @returns {string} sufijo aleatorio de longitud `len`.
 */
const secureRandomSuffix = (len = 8) => {
  const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
  const cryptoObj =
    (typeof globalThis !== 'undefined' && globalThis.crypto) ||
    (typeof self !== 'undefined' && self.crypto) ||
    (typeof window !== 'undefined' && window.crypto) ||
    null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(len);
    cryptoObj.getRandomValues(bytes);
    // b % 36 introduce un sesgo mínimo e irrelevante para un id opaco.
    return Array.from(bytes, (b) => ALPHABET[b % 36]).join('');
  }
  // Fallback no-crypto: solo si no hay Web Crypto API. No debe ocurrir en
  // navegadores soportados; la telemetría jamás debe romper la UX.
  let out = '';
  while (out.length < len) {
    out += Math.random().toString(36).substring(2);
  }
  return out.substring(0, len);
};

const generateId = () => {
  const timestamp = Date.now().toString(36);
  return `pt_${timestamp}${secureRandomSuffix(8)}`;
};

// Clave de sessionStorage para el id de sesión anónima de uso.
const ANON_SESSION_KEY = 'chagra:anon-usage-session';
// Fallback en memoria si sessionStorage no está disponible (modo privado, SSR,
// etc.). Vive lo que viva el módulo cargado — equivale a "una sesión".
let inMemoryAnonSession = null;

/**
 * Devuelve un id de SESIÓN anónima y efímera para la telemetría de uso.
 *
 * - Se persiste en sessionStorage bajo `chagra:anon-usage-session`, así que rota
 *   por sesión de navegador (se pierde al cerrar la pestaña/ventana).
 * - Formato `as_<ts36><rand>` — opaco, sin relación con el usuario.
 * - Si sessionStorage no está disponible, usa un fallback en memoria.
 *
 * NO es PII: solo sirve para contar sesiones distintas de forma agregada.
 *
 * @returns {string} id de sesión anónima.
 */
export const getAnonSessionId = () => {
  const mint = () => `as_${Date.now().toString(36)}${secureRandomSuffix(8)}`;
  try {
    if (typeof sessionStorage !== 'undefined') {
      let id = sessionStorage.getItem(ANON_SESSION_KEY);
      if (!id) {
        id = mint();
        sessionStorage.setItem(ANON_SESSION_KEY, id);
      }
      return id;
    }
  } catch (_) {
    // sessionStorage bloqueado: caer al fallback en memoria.
  }
  if (!inMemoryAnonSession) inMemoryAnonSession = mint();
  return inMemoryAnonSession;
};

/**
 * Registra un evento anónimo de piloto. Falla silente si IndexedDB no
 * está disponible — la telemetría NUNCA debe romper la UX.
 *
 * @param {{ event_type: string, metadata?: object }} params
 * @returns {Promise<object|null>} el registro creado, o null si falló.
 */
export const recordPilotEvent = async (params = /** @type {any} */ ({})) => {
  const { event_type, metadata = {} } = params;
  if (!event_type || typeof event_type !== 'string') return null;

  const record = {
    id: generateId(),
    event_type,
    metadata: sanitizeMetadata(metadata),
    session_id: getAnonSessionId(),
    created_at: new Date().toISOString(),
    synced: false,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    tx.objectStore(STORES.PILOT_TELEMETRY).add(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return record;
  } catch (_err) {
    console.warn('[pilotTelemetry] IndexedDB no disponible, evento no registrado:', _err);
    return null;
  }
};

/**
 * Sanitiza metadata: solo permite valores numéricos, booleanos o strings
 * cortos. Descarta arrays, objetos anidados y strings largos (>200 chars)
 * y cualquier key que represente PII (nombres, emails, coords, etc.).
 */
function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  const PII_KEYS = new Set([
    'user_id', 'operator_id', 'nombre', 'name', 'email', 'correo',
    'telefono', 'phone', 'celular', 'gps_lat', 'gps_lng', 'lat', 'lng',
    'latitude', 'longitude', 'coords', 'direccion', 'address',
    'prompt_text', 'response_text', 'conversation', 'user_input',
    'identificacion', 'cedula', 'documento',
  ]);
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (typeof v === 'string' && v.length <= 200) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Agrega conteos por event_type. Útil para monitorear adopción.
 *
 * @returns {Promise<object>} { [event_type]: count }
 */
export const getPilotMetrics = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readonly');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    const counts = {};
    for (const e of all) {
      const t = e.event_type || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  } catch (_) {
    return {};
  }
};

/**
 * Elimina eventos más viejos que `olderThanDays`.
 *
 * @param {number} olderThanDays
 * @returns {Promise<number>} cantidad de eventos eliminados.
 */
export const clearOldEvents = async (olderThanDays = 30) => {
  if (typeof olderThanDays !== 'number' || olderThanDays <= 0) return 0;
  try {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);
    const index = store.index('created_at');
    let removed = 0;
    return new Promise((resolve, reject) => {
      const req = index.openCursor(IDBKeyRange.upperBound(cutoff));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          removed += 1;
          cursor.continue();
        } else {
          resolve(removed);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return 0;
  }
};
