/**
 * vitalidadEspirituService — arma el modelo del PANEL DE VITALIDAD DEL
 * ESPÍRITU del home "menú vivo" (FincaVivaHero, escena Finca Organismo),
 * fiel al mockup aprobado #/mockups/avatar-biopunk (AvatarGameBiopunk) pero
 * con GROUNDING TOTAL: cada número sale de un dato REAL de la finca del
 * usuario. Si un dato falta, el slot queda `estado: 'pendiente'`
 * ("dato en camino") — NUNCA se inventa un número.
 *
 * FUENTE REAL DE CADA VALOR (contrato anti-alucinación):
 *   · Vitalidad (medidor circular) → `scene.vitalidad` de
 *     fincaSceneService.buildFincaScene/calcularVitalidad: avance fenológico
 *     promedio de los ciclos ACTIVOS (FarmProcess reales) + diversidad de
 *     especies, saturada a 6. Sin registros (scene.vacia) → pendiente.
 *   · Especies vivas (badge) → conteo de especies DISTINTAS entre los
 *     FarmProcess activos (subject_slug/subject_label sin sufijo "#N") y las
 *     plantas-asset registradas (useAssetStore.plants, misma fuente que
 *     "Mis plantas: N" del dashboard).
 *   · 💧 El clima → la señal de clima GUARDADA de su vereda
 *     (climaService.getCachedClimaSnapshot: pronóstico Open-Meteo cacheado,
 *     offline-first) + la condición derivada por atmosphereService
 *     (despejado/nublado/lluvia/niebla — la MISMA del cielo de la escena).
 *     La barra pinta la lluvia de HOY en escala 0..25 mm (aguacero franco,
 *     mismo orden del umbral LLUVIA_MM=10 de atmosphereService). Sin
 *     snapshot → pendiente.
 *   · 🪱 El suelo → el diagnóstico REAL de soilDiagnostic.diagnosticarSuelo
 *     (DR-SUELOS-1) hecho sobre la descripción del usuario. Ese diagnóstico
 *     hoy se calcula bajo demanda (agente/pantalla de suelo) y NO se
 *     persiste, así que el slot queda pendiente hasta que llegue un
 *     diagnóstico (`diagSuelo`). Con diagnóstico: valor = 100 − 18 por cada
 *     problema detectado (fórmula documentada, acotada 0..100). Con
 *     `sin_datos` → pendiente. NO se fabrica un puntaje sin diagnóstico.
 *   · 🦋 La biodiversidad → especies distintas VIVAS, con la MISMA
 *     saturación a 6 especies que usa calcularVitalidad (min(n,6)/6·100).
 *     El texto lleva el conteo real.
 *   · 🔥 La energía (constancia) → registros REALES del MES en curso:
 *     cosechas anotadas este mes (serie mensual de cosechaService
 *     harvestSummary.trend) + siembras/ciclos abiertos este mes
 *     (FarmProcess.created_at). Escala documentada: 6 registros/mes =
 *     fuego pleno. Sin resumen de cosecha NI procesos → pendiente.
 *   · 🍃 Especies registradas → especies distintas de TODA la finca
 *     (procesos no cancelados, activos o cerrados, + plantas-asset).
 *   · ✦ Cosechas anotadas → useCosechaStore.summary.totalHarvests
 *     (log--harvest reales de logCache, agregados por cosechaService).
 *     summary null (aún sin cargar / error IDB) → pendiente. 0 con el store
 *     cargado es un CERO REAL y se muestra.
 *   · ◎ Anillos del frailejón → un anillo por AÑO calendario desde el
 *     PRIMER registro real de la finca (la siembra más antigua o la primera
 *     cosecha anotada, lo que ocurra primero) — el MISMO contrato que el
 *     Reloj del Frailejón (fincaClockService): el frailejón crece un anillo
 *     al año, y los dos "anillos" del home deben contar lo mismo. Sin
 *     ningún registro → pendiente.
 *
 * Todo puro y client-side (sin fetch, sin IDB, sin DOM): la vista
 * (FincaVivaHero → PanelVitalidadEspiritu) inyecta los datos ya cargados.
 * Español de Colombia (tú/usted), sin voseo.
 *
 * @module services/vitalidadEspirituService
 */

