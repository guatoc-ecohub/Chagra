/**
 * ensoService — fase del Fenómeno del Niño / Oscilación del Sur (ENSO).
 *
 * Aún NO hay fuente automática en el cliente (IDEAM publica boletines mensuales,
 * sin API estable). Por ahora la fase es CONFIGURABLE y persiste en localStorage,
 * con default 'neutral'. La consumen climateCycleService (tareas preventivas y
 * recálculo de fenología) y cropAlertEngine (alerta de temporada). Cuando haya
 * fuente IDEAM/Open-Meteo se reemplaza getEnsoPhase por un fetch cacheado.
 */
const KEY = 'chagra:enso:phase';

export const ENSO_PHASES = Object.freeze(['neutral', 'el_nino', 'la_nina']);
export const ENSO_LABELS = Object.freeze({ neutral: 'Neutral', el_nino: 'El Niño', la_nina: 'La Niña' });
// Forma que espera climateCycleService.getEnsemblePreventiveTasks.
const ENSO_SERVICE_PHASE = Object.freeze({ neutral: null, el_nino: 'el_nino', la_nina: 'la_nina' });

/** Fase actual ('neutral' | 'el_nino' | 'la_nina'). Default 'neutral'. */
export function getEnsoPhase() {
  try {
    const v = localStorage.getItem(KEY);
    if (ENSO_PHASES.includes(v)) return v;
  } catch { /* SSR/test sin localStorage */ }
  return 'neutral';
}

/** Fija la fase (la elige el operador hasta tener fuente automática). */
export function setEnsoPhase(phase) {
  try {
    if (ENSO_PHASES.includes(phase)) localStorage.setItem(KEY, phase);
  } catch { /* SSR/test */ }
}

/** Etiqueta humana de la fase actual. */
export function getEnsoLabel() {
  return ENSO_LABELS[getEnsoPhase()] || 'Neutral';
}

/** Valor de fase en el formato que consume climateCycleService (null si neutral). */
export function getEnsoServicePhase() {
  return ENSO_SERVICE_PHASE[getEnsoPhase()] || null;
}
