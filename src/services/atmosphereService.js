/**
 * atmosphereService.js — MODULACIÓN CLIMÁTICA de los temas (2026-06-11).
 * ============================================================================
 * Hace que la ATMÓSFERA VISUAL de la app refleje el clima real de la finca:
 * despejado → luz cálida; nublado → luz difusa gris; lluvia → tinte frío
 * húmedo; niebla de piso térmico frío → velo neblinoso; noche → veladura
 * nocturna en los temas claros. El Niño/La Niña sesgan la intensidad
 * (Niña → más húmedo/gris, Niño → más seco/brillante).
 *
 * ARQUITECTURA (espejo del patrón useTheme/applyTheme):
 *
 *   climaService (snapshot cacheado + evento 'chagra:clima:updated')
 *        │  (este módulo solo CONSUME — nunca pide a la red por su cuenta)
 *        ▼
 *   deriveAtmosphere()  → { condicion, luz, enso }   (funciones puras, testeables)
 *        ▼
 *   applyAtmosphere()   → <html data-clima data-luz data-enso>
 *        ▼
 *   src/styles/clima-atmosfera.css → variables --w-* + velo body::after
 *
 * PRINCIPIOS:
 *  - La IDENTIDAD DEL TEMA MANDA. Este módulo no toca ningún token --c-* del
 *    tema: solo emite atributos; el CSS aplica un velo translúcido sutil
 *    (alphas ≤ 0.16, con tope min() duro) encima. El tema sigue reconocible.
 *  - SIN SEÑAL → SIN MODULACIÓN. Si el snapshot no trae nubosidad ni lluvia,
 *    `condicion` es null y el tema queda puro (no adivinamos el cielo).
 *  - OFFLINE-FIRST. La luz del día (amanecer/día/atardecer/noche) sale del
 *    reloj + efemérides locales (skyEphemeris) y funciona sin red. La
 *    condición usa el último snapshot cacheado de climaService (localStorage).
 *  - ACCESIBILIDAD. Campesinos bajo sol directo: el velo nunca supera el tope
 *    de alpha del CSS y `prefers-contrast: more` lo apaga del todo. Además
 *    hay kill-switch (`chagra:atmosfera` = 'off').
 *  - FORWARD-COMPAT. Si el sidecar/climaService empieza a emitir nubosidad
 *    (`cloud_cover_pct`) o un `estado` clasificado, este módulo los consume
 *    automáticamente — los lectores ya son oportunistas.
 *
 * HOOK DE CALIBRACIÓN (sensores en campo, futuro): cuando haya sensores de
 * luminosidad/humedad en la finca, llamar `setAtmosphereCalibration(x)` con
 * x∈[0,1.5] para escalar TODA la modulación (0 = apagada, 1 = diseño, 1.5 =
 * máximo seguro). Persiste en localStorage y escribe `--w-cal` en <html>.
 * ============================================================================
 */

import { solarTimes } from '../utils/skyEphemeris.js';

/** Kill-switch: localStorage[ATMOSPHERE_KILL_KEY] === 'off' apaga la capa. */
export const ATMOSPHERE_KILL_KEY = 'chagra:atmosfera';
/** Calibración persistida (float 0..1.5, default 1). */
export const ATMOSPHERE_CAL_KEY = 'chagra:atmosfera:cal';

const CONDICIONES = ['despejado', 'nublado', 'lluvia', 'niebla'];

/* ---------------------------------------------------------------------------
 * Umbrales (documentados para poder calibrarlos con datos de campo):
 *  - LLUVIA_MM: ≥10mm/día = día de lluvia franca (mismo umbral del ícono
 *    CloudRain en ClimaStrip — coherencia visual widget ↔ atmósfera).
 *  - LLOVIZNA_MM: 2..10mm = cielo gris con llovizna → nublado.
 *  - NUBLADO_PCT: ≥60% de nubosidad = luz difusa dominante.
 *  - Niebla por piso térmico (Choachí/páramo): tierra fría alta (≥2600m) con
 *    cielo cubierto (≥80%) = nube de suelo; clima frío (≥2000m) al AMANECER
 *    con nubes (≥60%) = niebla matinal típica de montaña.
 * ------------------------------------------------------------------------- */