import { stripInstanceSuffix } from '../utils/agruparEntradas';

/** Escala de la barra de clima: 25 mm de lluvia en el día = barra llena. */
export const PRECIP_ESCALA_MM = 25;
/** Saturación de diversidad (la misma de calcularVitalidad): 6 especies = 100. */
export const BIODIVERSIDAD_SATURACION = 6;
/** Registros del mes que llenan la barra de energía (constancia). */
export const ENERGIA_META_MES = 6;
/** Penalización por problema de suelo detectado (0..100, documentada). */
export const SUELO_PENALIZACION_POR_PROBLEMA = 18;

/** Copys de las fuentes (aria/title de cada slot — trazabilidad visible). */
export const FUENTES = Object.freeze({
  vitalidad: 'Avance real de sus ciclos de cultivo + diversidad de especies (fincaSceneService)',
  especies: 'Ciclos de cultivo y plantas registradas en su finca',
  clima: 'Señal de clima guardada para su vereda (pronóstico Open-Meteo, offline)',
  suelo: 'Diagnóstico de suelo sin laboratorio (DR-SUELOS-1) — descríbale su suelo al agente',
  biodiversidad: 'Especies distintas vivas en su finca (saturación a 6, como la vitalidad)',
  energia: 'Registros de este mes: cosechas anotadas + siembras abiertas',
  cosechas: 'Cosechas anotadas en «Mi cosecha» (registros reales de su finca)',
  anillos: 'Un anillo por año de su finca en Chagra, desde su primer registro real',
});

const CONDICION_LABEL = Object.freeze({
  despejado: 'despejado',
  nublado: 'nublado',
  lluvia: 'lluvia',
  niebla: 'niebla',
});

/* ── helpers ──────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} SlotVitalidad
 * @property {'ok'|'pendiente'} estado  pendiente = "dato en camino" (se pinta
 *   "—", nunca un número inventado)
 * @property {number|null} valor
 * @property {string} [texto]  lectura corta del dato real (aria/title)
 * @property {string} fuente   de dónde sale el valor (trazabilidad)
 */

const clamp01 = (v) => Math.max(0, Math.min(100, v));
const finito = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * @param {number|null} valor
 * @param {{texto?: string, fuente?: string}} [extra]
 * @returns {SlotVitalidad}
 */
const ok = (valor, extra = {}) => (
  /** @type {SlotVitalidad} */ ({ estado: 'ok', valor, fuente: '', ...extra })
);
/**
 * @param {{texto?: string, fuente?: string}} [extra]
 * @returns {SlotVitalidad}
 */
const pendiente = (extra = {}) => (
  /** @type {SlotVitalidad} */ ({ estado: 'pendiente', valor: null, fuente: '', ...extra })
);

/** Aplana un FarmProcess (anidado en `.attributes` o plano). */
function attrs(p) {
  if (!p || typeof p !== 'object') return null;
  return p.attributes && typeof p.attributes === 'object' ? p.attributes : p;
}

/** Clave de especie de un proceso: slug si existe, si no el label sin "#N". */
function claveEspecieProceso(a) {
  const slug = typeof a.subject_slug === 'string' ? a.subject_slug.trim() : '';
  if (slug) return slug.toLowerCase();
  const label = stripInstanceSuffix(a.subject_label || '');
  return label ? label.toLowerCase() : '';
}

/** Clave de especie de una planta-asset: su nombre sin el sufijo "#N". */
function claveEspeciePlanta(plant) {
  const name = plant?.attributes?.name || plant?.name || '';
  const base = stripInstanceSuffix(String(name));
  return base ? base.toLowerCase() : '';
}

