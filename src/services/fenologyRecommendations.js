/**
 * Motor puro de recomendaciones fenológicas para queue/010.
 *
 * El pronóstico se inyecta para mantener el servicio offline-first y
 * testeable. Este módulo no llama a IDEAM ni inventa históricos: cuando no
 * recibe datos climáticos devuelve el fallback explícito de la spec.
 */

import { lunarPhase } from '../utils/skyEphemeris';
import { FENOLOGY_CATALOG, SPECIES_ALIASES } from '../data/fenologySpecies';

export const RISK_THRESHOLDS = Object.freeze({
  frost: Object.freeze({ threshold_temp_c: 4, alert_hours: 24 }),
  drought: Object.freeze({ threshold_precip_mm: 5, forecast_days: 7 }),
  flood: Object.freeze({ threshold_precip_mm: 50, forecast_days: 3 }),
  pest: Object.freeze({ trigger_temp_c: 25, trigger_humidity_percent: 80 }),
});

export const PISOS = Object.freeze([
  { id: 'calido', min: 0, max: 1000 },
  { id: 'templado', min: 1000, max: 2000 },
  { id: 'frio', min: 2000, max: 3000 },
  { id: 'paramo', min: 3000, max: null },
]);

export const DEFAULT_FORECAST_HORIZON_DAYS = 7;
const VALID_TOLERANCES = new Set(['conservative', 'moderate', 'aggressive']);
const DAY_MS = 86_400_000;
const INVALID_PISO_MESSAGE = 'Invalid thermal floor classification.';

const clampConfidence = (value) => Math.max(0.05, Math.min(0.95, Math.round(value * 100) / 100));

function fold(value) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    : '';
}

function asFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Clasifica la altitud según los cuatro pisos de queue/010. */
export function classifyPiso(altitudeM) {
  const altitude = asFinite(altitudeM);
  if (altitude === null || altitude < 0) return null;
  return PISOS.find(({ min, max }) => altitude >= min && (max === null || altitude < max))?.id || null;
}

/** Interpreta una fecha de pronóstico como medianoche UTC. */
export function parseDayDate(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) return Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toISODate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function readForecastNumber(day, ...keys) {
  for (const key of keys) {
    const value = asFinite(day[key]);
    if (value !== null) return value;
  }
  return null;
}

/** Normaliza arrays y respuestas `{ days }` sin completar datos ausentes. */
export function parseForecast(_request, deps = {}) {
  let raw = deps.forecast;
  if (typeof raw === 'function') {
    try {
      raw = raw(_request);
    } catch {
      return null;
    }
  }
  if (raw == null) return null;
  const sourceDays = Array.isArray(raw) ? raw : raw.days;
  if (!Array.isArray(sourceDays) || sourceDays.length === 0) return null;

  const days = sourceDays.map((day) => {
    if (!day || typeof day !== 'object') return null;
    const timestamp = parseDayDate(day.date ?? day.day ?? day.fecha);
    if (timestamp === null) return null;
    return {
      date: toISODate(timestamp),
      timestamp,
      temp_min_c: readForecastNumber(day, 'temp_min_c', 'temp_min'),
      temp_max_c: readForecastNumber(day, 'temp_max_c', 'temp_max'),
      precip_mm: readForecastNumber(day, 'precip_mm', 'precipitation_mm'),
      precip_prob: readForecastNumber(day, 'precip_prob', 'precipitation_probability'),
      humidity_avg: readForecastNumber(day, 'humidity_avg', 'humidity'),
    };
  }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);

  return days.length > 0
    ? { source: typeof raw.source === 'string' ? raw.source : null, days }
    : null;
}

/** Resuelve ids, aliases y nombre común sin cruzar especies por substring. */
export function resolveSpeciesEntry(speciesId, deps = {}) {
  if (typeof speciesId !== 'string' || !speciesId.trim()) return null;
  const catalog = Array.isArray(deps.catalog) ? deps.catalog : FENOLOGY_CATALOG;
  const aliases = deps.aliases || SPECIES_ALIASES;
  const exact = catalog.find((entry) => entry?.id === speciesId);
  if (exact) return exact;

  const key = fold(speciesId);
  const aliasId = aliases[key];
  if (aliasId) {
    const alias = catalog.find((entry) => entry?.id === aliasId);
    if (alias) return alias;
  }

  return catalog.find((entry) => {
    const names = String(entry?.nombre_comun || '').split('/').map(fold);
    return names.includes(key) || fold(entry?.nombre_cientifico) === key;
  }) || null;
}

