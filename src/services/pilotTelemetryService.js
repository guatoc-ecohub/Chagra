/**
 * pilotTelemetryService.js — Telemetría por piloto (#7005) para monitoreo e2e.
 *
 * Captura por usuario piloto (con consentimiento explícito vía userProfileService)
 * los metadatos de uso: queries, errores, minutos de audio, módulos usados.
 * Privacy-first: NO prompt completo, NO PII, NO coords precisas. Solo metadata
 * agregada para mejorar el producto en tiempo real.
 *
 * Schema del evento:
 *   {
 *     id: 'pt_<ts36><rand36>',
 *     event_type: 'query' | 'error' | 'audio_min' | 'module_use',
 *     module: string,              // módulo que generó el evento (ej: 'agent', 'voice', 'vision')
 *     metadata: { ... },            // metadata específica del evento (sin PII)
 *     created_at: ISO,
 *     synced: false,
 *   }
 *
 * Privacy (ADR-030 Regla 9 extendida):
 * - NUNCA persiste prompt completo del usuario
 * - NUNCA coords precisas (solo región/municipio si disponible)
 * - NUNCA transcripciones literales de audio
 * - SOLO metadata agregada: conteos, latencias, módulos, tipos de error
 *
 * Backend: IndexedDB store `pilot_telemetry` (dbCore v25).
 * Sync: POST al endpoint /ingest (mismo que agentTelemetrySync).
 */

import { openDB, STORES } from '../db/dbCore.js';
import { getTelemetryConsent } from './userProfileService.js';

const RETAIN_MAX = 2000; // cap defensivo — purga oldest al sobrepasar

/**
 * Genera un ID único para el evento de telemetría piloto.
 */
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `pt_${timestamp}${random}`;
};

/**
 * Verifica si la telemetría piloto está habilitada.
 * Requiere consentimiento explícito del usuario.
 */
const isEnabled = () => {
  return getTelemetryConsent();
};

/**
 * Registra un evento de telemetría piloto.
 *
 * @param {Object} event - evento a registrar
 * @param {string} event.event_type - tipo de evento: 'query' | 'error' | 'audio_min' | 'module_use'
 * @param {string} event.module - módulo que generó el evento
 * @param {Object} event.metadata - metadata específica del evento (sin PII)
 * @returns {Promise<Object|null>} evento persistido, o null si falló o sin consentimiento
 */
export const recordPilotEvent = async (event) => {
  if (!isEnabled()) {
    console.debug('[pilotTelemetry] consentimiento denegado — no registra evento');
    return null;
  }

  if (!event || typeof event !== 'object') {
    console.warn('[pilotTelemetry] evento inválido');
    return null;
  }

  const { event_type, module, metadata = {} } = event;

  if (!event_type || !module) {
    console.warn('[pilotTelemetry] falta event_type o module');
    return null;
  }

  // Validar event_type
  const validTypes = ['query', 'error', 'audio_min', 'module_use'];
  if (!validTypes.includes(event_type)) {
    console.warn(`[pilotTelemetry] event_type inválido: ${event_type}`);
    return null;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);

    const record = {
      id: generateId(),
      event_type,
      module,
      metadata: sanitizeMetadata(metadata),
      created_at: new Date().toISOString(),
      synced: false,
    };

    store.add(record);

    return await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] recordPilotEvent failed:', err);
    return null;
  }
};

/**
 * Sanitiza metadata para asegurar que no contiene PII ni datos sensibles.
 *
 * @param {Object} metadata - metadata original
 * @returns {Object} metadata sanitizada
 */
const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return {};

  const sanitized = {};

  // Campos permitidos (whitelist approach para privacidad)
  const allowedKeys = [
    // Para eventos 'query'
    'route', 'model', 'latency_ms', 'tokens_in', 'tokens_out', 'has_rag', 'has_vision',
    // Para eventos 'error'
    'error_kind', 'error_code', 'context_type', 'retry_count',
    // Para eventos 'audio_min'
    'duration_seconds', 'flujo', 'accepted', 'edits',
    // Para eventos 'module_use'
    'action', 'item_count', 'success',
  ];

  for (const key of allowedKeys) {
    if (key in metadata) {
      sanitized[key] = metadata[key];
    }
  }

  return sanitized;
};

