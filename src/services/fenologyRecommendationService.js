/**
 * fenologyRecommendationService.js — Motor de recomendaciones de siembra
 * basadas en fase lunar + clima + fenología de la especie.
 *
 * SPEC: Chagra-strategy/queue/010-fenologia-recommendations.md (COMPLETADA).
 * Contratos: FenologyRequest / FenologyResponse. Esta implementación NO
 * rediseña la spec: la implementa. Las decisiones que la spec dejaba
 * abiertas se completan acá y se declaran en el encabezado y en el informe.
 *
 * PRINCIPIO DURO (no negociable): recomendación honesta. Nunca prometer
 * cosecha garantizada. Si faltan datos de entrada se devuelve `warning` +
 * `confidence` baja. JAMÁS se rellena con un valor inventado para que la
 * respuesta "se vea completa".
 *
 * FUENTES DE DATOS DE ESPECIES (prohibido inventar):
 *   - Fenología y preferencia lunar: tabla de la spec (Rule 1 y Rule 3).
 *   - Hechos duros del catálogo del repo (nombre científico, pisos
 *     térmicos, altitud, temperatura): snapshot de
 *     `catalog/chagra-catalog-seed-v3.1.json` (CATALOG_FACTS abajo). La
 *     consitencia entre el snapshot y el JSON se verifica en test
 *     (fenologyRecommendation.catalogSnapshot.test.js).
 *   - Lo que no está en ninguna de las dos fuentes queda `null`/unknown y
 *     baja la confianza: no se completa con un número plausible.
 *
 * DECISIONES COMPLETADAS (la spec las dejaba abiertas; ver informe):
 *   1. `LunarPhase` (meta.lunar_phase): objeto `{ phase, fraction,
 *      illumination, name_es, icon }`. `phase` usa los slugs de la spec
 *      (waxing_gibbous, waning_crescent, ...) mapeados desde el calculador
 *      canónico del repo `src/utils/skyEphemeris.js#lunarPhase`.
 *   2. `ClimateForecast` (meta.climate_forecast): `{ source,
 *      generated_at, temp_min_c, temp_max_c, precip_prob, humidity_avg }`.
 *      Sin datos de clima → `null` + warning `data_unavailable` +
 *      fallback_mode 'historical_climate' (spec Fallback 1).
 *   3. `timing` puede ser `null` cuando no hay base grounded para una
 *      fecha (spec exige el campo; la honestidad manda: fecha inventada es
 *      peor). Cada recomendación explica en `reason[]` por qué no hay.
 *   4. Ventana de siembra: best_date = próximo día lunar favorable
 *      (calculado con el ciclo sinódico), window_start/end = ±2 días
 *      alrededor. Documentado como decisión de implementación.
 *   5. `fallback_mode`: string con el modo más conservador activo.
 *   6. Fórmula de `confidence` (ver computeConfidence).
 *   7. Tipos extra de `Warning` usados por la propia spec en sus ejemplos
 *      de fallback: 'data_unavailable', 'incomplete_catalog'.
 *
 * Sin em dashes en strings visibles (regla de la casa).
 */

import { lunarPhase } from '../utils/skyEphemeris';

/* ── Constantes astronómicas (coinciden con skyEphemeris.js) ───────────── */
const SYNODIC_MONTH = 29.530588853; // días, ciclo lunar promedio
const PLANTING_WINDOW_DAYS = 2; // ±2 días alrededor del día favorable

/* ── Slugs de fase lunar de la spec y sus rangos de fracción (0..1) ────── */
export const LUNAR_PHASES = {
  new_moon: { range: [0, 0.025], grupos: ['semilla'] },
  waxing_crescent: { range: [0.025, 0.225], grupos: ['hoja'] },
  first_quarter: { range: [0.225, 0.275], grupos: ['hoja'] },
  waxing_gibbous: { range: [0.275, 0.475], grupos: ['hoja', 'fruto'] },
  full_moon: { range: [0.475, 0.525], grupos: ['fruto'] },
  waning_gibbous: { range: [0.525, 0.725], grupos: ['raiz'] },
  last_quarter: { range: [0.725, 0.775], grupos: ['raiz'] },
  waning_crescent: { range: [0.775, 0.975], grupos: ['raiz'] },
};