export function assessLocationFit(entry, altitudeM, piso = classifyPiso(altitudeM)) {
  const result = { apt: null, pisoOk: null, altitudeOk: null, reason: null };
  if (!entry) return result;
  const altitude = asFinite(altitudeM);
  if (piso && Array.isArray(entry.thermal_zones)) result.pisoOk = entry.thermal_zones.includes(piso);
  const range = entry.altitud_msnm;
  if (altitude !== null && altitude >= 0 && range) {
    const min = asFinite(range.min_absoluto);
    const max = asFinite(range.max_absoluto);
    if (min !== null && max !== null) result.altitudeOk = altitude >= min && altitude <= max;
  }

  if (result.pisoOk === false || result.altitudeOk === false) {
    result.apt = false;
    result.reason = result.pisoOk === false
      ? `No es apta para el piso térmico ${piso} de esta ubicación.`
      : 'La altitud de la ubicación está fuera del rango del catálogo para esta especie.';
  } else if (result.pisoOk === true || result.altitudeOk === true) {
    result.apt = true;
  }
  return result;
}

export function analyzeDay(day, entry = null, tolerance = 'moderate') {
  const tempMin = day.temp_min_c;
  const tempMax = day.temp_max_c;
  const precipitation = day.precip_mm;
  const humidity = day.humidity_avg;
  const frost = tempMin !== null && tempMin < RISK_THRESHOLDS.frost.threshold_temp_c;
  const frostSevere = tempMin !== null && tempMin < 0;
  const flood = precipitation !== null && precipitation > RISK_THRESHOLDS.flood.threshold_precip_mm;
  const floodSevere = precipitation !== null && precipitation > 80;
  const pest = tempMax !== null
    && humidity !== null
    && tempMax > RISK_THRESHOLDS.pest.trigger_temp_c
    && humidity > RISK_THRESHOLDS.pest.trigger_humidity_percent;
  const frostSensitive = entry?.phenology?.frost_sensitive;
  const blockedByFrost = frost && (tolerance === 'aggressive'
    ? frostSevere
    : frostSensitive === false ? frostSevere : true);
  const blockedByFlood = flood && (tolerance !== 'aggressive' || floodSevere);
  return {
    frost,
    frostSevere,
    flood,
    floodSevere,
    pest,
    blocked: blockedByFrost || blockedByFlood,
    blockedByFrost,
    blockedByFlood,
  };
}

export function computeClimateWarnings(forecast, entry = null, _tolerance = 'moderate') {
  if (!forecast?.days?.length) return [];
  const days = forecast.days;
  const warnings = [];
  const frost = days.some((day) => day.temp_min_c !== null && day.temp_min_c < 4);
  const frostSevere = days.some((day) => day.temp_min_c !== null && day.temp_min_c < 0);
  const floodDays = days.slice(0, RISK_THRESHOLDS.flood.forecast_days);
  const flood = floodDays.some((day) => day.precip_mm !== null && day.precip_mm > 50);
  const floodSevere = floodDays.some((day) => day.precip_mm !== null && day.precip_mm > 80);
  const droughtDays = days.slice(0, RISK_THRESHOLDS.drought.forecast_days);
  const hasPrecipitation = droughtDays.length >= 5 && droughtDays.every((day) => day.precip_mm !== null);
  const droughtTotal = hasPrecipitation ? droughtDays.reduce((sum, day) => sum + day.precip_mm, 0) : null;
  const drought = droughtTotal !== null && droughtTotal < 5;
  const pest = days.some((day) => analyzeDay(day, entry).pest);

  if (frost) warnings.push({
    type: 'frost_risk',
    message: frostSevere
      ? 'Riesgo de helada severa en las próximas 24 horas. No sembrar especies sensibles.'
      : 'Riesgo de helada en próximas 24h. No sembrar especies sensibles.',
    severity: frostSevere ? 'high' : 'medium',
  });
  if (drought) warnings.push({
    type: 'drought_risk',
    message: 'Sequía esperada próximos 7 días. Considerar riego suplementario.',
    severity: 'medium',
  });
  if (flood) warnings.push({
    type: 'flood_risk',
    message: 'Lluvia intensa esperada. Evitar siembra en zonas con drenaje pobre.',
    severity: floodSevere ? 'high' : 'medium',
  });
  if (pest) warnings.push({
    type: 'pest_risk',
    message: 'Condiciones favorables para plagas. Monitorear tras siembra.',
    severity: 'low',
  });
  return warnings;
}

