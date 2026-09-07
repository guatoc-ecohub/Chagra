/**
 * agroMeteoService.js — la CAPA DE DATOS CRUDOS agrometeorológicos de la Página
 * del Tiempo (Fase 0 del DOSSIER-PAGINA-TIEMPO-AGROCLIMA, en cliente).
 * ============================================================================
 * QUÉ ES: un fetcher offline-first de Open-Meteo que trae TODA la
 * agrometeorología que una página de agroclima world-class necesita —ETo FAO-56,
 * UV, radiación, punto de rocío, humedad relativa, humedad de suelo, probabilidad
 * de lluvia, weathercode, 16 días— además de las NORMALES climáticas del archivo
 * histórico para la ANOMALÍA ("hoy vs. lo normal").
 *
 * POR QUÉ EN CLIENTE (y no en el sidecar todavía):
 *   El DOSSIER (decisión operador #2) fija arquitectura HÍBRIDA: datos crudos en
 *   el sidecar, índices derivados en cliente puro. La Fase 0 del sidecar (ampliar
 *   `openmeteo-alerts.ts` de 4 → 16 variables + `/v1/archive`) AÚN NO está en
 *   `main` de chagra-pro (verificado 2026-08-23: el snapshot solo trae
 *   temp_max/min + precip + viento). Open-Meteo es gratis, sin API key y CORS `*`
 *   (`Access-Control-Allow-Origin: *`), así que el cliente puede pedirle
 *   directamente sin romper el lockdown de CORS.
 *
 *   Este módulo es EL COSTURÓN (seam): cuando la Fase 0 aterrice en el sidecar,
 *   `fetchAgroMeteo` cambia su `fetch` interno por el snapshot del sidecar y NADA
 *   más cambia — la Página del Tiempo consume esta forma normalizada, no la API.
 *
 * REGLAS (idénticas a climaService):
 *   - NUNCA throw. El caller espera `T | null`.
 *   - Offline / falla → cache stale si existe, si no `null` (la UI degrada a
 *     SlotPendiente, nunca inventa un número).
 *   - Todo lo que devuelve es DATO OBSERVADO/PRONOSTICADO de Open-Meteo. Los
 *     ÍNDICES DERIVADOS (ETc, balance, VPD, presión de enfermedad) NO viven aquí:
 *     son funciones puras en agroIndices.js (testeable, offline, auditable).
 *
 * FUENTE: Open-Meteo forecast API (ECMWF/GFS/ICON blend) y archive API
 * (ERA5/ERA5-Land). Gratis, sin key. `et0_fao_evapotranspiration` lo calcula
 * Open-Meteo con FAO-56 Penman-Monteith nativo.
 */

import { horasFrio, etcMm, balanceHidricoDia } from './agroIndices.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

const FORECAST_TTL_MS = 3 * 60 * 60 * 1000; // 3 h — coherente con el snapshot ENSO (30 min ENSO, clima 3 h)
const NORMALS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días — la climatología no cambia
const FETCH_TIMEOUT_MS = 12_000;

const LS_FORECAST = 'chagra:agrometeo:forecast-v1';
const LS_NORMALS = 'chagra:agrometeo:normals-v3';

const DAILY_VARS = [
    'weathercode',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'precipitation_sum',
    'precipitation_probability_max',
    'et0_fao_evapotranspiration',
    'uv_index_max',
    'shortwave_radiation_sum',
    'sunshine_duration',
    'windspeed_10m_max',
    'windgusts_10m_max',
    'winddirection_10m_dominant',
];

const HOURLY_VARS = [
    'temperature_2m',
    'relative_humidity_2m',
    'dew_point_2m',
    'precipitation',
    'cloud_cover',
    'uv_index',
    'weathercode',
    'is_day',
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
    'soil_moisture_3_to_9cm',
];

function coordKey(lat, lng, elevation) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'none';
    const base = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    return Number.isFinite(elevation) ? `${base}@${Math.round(elevation)}` : base;
}

function readLS(key, ttl) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !parsed?.key) return null;
        const fresh = Date.now() - parsed.ts < ttl;
        return { ...parsed, fresh };
    } catch {
        return null;
    }
}

