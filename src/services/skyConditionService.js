/**
 * skyConditionService.js — Condición REAL del cielo (nubosidad) para el
 * artefacto sol/luna del agente y el strip de pronóstico.
 *
 * POR QUÉ EXISTE (caso Choachí, 2026-06):
 *   El widget de clima mostró ~4 días de "sol" en Choachí (1.900-2.400 msnm,
 *   altoandino, vecino del páramo de Cruz Verde) cuando en realidad solo hubo
 *   2 — el resto fue muy nublado. Dos causas encadenadas:
 *     1. El snapshot del sidecar pide a Open-Meteo solo temp/precip/viento —
 *        NUNCA nubosidad (`cloud_cover`). El dato no existía en el pipeline.
 *     2. El ícono se decidía por precipitación (<2 mm → "solecito" ámbar).
 *        En los pueblos altoandinos la nubosidad orográfica y la niebla son
 *        crónicas SIN precipitación medible (precipitación oculta): el modelo
 *        global ya subestima la nube; el ícono la borraba del todo.
 *
 * QUÉ HACE:
 *   - Pide a Open-Meteo (fetch directo del browser, gratis, sin key, CORS ok)
 *     la nubosidad actual + media diaria + weather_code WMO 7 días.
 *   - `classifySkyCondition` traduce nubosidad+código a una condición honesta:
 *     despejado | parcial | nublado | niebla | lluvia.
 *   - CORRECCIÓN OROGRÁFICA ANDINA: en piso frío/páramo (≥2000 msnm) el cielo
 *     "despejado" del modelo en horas de la tarde se degrada a "parcial"
 *     (nubosidad vespertina orográfica, patrón altoandino documentado: amanece
 *     despejado, se nubla después del mediodía). La degradación es SOLO hacia
 *     más nube — nunca pintamos más sol del que el modelo da (sesgo de
 *     honestidad: el costo de prometer sol falso > el de prometer nube falsa).
 *   - MODULACIÓN ENSO: La Niña (más nublado/lluvioso en los Andes) degrada un
 *     paso extra; El Niño (más seco/soleado) anula la degradación orográfica
 *     pero NUNCA mejora la condición que el modelo reporta.
 *   - HOOK DE CALIBRACIÓN FUTURA: `applySensorCalibration` recibirá lecturas
 *     de sensores en finca (radiación solar / humedad) cuando existan; hoy es
 *     identidad documentada — la puerta queda lista sin depender de sensores.
 *
 * Reglas de robustez (mismas de climaService):
 *   - NUNCA throw. Caller espera `T | null`.
 *   - Offline → null inmediato.
 *   - Cache 30 min en memoria + localStorage (primer paint instantáneo).
 *
 * Fuentes del conocimiento climático aplicado:
 *   - Pisos térmicos Caldas/IDEAM (cálido <1000, templado 1000-2000,
 *     frío 2000-3000, páramo >3000) — mismos cortes que pisoTermicoFromAltitud.
 *   - Régimen bimodal andino + nubosidad orográfica/inversión térmica (IDEAM,
 *     Atlas Climatológico de Colombia).
 *   - ENSO Andes: El Niño seco/soleado, La Niña nublado/lluvioso (DR-MISSION-2/4).
 */

const LS_KEY = 'chagra:sky:snapshot-v1';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

export const OPEN_METEO_SKY_URL = 'https://api.open-meteo.com/v1/forecast';

/** Umbrales de nubosidad (% cobertura) — convención WMO/octas aproximada. */
export const CLOUD_THRESHOLDS = Object.freeze({
  parcial: 35, // >=35% deja de ser despejado
  nublado: 70, // >=70% es mayormente nublado
});

/** msnm desde el cual aplica la corrección orográfica altoandina. */
const OROGRAPHIC_MSNM = 2000;
/** Hora local desde la que la nubosidad vespertina es el patrón dominante. */
const OROGRAPHIC_AFTERNOON_HOUR = 12;
/** Precipitación diaria (mm) que ya cuenta como día de lluvia para el ícono. */
const RAIN_DAY_MM = 5;