/**
 * Devuelve los eventos pendientes de sincronización.
 *
 * @param {number} limit - máximo número de eventos a devolver
 * @returns {Promise<Array>} eventos pendientes de sync
 */
export const getPendingEvents = async (limit = 100) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readonly');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);

    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false), limit);

    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] getPendingEvents failed:', err);
    return [];
  }
};

/**
 * Marca un set de eventos como sincronizados.
 *
 * @param {Array<string>} eventIds - IDs de eventos a marcar como sincronizados
 * @returns {Promise<void>}
 */
export const markSynced = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);

    for (const id of eventIds) {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.synced = true;
          event.synced_at = new Date().toISOString();
          store.put(event);
        }
      };
    }

    return await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] markSynced failed:', err);
  }
};

/**
 * Devuelve todos los eventos ordenados por created_at (desc).
 *
 * @param {number} limit - máximo número de eventos a devolver
 * @returns {Promise<Array>} eventos ordenados
 */
export const getAllEvents = async (limit = 1000) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readonly');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);

    const index = store.index('created_at');
    const events = [];
    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] getAllEvents failed:', err);
    return [];
  }
};

/**
 * Calcula métricas agregadas de telemetría piloto.
 *
 * @returns {Promise<Object>} métricas agregadas
 */
export const getMetrics = async () => {
  const events = await getAllEvents();

  const queryEvents = events.filter(e => e.event_type === 'query');
  const errorEvents = events.filter(e => e.event_type === 'error');
  const audioEvents = events.filter(e => e.event_type === 'audio_min');
  const moduleEvents = events.filter(e => e.event_type === 'module_use');

  const totalPending = events.filter(e => !e.synced).length;

  // Agrupar por módulo
  const byModule = {};
  for (const e of events) {
    if (!byModule[e.module]) {
      byModule[e.module] = {
        total: 0,
        queries: 0,
        errors: 0,
        audio_min: 0,
      };
    }
    byModule[e.module].total += 1;
    if (e.event_type === 'query') byModule[e.module].queries += 1;
    if (e.event_type === 'error') byModule[e.module].errors += 1;
    if (e.event_type === 'audio_min') byModule[e.module].audio_min += 1;
  }

  // Agrupar errores por tipo
  const errorsByKind = {};
  for (const e of errorEvents) {
    const kind = e.metadata?.error_kind || 'unknown';
    errorsByKind[kind] = (errorsByKind[kind] || 0) + 1;
  }

  // Total minutos de audio
  const totalAudioSeconds = audioEvents.reduce((sum, e) => sum + (e.metadata?.duration_seconds || 0), 0);
  const totalAudioMinutes = Math.round(totalAudioSeconds / 60);

  return {
    total_events: events.length,
    pending_sync: totalPending,
    by_event_type: {
      query: queryEvents.length,
      error: errorEvents.length,
      audio_min: audioEvents.length,
      module_use: moduleEvents.length,
    },
    by_module: byModule,
    errors_by_kind: errorsByKind,
    audio: {
      total_seconds: totalAudioSeconds,
      total_minutes: totalAudioMinutes,
    },
  };
};

/**
 * Mantiene el store por debajo de RETAIN_MAX (LRU por created_at).
 * Idempotente y barato — corre opcionalmente al registrar eventos.
 *
 * @returns {Promise<number>} número de eventos eliminados
 */
export const pruneEvents = async () => {
  try {
    const db = await openDB();
    const countTx = db.transaction(STORES.PILOT_TELEMETRY, 'readonly');
    const count = await new Promise((resolve, reject) => {
      const req = countTx.objectStore(STORES.PILOT_TELEMETRY).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count <= RETAIN_MAX) return 0;

    const excess = count - RETAIN_MAX;
    const delTx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const index = delTx.objectStore(STORES.PILOT_TELEMETRY).index('created_at');
    let removed = 0;
    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, 'next');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && removed < excess) {
          cursor.delete();
          removed += 1;
          cursor.continue();
        } else {
          resolve(removed);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] pruneEvents failed:', err);
    return 0;
  }
};

