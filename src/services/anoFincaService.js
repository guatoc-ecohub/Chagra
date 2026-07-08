/**
 * anoFincaService — arma la LÍNEA DE TIEMPO del año de la finca del usuario
 * ("El año de la finca"): qué pasó (siembras, cosechas, labores, floraciones
 * REGISTRADAS) y qué viene (ventanas de cosecha/floración/nutrición del
 * calendario groundeado), todo ubicado en los 12 meses del año en curso.
 *
 * FUENTES (todas existentes, este servicio NO inventa datos):
 *   - Siembras   → FarmProcess de la finca (listFarmProcesses + hydrate):
 *                  `attributes.created_at` es el día 0 del ciclo.
 *   - Cosechas   → `log--harvest` de logCache, normalizados por cosechaService
 *                  (SOLO LECTURA: la vista "Mi cosecha" es dueña del tablero
 *                  de cantidades; aquí solo ubicamos el hito en el tiempo).
 *   - Labores    → FarmProcessEvent (task_completed, observation,
 *                  pest_management_confirmed, stage_transition).
 *   - Floración  → stage_transition con to_stage 'flowering' (dato del usuario).
 *   - Lo que viene → PlantCalendar de farmCalendarService (buildPlantCalendar),
 *                  que ya es groundeado y honesto (approximate/confidence).
 *
 * REGLA DURA (anti-alucinación): un hito sin fecha real no se pinta. Los hitos
 * futuros heredan `approximate` del calendario y se marcan `pasado: false`.
 *
 * Todo es puro y client-side: la vista (AnoFincaScreen) hace el I/O.
 */
import { normalizeHarvests } from './cosechaService';
import { STAGE_LABELS } from './hoyEnFincaService';
import { stripInstanceSuffix, dayBucket } from '../utils/agruparEntradas';

/** Tipos de hito del año. El orden es el de dibujado/leyenda. */
export const HITO_TIPOS = Object.freeze(['siembra', 'cosecha', 'floracion', 'labor', 'nutricion']);

export const HITO_META = Object.freeze({
  siembra: { label: 'Siembra', emoji: '🌱' },
  cosecha: { label: 'Cosecha', emoji: '🧺' },
  floracion: { label: 'Floración', emoji: '🌸' },
  labor: { label: 'Labor', emoji: '🛠️' },
  nutricion: { label: 'Nutrición', emoji: '🧪' },
});