/**
 * Metadatos de cada condición — labels honestos en español de Colombia.
 * `rank` ordena de más sol a más nube para la escala de degradación.
 */
export const SKY_CONDITIONS = Object.freeze({
  despejado: Object.freeze({ rank: 0, label: 'Despejado' }),
  parcial: Object.freeze({ rank: 1, label: 'Parcialmente nublado' }),
  nublado: Object.freeze({ rank: 2, label: 'Mayormente nublado' }),
  niebla: Object.freeze({ rank: 3, label: 'Niebla' }),
  lluvia: Object.freeze({ rank: 4, label: 'Lluvia' }),
});

const CLOUD_SCALE = ['despejado', 'parcial', 'nublado'];

/** Familia ENSO desde el slug del sidecar (nino_fuerte → 'nino', etc.). */
function ensoFamily(phase) {
  if (typeof phase !== 'string') return 'neutral';
  if (phase.startsWith('nino')) return 'nino';
  if (phase.startsWith('nina')) return 'nina';
  return 'neutral';
}

/** Piso térmico Caldas/IDEAM (slug sin tilde, igual que alertEngine). */
export function pisoFromMsnm(msnm) {
  const n = Number(msnm);
  if (!Number.isFinite(n)) return null;
  if (n >= 3000) return 'paramo';
  if (n >= 2000) return 'frio';
  if (n >= 1000) return 'templado';
  return 'calido';
}

/**
 * Grupos de weather_code WMO (los que emite Open-Meteo):
 *   0 despejado · 1-2 parcial · 3 nublado · 45/48 niebla ·
 *   51-67 llovizna/lluvia · 71-77 nieve (en Colombia: páramo/glacial → lluvia
 *   helada a efectos de UI) · 80-82 chubascos · 85-86 nieve · 95-99 tormenta.
 */
function conditionFromWeatherCode(code) {
  if (!Number.isFinite(code)) return null;
  if (code === 0) return 'despejado';
  if (code === 1 || code === 2) return 'parcial';
  if (code === 3) return 'nublado';
  if (code === 45 || code === 48) return 'niebla';
  if (code >= 51) return 'lluvia';
  return null;
}

/**
 * Clasifica la condición del cielo con honestidad andina.
 *
 * @param {object} input
 * @param {number|null} [input.cloudCoverPct]  cobertura nubosa 0-100 (actual o media diaria)
 * @param {number|null} [input.weatherCode]    código WMO de Open-Meteo
 * @param {number|null} [input.precipMm]       precipitación del periodo (mm)
 * @param {number|null} [input.elevationM]     msnm de la finca (corrección orográfica)
 * @param {number|null} [input.hour]           hora local 0-23 (default: ahora)
 * @param {string}      [input.ensoPhase]      slug ENSO del sidecar ('nina_moderada'…)
 * @returns {{
 *   condition: 'despejado'|'parcial'|'nublado'|'niebla'|'lluvia',
 *   label: string,
 *   degraded: boolean,
 *   reasons: string[],
 *   confidence: 'alta'|'media'|'baja',
 *   cloudCoverPct: number|null,
 * }}
 */