/**
 * Especies DISTINTAS de la finca, desde procesos + plantas-asset reales.
 *
 * @param {Array} processes  FarmProcess[] (anidados o planos)
 * @param {Array} plants     plantas-asset (useAssetStore.plants)
 * @param {{soloVivas?: boolean}} [opts]  true → solo procesos activos y
 *   plantas no archivadas ("especies vivas"); false → toda la historia
 *   no cancelada ("especies registradas").
 * @returns {number}
 */
export function contarEspecies(processes = [], plants = [], { soloVivas = false } = {}) {
  const set = new Set();
  for (const p of Array.isArray(processes) ? processes : []) {
    const a = attrs(p);
    if (!a) continue;
    const status = a.status || 'active';
    if (status === 'cancelled') continue;
    if (soloVivas && status !== 'active') continue;
    const clave = claveEspecieProceso(a);
    if (clave) set.add(clave);
  }
  for (const plant of Array.isArray(plants) ? plants : []) {
    const status = plant?.attributes?.status || plant?.status || 'active';
    if (soloVivas && status === 'archived') continue;
    const clave = claveEspeciePlanta(plant);
    if (clave) set.add(clave);
  }
  return set.size;
}

/** 'YYYY-MM-DD' local (mismo criterio que atmosphereService). */
function isoDiaLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Eje 💧 El clima, desde la señal guardada (snapshot cacheado + condición ya
 * derivada por atmosphereService). Ver contrato en el docstring del módulo.
 *
 * @param {{climaSnapshot?: object|null, condicion?: string|null, now?: Date}} [input]
 * @returns {SlotVitalidad}
 */
export function ejeClima({ climaSnapshot = null, condicion = null, now = new Date() } = {}) {
  const om = climaSnapshot?.openmeteo;
  const forecast = om?.available && Array.isArray(om.forecast_7d) ? om.forecast_7d : null;
  const hoyKey = isoDiaLocal(now);
  const day = forecast?.find((d) => d?.date === hoyKey) || forecast?.[0] || null;
  const precip = finito(day?.precip_mm);
  const condTxt = condicion && CONDICION_LABEL[condicion] ? CONDICION_LABEL[condicion] : null;

  if (precip != null) {
    const partes = [`${precip} mm hoy`];
    if (condTxt) partes.push(condTxt);
    return ok(Math.round(clamp01((precip / PRECIP_ESCALA_MM) * 100)), {
      texto: partes.join(' · '),
      fuente: FUENTES.clima,
    });
  }
  if (condTxt) {
    // Hay condición real (nubosidad/estado) pero sin mm: se muestra la
    // condición sin inventar una barra numérica.
    return ok(null, { texto: condTxt, fuente: FUENTES.clima });
  }
  return pendiente({ texto: 'dato en camino', fuente: FUENTES.clima });
}

/**
 * Eje 🪱 El suelo, desde un resultado REAL de diagnosticarSuelo
 * (services/soilDiagnostic). Sin diagnóstico o con `sin_datos` → pendiente.
 * Fórmula documentada: 100 − 18·problemas, acotada 0..100.
 *
 * @param {object|null} [diagSuelo]  resultado de diagnosticarSuelo, o null
 * @returns {SlotVitalidad}
 */
export function ejeSuelo(diagSuelo = null) {
  if (!diagSuelo || diagSuelo.sin_datos) {
    return pendiente({ texto: 'dato en camino', fuente: FUENTES.suelo });
  }
  const problemas = Array.isArray(diagSuelo.problemas) ? diagSuelo.problemas : [];
  const valor = Math.round(clamp01(100 - problemas.length * SUELO_PENALIZACION_POR_PROBLEMA));
  const texto = problemas.length === 0
    ? 'sin señales de alarma'
    : `${problemas.length} ${problemas.length === 1 ? 'señal' : 'señales'} de cuidado`;
  return ok(valor, { texto, fuente: FUENTES.suelo });
}

