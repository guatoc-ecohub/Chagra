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
import { getGenericTemplate } from '../data/phenologyGeneric';

// Umbral de confianza alineado con agentService.LOW_CONFIDENCE_THRESHOLD (0.7).
// Se define local para NO arrastrar el módulo pesado agentService.js al grafo de
// imports de la capa de datos (farmProcessCache lo importa de forma transitiva
// vía deriveCurrentStage). Mantener ambos valores en 0.7.
const LOW_CONFIDENCE_THRESHOLD = 0.7;

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

export function normalizePhenologyTemplate(template, speciesSlug = '') {
  if (!template || typeof template !== 'object') return null;
  const stages = Array.isArray(template.stages)
    ? template.stages
    : Array.isArray(template.phenology_stages)
      ? template.phenology_stages
      : null;
  if (!stages || stages.length === 0) return null;
  return {
    template_id: template.template_id || `${speciesSlug || 'catalog'}.catalog`,
    species_slug: template.species_slug || speciesSlug,
    species_label: template.species_label || template.label || speciesSlug,
    version: template.version || 1,
    sources: Array.isArray(template.sources) && template.sources.length > 0
      ? template.sources
      : [{ name: 'Catálogo Chagra' }],
    stages: stages.map((stage, index) => ({
      code: stage.code || stage.stage || `stage_${index}`,
      label: stage.label || stage.name || stage.code || stage.stage || `Etapa ${index + 1}`,
      description: stage.description || '',
      minDays: Number.isFinite(Number(stage.minDays)) ? Number(stage.minDays) : Number(stage.calendar_range?.[0] || 0),
      maxDays: stage.maxDays === null
        ? null
        : Number.isFinite(Number(stage.maxDays))
          ? Number(stage.maxDays)
          : (Number.isFinite(Number(stage.calendar_range?.[1])) ? Number(stage.calendar_range[1]) : null),
      sourceIndex: Number.isInteger(stage.sourceIndex) ? stage.sourceIndex : 0,
    })),
  };
}

/**
 * Resuelve la plantilla fenológica a usar para una especie, en orden de
 * preferencia y SIN inventar datos:
 *
 *   1. `template` explícito normalizado (ej. fenología embebida en el catálogo).
 *   2. Plantilla específica de la especie por slug (incluye resolución de
 *      cultivar/subespecie a su especie madre, que es dato real de la especie).
 *   3. Plantilla GENÉRICA por tipo de cultivo (`category`), marcada como
 *      aproximada. Solo existe para categorías con ciclo anual estimable.
 *   4. null si no hay nada honesto que mostrar.
 *
 * El resultado conserva `is_generic` cuando proviene del paso 3, para que la
 * capa de cálculo baje la confianza y la UI marque la estimación como
 * aproximada y NO específica de la especie.
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {Object} [input.template] — plantilla explícita (sin normalizar)
 * @param {string} [input.category] — categoría del catálogo para el genérico
 * @returns {(Object & {is_generic?: boolean})|null}
 */
export function resolveTemplate({ speciesSlug, template, category } = {}) {
  const explicit = normalizePhenologyTemplate(template, speciesSlug);
  if (explicit) return explicit;

  const specific = getTemplate(speciesSlug);
  if (specific) return specific;

  if (category) {
    const generic = getGenericTemplate(category);
    if (generic) return { ...generic, is_generic: true };
  }

  return null;
}

/**
 * Calcula ventanas fenológicas estimadas para un proceso.
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {number} input.sowingDate — timestamp ms del evento de siembra
 * @param {number} [input.altitudeM] — msnm para corrección por altitud
 * @param {Object} [input.template] — plantilla explícita (sin normalizar)
 * @param {string} [input.category] — categoría del catálogo para el genérico por tipo
 * @returns {PhenologyWindow[]}
 */
export function calculateWindows({ speciesSlug, sowingDate, altitudeM, template: inputTemplate, category } = {}) {
  const template = resolveTemplate({ speciesSlug, template: inputTemplate, category });
  const isGeneric = !!(template && template.is_generic);

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

    // Plantilla genérica por tipo de cultivo: NO es dato específico de la
    // especie, así que la confianza se reduce fuerte para que la UI lo marque
    // como aproximado (anti-alucinación: nunca aparentar precisión que no hay).
    if (isGeneric) {
      confidence = Math.min(confidence, 0.3);
    }

    // Etapa sowing (día 0) tiene confianza 1.0 (la fecha de siembra es un hecho,
    // no una estimación), incluso en plantillas genéricas.
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
      // `isGeneric`: la ventana viene de una estimación por TIPO de cultivo, no
      // de datos específicos de la especie. La UI debe rotularla aproximada.
      isGeneric,
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
export function getCurrentStage({ speciesSlug, sowingDate, altitudeM, now, template, category } = {}) {
  const windows = calculateWindows({ speciesSlug, sowingDate, altitudeM, template, category });

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
 * Deriva el código de etapa ACTUAL de un ciclo a partir de la fecha de siembra
 * y la plantilla fenológica de la especie.
 *
 * Es la fuente de verdad para `current_stage` de los ciclos que NO tienen
 * confirmación manual del campesino: en vez de quedar congelados en
 * `sowing_confirmed`, la etapa avanza sola con el calendario.
 *
 * Degradación honesta:
 *   - Sin template para la especie o sin fecha de siembra → devuelve el
 *     `fallback` (por defecto 'sowing_confirmed'), NUNCA rompe.
 *   - El día 0 (recién sembrado) devuelve 'sowing_confirmed' para conservar la
 *     etiqueta que el resto de la UI espera tras una siembra.
 *
 * @param {Object} input
 * @param {string} input.speciesSlug
 * @param {number} input.sowingDate — timestamp ms de la siembra (created_at)
 * @param {number} [input.altitudeM]
 * @param {number} [input.now=Date.now()]
 * @param {string} [input.fallback='sowing_confirmed'] — etapa si no se puede derivar
 * @returns {string} código de etapa (ej. 'vegetative', 'flowering', 'sowing_confirmed')
 */
export function deriveCurrentStage({ speciesSlug, sowingDate, altitudeM, now, template, category, fallback = 'sowing_confirmed' } = {}) {
  let result = null;
  try {
    result = getCurrentStage({ speciesSlug, sowingDate, altitudeM, now, template, category });
  } catch {
    return fallback;
  }
  if (!result || !result.stage || result.stage.status !== 'computed') {
    return fallback;
  }
  // La etapa 'sowing' del template equivale a 'sowing_confirmed' en el vocabulario
  // de FarmProcess (la UI muestra "Siembra" para ambas).
  if (result.stage.code === 'sowing') return 'sowing_confirmed';
  return result.stage.code;
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
