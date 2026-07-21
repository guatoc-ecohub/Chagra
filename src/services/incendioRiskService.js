/**
 * incendioRiskService — Alerta de RIESGO DE INCENDIO forestal para la finca.
 *
 * Caso de uso (Ana, UNGRD Pasto / Galeras): "¿mi zona está en temporada de
 * riesgo de incendio?" El diferenciador Pro para gestión de riesgo de
 * desastres y restauración post-perturbación.
 *
 * ── HONESTIDAD DE FUENTES (verify-first, cero fabricación) ──────────────────
 *
 * NO existe una API pública verificada de alertas de incendio EN TIEMPO REAL de
 * IDEAM ni del sistema UNGRD (SAGER / SNPAD) consultable con HTTP-200 a la
 * fecha. Por eso este servicio NO afirma "hay un incendio activo" ni emite una
 * alerta oficial. Es una ESTIMACIÓN de riesgo (estacional/climática) construida
 * SOLO con señales reales que la app ya tiene cableadas:
 *
 *   1. FASE ENSO en vivo (NOAA ONI + IDEAM) vía ensoService.getEnsoPhase().
 *      El Niño = sequía → más combustible seco → mayor riesgo (IDEAM/UNGRD).
 *   2. TEMPORADA SECA por región natural (climatología IDEAM documentada:
 *      régimen bimodal Andina/Caribe = dic–mar + jun–ago; monomodal seco
 *      Orinoquía/Amazonía = dic–mar). NO es un pronóstico, es el calendario
 *      climatológico medio.
 *   3. PISO TÉRMICO / REGIÓN del perfil (ensoContext.REGION_IMPACTS ya
 *      documenta que Orinoquía/Amazonía/altiplano seco son fire-prone bajo
 *      El Niño, con cita DR-MISSION-4).
 *
 * El nivel resultante ('alto'|'medio'|'bajo') se marca SIEMPRE como
 * `es_estimacion: true` y trae `disclaimer` explícito: el campesino debe
 * confirmar con su CMGRD / bomberos / Corporación Autónoma Regional para una
 * alerta oficial. La regla del Pacífico (sin temporada seca marcada) evita
 * falsos positivos donde el riesgo real de incendio es bajo.
 *
 * Este módulo es PURO (sin red, sin React): toma la fase ENSO y el perfil y
 * devuelve un objeto serializable, testeable en aislamiento (TDD). El path de
 * datos en vivo (snapshot del sidecar) ya alimenta ensoService; aquí leemos la
 * fase efectiva, así offline y chat coinciden.
 *
 * Lo consume: AgentScreen (grounding del agente cuando el usuario pregunta por
 * riesgo de incendio) y el PDF del plan de restauración (sección de contexto de
 * riesgo para informes UNGRD).
 */

import { getEnsoPhase, getEnsoPhaseSource } from './ensoService.js';
import { ensoFamily, regionFromProfile } from './ensoContext.js';
import { getProfile } from './userProfileService.js';

const MESES = Object.freeze([
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]);

/**
 * Temporadas secas medias por región natural (climatología IDEAM, meses
 * 1-indexados). Fuente: régimen de lluvias de Colombia (IDEAM, Atlas
 * Climatológico). NO es un pronóstico — es el patrón medio que define cuándo el
 * combustible vegetal tiende a estar más seco y el riesgo de incendio sube.
 *
 *   - bimodal (Andina, Caribe): dos temporadas secas — dic–mar y jun–ago.
 *   - monomodal seco (Orinoquía, Amazonía): una temporada seca marcada dic–mar
 *     (la "época de quemas" de la sabana / piedemonte).
 *   - Pacífico: sin temporada seca marcada (lluvia casi todo el año) → el
 *     riesgo de incendio forestal es estructuralmente bajo.
 */