/**
 * Eje 🦋 La biodiversidad: especies vivas distintas, saturadas a 6 (la misma
 * regla de diversidad de calcularVitalidad — no se inventa otra escala).
 *
 * @param {{especiesVivas?: number, vacia?: boolean}} [input]
 * @returns {SlotVitalidad}
 */
export function ejeBiodiversidad({ especiesVivas = 0, vacia = true } = {}) {
  if (especiesVivas <= 0 && vacia) {
    return pendiente({ texto: 'dato en camino', fuente: FUENTES.biodiversidad });
  }
  const valor = Math.round(clamp01((Math.min(especiesVivas, BIODIVERSIDAD_SATURACION) / BIODIVERSIDAD_SATURACION) * 100));
  return ok(valor, {
    texto: `${especiesVivas} ${especiesVivas === 1 ? 'especie' : 'especies'}`,
    fuente: FUENTES.biodiversidad,
  });
}

/** 'YYYY-MM' UTC — el MISMO bucket mensual de cosechaService.temporalTrend. */
function mesBucketUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Eje 🔥 La energía (constancia de registro): cosechas anotadas este mes
 * (serie mensual real de harvestSummary.trend) + ciclos abiertos este mes
 * (created_at de FarmProcess). 6 registros/mes = barra llena (documentado).
 *
 * @param {{processes?: Array, harvestSummary?: object|null, now?: Date}} [input]
 * @returns {SlotVitalidad}
 */
export function ejeEnergia({ processes = [], harvestSummary = null, now = new Date() } = {}) {
  const hayProcesos = Array.isArray(processes) && processes.length > 0;
  if (!harvestSummary && !hayProcesos) {
    return pendiente({ texto: 'dato en camino', fuente: FUENTES.energia });
  }
  const mesKey = mesBucketUTC(now);
  const serie = harvestSummary?.trend?.series;
  const cosechasMes = Array.isArray(serie)
    ? (serie.find((s) => s?.period === mesKey)?.harvestCount || 0)
    : 0;
  let siembrasMes = 0;
  for (const p of Array.isArray(processes) ? processes : []) {
    const a = attrs(p);
    const ts = finito(a?.created_at);
    if (ts == null || a?.status === 'cancelled') continue;
    if (mesBucketUTC(new Date(ts)) === mesKey) siembrasMes += 1;
  }
  const registros = cosechasMes + siembrasMes;
  return ok(Math.round(clamp01((Math.min(registros, ENERGIA_META_MES) / ENERGIA_META_MES) * 100)), {
    texto: `${registros} ${registros === 1 ? 'registro' : 'registros'} este mes`,
    fuente: FUENTES.energia,
  });
}

/**
 * ◎ Anillos del frailejón: un anillo por AÑO calendario desde el primer
 * registro real (siembra más antigua o primera cosecha anotada) — mismo
 * contrato que fincaClockService.getAniosFinca (el reloj del home): los dos
 * "anillos del frailejón" cuentan LO MISMO y nunca se contradicen.
 *
 * @param {{processes?: Array, harvestSummary?: object|null, now?: Date}} [input]
 * @returns {SlotVitalidad}
 */
export function contarAnillosFrailejon({ processes = [], harvestSummary = null, now = new Date() } = {}) {
  let primero = null;
  for (const p of Array.isArray(processes) ? processes : []) {
    const a = attrs(p);
    const ts = finito(a?.created_at);
    if (ts == null || a?.status === 'cancelled') continue;
    if (primero == null || ts < primero) primero = ts;
  }
  const primeraCosecha = finito(harvestSummary?.dateRange?.firstMs);
  if (primeraCosecha != null && (primero == null || primeraCosecha < primero)) {
    primero = primeraCosecha;
  }
  if (primero == null || primero > now.getTime()) {
    return pendiente({ fuente: FUENTES.anillos });
  }
  const inicio = new Date(primero);
  const anillos = Math.max(0, now.getFullYear() - inicio.getFullYear()) + 1;
  return ok(anillos, { fuente: FUENTES.anillos });
}