/**
 * Mapea una fracción de ciclo lunar (0..1, 0 = luna nueva) al slug de la
 * spec. Rangos idénticos a los de skyEphemeris#phaseNameFromFraction.
 * @param {number} fraction 0..1
 * @returns {string} slug de LUNAR_PHASES
 */
export function phaseSlugFromFraction(fraction) {
  const f = ((Number(fraction) % 1) + 1) % 1;
  if (f < 0.025 || f >= 0.975) return 'new_moon';
  if (f < 0.225) return 'waxing_crescent';
  if (f < 0.275) return 'first_quarter';
  if (f < 0.475) return 'waxing_gibbous';
  if (f < 0.525) return 'full_moon';
  if (f < 0.725) return 'waning_gibbous';
  if (f < 0.775) return 'last_quarter';
  return 'waning_crescent';
}

/* ── Pisos térmicos (spec Rule 2, clasificación de Caldas / IGAC) ──────── */
export const THERMAL_FLOORS = [
  { id: 'calido', label: 'Cálido', alt: [0, 1000], temp: [24, 99] },
  { id: 'templado', label: 'Templado', alt: [1000, 2000], temp: [18, 24] },
  { id: 'frio', label: 'Frío', alt: [2000, 3000], temp: [12, 18] },
  { id: 'paramo', label: 'Páramo', alt: [3000, 99999], temp: [-99, 12] },
];

/** Clasifica una altitud (msnm) en piso térmico según la spec. */
export function classifyThermalFloor(altitudeM) {
  if (!Number.isFinite(altitudeM) || altitudeM < 0) return null;
  const floor = THERMAL_FLOORS.find((t) => altitudeM >= t.alt[0] && altitudeM < t.alt[1]);
  return floor ? floor.id : 'paramo';
}

/* ── Reglas de riesgo climático (spec Rule 2, climateRisks) ─────────────── */
const CLIMATE_RISK_RULES = {
  frost: {
    type: 'frost_risk',
    threshold_temp_c: 4,
    message: 'Riesgo de helada en próximas 24h. No sembrar especies sensibles.',
    severityFor: (tempMinC) => (tempMinC <= 0 ? 'high' : 'medium'),
  },
  drought: {
    type: 'drought_risk',
    threshold_precip_mm: 5,
    forecast_days: 7,
    message: 'Sequía esperada próximos 7 días. Considerar riego suplementario.',
    severityFor: (precip) => (precip <= 2 ? 'high' : 'medium'),
  },
  flood: {
    type: 'flood_risk',
    threshold_precip_mm: 50,
    forecast_days: 3,
    message: 'Lluvia intensa esperada. Evitar siembra en zonas con drenaje pobre.',
    severityFor: (precip) => (precip >= 80 ? 'high' : 'medium'),
  },
  pest: {
    type: 'pest_risk',
    trigger_temp_c: 25,
    trigger_humidity_percent: 80,
    message: 'Condiciones favorables para plagas. Monitorear tras siembra.',
    severityFor: (temp, hum) => (temp >= 28 && hum >= 85 ? 'high' : 'medium'),
  },
};

/**
 * Evalúa un forecast climático contra las reglas de la spec.
 * @param {object|null} fc { temp_min_c, temp_max_c, precip_prob, humidity_avg }
 * @returns {Warning[]} riesgos activos ordenados (helada, sequía, inundación, plaga)
 */
export function buildClimateRisks(fc) {
  if (!fc) return [];
  const risks = [];
  const tmin = Number(fc.temp_min_c);
  const tmax = Number(fc.temp_max_c);
  const precip = Number(fc.precip_prob);
  const hum = Number(fc.humidity_avg);

  if (Number.isFinite(tmin) && tmin <= CLIMATE_RISK_RULES.frost.threshold_temp_c) {
    risks.push({
      type: 'frost_risk',
      message: CLIMATE_RISK_RULES.frost.message,
      severity: CLIMATE_RISK_RULES.frost.severityFor(tmin),
    });
  }
  if (Number.isFinite(precip) && precip <= CLIMATE_RISK_RULES.drought.threshold_precip_mm) {
    risks.push({
      type: 'drought_risk',
      message: CLIMATE_RISK_RULES.drought.message,
      severity: CLIMATE_RISK_RULES.drought.severityFor(precip),
    });
  }
  if (Number.isFinite(precip) && precip >= CLIMATE_RISK_RULES.flood.threshold_precip_mm) {
    risks.push({
      type: 'flood_risk',
      message: CLIMATE_RISK_RULES.flood.message,
      severity: CLIMATE_RISK_RULES.flood.severityFor(precip),
    });
  }
  if (
    Number.isFinite(tmax) && Number.isFinite(hum) &&
    tmax >= CLIMATE_RISK_RULES.pest.trigger_temp_c &&
    hum >= CLIMATE_RISK_RULES.pest.trigger_humidity_percent
  ) {
    risks.push({
      type: 'pest_risk',
      message: CLIMATE_RISK_RULES.pest.message,
      severity: CLIMATE_RISK_RULES.pest.severityFor(tmax, hum),
    });
  }
  return risks;
}

