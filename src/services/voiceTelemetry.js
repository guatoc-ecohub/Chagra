/**
 * voiceTelemetry.js — Telemetría de comandos de voz.
 *
 * Captura eventos del pipeline VoiceCapture (grabar → transcribir → extraer
 * → guardar) y permite agregación offline + exportación opcional (CSV/JSON).
 *
 * Patrón de eventos alineado con TelemetryAlerts.logTelemetryEvent:
 *   window.dispatchEvent(new CustomEvent('farmosLog', { detail: '<kind>: <msg>' }))
 *   + console.log/debug según localStorage 'chagra:debug:telemetry'.
 *
 * Almacenamiento: sessionStorage (eventos de sesión) + localStorage (persistente
 * para agregación entre sesiones, con TTL 7 días).
 */

const STORAGE_KEY_PREFIX = 'chagra:voice:telemetry';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_MAP = { '1d': 86400000, '7d': 604800000, '30d': 2592000000, 'never': Infinity };

const STORAGE_KEY = `${STORAGE_KEY_PREFIX}:events`;
const STORAGE_META = `${STORAGE_KEY_PREFIX}:meta`;
const STORAGE_ENABLED = `${STORAGE_KEY_PREFIX}:enabled`;
const STORAGE_TTL = `${STORAGE_KEY_PREFIX}:ttl`;

const getEffectiveTtl = () => {
  const raw = localStorage.getItem(STORAGE_TTL);
  return raw && TTL_MAP[raw] != null ? TTL_MAP[raw] : DEFAULT_TTL_MS;
};

const logEventToStorage = (kind, payload, level) => {
  const entry = {
    ts: Date.now(),
    kind,
    payload,
    level,
  };

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.push(entry);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (_) { /* noop */ }

  try {
    const metaRaw = localStorage.getItem(STORAGE_META);
    const meta = metaRaw ? JSON.parse(metaRaw) : { firstEvent: Date.now(), lastEvent: Date.now() };
    meta.lastEvent = Date.now();
    if (!meta.firstEvent) meta.firstEvent = Date.now();
    localStorage.setItem(STORAGE_META, JSON.stringify(meta));
  } catch (_) { /* noop */ }
};

export const logVoiceEvent = (kind, payload = {}, level = 'info') => {
  const enabled = localStorage.getItem(STORAGE_ENABLED);
  if (enabled === '0') return;

  const isDebug = localStorage.getItem('chagra:debug:telemetry') === '1';
  const detail = `[${kind}] ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;

  if (isDebug) console[level](detail);

  window.dispatchEvent(new CustomEvent('farmosLog', {
    detail: `${kind}: ${payload.message || payload.error || payload.action || 'evento general'}`,
  }));

  logEventToStorage(kind, payload, level);
};

export const getSessionEvents = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const getPersistedMeta = () => {
  try {
    const raw = localStorage.getItem(STORAGE_META);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const isExpired = (meta) => {
  if (!meta) return true;
  const ttl = getEffectiveTtl();
  if (ttl === Infinity) return false;
  return Date.now() - meta.lastEvent > ttl;
};

export const aggregateVoiceMetrics = () => {
  const events = getSessionEvents();
  const meta = getPersistedMeta();

  const recordings = events.filter((e) => e.kind === 'voice:recording_started').length;
  const transcriptionsStarted = events.filter((e) => e.kind === 'voice:transcription_started').length;
  const transcriptionsDone = events.filter((e) => e.kind === 'voice:transcription_done').length;
  const transcriptionsFailed = events.filter((e) => e.kind === 'voice:transcription_failed').length;
  const extractionDone = events.filter((e) => e.kind === 'voice:extraction_done').length;
  const extractionFailed = events.filter((e) => e.kind === 'voice:extraction_failed').length;
  const savesDone = events.filter((e) => e.kind === 'voice:save_done').length;
  const savesFailed = events.filter((e) => e.kind === 'voice:save_failed').length;
  const reprocessCount = events.filter((e) => e.kind === 'voice:reprocess_started').length;
  const discardCount = events.filter((e) => e.kind === 'voice:discarded').length;

  const durationEvents = events.filter((e) => e.kind === 'voice:recording_stopped' && e.payload?.durationMs);
  const totalRecordingMs = durationEvents.reduce((sum, e) => sum + (e.payload.durationMs || 0), 0);
  const avgRecordingMs = durationEvents.length > 0 ? Math.round(totalRecordingMs / durationEvents.length) : 0;

  const textEvents = events.filter((e) => e.kind === 'voice:transcription_done' && e.payload?.textLength);
  const totalTextChars = textEvents.reduce((sum, e) => sum + (e.payload.textLength || 0), 0);
  const avgTextChars = textEvents.length > 0 ? Math.round(totalTextChars / textEvents.length) : 0;

  const entityEvents = events.filter((e) => e.kind === 'voice:extraction_done' && e.payload?.entityCount != null);
  const totalEntities = entityEvents.reduce((sum, e) => sum + (e.payload.entityCount || 0), 0);
  const avgEntities = entityEvents.length > 0 ? (totalEntities / entityEvents.length).toFixed(1) : '0';

  const saveEvents = events.filter((e) => e.kind === 'voice:save_done');
  const totalSaved = saveEvents.reduce((sum, e) => sum + (e.payload?.savedCount || 0), 0);
  const offlinePathCount = saveEvents.filter((e) => e.payload?.syncedOffline).length;

  const failedOps = transcriptionsFailed + extractionFailed + savesFailed;
  const totalOps = recordings || 1;
  const successRate = totalOps > 0 ? ((totalOps - failedOps) / totalOps * 100).toFixed(1) : '0';

  return {
    sessionEvents: events.length,
    recordings,
    transcriptions: { started: transcriptionsStarted, done: transcriptionsDone, failed: transcriptionsFailed },
    extraction: { done: extractionDone, failed: extractionFailed },
    saves: { done: savesDone, failed: savesFailed, totalSaved },
    reprocessCount,
    discardCount,
    recordingDurationMs: { total: Math.round(totalRecordingMs), avg: avgRecordingMs },
    transcriptionLength: { total: totalTextChars, avg: avgTextChars },
    entityCount: { total: totalEntities, avg: avgEntities },
    offlinePathCount,
    successRate: `${successRate}%`,
    persistedSince: meta?.firstEvent ? new Date(meta.firstEvent).toISOString() : null,
    lastEvent: meta?.lastEvent ? new Date(meta.lastEvent).toISOString() : null,
    expired: isExpired(meta),
  };
};

export const exportVoiceTelemetry = (format = 'json') => {
  const events = getSessionEvents();
  const metrics = aggregateVoiceMetrics();

  if (format === 'csv') {
    const header = 'timestamp,kind,level,payload_json';
    const rows = events.map((e) =>
      [e.ts, e.kind, e.level, JSON.stringify(e.payload).replace(/"/g, '""')].join(',')
    );
    return [header, ...rows].join('\n');
  }

  return JSON.stringify({ metrics, events }, null, 2);
};

export const clearVoiceTelemetry = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) { /* noop */ }
  try { localStorage.removeItem(STORAGE_META); } catch (_) { /* noop */ }
};