/* ── modelo completo del panel ────────────────────────────────────────────── */

/**
 * Arma el modelo completo del panel. Ver "FUENTE REAL DE CADA VALOR" arriba.
 *
 * @param {Object} input
 * @param {Object|null} [input.scene]  FincaScene de buildFincaScene (vitalidad honesta)
 * @param {Array} [input.processes]    FarmProcess[] reales (farmProcessCache)
 * @param {Array} [input.plants]       plantas-asset (useAssetStore.plants)
 * @param {Object|null} [input.climaSnapshot]  getCachedClimaSnapshot() o null
 * @param {string|null} [input.condicion]      atmosfera.condicion (deriveAtmosphere)
 * @param {Object|null} [input.harvestSummary] useCosechaStore.summary o null
 * @param {Object|null} [input.diagSuelo]      resultado de diagnosticarSuelo (si existe)
 * @param {Date} [input.now]           inyectable en tests
 * @returns {{
 *   vitalidad: SlotVitalidad,
 *   especiesVivas: SlotVitalidad,
 *   ejes: Array<SlotVitalidad & {id:string, emoji:string, label:string, c1:string, c2:string}>,
 *   conteos: {especies: SlotVitalidad, cosechas: SlotVitalidad, anillos: SlotVitalidad},
 *   algunPendiente: boolean,
 * }}
 */
export function buildVitalidadEspiritu({
  scene = null,
  processes = [],
  plants = [],
  climaSnapshot = null,
  condicion = null,
  harvestSummary = null,
  diagSuelo = null,
  now = new Date(),
} = {}) {
  const vacia = scene ? !!scene.vacia : true;

  const vitalidad = (scene && !vacia && Number.isFinite(scene.vitalidad))
    ? ok(Math.round(clamp01(scene.vitalidad)), { fuente: FUENTES.vitalidad })
    : pendiente({ fuente: FUENTES.vitalidad });

  const vivas = contarEspecies(processes, plants, { soloVivas: true });
  const especiesVivas = (vivas > 0 || !vacia)
    ? ok(vivas, { fuente: FUENTES.especies })
    : pendiente({ fuente: FUENTES.especies });

  // Los 4 ejes del panel del mockup (mismos colores neón c1→c2 del original).
  const ejes = [
    { id: 'clima', emoji: '💧', label: 'El clima', c1: '#4fd8ff', c2: '#2dffc4', ...ejeClima({ climaSnapshot, condicion, now }) },
    { id: 'suelo', emoji: '🪱', label: 'El suelo', c1: '#ffb54f', c2: '#9dff3f', ...ejeSuelo(diagSuelo) },
    { id: 'biodiversidad', emoji: '🦋', label: 'La biodiversidad', c1: '#ff4fd8', c2: '#b28dff', ...ejeBiodiversidad({ especiesVivas: vivas, vacia }) },
    { id: 'energia', emoji: '🔥', label: 'La energía', c1: '#9dff3f', c2: '#2dffc4', ...ejeEnergia({ processes, harvestSummary, now }) },
  ];

  const registradas = contarEspecies(processes, plants, { soloVivas: false });
  const conteos = {
    especies: (registradas > 0 || !vacia)
      ? ok(registradas, { fuente: FUENTES.especies })
      : pendiente({ fuente: FUENTES.especies }),
    cosechas: harvestSummary
      ? ok(Number.isFinite(harvestSummary.totalHarvests) ? harvestSummary.totalHarvests : 0, { fuente: FUENTES.cosechas })
      : pendiente({ fuente: FUENTES.cosechas }),
    anillos: contarAnillosFrailejon({ processes, harvestSummary, now }),
  };

  const slots = [vitalidad, especiesVivas, ...ejes, conteos.especies, conteos.cosechas, conteos.anillos];
  return {
    vitalidad,
    especiesVivas,
    ejes,
    conteos,
    algunPendiente: slots.some((s) => s.estado === 'pendiente'),
  };
}

export default buildVitalidadEspiritu;
