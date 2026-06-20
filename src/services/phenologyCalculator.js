/**
 * phenologyCalculator — calculador de ventanas fenológicas estimadas.
 *
 * Task 22: Calcula ventanas (no fechas únicas). Degrada honestamente
 * cuando faltan datos. Incluye corrección por altitud.
 *
 * Invariante ADR-049: nunca devuelve observed_stage ni modifica
 * el proceso. Solo computa estimated_stage.
 */
import { getTemplate } from '../data/phenologyTemplates';
import { LOW_CONFIDENCE_THRESHOLD } from '../services/agentService.js';

/**
 * @typedef {Object} PhenologyWindow
 * @property {string} code — stage code
 * @property {string} label
 * @property {number|null} windowStart — timestamp ms (inicio de ventana)
 * @property {number|null} windowEnd — timestamp ms (fin de ventana)
 * @property {'computed'|'insufficient_data'|'template_missing'} status
 * @property {number} confidence — 0-1
 * @property {string[]} sources — nombres de fuente
 */

/**
 * Corrige días por altitud. Fórmula empírica:
 * Por cada 100m sobre 1000msnm, el ciclo se alarga ~6%.
 * Este factor se aplica a minDays y maxDays.
 *
 * @param {number} days — días base de la plantilla
 * @param {number} altitudeM — altitud en msnm
 * @returns {number}
 */
function altitudeCorrection(days, altitudeM) {
  if (!altitudeM || altitudeM <= 0) return days;
  const baseAlt = 1000;
  if (altitudeM <= baseAlt) return days;
  const factor = 1 + ((altitudeM - baseAlt) / 100) * 0.06;
  return Math.round(days * factor);
}

/**
 * Calcula ventanas fenológicas estimadas para un proceso.
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {number} input.sowingDate — timestamp ms del evento de siembra
 * @param {number} [input.altitudeM] — msnm para corrección por altitud
 * @returns {PhenologyWindow[]}
 */
export function calculateWindows({ speciesSlug, sowingDate, altitudeM }) {
  const template = getTemplate(speciesSlug);

  if (!template) {
    return [{
      code: 'unknown',
      label: 'Plantilla no disponible',
      windowStart: null,
      windowEnd: null,
      status: 'template_missing',
      confidence: 0,
      sources: [],
    }];
  }

  if (!sowingDate || sowingDate <= 0) {
    return [{
      code: 'unknown',
      label: 'Fecha de siembra no disponible',
      windowStart: null,
      windowEnd: null,
      status: 'insufficient_data',
      confidence: 0,
      sources: [],
    }];
  }

  return template.stages.map((stage) => {
    const minDays = altitudeCorrection(stage.minDays, altitudeM);
    const maxDays = stage.maxDays !== null
      ? altitudeCorrection(stage.maxDays, altitudeM)
      : null;

    const windowStart = minDays > 0 ? sowingDate + minDays * 86400000 : sowingDate;
    const windowEnd = maxDays !== null ? sowingDate + maxDays * 86400000 : null;

    // Confianza base: template versionado + datos completos = 0.7
    let confidence = LOW_CONFIDENCE_THRESHOLD;

    // Penalización si no hay altitud (el rango es más amplio)
    if (!altitudeM || altitudeM <= 0) {
      confidence = Math.max(0.4, confidence - 0.15);
    }

    // Etapa sowing (día 0) tiene confianza 1.0
    if (stage.code === 'sowing') {
      confidence = 1.0;
    }

    const source = template.sources[stage.sourceIndex];

    return {
      code: stage.code,
      label: stage.label,
      windowStart,
      windowEnd,
      status: 'computed',
      confidence: Math.round(confidence * 100) / 100,
      sources: source ? [source.name] : [],
    };
  });
}

/**
 * @typedef {Object} CurrentStageResult
 * @property {PhenologyWindow} stage — la ventana que contiene `now`
 * @property {number} stageIndex — índice en el array de etapas del template
 * @property {number} daysElapsed — días transcurridos desde la siembra
 */

/**
 * Determina la etapa fenológica estimada actual según `now`.
 * Usa `calculateWindows` internamente y busca la ventana cuyo
 * [windowStart, windowEnd] contiene el timestamp `now`.
 *
 * - `now` anterior a la primera ventana → etapa sowing.
 * - `now` posterior a la última ventana → etapa closed.
 * - Sin plantilla o sin sowingDate → null (degradación limpia).
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {number} input.sowingDate — timestamp ms del evento de siembra
 * @param {number} [input.altitudeM]
 * @param {number} [input.now=Date.now()] — timestamp ms para el cual calcular la etapa
 * @returns {CurrentStageResult|null}
 */