function dateDifference(a, b) {
  return Math.round((a.timestamp - b.timestamp) / DAY_MS);
}

/** Devuelve la primera ventana continua de días favorables. */
export function buildWindow(days, nowMs) {
  if (!Array.isArray(days) || days.length === 0) return null;
  const today = parseDayDate(toISODate(nowMs));
  const future = days.filter((day) => day.timestamp >= today);
  if (future.length === 0) return null;
  const window = [future[0]];
  for (const day of future.slice(1)) {
    if (dateDifference(day, window[window.length - 1]) !== 1) break;
    window.push(day);
  }
  return {
    best_date: window[0].date,
    window_start: window[0].date,
    window_end: window[window.length - 1].date,
  };
}

function lunarKey(fraction) {
  if (fraction < 0.025 || fraction >= 0.975) return 'new_moon';
  if (fraction < 0.275) return 'waxing_crescent';
  if (fraction < 0.475) return 'waxing_gibbous';
  if (fraction < 0.525) return 'full_moon';
  if (fraction < 0.725) return 'waning_gibbous';
  if (fraction < 0.775) return 'waning_quarter';
  return 'waning_crescent';
}

function getLunarMeta(nowMs, latitude, useLunar, lunarPhaseFn) {
  if (!useLunar) return null;
  try {
    const phase = lunarPhaseFn(new Date(nowMs), { latitude });
    if (!phase || !Number.isFinite(phase.fraction)) return null;
    return { ...phase, key: lunarKey(phase.fraction) };
  } catch {
    return null;
  }
}

function lunarWarnings(useLunar) {
  return useLunar
    ? [{
        type: 'lunar_informational',
        message: 'La fase lunar se usa como guía tradicional, no como garantía de cosecha.',
        severity: 'low',
      }]
    : [];
}

function lunarReason(entry, lunar) {
  const preference = entry?.phenology?.lunar_preference;
  if (!lunar || !Array.isArray(preference)) return 'No hay preferencia lunar específica documentada para esta especie.';
  return preference.includes(lunar.key)
    ? `La fase lunar (${lunar.name}) coincide con la preferencia tradicional documentada para esta especie.`
    : `La fase lunar (${lunar.name}) no coincide con la preferencia tradicional documentada; la fecha se basa en el clima.`;
}

function summarizeForecast(forecast) {
  if (!forecast) return null;
  const values = (key) => forecast.days.map((day) => day[key]).filter((value) => value !== null);
  const mins = values('temp_min_c');
  const maxes = values('temp_max_c');
  const precipitation = values('precip_mm');
  return {
    source: forecast.source,
    horizon_days: forecast.days.length,
    temp_min_c: mins.length ? Math.min(...mins) : null,
    temp_max_c: maxes.length ? Math.max(...maxes) : null,
    precip_total_mm: precipitation.length ? Number(precipitation.reduce((a, b) => a + b, 0).toFixed(1)) : null,
    days: forecast.days.map(({ date, temp_min_c, temp_max_c, precip_mm, precip_prob, humidity_avg }) => ({
      date, temp_min_c, temp_max_c, precip_mm, precip_prob, humidity_avg,
    })),
  };
}

export function computeConfidence({ forecast, entry, piso, fit, lunarMatch }) {
  let confidence = forecast ? 0.6 : 0.2;
  if (entry?.phenology) confidence += entry.phenology.source?.startsWith('queue/010') ? 0.15 : 0.05;
  if (piso) confidence += 0.05;
  if (fit?.apt === true) confidence += 0.05;
  if (fit?.apt === false) confidence -= 0.25;
  if (forecast?.days.length >= DEFAULT_FORECAST_HORIZON_DAYS) confidence += 0.05;
  if (lunarMatch === true) confidence += 0.02;
  return clampConfidence(confidence);
}

function riskLevel(analyzed, fit) {
  if (fit?.apt === false || analyzed.some(({ flags }) => flags.frostSevere || flags.floodSevere)) return 'high';
  if (analyzed.some(({ flags }) => flags.frost || flags.flood)) return 'medium';
  return 'low';
}