function writeLS(key, entry) {
    try {
        localStorage.setItem(key, JSON.stringify(entry));
    } catch {
        /* cuota / privacy mode — ignorar */
    }
}

async function timedFetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(t);
    }
}

/** Traduce el weathercode WMO a un ícono HONESTO (nada de "soleado" bajo nube). */
export function describeWeathercode(code, isDay = true) {
    const c = Number(code);
    // Grupos WMO (open-meteo docs). Familia sirve para colorear el cielo.
    if (c === 0) return { label: isDay ? 'Despejado' : 'Cielo despejado', emoji: isDay ? '☀️' : '🌙', family: 'sol' };
    if (c === 1) return { label: 'Casi despejado', emoji: isDay ? '🌤️' : '🌙', family: 'sol' };
    if (c === 2) return { label: 'Parcialmente nublado', emoji: '⛅', family: 'nubes' };
    if (c === 3) return { label: 'Nublado', emoji: '☁️', family: 'nubes' };
    if (c === 45 || c === 48) return { label: 'Neblina', emoji: '🌫️', family: 'nubes' };
    if (c >= 51 && c <= 57) return { label: 'Llovizna', emoji: '🌦️', family: 'lluvia' };
    if (c >= 61 && c <= 67) return { label: 'Lluvia', emoji: '🌧️', family: 'lluvia' };
    if (c >= 71 && c <= 77) return { label: 'Nieve', emoji: '🌨️', family: 'lluvia' };
    if (c >= 80 && c <= 82) return { label: 'Aguaceros', emoji: '🌧️', family: 'lluvia' };
    if (c >= 85 && c <= 86) return { label: 'Aguanieve', emoji: '🌨️', family: 'lluvia' };
    if (c >= 95) return { label: 'Tormenta', emoji: '⛈️', family: 'tormenta' };
    return { label: 'Sin dato', emoji: '❓', family: 'nubes' };
}

/**
 * ISO de calendario (YYYY-MM-DD) de un instante, en la zona horaria dada por
 * su offset en segundos respecto a UTC — BUG-DIA-UTC-20260904.
 *
 * Por qué existe: `new Date().toISOString().slice(0,10)` da el día EN UTC.
 * Colombia es UTC-5 (fijo, sin horario de verano): a las 19:00 hora local el
 * reloj del sistema ya marca las 00:00 UTC del día siguiente, así que entre
 * las 19:00 y medianoche esa expresión devuelve MAÑANA, no hoy — justo la
 * ventana en la que se avisa una helada (que ocurre de madrugada y el aviso
 * debe darse la noche anterior).
 *
 * El offset SIEMPRE viene de la respuesta de Open-Meteo (`utc_offset_seconds`,
 * presente cuando se pide `timezone=auto` o un nombre de zona explícito).
 * NUNCA una constante regional escrita a mano: Colombia no tiene horario de
 * verano hoy, pero una constante sería una bomba dormida para cualquier otra
 * región que use este mismo módulo.
 *
 * Sin offset (dato ausente) devuelve `null` — el caller degrada a un
 * fallback ya declarado, nunca inventa el día.
 *
 * @param {number} nowMs epoch ms (inyectable en tests vía reloj falseado)
 * @param {number|null|undefined} utcOffsetSeconds
 * @returns {string|null}
 */
export function localIsoDate(nowMs, utcOffsetSeconds) {
    if (!Number.isFinite(utcOffsetSeconds)) return null;
    return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
}

/** Índice del array horario más cercano a "ahora" (hora local del sitio). */
function nowHourIndex(times) {
    if (!Array.isArray(times) || times.length === 0) return 0;
    const now = Date.now();
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i += 1) {
        const t = new Date(times[i]).getTime();
        const diff = Math.abs(t - now);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = i;
        }
    }
    return best;
}