export function classifySkyCondition({
  cloudCoverPct = null,
  weatherCode = null,
  precipMm = null,
  elevationM = null,
  hour = null,
  ensoPhase = 'neutral',
} = {}) {
  const h = Number.isFinite(hour) ? hour : new Date().getHours();
  const piso = pisoFromMsnm(elevationM);
  const fam = ensoFamily(ensoPhase);
  const reasons = [];

  // 1) Señales absolutas: niebla y lluvia mandan (no se degradan ni mejoran).
  const codeCondition = conditionFromWeatherCode(
    weatherCode == null ? NaN : Number(weatherCode),
  );
  if (codeCondition === 'niebla') {
    return {
      condition: 'niebla',
      label: SKY_CONDITIONS.niebla.label,
      degraded: false,
      reasons: ['weather_code WMO 45/48 (niebla)'],
      confidence: 'alta',
      cloudCoverPct,
    };
  }
  const rainBySignal =
    codeCondition === 'lluvia' ||
    (Number.isFinite(precipMm) && precipMm >= RAIN_DAY_MM);
  if (rainBySignal) {
    return {
      condition: 'lluvia',
      label: SKY_CONDITIONS.lluvia.label,
      degraded: false,
      reasons: ['precipitación/código de lluvia del modelo'],
      confidence: 'alta',
      cloudCoverPct,
    };
  }

  // 2) Condición base: nubosidad medida > código WMO > prior climatológico.
  let condition;
  let confidence;
  if (Number.isFinite(cloudCoverPct)) {
    condition =
      cloudCoverPct >= CLOUD_THRESHOLDS.nublado
        ? 'nublado'
        : cloudCoverPct >= CLOUD_THRESHOLDS.parcial
          ? 'parcial'
          : 'despejado';
    confidence = 'alta';
    reasons.push(`cobertura nubosa ${Math.round(cloudCoverPct)}% (Open-Meteo)`);
  } else if (codeCondition) {
    condition = codeCondition;
    confidence = 'media';
    reasons.push(`weather_code WMO ${weatherCode}`);
  } else if (Number.isFinite(precipMm) && precipMm >= 2) {
    // Llovizna sin dato de nube: día encapotado.
    condition = 'nublado';
    confidence = 'baja';
    reasons.push('llovizna sin dato de nubosidad → encapotado');
  } else {
    // SIN dato de nubosidad (shape viejo del sidecar / offline): prior
    // climatológico — en piso frío/páramo lo honesto es "variable", no sol.
    condition = piso === 'frio' || piso === 'paramo' ? 'parcial' : 'despejado';
    confidence = 'baja';
    reasons.push('sin dato de nubosidad → prior climatológico por piso térmico');
  }

  // 3) Corrección orográfica andina + ENSO. SOLO degrada (nunca más sol).
  // El prior por piso (confidence 'baja') YA encierra el conocimiento
  // orográfico — no se degrada dos veces.
  let degradeSteps = 0;
  const altoandino =
    confidence !== 'baja' &&
    Number.isFinite(elevationM) && elevationM >= OROGRAPHIC_MSNM;
  if (altoandino && h >= OROGRAPHIC_AFTERNOON_HOUR) {
    degradeSteps += 1;
    reasons.push(
      `nubosidad orográfica vespertina (piso ${piso}, ${Math.round(elevationM)} msnm, tarde)`,
    );
  }
  if (altoandino && fam === 'nina') {
    degradeSteps += 1;
    reasons.push('La Niña: más nubosidad/lluvia en los Andes (NOAA/IDEAM)');
  }
  if (fam === 'nino' && degradeSteps > 0) {
    degradeSteps = 0;
    reasons.push('El Niño: Andes más secos/soleados — sin degradación orográfica');
  }

  let degraded = false;
  if (degradeSteps > 0 && CLOUD_SCALE.includes(condition)) {
    const idx = CLOUD_SCALE.indexOf(condition);
    const next = CLOUD_SCALE[Math.min(CLOUD_SCALE.length - 1, idx + degradeSteps)];
    degraded = next !== condition;
    condition = next;
  }

  return /** @type {any} */ ({
    condition,
    label: SKY_CONDITIONS[condition].label,
    degraded,
    reasons,
    confidence,
    cloudCoverPct: Number.isFinite(cloudCoverPct) ? cloudCoverPct : null,
  });
}

/**
 * Condición de UN día del pronóstico (strip de 7 días / bell).
 * Acepta tanto el shape nuevo (con `cloud_cover_mean_pct`/`weather_code` del
 * fetch directo o de un sidecar futuro) como el viejo del sidecar (solo
 * temp/precip) — en cuyo caso cae al prior conservador por piso térmico.
 *
 * `hour` default 13: el día "vivido" incluye la tarde — para un día completo
 * en piso frío lo honesto es asumir el patrón vespertino, no el amanecer.
 *
 * @param {object} day  { precip_mm?, cloud_cover_mean_pct?, weather_code? }
 * @param {object} ctx  { elevationM?, ensoPhase?, hour? }
 */
