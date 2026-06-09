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
    let confidence = 0.7;

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