/** Agrega los valores horarios de un día ISO (YYYY-MM-DD) a mín/máx/promedio + horas de mojado. */
function aggregateHourly(hourly, dayIso) {
    const idxs = [];
    for (let i = 0; i < hourly.time.length; i += 1) {
        if (String(hourly.time[i]).startsWith(dayIso)) idxs.push(i);
    }
    if (idxs.length === 0) return null;
    const rh = idxs.map((i) => hourly.relative_humidity_2m?.[i]).filter((v) => Number.isFinite(v));
    const temps = idxs.map((i) => hourly.temperature_2m?.[i]).filter((v) => Number.isFinite(v));
    const cloud = idxs.map((i) => hourly.cloud_cover?.[i]).filter((v) => Number.isFinite(v));
    const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    return {
        rh_max: rh.length ? Math.max(...rh) : null,
        rh_min: rh.length ? Math.min(...rh) : null,
        rh_mean: mean(rh),
        // Mojado foliar aproximado: horas con HR ≥ 90 % (rocío/agua libre sobre la hoja).
        horas_hr_alta: rh.filter((v) => v >= 90).length,
        // Horas-frío: horas con temperatura < 7 °C (base frutales caducifolios, FAO/UC-Davis).
        horas_frio: temps.length ? horasFrio(temps) : null,
        cloud_mean: mean(cloud),
    };
}

/**
 * Trae y NORMALIZA el pronóstico agrometeorológico completo para una finca.
 * Offline-first: cache 3 h; si el fetch falla devuelve la cache aunque esté
 * vencida (marcada `stale:true`), y si no hay nada, `null`.
 *
 * @param {{lat:number,lng:number,elevation?:number}} loc
 * @param {{forceRefresh?:boolean}} [opts]
 * @returns {Promise<object|null>}
 */