/* ────────────────────────────────────────────────────────────────────────
 * DATOS DE ESPECIES
 *
 * Fuentes (prohibido inventar):
 *  A) CATALOG_FACTS: snapshot de `catalog/chagra-catalog-seed-v3.1.json`
 *     (72 especies). Se incluyen solo las especies de la spec presentes en
 *     el catálogo. Un test verifica que el snapshot NO diverja del JSON.
 *  B) PHENOLOGY + LUNAR_PREFERENCES: tablas literales de la spec.
 *  C) Especies de la spec ausentes del catálogo (espinaca, acelga,
 *     remolacha, pimenton, gulupa, mashua): no se les inventa nombre
 *     científico ni altitud. Quedan como unknown (baja confianza).
 * ──────────────────────────────────────────────────────────────────────── */
export const FENOLOGY_SNAPSHOT_SOURCE =
  'catalog/chagra-catalog-seed-v3.1.json (snapshot tomado 2026-08-12)';

/** Hechos duros extraídos del catálogo del repo (nombre científico, pisos, altitud, temperatura). */
export const CATALOG_FACTS = {
  lechuga: {
    catalog_slug: 'lactuca_sativa_capitata',
    name_es: 'Lechuga',
    name_la: 'Lactuca sativa var. capitata L.',
    thermal_zones: ['frio', 'templado'],
    altitude_optimo_m: [1800, 2700],
    temp_optimo_c: [14, 18],
  },
  zanahoria: {
    catalog_slug: 'daucus_carota_subsp_sativus',
    name_es: 'Zanahoria',
    name_la: 'Daucus carota L. subsp. sativus (Hoffm.) Arcang.',
    thermal_zones: ['frio', 'templado'],
    altitude_optimo_m: [1500, 2700],
    temp_optimo_c: [15, 20],
  },
  tomate: {
    catalog_slug: 'solanum_lycopersicum_san_marzano',
    name_es: 'Tomate',
    name_la: "Solanum lycopersicum 'San Marzano'",
    thermal_zones: ['templado', 'frio'],
    altitude_optimo_m: [1500, 2400],
    temp_optimo_c: [20, 28],
  },
  papa: {
    catalog_slug: 'solanum_tuberosum',
    name_es: 'Papa',
    name_la: 'Solanum tuberosum L.',
    thermal_zones: ['frio', 'paramo'],
    altitude_optimo_m: [2500, 3200],
    temp_optimo_c: [10, 18],
  },
  cebolla: {
    catalog_slug: 'allium_fistulosum',
    name_es: 'Cebolla larga',
    name_la: 'Allium fistulosum L.',
    thermal_zones: ['templado', 'frio'],
    altitude_optimo_m: [1800, 2800],
    temp_optimo_c: [12, 20],
  },
  yuca: {
    catalog_slug: 'manihot_esculenta',
    name_es: 'Yuca',
    name_la: 'Manihot esculenta Crantz',
    thermal_zones: ['calido'],
    altitude_optimo_m: [100, 800],
    temp_optimo_c: [22, 30],
  },
};