export function skyForDay(day = {}, ctx = {}) {
  return classifySkyCondition({
    cloudCoverPct: Number.isFinite(day?.cloud_cover_mean_pct)
      ? day.cloud_cover_mean_pct
      : null,
    weatherCode: Number.isFinite(day?.weather_code) ? day.weather_code : null,
    precipMm: Number.isFinite(day?.precip_mm) ? day.precip_mm : null,
    elevationM: ctx.elevationM ?? null,
    hour: Number.isFinite(ctx.hour) ? ctx.hour : 13,
    ensoPhase: ctx.ensoPhase || 'neutral',
  });
}

/**
 * HOOK DE CALIBRACIÓN FUTURA (sensores en finca — BOM estación de campo).
 *
 * Contrato: cuando existan lecturas frescas de sensores locales (radiación
 * solar W/m², humedad relativa, temperatura), este hook ajustará la condición
 * del MODELO con la observación REAL (p. ej. radiación < 200 W/m² al mediodía
 * = nublado observado, gana sobre el modelo). Hoy: identidad — devuelve la
 * clasificación intacta si no hay sensores. NO acoplar lógica de modelo aquí.
 *
 * @param {object} classification  output de classifySkyCondition
 * @param {object|null} sensors    lecturas futuras { solar_wm2?, rh_pct?, ts? }
 */
export function applySensorCalibration(classification, sensors) {
  if (!sensors || typeof sensors !== 'object') return classification;
  // Futuro: comparar sensors.solar_wm2 contra el esperado por hora/condición y
  // sobreescribir condition/confidence con source:'sensor'. Por ahora, sin
  // sensores desplegados, no hay nada que calibrar.
  return classification;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch directo Open-Meteo (nubosidad) — cache 30 min mem + localStorage.
// El sidecar aún no pide cloud_cover (tarea aparte en chagra-pro); mientras
// tanto el browser lo pide directo: gratis, sin key, CORS abierto. Cuando el
// sidecar lo agregue a forecast_7d, skyForDay ya entiende ese shape.
// ─────────────────────────────────────────────────────────────────────────────

let memCache = null; // { ts, key, payload }
let inFlight = null; // { key, promise }

function quantKey(lat, lng, elevation) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const base = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  return Number.isFinite(elevation) ? `${base}@${Math.round(elevation)}` : base;
}

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.payload) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function writeLS(entry) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entry));
  } catch (_) {
    // cuota llena / private mode — ignorar
  }
}

function pickNum(arr, i) {
  if (!Array.isArray(arr) || i >= arr.length) return null;
  const v = Number(arr[i]);
  return Number.isFinite(v) ? v : null;
}

/**
 * Snapshot de cielo cacheado (sync, sin fetch) si está dentro de TTL.
 * @returns {{ fetched_at, current, daily } | null}
 */
export function getCachedSkyConditions(lat, lng, elevation) {
  const key = quantKey(Number(lat), Number(lng), Number(elevation));
  if (!key) return null;
  const now = Date.now();
  if (memCache && memCache.key === key && now - memCache.ts < CACHE_TTL_MS) {
    return memCache.payload;
  }
  const ls = readLS();
  if (ls && ls.key === key) {
    memCache = ls;
    return ls.payload;
  }
  return null;
}

/**
 * Pide nubosidad actual + 7 días a Open-Meteo. Nunca throw; null si offline,
 * coords inválidas o error HTTP. Comparte promesa si hay un fetch en vuelo.
 *
 * @param {{ lat:number, lng:number, elevation?:number, forceRefresh?:boolean }} opts
 * @returns {Promise<{ fetched_at:string,
 *   current: { cloud_cover_pct:number|null, weather_code:number|null, precip_mm:number|null, is_day:boolean|null },
 *   daily: Array<{ date:string, cloud_cover_mean_pct:number|null, weather_code:number|null, precip_mm:number|null }>
 * } | null>}
 */