export const MESES_CORTOS = Object.freeze(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']);
export const MESES_LARGOS = Object.freeze([
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]);

/**
 * Tono de temporada por mes 1-12, MAPEO FIEL de las temporadas del almanaque
 * campesino (data/almanaqueFinca.js TEMPORADAS_ANIO, zona andina bimodal):
 *   primeras aguas "abril – mayo" → 4,5 · secas grandes "junio – agosto" →
 *   6,7,8 · segundas aguas "octubre – noviembre" → 10,11 · secas de fin de año
 *   "diciembre – febrero" → 12,1,2. Marzo y septiembre no están cubiertos por
 *   el texto del almanaque → 'transicion' (no se inventa tono).
 */
export const TEMPORADA_POR_MES = Object.freeze([
  { mes: 1, tono: 'seca', temporadaId: 'secas2' },
  { mes: 2, tono: 'seca', temporadaId: 'secas2' },
  { mes: 3, tono: 'transicion', temporadaId: null },
  { mes: 4, tono: 'lluvia', temporadaId: 'aguas1' },
  { mes: 5, tono: 'lluvia', temporadaId: 'aguas1' },
  { mes: 6, tono: 'seca', temporadaId: 'secas1' },
  { mes: 7, tono: 'seca', temporadaId: 'secas1' },
  { mes: 8, tono: 'seca', temporadaId: 'secas1' },
  { mes: 9, tono: 'transicion', temporadaId: null },
  { mes: 10, tono: 'lluvia', temporadaId: 'aguas2' },
  { mes: 11, tono: 'lluvia', temporadaId: 'aguas2' },
  { mes: 12, tono: 'seca', temporadaId: 'secas2' },
]);

/** Etiquetas de etapa que STAGE_LABELS (hoyEnFincaService) no cubre pero que
 * los ciclos reales usan (current_stage de farmProcess / demo). */
const EXTRA_STAGE_LABELS = Object.freeze({
  sowing_confirmed: 'Siembra',
  germination: 'Germinación',
  growth: 'Crecimiento',
  harvest: 'Cosecha',
  fallow: 'Descanso',
});

/**
 * Etiqueta en llano de un código de etapa. Devuelve el código crudo si no hay
 * traducción (mejor mostrar el dato real que inventar).
 * @param {string} code
 * @returns {string}
 */
export function stageLabel(code) {
  const base = String(code || '').replace(/_confirmed$/, '');
  return STAGE_LABELS[base] || EXTRA_STAGE_LABELS[code] || EXTRA_STAGE_LABELS[base] || code || '';
}

const isFiniteTs = (ts) => Number.isFinite(ts) && ts > 0;
const yearOf = (ts) => new Date(ts).getFullYear();
const monthOf = (ts) => new Date(ts).getMonth() + 1;
const dayOf = (ts) => new Date(ts).getDate();

/**
 * Hitos de SIEMBRA del año: uno por grupo (especie + día + lote), con `count`
 * de matas equivalentes (misma agrupación que el Calendario de finca, para no
 * pintar 20 puntos de "Fresa #01..#20").
 *
 * @param {Array} cycles — FarmProcess[] (attributes.created_at = siembra)
 * @param {number} year
 * @returns {Array} hitos
 */
export function hitosDeSiembras(cycles = [], year) {
  const grupos = new Map();
  for (const cycle of cycles) {
    const a = cycle?.attributes || {};
    const ts = a.created_at;
    if (!isFiniteTs(ts) || yearOf(ts) !== year) continue;
    const nombre = stripInstanceSuffix(a.subject_label) || a.subject_label || a.subject_slug || 'Cultivo';
    const key = `${a.subject_slug || nombre}|${dayBucket(ts)}|${a.location_land_asset_id || ''}`;
    const prev = grupos.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      grupos.set(key, {
        id: `siembra-${cycle.process_id || cycle.id || key}`,
        tipo: 'siembra',
        pasado: true,
        ts,
        month: monthOf(ts),
        day: dayOf(ts),
        label: `Sembró ${nombre}`,
        detail: a.variety ? `Variedad ${a.variety}` : '',
        count: 1,
        approximate: false,
        source: 'Ciclo de cultivo registrado en su finca',
      });
    }
  }
  return [...grupos.values()];
}

/**
 * Hitos de COSECHA del año desde los `log--harvest` (normalizados por
 * cosechaService — solo lectura). El detalle trae la cantidad tal como se
 * registró; los kg agregados son negocio de "Mi cosecha", no de esta vista.
 *
 * @param {Array} harvestLogs — logs crudos de logCache
 * @param {number} year
 * @returns {Array} hitos
 */
export function hitosDeCosechas(harvestLogs = [], year) {
  return normalizeHarvests(harvestLogs)
    .filter((h) => isFiniteTs(h.timestampMs) && yearOf(h.timestampMs) === year)
    .map((h) => ({
      id: `cosecha-${h.id}`,
      tipo: 'cosecha',
      pasado: true,
      ts: h.timestampMs,
      month: monthOf(h.timestampMs),
      day: dayOf(h.timestampMs),
      label: `Cosechó ${h.crop}`,
      detail: h.value > 0 ? `${h.value} ${h.unit || ''}`.trim() : '',
      count: 1,
      approximate: false,
      source: 'Cosecha registrada en su finca',
    }));
}

/**
 * Hitos de LABORES y FLORACIONES del año desde los eventos de ciclo
 * (FarmProcessEvent). Reglas:
 *   - task_completed / pest_management_confirmed → labor.
 *   - stage_transition a 'flowering' → floración ("floreció Z", dato real).
 *   - stage_transition a otra etapa → labor "X pasó a {etapa}".
 *   - observation → se AGREGAN por planta+mes ("N apuntes de X") para no
 *     inundar el carril.
 *   - sowing_confirmed / harvest_confirmed se OMITEN: ya vienen como hitos de
 *     siembra (proceso) y cosecha (log--harvest); incluirlos duplicaría.
 *
 * @param {Object<string, Array>} eventsByProcess — process_id → eventos
 * @param {Object<string, Object>} cyclesById — process_id → FarmProcess
 * @param {number} year
 * @returns {Array} hitos
 */
