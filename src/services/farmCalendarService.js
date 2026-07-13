/**
 * farmCalendarService — agrega en UN SOLO calendario, por planta de la finca (o
 * por especie del catálogo si no hay finca), las tareas y fases que ya viven
 * dispersas en el repo:
 *
 *   - FENOLOGÍA      → ventanas de etapas (phenologyCalculator + plantillas).
 *   - NUTRICIÓN      → pasos del plan de alimentación (feedingPlanGeneric +
 *                      feeding_plan_template del catálogo), por offset de días.
 *   - SIEMBRA        → el día 0 del ciclo (siembra confirmada) o, si no hay
 *                      ciclo, la ventana de siembra honesta por piso térmico.
 *   - COSECHA        → la ventana de cosecha (anual o de perennes).
 *   - SANIDAD (MIP)  → biopreparados/avisos por etapa (climateCycleService).
 *   - PERENNE        → floración/cosecha recurrente de árboles/arbustos
 *                      (perennialCalculator), proyectada sobre los 12 meses.
 *
 * REGLAS DURAS (anti-alucinación):
 *   - Cada entrada lleva `source` con la procedencia real del dato. NUNCA se
 *     inventa una fecha: si no hay plantilla ni ciclo perenne para la especie,
 *     la planta queda con `status: 'no_data'` y la UI deflexiona honestamente
 *     ("sin calendario para esta especie todavía").
 *   - Los pasos de nutrición se marcan `approximate` cuando vienen del genérico
 *     por tipo de cultivo (no son dato específico de la especie).
 *   - No se reescriben recetas del feeding_plan (rediseño agroecológico
 *     pendiente): se muestra lo que hay y se dejan los ganchos.
 *
 * Salida: un array de PlantCalendar, cada uno con sus CalendarEntry resueltas a
 * meses (1-12). Todo es client-side y degrada limpio.
 */
import { calculateWindows, normalizePhenologyTemplate, resolveTemplate } from './phenologyCalculator';
import { resolvePerennialCycle } from './perennialCalculator';
import { isPerennialSpecies } from '../data/perennialCycles';
import { resolveFeedingPlanTemplateForSpecies } from '../data/feedingPlanFrutales';
import { getBiopreparadosForStage } from './climateCycleService';

/** Capas del calendario. El orden importa para el ordenamiento estable. */
export const CALENDAR_LAYERS = Object.freeze([
  'siembra',
  'fenologia',
  'nutricion',
  'sanidad',
  'cosecha',
]);

/** Metadatos de presentación por capa (label corto, sin estilos: la UI decide). */
export const LAYER_META = Object.freeze({
  siembra: { label: 'Siembra' },
  fenologia: { label: 'Fenología' },
  nutricion: { label: 'Nutrición' },
  sanidad: { label: 'Sanidad' },
  cosecha: { label: 'Cosecha' },
});

const MS_PER_DAY = 86400000;

/**
 * Mapea un código de etapa fenológica a la capa de calendario que le corresponde.
 * La cosecha es su propia capa (es la que más le importa al campesino); la
 * siembra también; el resto de las etapas son "fenología".
 *
 * @param {string} code
 * @returns {'siembra'|'cosecha'|'fenologia'}
 */
function stageToLayer(code) {
  const base = String(code || '').replace(/_confirmed$/, '');
  if (base === 'sowing') return 'siembra';
  if (base === 'harvest_window' || base === 'harvest') return 'cosecha';
  return 'fenologia';
}

/**
 * Convierte un timestamp ms a mes calendario 1-12. Null-safe.
 * @param {number|null} ts
 * @returns {number|null}
 */
function tsToMonth(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts).getMonth() + 1;
}

/**
 * Expande una ventana [start, end] (timestamps) a la lista de meses 1-12 que
 * toca, recortada a un horizonte de 12 meses desde `now` para no pintar años
 * enteros de un perenne joven. Si no hay fin, marca solo el mes de inicio.
 *
 * @param {number|null} start
 * @param {number|null} end
 * @param {number} now
 * @returns {number[]} meses únicos 1-12
 */
