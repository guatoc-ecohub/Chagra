/**
 * agentTelemetrySync.js — Sincronización de telemetría rica del agente (#6230).
 *
 * Si el usuario dio consentimiento (via userProfileService.setTelemetryConsent),
 * envía los metadatos anónimos de las consultas completadas al backend de
 * telemetría. NO envía prompts completos (privacidad-first) ni PII.
 *
 * Flujo:
 *   1. Verifica consentimiento (getTelemetryConsent)
 *   2. Verifica que esté online (navigator.onLine)
 *   3. Verifica que VITE_TELEMETRY_INGEST_URL esté configurado
 *   4. Obtiene requests con status='done' de agentRequestQueue.listRequests()
 *   5. Filtra los no sincronizados (synced !== true)
 *   6. Anonimiza (remueve prompt completo, mantiene metadata)
 *   7. POST al endpoint en batch
 *   8. Marca como sincronizados (synced: true)
 *   9. Falla silente (no bloquea UX)
 *
 * Env variable (build-time):
 *   - VITE_TELEMETRY_INGEST_URL: URL del endpoint /ingest (default '' = no-op)
 *
 * Schema del payload enviado (anónimo):
 *   [
 *     {
 *       id: number,
 *       ts_submit: number,
 *       ts_done: number,
 *       route: string,
 *       model: string,
 *       grounding: { ... },    // sin PII
 *       latency: { ... },      // agregados
 *       tokens_in: number,
 *       tokens_out: number,
 *       retries: number,
 *     },
 *     ...
 *   ]
 *
 * NO incluye:
 *   - prompt (puede contener datos sensibles del usuario)
 *   - response (puede contener datos sensibles)
 *   - user_id, finca_id, coords (PII)
 */

import { getTelemetryConsent } from './userProfileService.js';
import { listRequests, getRequest } from './agentRequestQueue.js';

/**
 * Devuelve la URL de ingest de telemetría.
 * Leer en tiempo de ejecución (no en import) para facilitar testing.
 *
 * @returns {string}
 */
export function getTelemetryIngestUrl() {
  return import.meta.env.VITE_TELEMETRY_INGEST_URL || '';
}

/**
 * Anonimiza un request del agente removiendo PII y datos sensibles.
 *
 * @param {Object} request - request completo de agentRequestQueue
 * @returns {Object} request anonimizado
 */
function anonymizeRequest(request) {
  if (!request || typeof request !== 'object') return null;

  return {
    id: request.id,
    ts_submit: request.ts_submit,
    ts_done: request.ts_done,
    route: request.route || 'unknown',
    model: request.model || 'default',
    grounding: request.grounding || {},
    latency: request.latency || {},
    tokens_in: request.tokens_in,
    tokens_out: request.tokens_out,
    retries: request.retries || 0,
  };
}

/**
 * Marca un request como sincronizado (synced: true).
 *
 * @param {number} id - id del request
 * @returns {Promise<boolean>}
 */
async function markRequestSynced(id) {
  try {
    const item = await getRequest(id);
    if (!item) return false;

    const { openDB, STORES } = await import('../db/dbCore.js');
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);

    item.synced = true;
    await new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return true;
  } catch (e) {
    console.debug('[agentTelemetrySync] markRequestSynced error:', e);
    return false;
  }
}

/**
 * Sincroniza la telemetría del agente al backend.
 *
 * Solo sincroniza si:
 *   - Hay consentimiento del usuario (getTelemetryConsent)
 *   - Está online (navigator.onLine)
 *   - VITE_TELEMETRY_INGEST_URL está configurado
 *
 * Procesa requests con status='done' y synced !== true, los anonimiza
 * y los envía en batch al endpoint. Luego marca como sincronizados.
 *
 * Falla silente (devuelve null en caso de error) para no bloquear la UX.
 *
 * @returns {Promise<{ synced: number, errors: number } | null>}
 */
export async function syncAgentTelemetry() {
  try {
    // 1. Verificar consentimiento
    if (!getTelemetryConsent()) {
      console.debug('[agentTelemetrySync] consentimiento denegado — no sync');
      return { synced: 0, errors: 0 };
    }

    // 2. Verificar online
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.debug('[agentTelemetrySync] offline — no sync');
      return { synced: 0, errors: 0 };
    }

    // 3. Verificar endpoint configurado
    const telemetryUrl = getTelemetryIngestUrl();
    if (!telemetryUrl || typeof telemetryUrl !== 'string') {
      console.debug('[agentTelemetrySync] VITE_TELEMETRY_INGEST_URL no configurado — no sync');
      return { synced: 0, errors: 0 };
    }

    // 4. Obtener requests completados
    const allRequests = await listRequests();
    const doneRequests = allRequests.filter((r) => r.status === 'done' && r.synced !== true);

    if (doneRequests.length === 0) {
      console.debug('[agentTelemetrySync] no hay requests pendientes de sync');
      return { synced: 0, errors: 0 };
    }

    // 5. Anonimizar requests
    const payload = doneRequests.map(anonymizeRequest).filter(Boolean);

    if (payload.length === 0) {
      console.debug('[agentTelemetrySync] payload vacío tras anonimización');
      return { synced: 0, errors: 0 };
    }

    // 6. POST al endpoint
    const response = await fetch(telemetryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[agentTelemetrySync] endpoint respondió ${response.status}`);
      return { synced: 0, errors: payload.length };
    }

    // 7. Marcar como sincronizados
    let syncedCount = 0;
    let errorsCount = 0;

    for (const request of doneRequests) {
      const marked = await markRequestSynced(request.id);
      if (marked) {
        syncedCount++;
      } else {
        errorsCount++;
      }
    }

    console.debug(`[agentTelemetrySync] sincronizados ${syncedCount}, errors ${errorsCount}`);
    return { synced: syncedCount, errors: errorsCount };
  } catch (e) {
    console.debug('[agentTelemetrySync] error en sync (falla silente):', e);
    return null; // Falla silente — no bloquea UX
  }
}

/**
 * Devuelve si la sincronización está habilitada (consentimiento + online + URL).
 * Útil para UI que muestra estado de sync.
 *
 * @returns {boolean}
 */
export function isTelemetrySyncEnabled() {
  if (!getTelemetryConsent()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const telemetryUrl = getTelemetryIngestUrl();
  if (!telemetryUrl || typeof telemetryUrl !== 'string') return false;
  return true;
}