const DRY_SEASONS = Object.freeze({
  andina: { meses: [12, 1, 2, 3, 6, 7, 8], etiqueta: 'temporada seca andina (dic–mar y jun–ago)' },
  caribe: { meses: [12, 1, 2, 3, 6, 7, 8], etiqueta: 'temporada seca del Caribe (dic–mar y jun–ago)' },
  orinoquia: { meses: [12, 1, 2, 3], etiqueta: 'verano de la Orinoquía (dic–mar, época de quemas)' },
  amazonia: { meses: [12, 1, 2, 3], etiqueta: 'verano amazónico (dic–mar)' },
  pacifico: { meses: [], etiqueta: 'sin temporada seca marcada (Pacífico)' },
});

/**
 * Regiones donde el incendio forestal es un peligro relevante bajo sequía.
 * El Pacífico se excluye explícitamente (riesgo estructuralmente bajo) para no
 * generar falsos positivos.
 */
const FIRE_PRONE = Object.freeze(['andina', 'caribe', 'orinoquia', 'amazonia']);

/** Mes 1-indexado actual (inyectable en tests vía opts.mes). */
function currentMonth() {
  return new Date().getMonth() + 1;
}

/** Piso térmico coarse desde altitud (msnm), o null. */
function pisoDesdeAltitud(alt) {
  const a = Number(alt);
  if (alt == null || Number.isNaN(a)) return null;
  if (a >= 3000) return 'paramo';
  if (a >= 2000) return 'frio';
  if (a >= 1000) return 'templado';
  return 'calido';
}

/**
 * Corrige la región de incendio por piso térmico. ensoContext mapea Nariño,
 * Cauca y Valle a 'pacifico' por departamento, pero esos departamentos tienen
 * tierras ALTAS de la cordillera andina (p. ej. la ladera del Galeras en Pasto,
 * ~2.400 msnm) donde SÍ hay temporada seca y riesgo de incendio. Si el piso es
 * frío/templado/páramo (altitud ≥ ~1.000 msnm) tratamos la zona como andina; la
 * planicie/litoral del Pacífico (cálido) se queda como 'pacifico' (sin seca).
 * Geográficamente correcto, no es fabricación.
 *
 * @param {string|null} region
 * @param {string|null} piso  'paramo'|'frio'|'templado'|'calido'|null
 * @returns {string|null}
 */
function resolveFireRegion(region, piso) {
  if (region === 'pacifico' && (piso === 'paramo' || piso === 'frio' || piso === 'templado')) {
    return 'andina';
  }
  return region;
}

/**
 * ¿El mes dado cae en temporada seca de la región? Devuelve {seca, etiqueta}.
 */
function temporadaSeca(region, mes) {
  const entry = region && DRY_SEASONS[region] ? DRY_SEASONS[region] : null;
  if (!entry) return { seca: false, etiqueta: null };
  return { seca: entry.meses.includes(mes), etiqueta: entry.etiqueta };
}

/**
 * Evalúa el riesgo de incendio para la finca/zona.
 *
 * Matriz de decisión (estacional + ENSO):
 *   - Región NO fire-prone (Pacífico / desconocida sin señales) → 'bajo'.
 *   - Temporada seca + El Niño                                   → 'alto'.
 *   - Temporada seca (sin El Niño)  ó  El Niño (fuera de seca)   → 'medio'.
 *   - Fuera de temporada seca y sin El Niño                      → 'bajo'.
 *
 * @param {object} [opts]
 * @param {object|null} [opts.profile]  perfil (default getProfile()).
 * @param {string|null} [opts.ensoPhase] slug/coarse de fase ENSO (default getEnsoPhase()).
 * @param {string|null} [opts.region]   región natural (default regionFromProfile(profile)).
 * @param {number|null} [opts.altitud]  msnm (default profile.finca_altitud/altitud).
 * @param {number} [opts.mes]           mes 1-indexado (default mes actual).
 * @returns {{
 *   nivel: 'alto'|'medio'|'bajo',
 *   es_estimacion: true,
 *   fase_enso: 'nino'|'nina'|'neutral',
 *   fase_enso_source: 'manual'|'live'|'default'|'override',
 *   temporada_seca: boolean,
 *   temporada_etiqueta: string|null,
 *   region: string|null,
 *   piso_termico: string|null,
 *   mes: number,
 *   factores: string[],
 *   recomendaciones: string[],
 *   disclaimer: string,
 *   fuentes: string[],
 * }}
 */