export function hitosDeEventos(eventsByProcess = {}, cyclesById = {}, year) {
  const hitos = [];
  const observaciones = new Map(); // `${processId}|${month}` → agregado

  for (const [processId, events] of Object.entries(eventsByProcess)) {
    const cycle = cyclesById[processId];
    const nombre = stripInstanceSuffix(cycle?.attributes?.subject_label)
      || cycle?.attributes?.subject_label || cycle?.attributes?.subject_slug || 'la mata';

    for (const ev of events || []) {
      const a = ev?.attributes || {};
      const ts = a.occurred_at;
      if (!isFiniteTs(ts) || yearOf(ts) !== year) continue;

      if (a.event_type === 'stage_transition' || a.event_type === 'stage_confirmed') {
        const to = a.payload?.to_stage || a.payload?.stage || '';
        const base = String(to).replace(/_confirmed$/, '');
        if (!to) continue;
        hitos.push({
          id: `evento-${ev.event_id || `${processId}-${ts}`}`,
          tipo: base === 'flowering' ? 'floracion' : 'labor',
          pasado: true,
          ts,
          month: monthOf(ts),
          day: dayOf(ts),
          label: base === 'flowering' ? `Floreció ${nombre}` : `${nombre} pasó a ${stageLabel(to).toLowerCase()}`,
          detail: '',
          count: 1,
          approximate: false,
          source: 'Etapa registrada en el ciclo de cultivo',
        });
      } else if (a.event_type === 'task_completed' || a.event_type === 'pest_management_confirmed') {
        hitos.push({
          id: `evento-${ev.event_id || `${processId}-${ts}`}`,
          tipo: 'labor',
          pasado: true,
          ts,
          month: monthOf(ts),
          day: dayOf(ts),
          label: a.event_type === 'pest_management_confirmed'
            ? `Manejo de plaga en ${nombre}`
            : `Labor en ${nombre}`,
          detail: a.payload?.task_label || a.payload?.pest_name || a.notes || '',
          count: 1,
          approximate: false,
          source: 'Labor registrada en el ciclo de cultivo',
        });
      } else if (a.event_type === 'observation') {
        const key = `${processId}|${monthOf(ts)}`;
        const prev = observaciones.get(key);
        if (prev) {
          prev.count += 1;
          if (ts > prev.ts) { prev.ts = ts; prev.day = dayOf(ts); }
        } else {
          observaciones.set(key, {
            id: `obs-${key}`,
            tipo: 'labor',
            pasado: true,
            ts,
            month: monthOf(ts),
            day: dayOf(ts),
            label: `Apuntes de ${nombre}`,
            detail: '',
            count: 1,
            approximate: false,
            source: 'Observaciones registradas en el ciclo',
          });
        }
      }
      // Otros event_type (photo_attached, weather_snapshot, note, sowing/
      // harvest_confirmed) se omiten a propósito (ver docstring).
    }
  }

  for (const obs of observaciones.values()) {
    if (obs.count > 1) obs.label = `${obs.count} apuntes: ${obs.label.replace(/^Apuntes de /, '')}`;
    hitos.push(obs);
  }
  return hitos;
}

/**
 * Hitos FUTUROS del resto del año desde los PlantCalendar groundeados
 * (farmCalendarService.buildPlantCalendar). Solo capas con valor de agenda:
 * cosecha (qué viene a canasta), floración (fenología stageCode 'flowering') y
 * nutrición ANCLADA a siembra real. Un hito por (planta, entrada, mes futuro).
 * Las entradas `continuous` (produce todo el año) se resumen en UN hito en el
 * mes siguiente, no en 12 puntos.
 *
 * @param {Array} calendars — PlantCalendar[] con status 'ok'
 * @param {{currentMonth?: number}} [cfg] - mes actual 1-12 (los hitos van de
 *   currentMonth+1 a 12)
 * @returns {Array} hitos con pasado: false
 */