function buildRecommendation(request, entry, context) {
  const { forecast, nowMs, piso, tolerance, lunar } = context;
  const fit = assessLocationFit(entry, request.location.altitude_m, piso);
  const analyzed = forecast.days.map((day) => ({ day, flags: analyzeDay(day, entry, tolerance) }));
  const favorable = analyzed.filter(({ flags }) => !flags.blocked).map(({ day }) => day);
  const timing = buildWindow(favorable, nowMs);
  const reasons = [`${entry.nombre_comun} (${entry.nombre_cientifico}).`, lunarReason(entry, lunar)];
  if (fit.reason) reasons.push(fit.reason);
  else if (fit.apt === true) reasons.push(`Apta para el piso térmico ${piso} de esta ubicación.`);
  else reasons.push('La aptitud exacta no se pudo verificar con los datos disponibles del catálogo.');
  if (timing) reasons.push(`Ventana climática favorable del ${timing.window_start} al ${timing.window_end}.`);
  else reasons.push('No hay un día favorable en el pronóstico para sembrar.');
  if (entry.phenology?.harvest_days) {
    const harvestDays = entry.phenology.harvest_days;
    const range = Array.isArray(harvestDays) ? `${harvestDays[0]} a ${harvestDays[1]}` : `aproximadamente ${harvestDays}`;
    reasons.push(`Ciclo siembra a cosecha de ${range} días.`);
  }
  return {
    species_id: entry.id,
    species_name: entry.nombre_comun,
    reason: reasons,
    timing,
    risk_level: riskLevel(analyzed, fit),
    fallback_available: fit.apt === true,
  };
}

function baseMeta(context, fallbackMode) {
  return {
    lunar_phase: context.lunar,
    climate_forecast: summarizeForecast(context.forecast),
    generated_at: new Date(context.nowMs).toISOString(),
    confidence: context.confidence,
    ...(fallbackMode ? { fallback_mode: fallbackMode } : {}),
  };
}

function fallbackNoClimate(context, warnings) {
  return {
    recommendations: [],
    warnings: [
      {
        type: 'data_unavailable',
        message: 'No hay datos climáticos recientes. Basándonos en históricos.',
        severity: 'medium',
      },
      ...warnings,
    ],
    meta: { ...baseMeta({ ...context, confidence: 0.4, forecast: null }), fallback_mode: 'historical_climate' },
  };
}

function fallbackUnknownSpecies(speciesId, context, warnings) {
  const genericDays = context.forecast.days.map((day) => ({ day, flags: analyzeDay(day) }));
  const timing = buildWindow(genericDays.filter(({ flags }) => !flags.blocked).map(({ day }) => day), context.nowMs);
  const reason = [
    `La especie solicitada no está en el catálogo con fenología: ${speciesId}.`,
    'Sin datos específicos de la especie, la recomendación es genérica y no garantiza la cosecha.',
  ];
  if (context.lunar) reason.push(`La fase lunar (${context.lunar.name}) se toma como guía tradicional para hortalizas de hoja.`);
  return {
    recommendations: [{
      species_id: 'generic_hoja',
      species_name: 'Hortalizas de hoja (genérico)',
      reason,
      timing,
      risk_level: riskLevel(genericDays, null),
      fallback_available: true,
    }],
    warnings: [
      {
        type: 'incomplete_catalog',
        message: 'El catálogo no tiene fenología para esta especie. Recomendación genérica.',
        severity: 'low',
      },
      ...warnings,
    ],
    meta: { ...baseMeta({ ...context, confidence: 0.5 }), fallback_mode: 'generic_recommendation' },
  };
}

function fallbackRiskAlert(context, type, message, warnings) {
  return {
    recommendations: [],
    warnings: [{ type, message, severity: 'high' }, ...warnings],
    meta: { ...baseMeta({ ...context, confidence: 0.9 }), fallback_mode: 'risk_alert' },
  };
}

function invalidRequest(message) {
  return {
    recommendations: [],
    warnings: [{ type: 'data_unavailable', message, severity: 'medium' }],
    meta: {
      lunar_phase: null,
      climate_forecast: null,
      generated_at: new Date().toISOString(),
      confidence: 0.15,
    },
  };
}