export function evaluarRiesgoIncendio(opts = {}) {
  const profile = opts.profile && typeof opts.profile === 'object' ? opts.profile : getProfile();
  const phase = typeof opts.ensoPhase === 'string' ? opts.ensoPhase : getEnsoPhase();
  const fam = ensoFamily(phase);
  const altitud = opts.altitud != null ? opts.altitud : (profile?.finca_altitud ?? profile?.altitud ?? null);
  const piso = pisoDesdeAltitud(altitud);
  const region = resolveFireRegion(opts.region || regionFromProfile(profile) || null, piso);
  const mes = Number.isFinite(opts.mes) ? opts.mes : currentMonth();

  const { seca, etiqueta } = temporadaSeca(region, mes);
  const fireProne = region ? FIRE_PRONE.includes(region) : false;
  const esNino = fam === 'nino';

  const factores = [];
  let nivel = 'bajo';

  if (!fireProne) {
    // Pacífico o región sin señal clara → riesgo de incendio estructuralmente bajo.
    nivel = 'bajo';
    if (region === 'pacifico') {
      factores.push('Región Pacífico: lluvia casi todo el año, riesgo de incendio forestal bajo.');
    } else {
      factores.push('Sin región o temporada seca identificada para tu finca: no puedo estimar un riesgo estacional alto.');
    }
  } else if (seca && esNino) {
    nivel = 'alto';
    factores.push(`Estás en ${etiqueta}.`);
    factores.push('El Niño activo seca aún más el combustible vegetal (IDEAM/UNGRD): el riesgo de incendio sube.');
  } else if (seca) {
    nivel = 'medio';
    factores.push(`Estás en ${etiqueta}: el pasto y la hojarasca se secan y prenden fácil.`);
  } else if (esNino) {
    nivel = 'medio';
    factores.push('El Niño activo trae sequía y reduce la humedad del combustible vegetal, aunque no estés en el pico de temporada seca.');
  } else {
    nivel = 'bajo';
    factores.push('No estás en temporada seca marcada ni hay El Niño activo: el riesgo estacional de incendio es bajo.');
  }
  // El Niño en VIGILANCIA (neutral con probabilidad creciente) NO se afirma como
  // activo aquí: ensoService entrega 'neutral' si no hay Niño, y el agente
  // comunica la vigilancia por buildEnsoAgentLines. Mantenemos honestidad.

  if (piso === 'paramo') {
    factores.push('En páramo, una quema es especialmente grave: el suelo orgánico (turba) puede arder bajo tierra por semanas y el ecosistema tarda décadas o siglos en recuperarse.');
  }

  return /** @type {any} */ ({
    nivel,
    es_estimacion: true,
    fase_enso: fam,
    fase_enso_source: opts.ensoPhase ? 'override' : getEnsoPhaseSource(),
    temporada_seca: seca,
    temporada_etiqueta: etiqueta,
    region,
    piso_termico: piso,
    mes,
    factores,
    recomendaciones: recomendacionesPara(nivel, { region, piso }),
    disclaimer:
      'Esto es una ESTIMACIÓN de riesgo según la temporada climática y la fase de El Niño/La Niña, ' +
      'NO una alerta oficial de incendio. Para una alerta confirmada de tu zona consulta tu Consejo ' +
      'Municipal de Gestión del Riesgo (CMGRD), el cuerpo de bomberos o tu Corporación Autónoma Regional.',
    fuentes: [
      'Fase ENSO: NOAA CPC (ONI) + IDEAM',
      'Temporadas secas: climatología IDEAM (régimen de lluvias de Colombia)',
      'Impacto de El Niño en incendios: IDEAM / UNGRD (DR-MISSION-4)',
    ],
  });
}

