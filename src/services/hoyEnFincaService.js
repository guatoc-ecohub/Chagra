/**
 * hoyEnFincaService — agregador PURO para la vista "Hoy en finca".
 *
 * Junta lo que la finca necesita saber HOY y ESTA SEMANA a partir de
 * servicios que ya existen — este módulo NO fabrica datos:
 *   - Clima de hoy: snapshot del sidecar (climaService) + nubosidad real
 *     (skyConditionService) → condición honesta del cielo (fix Choachí).
 *   - Tareas del ciclo: fenología estimada (phenologyCalculator) + plantillas
 *     por etapa (cycleTaskService) + preventivas ENSO (climateCycleService).
 *   - Agenda campesina: ventanas fenológicas próximas (calculateWindows)
 *     agrupadas por día (semana) o por semana (mes).
 *
 * Reglas:
 *   - Funciones puras: reciben datos, devuelven datos. Sin fetch, sin IDB.
 *     El caller (HoyEnFincaScreen) trae snapshot/sky/procesos de los caches
 *     offline-first y degrada limpio si no hay nada.
 *   - Cero fabricación: sin datos → arrays vacíos / hasData:false. Cada
 *     ventana fenológica conserva sus `fuentes` y `confianza` del template.
 *   - Lenguaje llano español de Colombia (sin voseo): labels de etapa
 *     pensados para leerse de un vistazo en el campo.
 */
import { skyForDay, classifySkyCondition } from './skyConditionService';
import { getCurrentStage, calculateWindows } from './phenologyCalculator';
import { getTasksForStage } from './cycleTaskService';
import { getEnsemblePreventiveTasks } from './climateCycleService';

const DAY_MS = 86400000;

/** Etapas fenológicas en lenguaje llano (mismos codes de phenologyTemplates). */
export const STAGE_LABELS = Object.freeze({
  sowing: 'Siembra',
  emergence: 'Brote',
  vegetative: 'Crecimiento',
  flowering: 'Floración',
  fruiting: 'Echando fruto',
  harvest_window: 'Cosecha',
  closed: 'Ciclo cerrado',
  // Restauración/silvopastoreo (no fenología de cultivo): hitos propios.
  establecimiento: 'Establecimiento',
  prendimiento: 'Prendimiento',
  mantenimiento: 'Mantenimiento',
  monitoreo_sucesion: 'Monitoreo de sucesión',
  cierre: 'Cierre',
});

export const STAGE_EMOJIS = Object.freeze({
  sowing: '🌱',
  emergence: '🌿',
  vegetative: '🌳',
  flowering: '🌸',
  fruiting: '🍎',
  harvest_window: '🧺',
  closed: '🏁',
  // Restauración/silvopastoreo.
  establecimiento: '🌱',
  prendimiento: '🌿',
  mantenimiento: '🪴',
  monitoreo_sucesion: '🌳',
  cierre: '🏞️',
});

/**
 * Mapea el slug ENSO del sidecar ('nina_moderada', 'nino_fuerte', …) a la
 * fase que entiende getEnsemblePreventiveTasks ('la_nina' | 'el_nino').
 * Neutral / desconocido → null (sin tareas ENSO, no se inventan).
 * @param {string} [phase]
 * @returns {'el_nino'|'la_nina'|null}
 */
export function ensoTaskPhase(phase) {
  if (typeof phase !== 'string') return null;
  if (phase.startsWith('nino')) return 'el_nino';
  if (phase.startsWith('nina')) return 'la_nina';
  return null;
}

/**
 * Clima de HOY, honesto. Prefiere la nubosidad ACTUAL medida (sky.current);
 * cae al promedio diario / forecast del sidecar; sin nada → hasData:false
 * (el caller muestra "sin datos", nunca un sol inventado).
 *
 * @param {object} input
 * @param {object|null} input.snapshot  payload de clima (getCachedClimaSnapshot/fetchClimaSnapshot)
 * @param {object|null} input.sky       payload de cielo (getCachedSkyConditions/fetchSkyConditions)
 * @param {number|null} [input.elevationM]  msnm de la finca (corrección orográfica)
 * @returns {{ hasData:boolean, condition:string|null, label:string|null,
 *   tempMaxC:number|null, tempMinC:number|null, precipMm:number|null,
 *   ensoPhase:string, degraded:boolean, confidence:string|null, fuente:string }}
 */
