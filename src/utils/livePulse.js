/**
 * Derivaciones pequeñas para superficies que siguen actividad en vivo.
 *
 * Inspirado por el transporte LIVE/IDLE de zoetrope: la UI no guarda un
 * "estado live". Lo calcula desde el último hecho observado y un reloj de
 * presentación, de modo que no confunde ausencia de datos con actividad.
 */

export const LIVE_PULSE_STATES = Object.freeze({
  LIVE: 'live',
  IDLE: 'idle',
  STALE: 'stale',
  UNKNOWN: 'unknown',
});

export const LIVE_PULSE_WINDOWS_MS = Object.freeze({
  live: 2 * 60 * 1000,
  idle: 30 * 60 * 1000,
});

/**
 * Normaliza timestamps de sensores y de props de React a milisegundos.
 * @param {unknown} value
 * @returns {number|null}
 */
export function toTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Busca el hecho más reciente sin mutar ni enriquecer los sensores.
 * @param {Array<object>} sensors
 * @param {unknown} [fallback]
 * @returns {number|null}
 */
export function getMostRecentActivity(sensors, fallback = null) {
  const timestamps = [];
  const fallbackMs = toTimestampMs(fallback);
  if (fallbackMs !== null) timestamps.push(fallbackMs);

  for (const sensor of Array.isArray(sensors) ? sensors : []) {
    const timestamp = toTimestampMs(sensor?.last_changed ?? sensor?.timestamp ?? sensor?.updated_at);
    if (timestamp !== null) timestamps.push(timestamp);
  }

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

/**
 * Clasifica la actividad observada. El reloj solo sirve para presentar la
 * clasificación y nunca se persiste como parte del Asset o del Log.
 * @param {unknown} lastActivityAt
 * @param {number} [nowMs]
 * @param {{ liveWindowMs?: number, idleWindowMs?: number }} [windows]
 * @returns {'live'|'idle'|'stale'|'unknown'}
 */
export function deriveLivePulse(
  lastActivityAt,
  nowMs = Date.now(),
  {
    liveWindowMs = LIVE_PULSE_WINDOWS_MS.live,
    idleWindowMs = LIVE_PULSE_WINDOWS_MS.idle,
  } = {},
) {
  const activityMs = toTimestampMs(lastActivityAt);
  if (activityMs === null || !Number.isFinite(nowMs)) return LIVE_PULSE_STATES.UNKNOWN;

  const ageMs = Math.max(0, nowMs - activityMs);
  if (ageMs <= liveWindowMs) return LIVE_PULSE_STATES.LIVE;
  if (ageMs <= idleWindowMs) return LIVE_PULSE_STATES.IDLE;
  return LIVE_PULSE_STATES.STALE;
}

/**
 * Copy compacto para un badge de estado, separado de la clasificación pura.
 * @param {'live'|'idle'|'stale'|'unknown'} state
 * @param {unknown} lastActivityAt
 * @param {number} [nowMs]
 * @returns {{label: string, detail: string}}
 */
export function livePulseCopy(state, lastActivityAt, nowMs = Date.now()) {
  if (state === LIVE_PULSE_STATES.LIVE) return { label: 'Live', detail: 'actividad reciente' };
  if (state === LIVE_PULSE_STATES.IDLE) return { label: 'En pausa', detail: 'sin cambios recientes' };
  if (state === LIVE_PULSE_STATES.STALE) return { label: 'Sin señal', detail: formatActivityAge(lastActivityAt, nowMs) };
  return { label: 'Sin actividad', detail: 'esperando una lectura' };
}

function formatActivityAge(lastActivityAt, nowMs) {
  const activityMs = toTimestampMs(lastActivityAt);
  if (activityMs === null || !Number.isFinite(nowMs)) return 'sin timestamp válido';
  const minutes = Math.max(1, Math.floor(Math.max(0, nowMs - activityMs) / 60000));
  return `última lectura hace ${minutes} min`;
}