/** Fenología específica (spec Rule 3, tabla literal). 3 especies core. */
export const PHENOLOGY = {
  lechuga: {
    germination_days: 7,
    harvest_days: 60,
    optimal_temp_c: [15, 20],
    optimal_humidity_percent: [60, 70],
    frost_sensitive: true,
    drought_sensitive: true,
    altitude_range_m: [2000, 2800],
    lunar_preference: ['waxing_gibbous', 'waxing_crescent'],
  },
  tomate: {
    germination_days: 10,
    harvest_days: 120,
    optimal_temp_c: [18, 25],
    optimal_humidity_percent: [60, 75],
    frost_sensitive: true,
    drought_sensitive: false,
    altitude_range_m: [1500, 2500],
    lunar_preference: ['waxing_gibbous', 'full_moon'],
  },
  papa: {
    germination_days: 14,
    harvest_days: 90,
    optimal_temp_c: [14, 18],
    optimal_humidity_percent: [70, 80],
    frost_sensitive: false,
    drought_sensitive: false,
    altitude_range_m: [2500, 3200],
    lunar_preference: ['waning_gibbous', 'waning_crescent'],
  },
};

/** Preferencia lunar por especie (spec Rule 1, tabla literal). 12 especies. */
export const LUNAR_PREFERENCES = {
  lechuga: ['waxing_gibbous', 'waxing_crescent'],
  espinaca: ['waxing_gibbous', 'waxing_crescent'],
  acelga: ['waxing_gibbous', 'waxing_crescent'],
  zanahoria: ['waning_gibbous', 'waning_crescent'],
  remolacha: ['waning_gibbous', 'waning_crescent'],
  cebolla: ['waning_gibbous', 'waning_crescent'],
  tomate: ['waxing_gibbous', 'full_moon'],
  pimenton: ['waxing_gibbous', 'full_moon'],
  gulupa: ['waxing_gibbous', 'full_moon'],
  papa: ['waning_gibbous', 'waning_crescent'],
  mashua: ['waning_gibbous', 'waning_crescent'],
  yuca: ['waning_gibbous', 'waning_crescent'],
};

/** Aliases de slug del catálogo a claves de la spec (completado; ver informe). */
const CATALOG_SLUG_TO_KEY = {
  lactuca_sativa_capitata: 'lechuga',
  daucus_carota_subsp_sativus: 'zanahoria',
  solanum_lycopersicum_san_marzano: 'tomate',
  solanum_tuberosum: 'papa',
  solanum_tuberosum_pastusa_suprema: 'papa',
  allium_fistulosum: 'cebolla',
  manihot_esculenta: 'yuca',
};

/**
 * Nombres genéricos por grupo de la luna (spec Rule 1). Usados cuando la
 * especie no está en el catálogo (fallback genérico, spec Fallback 2).
 */
const GENERIC_BY_GROUP = {
  hoja: { id: 'generic_hoja', name: 'Hortalizas de hoja (genérico)' },
  raiz: { id: 'generic_raiz', name: 'Raíces y tubérculos (genérico)' },
  fruto: { id: 'generic_fruto', name: 'Frutas de porte bajo (genérico)' },
  semilla: { id: 'generic_semilla', name: 'Semillas de germinación rápida (genérico)' },
};

const fold = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * Normaliza el species_id del request a la clave de la spec.
 * Acepta nombre común en español (con o sin acentos) o slug del catálogo.
 * @param {string} id
 * @returns {string|null}
 */
export function resolveSpeciesKey(id) {
  if (!id) return null;
  const q = fold(id);
  if (!q) return null;
  if (LUNAR_PREFERENCES[q]) return q;
  if (CATALOG_SLUG_TO_KEY[q]) return CATALOG_SLUG_TO_KEY[q];
  return null;
}

/**
 * Une fenología (spec) + hechos del catálogo en la ficha que consume el motor.
 * Los campos ausentes quedan `null` (no se inventan).
 * @param {string} key clave de la spec ('lechuga', ...)
 * @returns {object} species facts
 */