/** Produce siempre una respuesta contractual y nunca lanza por datos externos. */
export function recommendSowing(request, deps = {}) {
  if (!request || typeof request !== 'object') return invalidRequest('Solicitud inválida: falta el objeto de request.');
  const location = request.location;
  const latitude = asFinite(location?.latitude);
  const longitude = asFinite(location?.longitude);
  const altitude = asFinite(location?.altitude_m);
  if (latitude === null || longitude === null || altitude === null || altitude < 0) {
    return invalidRequest('La ubicación requiere latitud, longitud y altitud válidas.');
  }

  const parsedDate = request.date ? parseDayDate(request.date) : null;
  const nowMs = parsedDate ?? (deps.now ? parseDayDate(deps.now) : Date.now());
  const preferences = request.preferences || {};
  const useLunar = preferences.use_lunar !== false;
  const useClimate = preferences.use_climate !== false;
  const tolerance = VALID_TOLERANCES.has(preferences.risk_tolerance) ? preferences.risk_tolerance : 'moderate';
  const piso = classifyPiso(altitude);
  const lunar = getLunarMeta(nowMs, latitude, useLunar, deps.lunarPhaseFn || lunarPhase);
  const warnings = lunarWarnings(useLunar);
  const context = { nowMs, latitude, longitude, altitude, piso, lunar, tolerance, forecast: null };

  if (!useClimate) return fallbackNoClimate(context, warnings);
  const forecast = parseForecast(request, deps);
  if (!forecast) return fallbackNoClimate(context, warnings);
  context.forecast = forecast;

  if (request.species_id) {
    const entry = resolveSpeciesEntry(request.species_id, deps);
    if (!entry) return fallbackUnknownSpecies(request.species_id, context, warnings);
    const analyzed = forecast.days.map((day) => ({ day, flags: analyzeDay(day, entry, tolerance) }));
    const favorable = analyzed.filter(({ flags }) => !flags.blocked).map(({ day }) => day);
    if (!buildWindow(favorable, nowMs)) {
      const severeFrost = analyzed.some(({ flags }) => flags.frostSevere);
      const severeFlood = analyzed.some(({ flags }) => flags.floodSevere);
      const type = severeFrost ? 'frost_risk' : severeFlood ? 'flood_risk' : 'data_unavailable';
      const message = severeFrost
        ? 'HELADA SEVERA esperada. NO sembrar esta semana.'
        : severeFlood
          ? 'Lluvia intensa esperada. Evitar siembra esta semana.'
          : 'No hay un día favorable en el pronóstico para sembrar esta semana.';
      return fallbackRiskAlert(context, type, message, warnings);
    }
    const recommendation = buildRecommendation(request, entry, context);
    const lunarMatch = entry.phenology?.lunar_preference?.includes(lunar?.key);
    return {
      recommendations: [recommendation],
      warnings: [...computeClimateWarnings(forecast, entry, tolerance), ...warnings],
      meta: baseMeta({
        ...context,
        confidence: computeConfidence({
          forecast,
          entry,
          piso,
          fit: assessLocationFit(entry, altitude, piso),
          lunarMatch,
        }),
      }),
    };
  }

  if (!piso) return invalidRequest(INVALID_PISO_MESSAGE);
  const catalog = Array.isArray(deps.catalog) ? deps.catalog : FENOLOGY_CATALOG;
  const maxGeneral = Math.max(1, Math.min(20, asFinite(deps.maxGeneral) ?? 5));
  const candidates = catalog
    .filter((entry) => entry && entry.thermal_zones?.includes(piso))
    .map((entry) => ({ entry, fit: assessLocationFit(entry, altitude, piso) }))
    .filter(({ fit }) => fit.apt !== false)
    .sort((a, b) => Number(Boolean(b.entry.phenology)) - Number(Boolean(a.entry.phenology))
      || String(a.entry.nombre_comun).localeCompare(String(b.entry.nombre_comun), 'es'))
    .slice(0, maxGeneral);
  if (candidates.length === 0) return {
    recommendations: [],
    warnings: [{ type: 'incomplete_catalog', message: `No hay especies del catálogo aptas para el piso térmico ${piso}.`, severity: 'low' }, ...warnings],
    meta: { ...baseMeta({ ...context, confidence: 0.3 }), fallback_mode: 'generic_recommendation' },
  };

  return {
    recommendations: candidates.map(({ entry }) => buildRecommendation(request, entry, context)),
    warnings: [...computeClimateWarnings(forecast, null, tolerance), ...warnings],
    meta: baseMeta({
      ...context,
      confidence: computeConfidence({ forecast, entry: candidates[0].entry, piso, fit: candidates[0].fit }),
    }),
  };
}