/** Recomendaciones accionables por nivel y contexto. Cero alarmismo. */
function recomendacionesPara(nivel, opts = /** @type {any} */ ({})) {
  const { region, piso } = opts;
  if (nivel === 'bajo') {
    return [
      'Mantén rondas cortafuego limpias y aprovecha para hacer mantenimiento preventivo.',
      'Si vas a quemar rastrojo, hazlo SOLO fuera de temporada seca, con autorización y vigilancia (la quema descontrolada es la causa #1 de incendios forestales).',
    ];
  }
  const recs = [
    'NO hagas quemas agrícolas: una chispa en pasto seco se vuelve incendio en minutos.',
    'Limpia y ensancha las rondas cortafuego alrededor de cultivos, vivienda y linderos.',
    'Ten lista agua y herramienta (bate-fuegos, machete, azadón) y el número de bomberos a la mano.',
  ];
  if (nivel === 'alto') {
    recs.unshift('Riesgo ALTO esta temporada: extrema el cuidado con el fuego en toda la finca y alrededores.');
    recs.push('Habla con tus vecinos: el incendio de un predio salta al de al lado. La prevención es comunitaria.');
  }
  if (region === 'orinoquia' || region === 'amazonia') {
    recs.push('En sabana o piedemonte, considera fuego prescrito planificado con la autoridad ambiental en vez de quemas espontáneas.');
  }
  if (piso === 'paramo' || piso === 'frio') {
    recs.push('En zona alta: NO quemes para "renovar pasto"; el páramo y el bosque altoandino no se recuperan de la quema.');
  }
  return recs;
}

/**
 * Renderiza un resultado YA evaluado a bloque de grounding (texto). Pura: no
 * recomputa. Útil para no evaluar dos veces (diagnosticar + formatear).
 *
 * @param {ReturnType<typeof evaluarRiesgoIncendio>} r
 * @returns {string}
 */
export function formatIncendioContext(r) {
  if (!r || typeof r !== 'object') return '';
  const lines = [];
  const nivelLabel = { alto: 'ALTO', medio: 'MEDIO', bajo: 'BAJO' }[r.nivel];
  lines.push(`RIESGO DE INCENDIO (estimación estacional, NO alerta oficial): ${nivelLabel}.`);
  if (r.region) lines.push(`Región: ${r.region}. Mes: ${MESES[r.mes - 1]}. Fase ENSO: ${r.fase_enso}.`);
  if (r.factores.length) lines.push(`Por qué: ${r.factores.join(' ')}`);
  if (r.recomendaciones.length) lines.push(`Recomendaciones:\n${r.recomendaciones.map((x) => `- ${x}`).join('\n')}`);
  lines.push(r.disclaimer);
  lines.push(`Fuentes: ${r.fuentes.join('; ')}.`);
  lines.push('IMPORTANTE: NO afirmes que hay un incendio activo ni inventes una alerta de IDEAM/UNGRD en tiempo real (no existe esa fuente consultable). Preséntalo como estimación de temporada y remite a CMGRD/bomberos/CAR para confirmación oficial.');
  return lines.join('\n');
}

/**
 * Atajo: evalúa el riesgo y devuelve directamente el bloque de grounding.
 * Honesto: deja claro que es estimación y cita fuentes.
 *
 * @param {object} [opts] mismos que evaluarRiesgoIncendio.
 * @returns {string}
 */
export function buildIncendioContext(opts = {}) {
  return formatIncendioContext(evaluarRiesgoIncendio(opts));
}

export const __testing__ = { DRY_SEASONS, FIRE_PRONE, pisoDesdeAltitud, temporadaSeca, resolveFireRegion, MESES };