/**
 * Limpia eventos sincronizados anteriores a olderThanDays.
 * No-throw (mantenimiento best-effort).
 *
 * @param {number} olderThanDays - días de antigüedad mínima para eliminar
 * @returns {Promise<void>}
 */
export const clearSyncedEvents = async (olderThanDays = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffISO = cutoff.toISOString();

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PILOT_TELEMETRY, 'readwrite');
    const store = tx.objectStore(STORES.PILOT_TELEMETRY);

    const index = store.index('synced');
    const request = index.openCursor(IDBKeyRange.only(true));

    return await new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const e = cursor.value;
          if (e.synced_at && e.synced_at < cutoffISO) {
            store.delete(e.id);
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[pilotTelemetry] clearSyncedEvents failed:', err);
  }
};

/**
 * Exporta los eventos a JSON para auditoría.
 * No incluye datos sensibles (solo metadata agregada).
 *
 * @param {string} format - formato de exportación ('json' | 'csv')
 * @returns {Promise<string>} eventos exportados
 */
export const exportTelemetry = async (format = 'json') => {
  const events = await getAllEvents(RETAIN_MAX);
  if (format === 'csv') {
    const headers = ['id', 'created_at', 'event_type', 'module', 'synced'];
    const metadataKeys = new Set();
    for (const e of events) {
      if (e.metadata) {
        Object.keys(e.metadata).forEach(k => metadataKeys.add(k));
      }
    }
    const allHeaders = [...headers, ...Array.from(metadataKeys).sort()];

    const rows = events.map((e) => {
      const metadataValues = Array.from(metadataKeys).map(k =>
        e.metadata?.[k] ?? ''
      );
      return [...headers.map(h => e[h] ?? ''), ...metadataValues].join(',');
    });
    return [allHeaders.join(','), ...rows].join('\n');
  }
  return JSON.stringify(events, null, 2);
};

/**
 * Helpers específicos para registrar tipos de eventos comunes.
 */

/**
 * Registra un evento de query al agente.
 *
 * @param {Object} params - parámetros del query
 * @returns {Promise<Object|null>} evento registrado
 */
export const recordQuery = async ({ route, model, latency_ms, tokens_in, tokens_out, has_rag, has_vision }) => {
  return recordPilotEvent({
    event_type: 'query',
    module: 'agent',
    metadata: {
      route: route || 'unknown',
      model: model || 'unknown',
      latency_ms: latency_ms || null,
      tokens_in: tokens_in || null,
      tokens_out: tokens_out || null,
      has_rag: Boolean(has_rag),
      has_vision: Boolean(has_vision),
    },
  });
};

/**
 * Registra un evento de error.
 *
 * @param {Object} params - parámetros del error
 * @returns {Promise<Object|null>} evento registrado
 */
export const recordError = async ({ module, error_kind, error_code, context_type, retry_count }) => {
  return recordPilotEvent({
    event_type: 'error',
    module: module || 'unknown',
    metadata: {
      error_kind: error_kind || 'unknown',
      error_code: error_code || null,
      context_type: context_type || null,
      retry_count: retry_count || 0,
    },
  });
};

/**
 * Registra un evento de minutos de audio.
 *
 * @param {Object} params - parámetros del audio
 * @returns {Promise<Object|null>} evento registrado
 */
export const recordAudioMin = async ({ duration_seconds, flujo, accepted, edits }) => {
  return recordPilotEvent({
    event_type: 'audio_min',
    module: 'voice',
    metadata: {
      duration_seconds: duration_seconds || 0,
      flujo: flujo || 'unknown',
      accepted: Boolean(accepted),
      edits: edits || 0,
    },
  });
};