export function hitosFuturos(calendars = [], { currentMonth } = {}) {
  const hitos = [];
  for (const plant of calendars) {
    if (!plant || plant.status !== 'ok') continue;
    for (const entry of plant.entries || []) {
      const esFloracion = entry.layer === 'fenologia' && entry.stageCode === 'flowering';
      const esNutricion = entry.layer === 'nutricion' && entry.anchored;
      const esCosecha = entry.layer === 'cosecha';
      if (!esCosecha && !esFloracion && !esNutricion) continue;

      const tipo = esCosecha ? 'cosecha' : esFloracion ? 'floracion' : 'nutricion';
      const verbo = esCosecha ? 'Viene cosecha de' : esFloracion ? 'Floración esperada de' : 'Abonar';

      const mesesFuturos = (entry.months || []).filter((m) => m > currentMonth && m <= 12);
      if (mesesFuturos.length === 0) continue;

      if (entry.continuous) {
        // Produce casi todo el año: un solo hito-resumen, no 12 puntos.
        hitos.push({
          id: `futuro-${plant.id}-${entry.layer}-cont`,
          tipo,
          pasado: false,
          ts: null,
          month: Math.min(...mesesFuturos),
          day: null,
          label: `${plant.name}: cosecha casi todo el año`,
          detail: entry.detail || '',
          count: plant.count || 1,
          approximate: true,
          source: entry.source || 'Calendario de la finca',
        });
        continue;
      }

      for (const m of mesesFuturos) {
        hitos.push({
          id: `futuro-${plant.id}-${entry.layer}-${entry.stageCode || entry.title}-${m}`,
          tipo,
          pasado: false,
          ts: null,
          month: m,
          day: null,
          label: `${verbo} ${plant.name}`,
          detail: entry.title && entry.title !== plant.name ? entry.title : '',
          count: plant.count || 1,
          approximate: Boolean(entry.approximate),
          source: entry.source || 'Calendario de la finca',
        });
      }
    }
  }
  return hitos;
}

/**
 * Arma la línea de tiempo completa del año en curso.
 *
 * @param {Object} cfg
 * @param {Array} [cfg.cycles] - FarmProcess[] de la finca
 * @param {Array} [cfg.harvestLogs] - log--harvest crudos (logCache)
 * @param {Object<string, Array>} [cfg.eventsByProcess] - process_id a eventos
 * @param {Array} [cfg.calendars] - PlantCalendar[] (farmCalendarService)
 * @param {number} [cfg.now] - epoch ms (inyectable en tests)
 * @returns {{
 *   year: number, currentMonth: number, hitos: Array,
 *   porMes: Array<{mes:number, estado:string, tono:string, temporadaId:(string|null),
 *                  hitos:Array, counts:Object, total:number}>,
 *   totalPasado: number, totalFuturo: number, vacio: boolean
 * }}
 */
export function buildAnoFinca({ cycles = [], harvestLogs = [], eventsByProcess = {}, calendars = [], now } = {}) {
  const ref = isFiniteTs(now) ? now : Date.now();
  const year = yearOf(ref);
  const currentMonth = monthOf(ref);

  const cyclesById = {};
  for (const c of cycles) {
    const id = c?.process_id || c?.id;
    if (id) cyclesById[id] = c;
  }

  const pasados = [
    ...hitosDeSiembras(cycles, year),
    ...hitosDeCosechas(harvestLogs, year),
    ...hitosDeEventos(eventsByProcess, cyclesById, year),
  ];
  const futuros = hitosFuturos(calendars, { currentMonth });
  const hitos = [...pasados, ...futuros];

  const porMes = TEMPORADA_POR_MES.map(({ mes, tono, temporadaId }) => {
    const delMes = hitos.filter((h) => h.month === mes);
    // Cronológico dentro del mes; los futuros (sin ts) al final.
    delMes.sort((a, b) => {
      if (a.pasado !== b.pasado) return a.pasado ? -1 : 1;
      return (a.ts || 0) - (b.ts || 0);
    });
    const counts = {};
    for (const h of delMes) counts[h.tipo] = (counts[h.tipo] || 0) + 1;
    return {
      mes,
      estado: mes === currentMonth ? 'hoy' : mes < currentMonth ? 'pasado' : 'proximo',
      tono,
      temporadaId,
      hitos: delMes,
      counts,
      total: delMes.length,
    };
  });

  return {
    year,
    currentMonth,
    hitos,
    porMes,
    totalPasado: pasados.length,
    totalFuturo: futuros.length,
    vacio: hitos.length === 0,
  };
}