export function buildSpeciesFacts(key) {
  const pheno = PHENOLOGY[key] || {};
  const catalog = CATALOG_FACTS[key] || {};
  const hasFullPhenology = Boolean(pheno.germination_days && pheno.harvest_days);

  return {
    key,
    name_es: catalog.name_es || key.charAt(0).toUpperCase() + key.slice(1),
    name_la: catalog.name_la || null,
    catalog_slug: catalog.catalog_slug || null,
    thermal_zones: catalog.thermal_zones || null,
    // Altitud: la spec manda donde define rango; el catálogo complementa.
    altitude_range_m: pheno.altitude_range_m || catalog.altitude_optimo_m || null,
    optimal_temp_c: pheno.optimal_temp_c || catalog.temp_optimo_c || null,
    germination_days: pheno.germination_days || null,
    harvest_days: pheno.harvest_days || null,
    optimal_humidity_percent: pheno.optimal_humidity_percent || null,
    frost_sensitive: pheno.frost_sensitive || false,
    drought_sensitive: pheno.drought_sensitive || false,
    lunar_preference: pheno.lunar_preference || LUNAR_PREFERENCES[key] || null,
    hasFullPhenology,
  };
}

/* ── Cálculo del próximo día lunar favorable (grounded, sin inventos) ───── */
function phaseRangesInDays(slugs) {
  const ranges = [];
  for (const slug of slugs) {
    const r = LUNAR_PHASES[slug];
    if (!r) continue;
    const lo = r.range[0] * SYNODIC_MONTH;
    const hi = r.range[1] * SYNODIC_MONTH;
    if (slug === 'new_moon') {
      ranges.push([0, lo], [hi, SYNODIC_MONTH]);
    } else {
      ranges.push([lo, hi]);
    }
  }
  return ranges;
}

/**
 * Días hasta la próxima ventana dentro de las fases preferidas.
 * @param {{fraction:number, daysSinceNewMoon:number}} lunar salida de lunarPhase()
 * @param {string[]} prefSlugs fases preferidas (slugs de spec)
 * @returns {{ daysUntil: number, atStart: boolean }} atStart=true si ya estamos en ventana
 */