export async function fetchSkyConditions(opts = /** @type {any} */ ({})) {
  const { lat, lng, elevation, forceRefresh = false } = opts;
  const nlat = Number(lat);
  const nlng = Number(lng);
  const key = quantKey(nlat, nlng, Number(elevation));
  if (!key) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return getCachedSkyConditions(nlat, nlng, Number(elevation));
  }

  if (!forceRefresh) {
    const cached = getCachedSkyConditions(nlat, nlng, Number(elevation));
    if (cached) return cached;
  }
  if (inFlight && inFlight.key === key) return inFlight.promise;

  const params = new URLSearchParams({
    latitude: String(nlat),
    longitude: String(nlng),
    timezone: 'auto',
    forecast_days: '7',
    daily: 'cloud_cover_mean,weather_code,precipitation_sum',
    current: 'cloud_cover,weather_code,precipitation,is_day',
  });
  if (Number.isFinite(Number(elevation))) {
    params.set('elevation', String(Math.round(Number(elevation))));
  }
  const url = `${OPEN_METEO_SKY_URL}?${params.toString()}`;

  const promise = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const raw = await res.json();
      const daily = raw?.daily;
      const dates = Array.isArray(daily?.time) ? daily.time : [];
      const payload = {
        fetched_at: new Date().toISOString(),
        current: {
          cloud_cover_pct: Number.isFinite(raw?.current?.cloud_cover)
            ? raw.current.cloud_cover
            : null,
          weather_code: Number.isFinite(raw?.current?.weather_code)
            ? raw.current.weather_code
            : null,
          precip_mm: Number.isFinite(raw?.current?.precipitation)
            ? raw.current.precipitation
            : null,
          is_day:
            raw?.current?.is_day === 1 || raw?.current?.is_day === 0
              ? raw.current.is_day === 1
              : null,
        },
        daily: dates.slice(0, 7).map((date, i) => ({
          date,
          cloud_cover_mean_pct: pickNum(daily?.cloud_cover_mean, i),
          weather_code: pickNum(daily?.weather_code, i),
          precip_mm: pickNum(daily?.precipitation_sum, i),
        })),
      };
      const entry = { ts: Date.now(), key, payload };
      memCache = entry;
      writeLS(entry);
      return payload;
    } catch (_) {
      return null;
    }
  })();
  inFlight = { key, promise };
  try {
    return await promise;
  } finally {
    if (inFlight && inFlight.promise === promise) inFlight = null;
  }
}

/**
 * Resumen del cielo de HOY para el grounding del agente (sync, solo caches).
 * Lee el snapshot de cielo cacheado usando la ubicación que el snapshot de
 * clima ya resolvió (location_context). Devuelve null si no hay datos — el
 * bloque clima del prompt simplemente no menciona nubosidad (no inventa).
 *
 * @param {object|null} climaSnapshot  payload de getCachedClimaSnapshot()
 * @returns {{ condition:string, label:string, cloudCoverPct:number|null,
 *             degraded:boolean, reasons:string[] } | null}
 */
export function summarizeSkyForGrounding(climaSnapshot) {
  try {
    const loc = climaSnapshot?.location_context;
    if (!loc || !Number.isFinite(Number(loc.lat))) return null;
    const sky = getCachedSkyConditions(loc.lat, loc.lng, loc.elevation);
    if (!sky?.current) return null;
    const r = classifySkyCondition({
      cloudCoverPct: sky.current.cloud_cover_pct,
      weatherCode: sky.current.weather_code,
      precipMm: sky.current.precip_mm,
      elevationM: Number.isFinite(Number(loc.elevation)) ? Number(loc.elevation) : null,
      ensoPhase: climaSnapshot?.enso_status?.phase || 'neutral',
    });
    return {
      condition: r.condition,
      label: r.label,
      cloudCoverPct: r.cloudCoverPct,
      degraded: r.degraded,
      reasons: r.reasons,
    };
  } catch (_) {
    return null;
  }
}