/**
 * Registra un evento de uso de módulo.
 *
 * @param {Object} params - parámetros del uso de módulo
 * @returns {Promise<Object|null>} evento registrado
 */
export const recordModuleUse = async ({ module, action, item_count, success }) => {
  return recordPilotEvent({
    event_type: 'module_use',
    module: module || 'unknown',
    metadata: {
      action: action || 'unknown',
      item_count: item_count || null,
      success: Boolean(success),
    },
  });
};

/**
 * Sincroniza la telemetría piloto al backend /ingest.
 * Sigue el mismo patrón que agentTelemetrySync.syncAgentTelemetry.
 *
 * @returns {Promise<{ synced: number, errors: number } | null>}
 */
export const syncPilotTelemetry = async () => {
  try {
    // 1. Verificar consentimiento
    if (!isEnabled()) {
      console.debug('[pilotTelemetry] consentimiento denegado — no sync');
      return { synced: 0, errors: 0 };
    }

    // 2. Verificar online
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.debug('[pilotTelemetry] offline — no sync');
      return { synced: 0, errors: 0 };
    }

    // 3. Obtener URL del endpoint /ingest
    let telemetryUrl;
    try {
      const explicit = import.meta.env?.VITE_TELEMETRY_INGEST_URL;
      if (typeof explicit === 'string' && explicit.trim()) {
        telemetryUrl = explicit.trim();
      } else {
        // Fallback a sidecar (como agentTelemetrySync)
        const sidecarUrl = import.meta.env?.VITE_SIDECAR_URL;
        const baseUrl = typeof sidecarUrl === 'string' && sidecarUrl.trim()
          ? sidecarUrl.trim().replace(/\/+$/, '')
          : '/api';
        telemetryUrl = `${baseUrl}/ingest`;
      }
    } catch (_) {
      telemetryUrl = '/api/ingest';
    }

    if (!telemetryUrl) {
      console.debug('[pilotTelemetry] VITE_TELEMETRY_INGEST_URL no configurado — no sync');
      return { synced: 0, errors: 0 };
    }

    // 4. Obtener eventos pendientes
    const pendingEvents = await getPendingEvents(500);

    if (pendingEvents.length === 0) {
      console.debug('[pilotTelemetry] no hay eventos pendientes de sync');
      return { synced: 0, errors: 0 };
    }

    // 5. Preparar payload (anonimizado por diseño)
    const payload = pendingEvents.map(e => ({
      id: e.id,
      event_type: e.event_type,
      module: e.module,
      metadata: e.metadata,
      created_at: e.created_at,
    }));

    // 6. POST al endpoint
    let token;
    try {
      token = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    } catch (_) {
      token = '';
    }

    const response = await fetch(telemetryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Chagra-Token': token } : {}),
      },
      body: JSON.stringify({ source: 'pilot_telemetry', events: payload }),
    });

    if (!response.ok) {
      console.warn(`[pilotTelemetry] endpoint respondió ${response.status}`);
      return { synced: 0, errors: payload.length };
    }

    // 7. Marcar como sincronizados
    const syncedIds = pendingEvents.map(e => e.id);
    await markSynced(syncedIds);

    console.debug(`[pilotTelemetry] sincronizados ${syncedIds.length}`);
    return { synced: syncedIds.length, errors: 0 };
  } catch (e) {
    console.debug('[pilotTelemetry] error en sync (falla silente):', e);
    return null; // Falla silente — no bloquea UX
  }
};

/**
 * Devuelve si la sincronización está habilitada.
 * Útil para UI que muestra estado de sync.
 *
 * @returns {boolean}
 */
export const isTelemetrySyncEnabled = () => {
  if (!isEnabled()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const telemetryUrl = import.meta.env?.VITE_TELEMETRY_INGEST_URL;
    if (!telemetryUrl) return true; // fallback a sidecar
    return typeof telemetryUrl === 'string' && telemetryUrl.trim();
  } catch (_) {
    return true;
  }
};