export function nextLunarWindow(lunar, prefSlugs) {
  if (!lunar || !Array.isArray(prefSlugs) || prefSlugs.length === 0) return null;
  const c = ((Number(lunar.daysSinceNewMoon) % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const ranges = phaseRangesInDays(prefSlugs);
  let minOffset = Infinity;
  for (const [lo, hi] of ranges) {
    if (c >= lo && c < hi) return { daysUntil: 0, atStart: true };
    const offset = (lo - c + SYNODIC_MONTH) % SYNODIC_MONTH;
    if (offset < minOffset) minOffset = offset;
  }
  return { daysUntil: Math.round(minOffset), atStart: false };
}

/* ── Utilidades de fecha (todas las fechas se tratan como UTC) ──────────── */
function parseDateISO(iso) {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysISO(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/* ── Fórmula de confianza (decisión completada, ver informe) ────────────── */
/**
 * Confianza (0-1) de la respuesta.
 * Fallbacks fijos de la spec: clima faltante 0.4, especie desconocida 0.5,
 * riesgo extremo 0.9. Camino con datos completos: 0.85 con descuentos por
 * dimensiones ausentes (fenología, altitud, preferencias apagadas, riesgo).
 */
export function computeConfidence({ hasClimate, speciesKnown, hasFullPhenology, altitudeKnown, useLunar, useClimate, hasRisk }) {
  if (!speciesKnown) return 0.5; // spec Fallback 2
  if (hasRisk === 'extreme') return 0.9; // spec Fallback 3
  if (!hasClimate) return 0.4; // spec Fallback 1

  let c = 0.85;
  if (!hasFullPhenology) c -= 0.15;
  if (!altitudeKnown) c -= 0.05;
  if (!useLunar) c -= 0.1;
  if (!useClimate) c -= 0.1;
  if (hasRisk) c -= 0.1;
  return Math.max(0, Math.round(c * 100) / 100);
}

/* ── Construcción de razones (texto honesto, sin promesas) ──────────────── */
function reasonLunar(phaseSlug, speciesKey, prefSlugs, isFavorable) {
  if (!prefSlugs) {
    return 'Sin preferencia lunar registrada para esta especie en el catálogo ni en la spec.';
  }
  if (isFavorable) {
    return 'Fase lunar actual favorable según saber tradicional (no es garantía de cosecha).';
  }
  return 'Fase lunar próxima favorable según saber tradicional (no es garantía de cosecha).';
}

function reasonClimate(fc, optimalTemp) {
  if (!fc) return null;
  const parts = [];
  if (optimalTemp && Array.isArray(optimalTemp)) {
    parts.push(`Temperatura pronosticada ${fc.temp_min_c}°C a ${fc.temp_max_c}°C contra óptimo ${optimalTemp[0]}-${optimalTemp[1]}°C de la especie.`);
  } else {
    parts.push(`Pronóstico sin riesgo climático activo a ${fc.forecast_days || 3} días.`);
  }
  return parts.join(' ');
}

function reasonThermalFloor(species, altitudeM) {
  const range = species.altitude_range_m;
  if (!range) {
    return 'Sin rango de altitud para esta especie: no se puede verificar el piso térmico.';
  }
  const inside = altitudeM >= range[0] && altitudeM <= range[1];
  return inside
    ? `Altitud ${altitudeM} msnm dentro del rango de la especie (${range[0]}-${range[1]} msnm).`
    : `Altitud ${altitudeM} msnm FUERA del rango de la especie (${range[0]}-${range[1]} msnm). No se recomienda sembrar fuera de su piso térmico.`;
}

function reasonFenologia(species) {
  if (!species.hasFullPhenology) {
    return 'Sin fenología completa (germinación/cosecha) para esta especie.';
  }
  return `Ciclo estimado: germinación ${species.germination_days} días, cosecha hacia ${species.harvest_days} días.`;
}

function reasonGeneric(phaseSlug) {
  const group = LUNAR_PHASES[phaseSlug]?.grupos?.[0] || 'hoja';
  const generic = GENERIC_BY_GROUP[group];
  const faseTexto = {
    waxing_crescent: 'Luna creciente',
    waxing_gibbous: 'Luna creciente gibosa',
    first_quarter: 'Cuarto creciente',
    full_moon: 'Luna llena',
    waning_gibbous: 'Luna menguante gibosa',
    last_quarter: 'Cuarto menguante',
    waning_crescent: 'Luna menguante',
    new_moon: 'Luna nueva',
  };
  return `${faseTexto[phaseSlug] || 'Fase actual'} favorable para ${generic.name}.`;
}

/* ── Riesgo de la recomendación (completado, ver informe) ───────────────── */
function computeRiskLevel({ species, altitudeM, risks, isAltitudeInside }) {
  const active = risks || [];
  const frost = active.find((r) => r.type === 'frost_risk');
  const drought = active.find((r) => r.type === 'drought_risk');
  const flood = active.find((r) => r.type === 'flood_risk');

  if (flood?.severity === 'high') return 'high';
  if (frost?.severity === 'high') return 'high';
  if (drought?.severity === 'high') return 'high';
  if (species?.frost_sensitive && frost) return 'high';
  if (species?.drought_sensitive && drought) return 'high';
  if (isAltitudeInside === false) return 'high';
  if (isAltitudeInside === null) return 'medium';
  if (frost || drought || flood) return 'medium';
  return 'low';
}

/* ── Nombres de fases para los mensajes (completado) ────────────────────── */
export const PHASE_LABELS = {
  new_moon: 'Luna nueva',
  waxing_crescent: 'Luna creciente',
  first_quarter: 'Cuarto creciente',
  waxing_gibbous: 'Luna creciente gibosa',
  full_moon: 'Luna llena',
  waning_gibbous: 'Luna menguante gibosa',
  last_quarter: 'Cuarto menguante',
  waning_crescent: 'Luna menguante',
};

/* ── El motor: construye las recomendaciones ────────────────────────────── */
/**
 * Genera las recomendaciones (camino normal + fallback genérico).
 * @returns {{ recommendations: Array, warnings: Array, fallback_mode: string|null }}
 */
export function buildRecommendations({ request, lunar, forecast, risks }) {
  const recommendations = [];
  const warnings = [];
  let fallbackMode = null;
  const useLunar = request?.preferences?.use_lunar !== false;
  const useClimate = request?.preferences?.use_climate !== false;
  const altitudeM = Number(request?.location?.altitude_m);
  const altitudeKnown = Number.isFinite(altitudeM) && altitudeM >= 0;

  const speciesKey = resolveSpeciesKey(request?.species_id);
  const species = speciesKey ? buildSpeciesFacts(speciesKey) : null;

  // Riesgo extremo: helada severa manda por encima de todo (spec Fallback 3).
  const extremeFrost = risks?.find((r) => r.type === 'frost_risk' && r.severity === 'high');
  if (extremeFrost) {
    return {
      recommendations: [],
      warnings: [
        { type: 'frost_risk', message: 'HELADA SEVERA esperada. NO sembrar esta semana.', severity: 'high' },
      ],
      fallbackMode: 'risk_alert',
      species,
    };
  }

  if (!speciesKey) {
    // Fallback genérico (spec Fallback 2).
    const phaseSlug = lunar?.phase || 'waxing_gibbous';
    const group = LUNAR_PHASES[phaseSlug]?.grupos?.[0] || 'hoja';
    const generic = GENERIC_BY_GROUP[group];
    const reasons = [];
    if (useLunar) reasons.push(reasonGeneric(phaseSlug));
    else reasons.push('Recomendación sin componente lunar por preferencia.');
    reasons.push('Sin datos específicos de la especie en el catálogo ni en la spec.');
    recommendations.push({
      species_id: generic.id,
      species_name: generic.name,
      reason: reasons,
      timing: null, // no hay base grounded para una fecha de siembra
      risk_level: 'medium',
      fallback_available: true,
    });
    warnings.push({
      type: 'incomplete_catalog',
      message: 'El catálogo no tiene fenología para esta especie. Recomendación genérica.',
      severity: 'low',
    });
    fallbackMode = 'generic_recommendation';
    return { recommendations, warnings, fallbackMode, species: null };
  }

  // Especie conocida: camino normal.
  if (useClimate && !forecast) {
    warnings.push({
      type: 'data_unavailable',
      message: 'No hay datos climáticos recientes. Basándonos en históricos.',
      severity: 'medium',
    });
    fallbackMode = 'historical_climate';
  }
  if (!useClimate) {
    warnings.push({
      type: 'climate_disabled',
      message: 'Recomendación sin pronóstico climático por preferencia del usuario.',
      severity: 'low',
    });
  }
  if (!useLunar) {
    warnings.push({
      type: 'lunar_disabled',
      message: 'Recomendación sin componente lunar por preferencia del usuario.',
      severity: 'low',
    });
  }

  const altitudeInside = species.altitude_range_m
    ? altitudeKnown && altitudeM >= species.altitude_range_m[0] && altitudeM <= species.altitude_range_m[1]
    : null;
  if (species.altitude_range_m && !altitudeKnown) {
    warnings.push({
      type: 'altitude_unknown',
      message: 'Sin altitud válida en el request: no se verifica el piso térmico.',
      severity: 'low',
    });
  }

  // Fecha de siembra.
  let timing = null;
  if (useLunar && species.lunar_preference) {
    const win = nextLunarWindow(lunar, species.lunar_preference);
    if (win) {
      const today = parseDateISO(request?.date);
      const best = addDaysISO(today, win.daysUntil);
      timing = {
        best_date: best,
        window_start: addDaysISO(parseDateISO(best), -PLANTING_WINDOW_DAYS),
        window_end: addDaysISO(parseDateISO(best), PLANTING_WINDOW_DAYS),
      };
    }
  } else if (!useLunar && !useClimate && species.lunar_preference) {
    // Ni luna ni clima: no hay base para fecha.
    timing = null;
  }

  const reasons = [];
  if (useLunar) {
    const isFavorable = species.lunar_preference?.includes(lunar?.phase);
    reasons.push(reasonLunar(lunar?.phase, speciesKey, species.lunar_preference, isFavorable));
    if (species.lunar_preference && !isFavorable) {
      const phaseLabels = species.lunar_preference.map((p) => PHASE_LABELS[p] || p).join(' o ');
      reasons.push(`Fechas óptimas según saber tradicional: ${phaseLabels}.`);
    }
  }
  if (useClimate && forecast) {
    const cr = reasonClimate(forecast, species.optimal_temp_c);
    if (cr) reasons.push(cr);
  }
  if (altitudeKnown && species.altitude_range_m) {
    reasons.push(reasonThermalFloor(species, altitudeM));
  } else if (!species.altitude_range_m) {
    reasons.push('Sin rango de altitud de esta especie en catálogo ni spec: piso térmico no verificado.');
  }
  reasons.push(reasonFenologia(species));

  const riskLevel = computeRiskLevel({
    species,
    altitudeM,
    risks,
    isAltitudeInside: altitudeInside,
  });

  recommendations.push({
    species_id: speciesKey,
    species_name: species.name_es,
    reason: reasons,
    timing,
    risk_level: riskLevel,
    fallback_available: !species.hasFullPhenology,
  });

  return { recommendations, warnings, fallbackMode, species };
}

/* ── Orquestador público ─────────────────────────────────────────────────── */
/**
 * @typedef {object} FenologyRequest
 * @property {{latitude:number, longitude:number, altitude_m:number}} location
 * @property {string} [date] ISO 8601, default = hoy
 * @property {string} [species_id] null = recomendación general
 * @property {{use_lunar?:boolean, use_climate?:boolean, risk_tolerance?:string}} [preferences]
 *
 * @typedef {object} ClimateForecast
 * @property {string} source
 * @property {string} generated_at
 * @property {number} temp_min_c
 * @property {number} temp_max_c
 * @property {number} precip_prob
 * @property {number} humidity_avg
 * @property {number} [forecast_days]
 *
 * @typedef {object} FenologyResponse
 * @property {Array} recommendations
 * @property {Array} warnings
 * @property {{lunar_phase: object|null, climate_forecast: object|null, generated_at: string, confidence: number, fallback_mode?: string|null}} meta
 */

/**
 * Recomienda fechas de siembra según luna + clima + catálogo.
 *
 * @param {FenologyRequest} request
 * @param {object} [deps] inyección de dependencias (tests; producción usa defaults)
 * @param {Function} [deps.getLunar] (date, latitude) => lunar (default: skyEphemeris#lunarPhase)
 * @param {Function} [deps.getClimate] (location) => Promise<ClimateForecast|null>
 *   Provider de pronóstico (IDEAM en producción). Sin implementación de red
 *   en esta fase: el default devuelve null (fallback honesto, spec Fallback 1).
 * @returns {Promise<FenologyResponse>}
 */
export async function recommendFenology(request = {}, deps = {}) {
  const {
    getLunar = lunarPhase,
    getClimate = async () => null, // IDEAM sin integrar: honesto = sin dato, no invento
  } = deps;

  const date = parseDateISO(request?.date);
  const latitude = Number(request?.location?.latitude);
  const useLunar = request?.preferences?.use_lunar !== false;
  const useClimate = request?.preferences?.use_climate !== false;

  const lunarRaw = useLunar ? getLunar(date, { latitude: Number.isFinite(latitude) ? latitude : 0 }) : null;
  const lunar = lunarRaw
    ? {
        phase: phaseSlugFromFraction(lunarRaw.fraction),
        fraction: lunarRaw.fraction,
        illumination: lunarRaw.illumination,
        name_es: lunarRaw.name,
        icon: lunarRaw.icon,
        days_since_new_moon: lunarRaw.daysSinceNewMoon,
      }
    : null;

  let forecast = null;
  if (useClimate) {
    try {
      forecast = (await getClimate(request?.location)) || null;
    } catch (e) {
      // Provider caído: el fallback honesto no propaga la excepción.
      forecast = null;
    }
  }

  const risks = useClimate ? buildClimateRisks(forecast) : [];
  const { recommendations, warnings, fallbackMode, species } = buildRecommendations({
    request,
    lunar,
    forecast,
    risks,
  });

  // Advertencias climáticas (se suman solo si se consultó el clima).
  for (const r of risks) {
    if (r.severity === 'high' && r.type === 'frost_risk') continue; // ya está en risk_alert
    if (!warnings.some((w) => w.type === r.type)) warnings.push(r);
  }

  const hasExtremeRisk = fallbackMode === 'risk_alert';
  const speciesKnown = Boolean(species);
  const confidence = computeConfidence({
    hasClimate: Boolean(forecast),
    speciesKnown,
    hasFullPhenology: species?.hasFullPhenology || false,
    altitudeKnown: Number.isFinite(Number(request?.location?.altitude_m)),
    useLunar,
    useClimate,
    hasRisk: hasExtremeRisk ? 'extreme' : risks.length > 0,
  });

  return {
    recommendations,
    warnings,
    meta: {
      lunar_phase: lunar,
      climate_forecast: forecast,
      generated_at: new Date().toISOString(),
      confidence,
      fallback_mode: fallbackMode,
    },
  };
}