export function buildClimaHoy({ snapshot = null, sky = null, elevationM = null } = /** @type {any} */ ({})) {
  const openmeteo = snapshot?.openmeteo;
  const forecast = openmeteo?.available && Array.isArray(openmeteo.forecast_7d)
    ? openmeteo.forecast_7d
    : [];
  const d0 = forecast[0] || null;
  const skyDay0 = Array.isArray(sky?.daily) ? sky.daily[0] || null : null;
  const current = sky?.current || null;
  const ensoPhase = snapshot?.enso_status?.phase || 'neutral';

  let cielo = null;
  if (current && (Number.isFinite(current.cloud_cover_pct) || Number.isFinite(current.weather_code))) {
    // Nubosidad medida AHORA: la señal más honesta para "hoy".
    cielo = classifySkyCondition({
      cloudCoverPct: current.cloud_cover_pct,
      weatherCode: current.weather_code,
      precipMm: Number.isFinite(d0?.precip_mm) ? d0.precip_mm : current.precip_mm,
      elevationM,
      ensoPhase,
    });
  } else if (d0 || skyDay0) {
    cielo = skyForDay(
      {
        precip_mm: Number.isFinite(d0?.precip_mm) ? d0.precip_mm : skyDay0?.precip_mm,
        cloud_cover_mean_pct: d0?.cloud_cover_mean_pct ?? skyDay0?.cloud_cover_mean_pct,
        weather_code: d0?.weather_code ?? skyDay0?.weather_code,
      },
      { elevationM, ensoPhase },
    );
  }

  const tempMaxC = typeof d0?.temp_max_c === 'number' ? d0.temp_max_c : null;
  const tempMinC = typeof d0?.temp_min_c === 'number' ? d0.temp_min_c : null;
  const precipMm = typeof d0?.precip_mm === 'number'
    ? d0.precip_mm
    : (typeof skyDay0?.precip_mm === 'number' ? skyDay0.precip_mm : null);

  return {
    hasData: Boolean(cielo) || tempMaxC != null,
    condition: cielo?.condition ?? null,
    label: cielo?.label ?? null,
    tempMaxC,
    tempMinC,
    precipMm,
    ensoPhase,
    degraded: Boolean(cielo?.degraded),
    confidence: cielo?.confidence ?? null,
    fuente: 'Open-Meteo',
  };
}

/** ¿El proceso cuenta como ciclo activo? (sin status explícito = activo). */
function esActivo(proc) {
  const status = proc?.attributes?.status;
  return !status || status === 'active';
}

/**
 * Tareas del ciclo para ESTA SEMANA, por ciclo activo.
 * Etapa: estima con fenología (especie + fecha siembra + altitud); si no hay
 * plantilla cae al current_stage registrado del proceso. Tareas: plantilla de
 * la etapa + preventivas ENSO (deduplicadas, ENSO primero por urgencia).
 *
 * @param {object} input
 * @param {Array} [input.processes]    FarmProcess[] (listFarmProcesses)
 * @param {number|null} [input.altitudeM]
 * @param {string} [input.ensoPhase]   slug del sidecar ('nina_moderada', …)
 * @param {number} [input.now]
 * @param {number} [input.maxPorCiclo] tope de tareas por ciclo (legibilidad)
 * @returns {Array<{processId:string, etiqueta:string, stageCode:string,
 *   stageLabel:string, emoji:string, diasDesdeSiembra:number|null,
 *   confianza:number|null, fuentes:string[],
 *   tareas:Array<{task:string, description:string, priority:string, origen:'etapa'|'enso'}>}>}
 */
export function buildTareasSemana({
  processes = [],
  altitudeM = null,
  ensoPhase = 'neutral',
  now = Date.now(),
  maxPorCiclo = 4,
} = {}) {
  const taskPhase = ensoTaskPhase(ensoPhase);
  const grupos = [];

  for (const proc of processes) {
    if (!esActivo(proc)) continue;
    const a = proc?.attributes || {};

    const est = a.subject_slug && a.created_at
      ? getCurrentStage({
        speciesSlug: a.subject_slug,
        sowingDate: a.created_at,
        altitudeM: altitudeM ?? undefined,
        now,
      })
      : null;
    const estCode = est?.stage?.status === 'computed' ? est.stage.code : null;
    const stageCode = estCode || a.current_stage || null;
    if (!stageCode) continue;

    // Etiqueta específica de la especie cuando el template la define; cae al
    // map genérico (STAGE_LABELS) cuando el template es genérico o no existe.
    const stageLabel = (estCode && est?.stage?.label)
      ? est.stage.label
      : STAGE_LABELS[stageCode] || stageCode;

    const deEtapa = getTasksForStage(stageCode).map((t) => ({ ...t, origen: 'etapa' }));
    const deEnso = taskPhase
      ? getEnsemblePreventiveTasks(taskPhase, stageCode).map((t) => ({ ...t, origen: 'enso' }))
      : [];

    // ENSO primero (urgencia climática), dedupe por nombre de tarea.
    const vistos = new Set();
    const tareas = [];
    for (const t of [...deEnso, ...deEtapa]) {
      if (vistos.has(t.task)) continue;
      vistos.add(t.task);
      tareas.push(t);
    }
    const orden = { alta: 0, media: 1, baja: 2 };
    tareas.sort((x, y) => (orden[x.priority] ?? 3) - (orden[y.priority] ?? 3));

    grupos.push({
      processId: proc.process_id || proc.id,
      etiqueta: a.subject_label || 'Ciclo',
      stageCode,
      stageLabel,
      emoji: STAGE_EMOJIS[stageCode] || '🌱',
      diasDesdeSiembra: est?.daysElapsed ?? null,
      confianza: est?.stage?.confidence ?? null,
      fuentes: est?.stage?.sources || [],
      tareas: tareas.slice(0, maxPorCiclo).map(t => /** @type {{ task: string, description: string, priority: string, origen: 'enso'|'etapa' }} */ (t)),
    });
  }
  return grupos;
}