const LLUVIA_MM = 10;
const LLOVIZNA_MM = 2;
const NUBLADO_PCT = 60;
const NIEBLA_ALTA_MSNM = 2600;
const NIEBLA_ALTA_PCT = 80;
const NIEBLA_FRIO_MSNM = 2000;
const NIEBLA_FRIO_PCT = 60;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** YYYY-MM-DD local (los `date` del forecast vienen en fecha local). */
function localISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Período de luz: 'amanecer' | 'dia' | 'atardecer' | 'noche'.
 * Con coordenadas usa efemérides reales (skyEphemeris, offline). Ventanas:
 * amanecer = sunrise−30min..+45min; atardecer = sunset−45min..+30min.
 * Sin coordenadas cae a un heurístico horario ecuatorial (Colombia: sol
 * ~6:00/18:00 todo el año).
 *
 * @param {Date} [now]
 * @param {{lat:number, lng:number}|null} [location]
 */
export function deriveLuz(now = new Date(), location = null) {
  const lat = num(location?.lat);
  const lng = num(location?.lng);
  if (lat != null && lng != null) {
    const st = solarTimes(now, lat, lng);
    if (st?.sunrise && st?.sunset) {
      const t = now.getTime();
      const sr = st.sunrise.getTime();
      const ss = st.sunset.getTime();
      if (t >= sr - 30 * 60_000 && t <= sr + 45 * 60_000) return 'amanecer';
      if (t >= ss - 45 * 60_000 && t <= ss + 30 * 60_000) return 'atardecer';
      return t > sr && t < ss ? 'dia' : 'noche';
    }
  }
  // Fallback ecuatorial por hora local.
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 330 && minutes < 420) return 'amanecer'; // 5:30–7:00
  if (minutes >= 420 && minutes < 1050) return 'dia'; // 7:00–17:30
  if (minutes >= 1050 && minutes < 1125) return 'atardecer'; // 17:30–18:45
  return 'noche';
}

/** Lector oportunista de nubosidad (%) — tolera los nombres que el sidecar
 * pueda emitir hoy o tras la mejora de climaService en curso. */
function readCloudPct(day, openmeteo) {
  const candidates = [
    day?.cloud_cover_pct, day?.cloudcover_pct, day?.cloud_cover, day?.cloudcover,
    day?.nubosidad_pct, openmeteo?.current?.cloud_cover_pct,
    openmeteo?.current?.cloud_cover, openmeteo?.current?.cloudcover,
  ];
  for (const c of candidates) {
    const n = num(c);
    if (n != null && n >= 0 && n <= 100) return n;
  }
  return null;
}

/** Lector oportunista de un `estado` ya clasificado por el sidecar. */
function readEstado(day, openmeteo) {
  const raw = day?.estado ?? openmeteo?.current?.estado ?? null;
  return CONDICIONES.includes(raw) ? raw : null;
}

/**
 * Condición del cielo HOY a partir del snapshot de climaService.
 * Sin señal suficiente devuelve null (→ el tema queda puro, sin velo).
 *
 * @param {object} opts
 * @param {object|null} opts.snapshot  snapshot de climaService (puede ser null)
 * @param {Date} [opts.now]
 * @param {'amanecer'|'dia'|'atardecer'|'noche'} [opts.luz]  para la niebla matinal
 * @param {number} [opts.elevation]  msnm de la finca (piso térmico → niebla)
 * @returns {'despejado'|'nublado'|'lluvia'|'niebla'|null}
 */
export function deriveCondicion(opts = /** @type {any} */ ({})) {
  const { snapshot, now = new Date(), luz = 'dia', elevation } = opts;
  const om = snapshot?.openmeteo;
  const forecast = om?.available && Array.isArray(om.forecast_7d) ? om.forecast_7d : null;
  if (!forecast || forecast.length === 0) return null;

  const todayKey = localISODate(now);
  const day = forecast.find((d) => d?.date === todayKey) || forecast[0];
  if (!day || typeof day !== 'object') return null;

  // 1. Estado ya clasificado río arriba (forward-compat) → confiar.
  const estado = readEstado(day, om);
  if (estado) return estado;

  const precip = num(day.precip_mm);
  const cloud = readCloudPct(day, om);
  const msnm = num(elevation) ?? num(snapshot?.location_context?.elevation);

  // 2. Lluvia franca gana sobre todo (también sobre la niebla).
  if (precip != null && precip >= LLUVIA_MM) return 'lluvia';

  // 3. Niebla por piso térmico frío (tierra alta + cielo cubierto / amanecer).
  if (msnm != null && cloud != null) {
    if (msnm >= NIEBLA_ALTA_MSNM && (cloud >= NIEBLA_ALTA_PCT || luz === 'amanecer')) return 'niebla';
    if (msnm >= NIEBLA_FRIO_MSNM && luz === 'amanecer' && cloud >= NIEBLA_FRIO_PCT) return 'niebla';
  }

  // 4. Llovizna → cielo gris.
  if (precip != null && precip >= LLOVIZNA_MM) return 'nublado';

  // 5. Nubosidad directa.
  if (cloud != null) return cloud >= NUBLADO_PCT ? 'nublado' : 'despejado';

  // 6. Sin señal de cielo (solo "no llueve") → no adivinar.
  return null;
}

