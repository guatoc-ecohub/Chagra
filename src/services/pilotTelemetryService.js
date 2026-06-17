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
 *     created_at: ISO,
 *     synced: false,
 *   }
 */

import { openDB, STORES } from '../db/dbCore.js';

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `pt_${timestamp}${random}`;
};

/**
 * Registra un evento anónimo de piloto. Falla silente si IndexedDB no
 * está disponible — la telemetría NUNCA debe romper la UX.
 *
 * @param {{ event_type: string, metadata?: object }} params
 * @returns {Promise<object|null>} el registro creado, o null si falló.
 */
export const recordPilotEvent = async ({ event_type, metadata = {} } = {}) => {
  if (!event_type || typeof event_type !== 'string') return null;

  const record = {
    id: generateId(),
    event_type,
    metadata: sanitizeMetadata(metadata),
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
