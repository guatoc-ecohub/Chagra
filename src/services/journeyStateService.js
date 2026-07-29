/**
 * journeyStateService — estado del viaje agroecológico del usuario, por finca.
 *
 * Guarda en qué etapa va y qué acciones completó, para que la guía proactiva
 * (Home / Hoy en finca) muestre el "siguiente paso". Modelo de etapas:
 * agroecologyJourney.js (6 etapas).
 *
 * Persistencia: localStorage (estado pequeño, tipo preferencia por finca,
 * offline-first; degrada limpio en modo privado). deriveInitialStage es PURA.
 * Cero fabricación: sin datos, arranca en Despertar (la etapa de diagnóstico).
 */
import { getStage, nextStageId } from './agroecologyJourney';

const KEY = (slug) => `chagra:journey:${slug || 'default'}`;

/** Lee el estado guardado, o null si nunca se guardó / es inválido. */
export function getStoredJourneyState(fincaSlug) {
  try {
    const raw = localStorage.getItem(KEY(fincaSlug));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !getStage(s.stageId)) return null;
    return {
      stageId: s.stageId,
      accionesHechas: Array.isArray(s.accionesHechas) ? s.accionesHechas : [],
      updatedAt: s.updatedAt || null,
    };
  } catch {
    return null;
  }
}

/** Persiste el estado (sella updatedAt). */
export function setJourneyState(fincaSlug, state) {
  const next = {
    stageId: state.stageId,
    accionesHechas: state.accionesHechas || [],
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(KEY(fincaSlug), JSON.stringify(next));
  } catch {
    /* modo privado: no persiste; la guía sigue funcionando en memoria */
  }
  return next;
}

/**
 * Deriva la etapa inicial de forma CONSERVADORA (no infla el progreso del
 * usuario): sin siembras registradas → Despertar (diagnóstico); con siembras
 * activas → Pausa Química. El avance fino lo decide el usuario en la guía.
 * @param {object} input
 * @param {Array} [input.processes] FarmProcess[]
 * @returns {string} stageId
 */
export function deriveInitialStage({ processes = [] } = {}) {
  const activos = processes.filter((p) => {
    const st = p?.attributes?.status;
    return !st || st === 'active';
  });
  return activos.length === 0 ? 'despertar' : 'pausa_quimica';
}

/** Estado actual: el guardado, o el derivado (que se persiste la primera vez). */
export function resolveJourneyState(opts = /** @type {any} */ ({})) {
  const { fincaSlug, processes = [] } = opts;
  const stored = getStoredJourneyState(fincaSlug);
  if (stored) return stored;
  const stageId = deriveInitialStage({ processes });
  return setJourneyState(fincaSlug, { stageId, accionesHechas: [] });
}

/** Marca una acción de la etapa actual como completada. */
export function marcarAccionHecha(fincaSlug, accion) {
  const s = getStoredJourneyState(fincaSlug) || { stageId: 'despertar', accionesHechas: [] };
  if (!s.accionesHechas.includes(accion)) {
    s.accionesHechas = [...s.accionesHechas, accion];
  }
  return setJourneyState(fincaSlug, s);
}

/**
 * Avanza a la siguiente etapa (reinicia las acciones de la nueva). Irradiación
 * es permanente: no avanza más, devuelve el estado igual.
 */
export function avanzarEtapa(fincaSlug) {
  const s = getStoredJourneyState(fincaSlug);
  if (!s) return null;
  const next = nextStageId(s.stageId);
  if (!next) return s;
  return setJourneyState(fincaSlug, { stageId: next, accionesHechas: [] });
}