export function getCurrentStage({ speciesSlug, sowingDate, altitudeM, now }) {
  const windows = calculateWindows({ speciesSlug, sowingDate, altitudeM });

  if (!windows.length || (windows.length === 1 && windows[0].status !== 'computed')) {
    return null;
  }

  const today = now && now > 0 ? now : Date.now();
  const daysElapsed = Math.floor((today - windows[0].windowStart) / 86400000);

  // Recorrer de la última etapa hacia atrás: en caso de solapamiento,
  // retorna la etapa más avanzada que aún aplica.
  for (let i = windows.length - 1; i >= 0; i--) {
    const w = windows[i];
    if (w.status !== 'computed' || w.windowStart === null) continue;
    const afterStart = today >= w.windowStart;
    const beforeEnd = w.windowEnd === null || today <= w.windowEnd;
    if (afterStart && beforeEnd) {
      return { stage: w, stageIndex: i, daysElapsed };
    }
  }

  // today anterior a la primera ventana
  return { stage: windows[0], stageIndex: 0, daysElapsed: Math.max(0, daysElapsed) };
}

/**
 * @typedef {Object} LifecycleEnd
 * @property {number|null} harvestStart — timestamp ms estimado de inicio de cosecha
 * @property {number|null} harvestEnd — timestamp ms estimado de fin de la ventana de cosecha
 * @property {number|null} naturalDeath — timestamp ms estimado de muerte natural / senescencia
 * @property {'lifecycle_block'|'derived_from_stages'|'unavailable'} source — de dónde salió la estimación
 * @property {number} confidence — 0-1
 */

/**
 * Estima el FIN DEL CICLO de una siembra: ventana de cosecha y muerte natural
 * (senescencia tras cosecha o, si no se cosecha, bolting + colapso de la planta).
 *
 * Precedencia:
 *   1. Bloque `lifecycle` del template (días explícitos por especie). Es el dato
 *      curado más confiable. Aplica corrección por altitud.
 *   2. Derivado de las ETAPAS: usa el windowEnd de la etapa de cosecha
 *      (`harvest_window` | `harvest`) y el windowStart de la etapa `closed`
 *      como proxy de la muerte natural. Degrada limpio si no existen.
 *
 * Invariante: NO modifica el proceso ni inventa fechas — degrada a `unavailable`
 * cuando faltan datos. Es estimación de referencia, no observación.
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {number} input.sowingDate — timestamp ms del evento de siembra
 * @param {number} [input.altitudeM]
 * @returns {LifecycleEnd}
 */
export function calculateLifecycleEnd({ speciesSlug, sowingDate, altitudeM }) {
  const unavailable = {
    harvestStart: null,
    harvestEnd: null,
    naturalDeath: null,
    source: 'unavailable',
    confidence: 0,
  };

  const template = getTemplate(speciesSlug);
  if (!template || !sowingDate || sowingDate <= 0) return unavailable;

  // 1) Bloque lifecycle explícito (más confiable).
  const lc = template.lifecycle;
  if (lc && typeof lc === 'object') {
    const harvestMin = Number(lc.sowing_to_harvest_min_days);
    const harvestMax = Number(lc.sowing_to_harvest_max_days);
    const deathDays = Number(lc.natural_death_days);
    const day = (d) =>
      Number.isFinite(d) && d > 0
        ? sowingDate + altitudeCorrection(d, altitudeM) * 86400000
        : null;
    let confidence = altitudeM && altitudeM > 0 ? 0.7 : 0.5;
    return {
      harvestStart: day(harvestMin),
      harvestEnd: day(harvestMax),
      naturalDeath: day(deathDays),
      source: 'lifecycle_block',
      confidence,
    };
  }

  // 2) Derivar de las etapas (fallback genérico para especies sin bloque).
  const windows = calculateWindows({ speciesSlug, sowingDate, altitudeM });
  const harvest = windows.find((w) => w.code === 'harvest_window' || w.code === 'harvest');
  const closed = windows.find((w) => w.code === 'closed' || w.code === 'fallow');
  if (!harvest && !closed) return unavailable;

  return {
    harvestStart: harvest ? harvest.windowStart : null,
    harvestEnd: harvest ? harvest.windowEnd : null,
    // La etapa `closed` arranca cuando el ciclo comercial termina: su windowStart
    // es el mejor proxy de muerte natural / senescencia disponible sin bloque.
    naturalDeath: closed ? closed.windowStart : (harvest ? harvest.windowEnd : null),
    source: 'derived_from_stages',
    confidence: altitudeM && altitudeM > 0 ? 0.55 : 0.4,
  };
}

/**
 * Frase campesina para el fin de ciclo. Degrada a '' si no hay estimación.
 * @param {LifecycleEnd} lc
 * @returns {string}
 */
export function formatLifecycleEnd(lc) {
  if (!lc || lc.source === 'unavailable' || lc.naturalDeath == null) return '';
  const fecha = new Date(lc.naturalDeath).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  return `Se espera fin de ciclo ~${fecha}`;
}

/**
 * Ventana legible para el campesino.
 * @param {PhenologyWindow} w
 * @returns {string}
 */
export function formatWindow(w) {
  if (w.status !== 'computed') {
    if (w.status === 'template_missing') return 'No hay plantilla para esta especie';
    return 'Fecha no disponible';
  }
  const start = w.windowStart ? new Date(w.windowStart).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : '—';
  const end = w.windowEnd ? new Date(w.windowEnd).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : 'en adelante';
  return `${start} – ${end}`;
}