/**
 * Agenda campesina: ventanas fenológicas que ABREN dentro del horizonte
 * (default ~5 semanas), por ciclo activo. Solo lo computable con plantilla +
 * fecha de siembra reales — sin plantilla no hay item (cero fabricación).
 *
 * @param {object} input
 * @param {Array} [input.processes]
 * @param {number|null} [input.altitudeM]
 * @param {number} [input.now]
 * @param {number} [input.horizonDays]
 * @returns {Array<{fecha:number, processId:string, etiqueta:string,
 *   stageCode:string, stageLabel:string, emoji:string,
 *   tipo:'cosecha'|'etapa', confianza:number, fuentes:string[],
 *   ventana:{inicio:number, fin:number|null}}>}
 */
export function buildAgenda({
  processes = [],
  altitudeM = null,
  now = Date.now(),
  horizonDays = 35,
} = {}) {
  const items = [];
  const horizonEnd = now + horizonDays * DAY_MS;

  for (const proc of processes) {
    if (!esActivo(proc)) continue;
    const a = proc?.attributes || {};
    if (!a.subject_slug || !a.created_at) continue;

    const windows = calculateWindows({
      speciesSlug: a.subject_slug,
      sowingDate: a.created_at,
      altitudeM: altitudeM ?? undefined,
    });
    for (const w of windows) {
      if (w.status !== 'computed' || w.windowStart == null) continue;
      if (w.code === 'sowing') continue; // la siembra ya ocurrió: no es agenda
      if (w.windowStart < now - DAY_MS || w.windowStart > horizonEnd) continue;
      items.push({
        fecha: w.windowStart,
        processId: proc.process_id || proc.id,
        etiqueta: a.subject_label || 'Ciclo',
        stageCode: w.code,
        stageLabel: w.label || STAGE_LABELS[w.code] || w.code,
        emoji: STAGE_EMOJIS[w.code] || '🌱',
        tipo: /** @type {'cosecha'|'etapa'} */ (w.code === 'harvest_window' ? 'cosecha' : 'etapa'),
        confianza: w.confidence,
        fuentes: w.sources || [],
        ventana: { inicio: w.windowStart, fin: w.windowEnd },
      });
    }
  }
  items.sort((x, y) => x.fecha - y.fecha);
  return items;
}

const DIA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Vista SEMANA: agrupa items de agenda por día calendario (Hoy, Mañana, …).
 * @param {Array<{fecha:number}>} items
 * @param {{now?:number, dias?:number}} [opts]
 * @returns {Array<{fecha:number, label:string, esHoy:boolean, items:Array}>}
 */
export function agendaPorDia(items = [], { now = Date.now(), dias = 7 } = {}) {
  const hoy0 = startOfDay(now);
  return Array.from({ length: dias }, (_, i) => {
    const dayStart = hoy0 + i * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const d = new Date(dayStart);
    const label = i === 0
      ? 'Hoy'
      : i === 1
        ? 'Mañana'
        : `${DIA_CORTO[d.getDay()]} ${d.getDate()}`;
    return {
      fecha: dayStart,
      label,
      esHoy: i === 0,
      items: items.filter((it) => it.fecha >= dayStart && it.fecha < dayEnd),
    };
  });
}

/**
 * Vista MES: agrupa items por semana ("Esta semana", "Próxima semana", …).
 * @param {Array<{fecha:number}>} items
 * @param {{now?:number, semanas?:number}} [opts]
 * @returns {Array<{inicio:number, fin:number, label:string, items:Array}>}
 */
export function agendaPorSemana(items = [], { now = Date.now(), semanas = 5 } = {}) {
  const hoy0 = startOfDay(now);
  const fmt = (ts) => new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  return Array.from({ length: semanas }, (_, i) => {
    const inicio = hoy0 + i * 7 * DAY_MS;
    const fin = inicio + 7 * DAY_MS;
    const label = i === 0
      ? 'Esta semana'
      : i === 1
        ? 'Próxima semana'
        : `Del ${fmt(inicio)} al ${fmt(fin - DAY_MS)}`;
    return {
      inicio,
      fin,
      label,
      items: items.filter((it) => it.fecha >= inicio && it.fecha < fin),
    };
  });
}