function windowToMonths(start, end, now) {
  const startMonth = tsToMonth(start);
  if (startMonth === null) return [];
  if (!Number.isFinite(end) || end <= start) return [startMonth];

  const horizon = now + 365 * MS_PER_DAY;
  const cappedEnd = Math.min(end, horizon);
  const months = new Set();
  // Itera mes a mes desde el inicio hasta el fin (máx 13 iteraciones por el cap).
  const cursor = new Date(start);
  cursor.setDate(1);
  let guard = 0;
  while (cursor.getTime() <= cappedEnd && guard < 14) {
    months.add(cursor.getMonth() + 1);
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  months.add(startMonth);
  return [...months];
}

/**
 * Construye las entradas de FENOLOGÍA + SIEMBRA + COSECHA + SANIDAD de un ciclo
 * ANUAL (siembra → cosecha) a partir de la plantilla fenológica.
 *
 * @param {Object} cfg
 * @param {string} cfg.speciesSlug
 * @param {number} cfg.sowingDate — ts ms (día 0)
 * @param {number|null} cfg.altitudeM
 * @param {Object|null} cfg.template — plantilla explícita (catálogo) ya normalizada o cruda
 * @param {string|null} cfg.category
 * @param {number} cfg.now
 * @returns {{ entries: CalendarEntry[], isGeneric: boolean, hasData: boolean }}
 */
function buildAnnualEntries({ speciesSlug, sowingDate, altitudeM, template, category, now }) {
  const windows = calculateWindows({ speciesSlug, sowingDate, altitudeM, template, category });
  const computed = windows.filter((w) => w.status === 'computed');
  if (computed.length === 0) {
    return { entries: [], isGeneric: false, hasData: false };
  }

  const isGeneric = computed.some((w) => /** @type {any} */ (w).isGeneric);
  const entries = [];

  for (const w of computed) {
    const layer = stageToLayer(w.code);
    const months = windowToMonths(w.windowStart, w.windowEnd, now);
    if (months.length === 0) continue;
    entries.push({
      layer,
      title: w.label,
      detail: layer === 'cosecha'
        ? 'Ventana estimada de cosecha.'
        : layer === 'siembra'
          ? 'Siembra registrada (día 0 del ciclo).'
          : 'Etapa fenológica estimada según la siembra y la altitud.',
      months,
      windowStart: w.windowStart,
      windowEnd: w.windowEnd,
      approximate: isGeneric || w.confidence < 0.7,
      confidence: w.confidence,
      source: (w.sources && w.sources[0]) || 'Plantilla fenológica del catálogo',
      stageCode: String(w.code || '').replace(/_confirmed$/, ''),
    });

    // ── Capa SANIDAD: biopreparados/avisos preventivos por etapa, anclados a
    // los mismos meses de la etapa fenológica (climateCycleService). Solo para
    // etapas con datos de sanidad (vegetative/flowering/fruiting/harvest_window).
    const baseStage = String(w.code || '').replace(/_confirmed$/, '');
    let bios = [];
    try { bios = getBiopreparadosForStage(baseStage) || []; } catch { bios = []; }
    for (const b of bios) {
      entries.push({
        layer: 'sanidad',
        title: b.nombre,
        detail: b.uso || 'Manejo preventivo en esta etapa.',
        months,
        windowStart: w.windowStart,
        windowEnd: w.windowEnd,
        approximate: true,
        confidence: 0.5,
        source: 'Calendario de sanidad por etapa (climateCycleService)',
        stageCode: baseStage,
      });
    }
  }

  return { entries, isGeneric, hasData: true };
}

/**
 * Construye las entradas de NUTRICIÓN a partir del plan de alimentación: el
 * feeding_plan_template específico del catálogo si existe, o el genérico por
 * tipo de cultivo. Cada paso tiene un `offset_days` relativo a la siembra que se
 * proyecta a meses. Si no hay fecha de siembra se proyecta desde `now` para que
 * el campesino vea igual la SECUENCIA (marcada como sin anclar).
 *
 * NOTA: el feeding_plan tiene un rediseño agroecológico pendiente. NO se
 * reescriben recetas ni dosis aquí: se muestra lo que el template ya trae.
 *
 * @param {Object} cfg
 * @param {Object|null} cfg.species — entrada del catálogo
 * @param {number|null} cfg.sowingDate — ts ms (null si no hay ciclo)
 * @param {number} cfg.now
 * @returns {Array<{layer: string, title: string, detail: string, months: number[], windowStart: number|null, windowEnd: number|null, approximate: boolean, confidence: number, source: string, biofertilizer: string|null, offsetDays: number, anchored: boolean}>}
 */
function buildNutritionEntries({ species, sowingDate, now }) {
  if (!species) return [];

  const hasExplicitPlan = Array.isArray(species.feeding_plan_template?.primary_steps)
    && species.feeding_plan_template.primary_steps.length > 0;
  const template = resolveFeedingPlanTemplateForSpecies(species);
  if (!template || !Array.isArray(template.primary_steps) || template.primary_steps.length === 0) {
    return [];
  }

  const anchor = Number.isFinite(sowingDate) && sowingDate > 0 ? sowingDate : now;
  const anchored = Number.isFinite(sowingDate) && sowingDate > 0;
  const isGeneric = !hasExplicitPlan;

  return template.primary_steps.map((s) => {
    const offset = Number.isFinite(s.offset_days) ? s.offset_days : 0;
    const ts = anchor + offset * MS_PER_DAY;
    const month = tsToMonth(ts);
    return {
      layer: 'nutricion',
      title: s.action || 'Abonado',
      detail: s.dose_safe
        ? `${s.dose_safe}${s.notes ? ` · ${s.notes}` : ''}`
        : (s.notes || s.dose_text || 'Aporte de nutrición del plan.'),
      months: month !== null ? [month] : [],
      windowStart: ts,
      windowEnd: null,
      approximate: isGeneric || !anchored,
      confidence: isGeneric ? 0.3 : 0.6,
      source: template.source || 'Plan de alimentación (biopreparados prediales del catálogo)',
      biofertilizer: s.biofertilizer_slug || null,
      offsetDays: offset,
      anchored,
    };
  }).filter((e) => e.months.length > 0);
}

/**
 * Construye las entradas de un PERENNE (floración + cosecha recurrente +
 * establecimiento) proyectadas sobre los 12 meses del año, desde
 * perennialCalculator. La cosecha continua se marca como tal sin pintar meses
 * inventados.
 *
 * @param {Object} cfg
 * @param {string} cfg.speciesId
 * @param {number|null} cfg.plantingDate
 * @param {number} cfg.now
 * @returns {{ entries: Array<{layer: string, title: string, detail: string, months: number[], windowStart: number|null, windowEnd: number|null, approximate: boolean, confidence: number, source: string, stageCode: string, continuous?: boolean}>, resolution: Object|null }}
 */
function buildPerennialEntries({ speciesId, plantingDate, now }) {
  const res = resolvePerennialCycle({ speciesId, plantingDate, now });
  if (!res) return { entries: [], resolution: null };

  const entries = [];
  const { annual } = res;

  // Floración (capa fenología).
  if (annual.floweringMonths.length > 0) {
    entries.push({
      layer: 'fenologia',
      title: 'Floración',
      detail: 'Meses de floración típicos una vez establecida.',
      months: [...annual.floweringMonths],
      windowStart: null,
      windowEnd: null,
      approximate: res.confidence !== 'alta',
      confidence: res.confidence === 'alta' ? 0.7 : 0.5,
      source: res.source || 'Ciclo perenne del catálogo',
      stageCode: 'flowering',
    });
  }

  // Cosecha (capa cosecha).
  if (annual.harvestMonths.length > 0) {
    entries.push({
      layer: 'cosecha',
      title: annual.regime === 'continuous' ? 'Cosecha (picos)' : 'Cosecha',
      detail: annual.note || 'Meses de cosecha típicos.',
      months: [...annual.harvestMonths],
      windowStart: null,
      windowEnd: null,
      approximate: res.confidence !== 'alta',
      confidence: res.confidence === 'alta' ? 0.7 : 0.5,
      source: res.source || 'Ciclo perenne del catálogo',
      stageCode: 'harvest_window',
    });
  } else if (annual.regime === 'continuous') {
    // Produce casi todo el año: no pintamos meses inventados, dejamos una
    // entrada continua que la UI presenta como "todo el año".
    entries.push({
      layer: 'cosecha',
      title: 'Cosecha casi todo el año',
      detail: annual.note || 'Produce de forma casi continua una vez establecida.',
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      continuous: true,
      windowStart: null,
      windowEnd: null,
      approximate: true,
      confidence: 0.5,
      source: res.source || 'Ciclo perenne del catálogo',
      stageCode: 'harvest_window',
    });
  }

  return { entries, resolution: res };
}

/**
 * @typedef {Object} CalendarEntry
 * @property {'siembra'|'fenologia'|'nutricion'|'sanidad'|'cosecha'} layer
 * @property {string} title
 * @property {string} detail
 * @property {number[]} months — meses 1-12 que toca la entrada
 * @property {boolean} approximate — el dato es aproximado (genérico / sin anclar)
 * @property {number} confidence — 0-1
 * @property {string} source — procedencia real del dato
 */

/**
 * @typedef {Object} PlantCalendar
 * @property {string} id — id estable de la planta/ciclo
 * @property {string} name — nombre legible (común)
 * @property {string} speciesSlug — slug canónico de la especie
 * @property {'annual'|'perennial'|'no_data'} kind
 * @property {'ok'|'no_data'} status
 * @property {boolean} isGeneric — el calendario usa plantilla genérica por tipo
 * @property {boolean} hasSowingDate
 * @property {CalendarEntry[]} entries
 * @property {Object|null} perennial — resolución perenne (si aplica)
 * @property {number} [count] - cuántas matas equivalentes representa esta fila
 *   (agrupación de entradas repetidas; badge "×N"). Se asigna después de construir
 *   el calendario, no es parte del cálculo fenológico.
 */

/**
 * Construye el calendario de UNA planta (ciclo de finca o especie del catálogo).
 *
 * @param {Object} cfg
 * @param {string} cfg.id
 * @param {string} cfg.name
 * @param {string} cfg.speciesSlug — slug canónico (id de catálogo)
 * @param {Object|null} cfg.species — entrada del catálogo (para categoría/familia/plan)
 * @param {number|null} cfg.sowingDate — ts ms de la siembra (null si no hay ciclo)
 * @param {number|null} cfg.altitudeM
 * @param {number} [cfg.now]
 * @returns {PlantCalendar}
 */
export function buildPlantCalendar({ id, name, speciesSlug, species, sowingDate, altitudeM, now } = {}) {
  const ref = Number.isFinite(now) && now > 0 ? now : Date.now();
  const category = species?.category || null;
  const rawTemplate = species?.phenology_template || species?.phenology || species?.fenologia || species?.phenology_stages || null;
  const catalogTemplate = normalizePhenologyTemplate(rawTemplate, speciesSlug);

  const perennialFlag = isPerennialSpecies(speciesSlug)
    || category === 'frutales_perennes'
    || category === 'arboles_sombra';

  /** @type {any[]} */
  let entries = [];
  let kind = 'no_data';
  let isGeneric = false;
  let perennial = null;

  if (perennialFlag) {
    const { entries: pEntries, resolution } = buildPerennialEntries({
      speciesId: speciesSlug,
      plantingDate: sowingDate,
      now: ref,
    });
    if (pEntries.length > 0) {
      entries = entries.concat(pEntries);
      kind = 'perennial';
      perennial = resolution;
    }
  }

  // Ciclo anual: aplica a no-perennes y también complementa a un perenne joven
  // que aún tenga plantilla anual de establecimiento (solo si hay fecha siembra).
  if (kind !== 'perennial') {
    const resolved = resolveTemplate({ speciesSlug, template: rawTemplate, category });
    if (resolved && Number.isFinite(sowingDate) && sowingDate > 0) {
      const annual = buildAnnualEntries({
        speciesSlug,
        sowingDate,
        altitudeM,
        template: catalogTemplate || rawTemplate,
        category,
        now: ref,
      });
      if (annual.hasData) {
        entries = entries.concat(annual.entries);
        isGeneric = annual.isGeneric;
        kind = 'annual';
      }
    }
  }

  // Nutrición: aplica a cualquier planta con plan (anclada a la siembra o,
  // si no hay siembra, mostrada como secuencia sin anclar).
  const nutrition = buildNutritionEntries({ species, sowingDate, now: ref });
  if (nutrition.length > 0) {
    entries = entries.concat(nutrition);
    // Si la planta solo trae plan de nutrición (sin fenología/perenne), sigue
    // siendo un calendario real (aproximado): la clasificamos como 'annual'
    // para que la UI no la etiquete como sin datos cuando sí mostramos algo.
    if (kind === 'no_data') kind = 'annual';
  }

  const status = entries.length > 0 ? 'ok' : 'no_data';

  return {
    id,
    name,
    speciesSlug,
    kind: status === 'no_data' ? 'no_data' : kind,
    status,
    isGeneric,
    hasSowingDate: Number.isFinite(sowingDate) && sowingDate > 0,
    entries,
    perennial,
  };
}

/**
 * Agrega el calendario de varias plantas en una matriz mes × capa para pintar la
 * tira anual de 12 meses. Cuenta, por mes, cuántas entradas hay de cada capa.
 *
 * @param {PlantCalendar[]} plants
 * @param {Set<string>|null} [activeLayers] - capas a contar (null = todas)
 * @returns {Array<{ month:number, layers: Record<string, number>, total:number }>}
 */
export function aggregateMonthlyMatrix(plants, activeLayers = null) {
  const matrix = [];
  for (let m = 1; m <= 12; m++) {
    matrix.push({ month: m, layers: {}, total: 0 });
  }
  for (const plant of plants || []) {
    for (const entry of plant.entries || []) {
      if (activeLayers && !activeLayers.has(entry.layer)) continue;
      for (const month of entry.months || []) {
        const cell = matrix[month - 1];
        if (!cell) continue;
        cell.layers[entry.layer] = (cell.layers[entry.layer] || 0) + 1;
        cell.total += 1;
      }
    }
  }
  return matrix;
}

/**
 * Filtra y aplana las entradas de una planta para un mes y un set de capas dado,
 * ordenadas por la prioridad de capa (CALENDAR_LAYERS).
 *
 * @param {PlantCalendar} plant
 * @param {number} month — 1-12
 * @param {Set<string>|null} [activeLayers]
 * @returns {CalendarEntry[]}
 */
export function entriesForMonth(plant, month, activeLayers = null) {
  const out = (plant.entries || []).filter((e) => {
    if (activeLayers && !activeLayers.has(e.layer)) return false;
    return Array.isArray(e.months) && e.months.includes(month);
  });
  out.sort((a, b) => CALENDAR_LAYERS.indexOf(a.layer) - CALENDAR_LAYERS.indexOf(b.layer));
  return out;
}