/**
 * Fase ENSO macro → sesgo de intensidad (Niña húmeda/gris, Niño seco/brillante).
 * @returns {'nina'|'nino'|'neutral'|null}
 */
export function deriveEnso(snapshot) {
  const phase = snapshot?.enso_status?.phase;
  if (typeof phase !== 'string' || !phase) return null;
  if (phase.startsWith('nina')) return 'nina';
  if (phase.startsWith('nino')) return 'nino';
  return phase === 'neutral' ? 'neutral' : null;
}

/**
 * Deriva la atmósfera completa. Puro (sin DOM, sin red) — la composición de
 * snapshot/ubicación la hace el hook useClimaAtmosphere.
 */
export function deriveAtmosphere({ snapshot = null, now = new Date(), location = null } = {}) {
  const luz = deriveLuz(now, location);
  const condicion = deriveCondicion({
    snapshot,
    now,
    luz,
    elevation: location?.elevation,
  });
  return { condicion, luz, enso: deriveEnso(snapshot) };
}

function readKillSwitch() {
  try {
    return localStorage.getItem(ATMOSPHERE_KILL_KEY);
  } catch (_) {
    return null;
  }
}

/** ¿Capa activa? (kill-switch para debugging / preferencia del operador). */
export function isAtmosphereEnabled() {
  return readKillSwitch() !== 'off';
}

/** Quita todos los atributos de atmósfera (estado "tema puro"). */
export function clearAtmosphere() {
  const el = document.documentElement;
  el.removeAttribute('data-clima');
  el.removeAttribute('data-luz');
  el.removeAttribute('data-enso');
}

/**
 * Única escritura DOM de la capa: atributos en <html>. El CSS
 * (clima-atmosfera.css) traduce los atributos a variables --w-* y al velo.
 * `enso: 'neutral'` NO escribe atributo (neutro = sin sesgo).
 */
export function applyAtmosphere({ condicion = null, luz = null, enso = null } = {}) {
  if (!isAtmosphereEnabled()) {
    clearAtmosphere();
    return;
  }
  const el = document.documentElement;
  if (condicion && CONDICIONES.includes(condicion)) el.setAttribute('data-clima', condicion);
  else el.removeAttribute('data-clima');

  if (luz) el.setAttribute('data-luz', luz);
  else el.removeAttribute('data-luz');

  if (enso === 'nina' || enso === 'nino') el.setAttribute('data-enso', enso);
  else el.removeAttribute('data-enso');
}

/* ---------------------------------------------------------------------------
 * Calibración (hook para sensores en campo).
 * ------------------------------------------------------------------------- */

function clampCal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.5, Math.max(0, n));
}

/**
 * Escala global de la modulación (0 = apagada, 1 = diseño, 1.5 = tope seguro).
 * Pensada para que sensores de campo (luminosidad/humedad) la ajusten cuando
 * existan. Persiste y aplica de inmediato.
 */
export function setAtmosphereCalibration(intensity) {
  const v = clampCal(intensity);
  try {
    localStorage.setItem(ATMOSPHERE_CAL_KEY, String(v));
  } catch (_) { /* quota/privacy — seguir en memoria */ }
  document.documentElement.style.setProperty('--w-cal', String(v));
  return v;
}

export function getAtmosphereCalibration() {
  try {
    const raw = localStorage.getItem(ATMOSPHERE_CAL_KEY);
    if (raw == null) return 1;
    return clampCal(raw);
  } catch (_) {
    return 1;
  }
}

/** Aplica la calibración persistida al boot (la llama el hook). */
export function initAtmosphereCalibration() {
  const v = getAtmosphereCalibration();
  if (v !== 1) document.documentElement.style.setProperty('--w-cal', String(v));
}