export async function fetchAgroMeteo(loc, opts = {}) {
    const lat = Number(loc?.lat);
    const lng = Number(loc?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const elevation = Number.isFinite(Number(loc?.elevation)) ? Number(loc.elevation) : undefined;
    const key = coordKey(lat, lng, elevation);

    const cached = readLS(LS_FORECAST, FORECAST_TTL_MS);
    if (!opts.forceRefresh && cached && cached.key === key && cached.fresh) {
        return cached.payload;
    }

    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: DAILY_VARS.join(','),
        hourly: HOURLY_VARS.join(','),
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weathercode,cloud_cover,wind_speed_10m',
        timezone: 'auto',
        forecast_days: '16',
        past_days: '1',
    });
    if (Number.isFinite(elevation)) params.set('elevation', String(elevation));

    const raw = await timedFetchJson(`${FORECAST_URL}?${params.toString()}`);
    if (!raw || !raw.daily || !raw.hourly) {
        // Falla de red: devolver stale si lo hay (offline-first), nunca inventar.
        if (cached && cached.key === key) return { ...cached.payload, stale: true };
        return null;
    }

    const d = raw.daily;
    const utcOffsetSeconds = Number.isFinite(raw.utc_offset_seconds) ? raw.utc_offset_seconds : null;
    const hoyFinca = localIsoDate(Date.now(), utcOffsetSeconds);
    const nHour = nowHourIndex(raw.hourly.time);
    const nowW = describeWeathercode(raw.current?.weathercode ?? raw.hourly.weathercode?.[nHour], (raw.current?.is_day ?? raw.hourly.is_day?.[nHour]) !== 0);

    const dailyDigest = (d.time || []).map((iso, i) => {
        const agg = aggregateHourly(raw.hourly, iso);
        return {
            date: iso,
            weathercode: d.weathercode?.[i] ?? null,
            temp_max: d.temperature_2m_max?.[i] ?? null,
            temp_min: d.temperature_2m_min?.[i] ?? null,
            apparent_max: d.apparent_temperature_max?.[i] ?? null,
            precip_mm: d.precipitation_sum?.[i] ?? null,
            precip_prob: d.precipitation_probability_max?.[i] ?? null,
            eto_mm: d.et0_fao_evapotranspiration?.[i] ?? null,
            uv_max: d.uv_index_max?.[i] ?? null,
            radiacion_mj: d.shortwave_radiation_sum?.[i] ?? null,
            sol_horas: Number.isFinite(d.sunshine_duration?.[i]) ? d.sunshine_duration[i] / 3600 : null,
            viento_max: d.windspeed_10m_max?.[i] ?? null,
            racha_max: d.windgusts_10m_max?.[i] ?? null,
            viento_dir: d.winddirection_10m_dominant?.[i] ?? null,
            rh_max: agg?.rh_max ?? null,
            rh_min: agg?.rh_min ?? null,
            rh_mean: agg?.rh_mean ?? null,
            horas_hr_alta: agg?.horas_hr_alta ?? null,
            horas_frio: agg?.horas_frio ?? null,
            cloud_mean: agg?.cloud_mean ?? null,
        };
    });

    const payload = {
        available: true,
        fetched_at: new Date().toISOString(),
        source: 'Open-Meteo (ECMWF/GFS/ICON, ETo FAO-56)',
        source_url: 'https://open-meteo.com',
        lat,
        lng,
        elevation: raw.elevation ?? elevation ?? null,
        timezone: raw.timezone ?? null,
        utc_offset_seconds: Number.isFinite(raw.utc_offset_seconds) ? raw.utc_offset_seconds : null,
        now: {
            temp: raw.current?.temperature_2m ?? raw.hourly.temperature_2m?.[nHour] ?? null,
            aparente: raw.current?.apparent_temperature ?? null,
            rh: raw.current?.relative_humidity_2m ?? raw.hourly.relative_humidity_2m?.[nHour] ?? null,
            dew: raw.hourly.dew_point_2m?.[nHour] ?? null,
            precip: raw.current?.precipitation ?? raw.hourly.precipitation?.[nHour] ?? null,
            cloud: raw.current?.cloud_cover ?? raw.hourly.cloud_cover?.[nHour] ?? null,
            uv: raw.hourly.uv_index?.[nHour] ?? null,
            viento: raw.current?.wind_speed_10m ?? null,
            is_day: (raw.current?.is_day ?? raw.hourly.is_day?.[nHour]) !== 0,
            soil_moisture_0_1: raw.hourly.soil_moisture_0_to_1cm?.[nHour] ?? null,
            soil_moisture_1_3: raw.hourly.soil_moisture_1_to_3cm?.[nHour] ?? null,
            soil_moisture_3_9: raw.hourly.soil_moisture_3_to_9cm?.[nHour] ?? null,
            weather: nowW,
        },
        // El "hoy" agronómico = la entrada diaria de la fecha de hoy EN LA
        // ZONA HORARIA DE LA FINCA (BUG-DIA-UTC-20260904 — antes comparaba
        // contra el día en UTC, que desde las 19:00 hora Colombia ya es
        // mañana). Sin `utc_offset_seconds` en la respuesta (dato ausente),
        // `hoyFinca` es null y cae al fallback ya documentado (daily[1],
        // el "hoy" cuando past_days=1 empuja ayer al índice 0) — nunca se
        // inventa el offset.
        today: (hoyFinca && dailyDigest.find((x) => x.date === hoyFinca)) || dailyDigest[1] || dailyDigest[0] || null,
        daily: dailyDigest,
    };

    const entry = { ts: Date.now(), key, payload };
    writeLS(LS_FORECAST, entry);
    return payload;
}

/**
 * Trae las NORMALES climáticas (media de ~12 años) para la ventana de ±10 días
 * alrededor de hoy, del archivo histórico Open-Meteo (ERA5). Base de la ANOMALÍA
 * "hoy está 3 °C sobre lo normal y 40 % más seco". Cache 30 días. Lazy: solo se
 * llama cuando la vista estacional necesita la anomalía. Nunca throw → null.
 *
 * @param {{lat:number,lng:number}} loc
 * @returns {Promise<{temp_media_normal:number,precip_dia_normal:number,precip_dia_desv:number|null,balance_dia_normal:number|null,balance_dia_desv:number|null,years:number,doy_window:number,source:string}|null>}
 */
