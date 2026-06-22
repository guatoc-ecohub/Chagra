/**
 * usageTelemetrySync.js — Sincronización de telemetría ANÓNIMA de USO de producto.
 *
 * Espejo de agentTelemetrySync.js pero para el store `pilot_telemetry`
 * (eventos de uso: game_start/complete, screen_view, feature_use, agent_query).
 *
 * Si el usuario dio consentimiento (getTelemetryConsent), drena los eventos
 * anónimos pendientes (synced !== true) al endpoint /ingest-usage del sidecar
 * y los marca como sincronizados. NUNCA envía PII: ni nombres, ni email, ni
 * GPS, ni finca_id, ni texto de prompt/respuesta.
 *
 * Flujo:
 *   1. Verifica consentimiento (getTelemetryConsent)
 *   2. Verifica que esté online (navigator.onLine)
 *   3. Construye URL `${VITE_SIDECAR_URL||'/api'}/ingest-usage`
 *   4. Lee eventos de pilot_telemetry con synced !== true
 *   5. Mapea a la forma del sidecar { id, event_type, metadata, session_id, client_ts }
 *   6. POST en lotes de <=500 con X-Chagra-Token
 *   7. Marca como sincronizados (synced: true) tras 2xx
 *   8. Falla silente (devuelve null en error)
 *
 * Env (build-time):
 *   - VITE_SIDECAR_URL: base del sidecar (default '/api').
 *   - VITE_CHAGRA_MCP_TOKEN: token compartido (header X-Chagra-Token).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

import { getTelemetryConsent } from './userProfileService.js';
import { fetchWithAuthRetry } from './apiService.js';
import { openDB, STORES } from '../db/dbCore.js';

/** Tamaño máximo de lote por POST. */
const BATCH_SIZE = 500;

/**
 * Base del sidecar agro-mcp (espejo de agentTelemetrySync.getSidecarBaseUrl).
 * @returns {string}
 */
function getSidecarBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  } catch (_) {
    // ignore
  }
  return '/api';
}

/**
 * Token compartido del sidecar (header X-Chagra-Token).
 * @returns {string}
 */
function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

/**
 * URL de ingest de telemetría de USO (endpoint /ingest-usage del sidecar).
 * Se lee en call-time (no en import) para facilitar testing con vi.stubEnv.
 * @returns {string}
 */
export function getUsageIngestUrl() {
  return `${getSidecarBaseUrl()}/ingest-usage`;
}

/**
 * URL del agregado de telemetría de USO (endpoint /telemetry/usage del sidecar).
 * @returns {string}
 */
export function getUsageSummaryUrl() {
  return `${getSidecarBaseUrl()}/telemetry/usage`;
}

/**
 * Lee del store pilot_telemetry todos los eventos con synced !== true.
 * @returns {Promise<object[]>}
 */
async function readUnsyncedEvents() {
  const db = await openDB();
  const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readonly');
  const store = tx.objectStore(STORES.PILOT_TELEMETRY);
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  return all.filter((e) => e && e.synced !== true);
}

/**
 * Marca un evento de pilot_telemetry como sincronizado (synced: true).
 * @param {object} event — evento completo (debe traer su id).
 * @returns {Promise<boolean>}
 */
async function markEventSynced(event) {
  try {
    if (!event || event.id == null) return false;
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);
    const updated = { ...event, synced: true };
    await new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (e) {
    console.debug('[usageTelemetrySync] markEventSynced error:', e);
    return false;
  }
}

/**
 * Mapea un evento de pilot_telemetry a la forma esperada por el sidecar.
 * SOLO campos anónimos. `client_ts` es epoch ms o null.
 * @param {object} e
 * @returns {object}
 */
function toSidecarShape(e) {
  return {
    id: e.id,
    event_type: e.event_type,
    metadata: e.metadata || {},
    session_id: e.session_id,
    client_ts: Date.parse(e.created_at) || null,
  };
}

/**
 * Sincroniza la telemetría de USO al sidecar (/ingest-usage).
 *
 * Solo sincroniza si hay consentimiento y está online. Procesa los eventos de
 * pilot_telemetry con synced !== true, los envía en lotes de <=500 y marca los
 * de un lote 2xx como sincronizados.
 *
 * Falla silente (devuelve null en error) para no bloquear la UX.
 *
 * @returns {Promise<{ synced: number, errors: number } | null>}
 */
export async function syncUsageTelemetry() {
  try {
    // 1. Consentimiento
    if (!getTelemetryConsent()) {
      console.debug('[usageTelemetrySync] consentimiento denegado — no sync');
      return { synced: 0, errors: 0 };
    }

    // 2. Online
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.debug('[usageTelemetrySync] offline — no sync');
      return { synced: 0, errors: 0 };
    }

    // 3. Eventos pendientes
    const pending = await readUnsyncedEvents();
    if (pending.length === 0) {
      console.debug('[usageTelemetrySync] no hay eventos pendientes de sync');
      return { synced: 0, errors: 0 };
    }

    const url = getUsageIngestUrl();
    const token = getToken();

    let syncedCount = 0;
    let errorsCount = 0;

    // 4. POST en lotes de <=500
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const payload = batch.map(toSidecarShape);

      let response;
      try {
        response = await fetchWithAuthRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Chagra-Token': token } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.debug('[usageTelemetrySync] error de red en lote:', e);
        errorsCount += batch.length;
        continue;
      }

      if (!response || !response.ok) {
        console.warn(`[usageTelemetrySync] endpoint respondió ${response?.status}`);
        errorsCount += batch.length;
        continue;
      }

      // 5. Marcar el lote como sincronizado.
      for (const event of batch) {
        const marked = await markEventSynced(event);
        if (marked) syncedCount += 1;
        else errorsCount += 1;
      }
    }

    console.debug(`[usageTelemetrySync] sincronizados ${syncedCount}, errors ${errorsCount}`);
    return { synced: syncedCount, errors: errorsCount };
  } catch (e) {
    console.debug('[usageTelemetrySync] error en sync (falla silente):', e);
    return null; // Falla silente — no bloquea UX
  }
}

/**
 * Trae el agregado anónimo de uso desde el sidecar (/telemetry/usage).
 * Usado por el dashboard del operador.
 *
 * @returns {Promise<object|null>} JSON parseado, o null en error.
 */
export async function fetchUsageSummary() {
  try {
    const url = getUsageSummaryUrl();
    const token = getToken();
    const response = await fetchWithAuthRetry(url, {
      method: 'GET',
      headers: {
        ...(token ? { 'X-Chagra-Token': token } : {}),
      },
    });
    if (!response || !response.ok) {
      console.warn(`[usageTelemetrySync] /telemetry/usage respondió ${response?.status}`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.debug('[usageTelemetrySync] fetchUsageSummary error (falla silente):', e);
    return null;
  }
}