export async function fetchNormales(loc) {
    const lat = Number(loc?.lat);
    const lng = Number(loc?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const key = coordKey(lat, lng);

    const cached = readLS(LS_NORMALS, NORMALS_TTL_MS);
    if (cached && cached.key === key && cached.fresh) return cached.payload;

    // Ventana histórica: 12 años completos que terminan el año pasado (ERA5 tiene
    // ~5 días de latencia; pedir sólo años cerrados evita huecos).
    const thisYear = new Date().getUTCFullYear();
    const endYear = thisYear - 1;
    const startYear = endYear - 11; // 12 años
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        start_date: `${startYear}-01-01`,
        end_date: `${endYear}-12-31`,
        daily: 'temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration',
        timezone: 'auto',
    });

    const raw = await timedFetchJson(`${ARCHIVE_URL}?${params.toString()}`);
    if (!raw?.daily?.time) {
        if (cached && cached.key === key) return cached.payload;
        return null;
    }

    // Día-del-año de hoy y ventana ±10 días. Mismo patrón BUG-DIA-UTC-20260904
    // que `today` en fetchAgroMeteo: `now` se corrige al día EN LA ZONA DE LA
    // FINCA con el offset que la propia respuesta trae (`utc_offset_seconds`),
    // no con el UTC crudo del reloj del sistema. Sin offset (dato ausente) se
    // usa el reloj del sistema tal cual — la ventana es de ±10 días, así que
    // un desfase de una fecha no cambia materialmente la media climatológica.
    const utcOffsetSecondsNormales = Number.isFinite(raw.utc_offset_seconds) ? raw.utc_offset_seconds : null;
    const now = utcOffsetSecondsNormales != null
        ? new Date(Date.now() + utcOffsetSecondsNormales * 1000)
        : new Date();
    const doy = (dt) => {
        const start = Date.UTC(dt.getUTCFullYear(), 0, 0);
        return Math.floor((Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - start) / 86400000);
    };
    const targetDoy = doy(now);
    const WINDOW = 10;
    const temps = [];
    const precs = [];
    const balances = [];
    const times = raw.daily.time;
    for (let i = 0; i < times.length; i += 1) {
        const dt = new Date(`${times[i]}T00:00:00Z`);
        const dd = doy(dt);
        // Distancia circular en el año (365).
        let dist = Math.abs(dd - targetDoy);
        dist = Math.min(dist, 365 - dist);
        if (dist <= WINDOW) {
            const tm = raw.daily.temperature_2m_mean?.[i];
            const pr = raw.daily.precipitation_sum?.[i];
            const eto = raw.daily.et0_fao_evapotranspiration?.[i];
            if (Number.isFinite(tm)) temps.push(tm);
            if (Number.isFinite(pr)) precs.push(pr);
            if (Number.isFinite(pr) && Number.isFinite(eto)) {
                // SPEI de referencia: ETc = ETo × Kc con Kc 1.0.
                const etc = etcMm(eto, 1);
                const balance = balanceHidricoDia(pr, etc);
                if (balance) balances.push(balance.netoMm);
            }
        }
    }
    if (temps.length < 30) {
        if (cached && cached.key === key) return cached.payload;
        return null;
    }
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const precipMean = precs.length ? mean(precs) : null;
    const precipVariance = precs.length
        ? precs.reduce((sum, value) => sum + ((value - precipMean) ** 2), 0) / precs.length
        : null;
    const balanceMean = balances.length
        ? balances.reduce((sum, value) => sum + value, 0) / balances.length
        : null;
    const balanceVariance = balances.length
        ? balances.reduce((sum, value) => sum + ((value - balanceMean) ** 2), 0) / balances.length
        : null;
    const payload = {
        temp_media_normal: Math.round(mean(temps) * 10) / 10,
        precip_dia_normal: precipMean == null ? null : Math.round(precipMean * 10) / 10,
        precip_dia_desv: precipVariance == null ? null : Math.round(Math.sqrt(precipVariance) * 100) / 100,
        balance_dia_normal: balanceMean == null ? null : Math.round(balanceMean * 10) / 10,
        balance_dia_desv: balanceVariance == null ? null : Math.round(Math.sqrt(balanceVariance) * 100) / 100,
        years: endYear - startYear + 1,
        doy_window: WINDOW,
        source: `Open-Meteo archive (ERA5), media ${startYear}–${endYear} · ventana ±${WINDOW} d · balance de referencia Kc 1.0`,
    };
    writeLS(LS_NORMALS, { ts: Date.now(), key, payload });
    return payload;
}
