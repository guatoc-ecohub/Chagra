/**
 * skyEphemeris.js — Cálculos puros de fase lunar y horas solares.
 *
 * Algoritmos determinísticos sin dependencias externas (offline-first).
 * Precisión esperada: lunar ±12h, solar ±2min. Suficiente para etiquetas
 * informativas en header. NO apto para tareas astronómicas precisas.
 *
 * Sin sugerencias agronómicas en este módulo: solo cálculo. La UI puede
 * agregar contexto si emerge evidencia robusta peer-reviewed.
 */

const SYNODIC_MONTH = 29.530588853; // días, ciclo lunar promedio
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const MS_PER_DAY = 86_400_000;
const DEG = Math.PI / 180;

function phaseNameFromFraction(f) {
  if (f < 0.025 || f > 0.975) return 'Luna nueva';
  if (f < 0.225) return 'Luna creciente';
  if (f < 0.275) return 'Cuarto creciente';
  if (f < 0.475) return 'Gibosa creciente';
  if (f < 0.525) return 'Luna llena';
  if (f < 0.725) return 'Gibosa menguante';
  if (f < 0.775) return 'Cuarto menguante';
  return 'Luna menguante';
}

const NORTH_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const SOUTH_ICONS = ['🌑', '🌘', '🌗', '🌖', '🌕', '🌔', '🌓', '🌒'];

function phaseIcon(f, southern = false) {
  const set = southern ? SOUTH_ICONS : NORTH_ICONS;
  if (f < 0.025 || f > 0.975) return set[0];
  if (f < 0.225) return set[1];
  if (f < 0.275) return set[2];
  if (f < 0.475) return set[3];
  if (f < 0.525) return set[4];
  if (f < 0.725) return set[5];
  if (f < 0.775) return set[6];
  return set[7];
}

/**
 * Calcula la fase lunar para una fecha dada.
 * @param {Date} date Fecha (default: ahora).
 * @param {{ latitude?: number }} opts Si latitude < 0, usa íconos hemisferio sur.
 * @returns {{
 *   fraction: number, illumination: number, name: string, icon: string,
 *   daysSinceNewMoon: number, daysToFullMoon: number, daysToNewMoon: number
 * }}
 */
export function lunarPhase(date = new Date(), { latitude = 0 } = {}) {
  const elapsedDays = (date.getTime() - KNOWN_NEW_MOON) / MS_PER_DAY;
  const cyclePosition = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const fraction = cyclePosition / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;

  const daysToFullMoon = ((0.5 - fraction + 1) % 1) * SYNODIC_MONTH;
  const daysToNewMoon = ((1 - fraction) % 1) * SYNODIC_MONTH;

  return {
    fraction,
    illumination,
    name: phaseNameFromFraction(fraction),
    icon: phaseIcon(fraction, latitude < 0),
    daysSinceNewMoon: cyclePosition,
    daysToFullMoon,
    daysToNewMoon,
  };
}

/**
 * Calcula horas locales de salida/puesta del sol para fecha + lat/lon.
 * Algoritmo NOAA simplificado. Precisión ~±2 min para latitudes templadas;
 * en zonas polares (|lat| > 66.5°) puede devolver null para día/noche extendidas.
 *
 * @param {Date} date Fecha local.
 * @param {number} latitude Grados, +N / -S.
 * @param {number} longitude Grados, +E / -W.
 * @returns {{
 *   sunrise: Date|null, sunset: Date|null, solarNoon: Date|null,
 *   dayLengthMinutes: number, isDaylight: boolean
 * }}
 */
export function solarTimes(date, latitude, longitude) {
  const yearStart = Date.UTC(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / MS_PER_DAY);

  // Solar declination (radians)
  const decl = 23.45 * DEG * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);

  // Hour angle at sunrise/sunset
  const latRad = latitude * DEG;
  const cosH = -Math.tan(latRad) * Math.tan(decl);

  if (cosH > 1) {
    return { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: 0, isDaylight: false };
  }
  if (cosH < -1) {
    return { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: 24 * 60, isDaylight: true };
  }
  const H = Math.acos(cosH);
  const halfDayMinutes = (H / DEG) * 4;

  // Equation of time approximation (minutes)
  const B = 2 * Math.PI * (dayOfYear - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Solar noon in minutes UTC
  const solarNoonUTC = 720 - 4 * longitude - eot;
  const sunriseMinUTC = solarNoonUTC - halfDayMinutes;
  const sunsetMinUTC = solarNoonUTC + halfDayMinutes;

  const baseUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const sunrise = new Date(baseUTC + sunriseMinUTC * 60_000);
  const sunset = new Date(baseUTC + sunsetMinUTC * 60_000);
  const solarNoon = new Date(baseUTC + solarNoonUTC * 60_000);

  const now = date.getTime();
  const isDaylight = now >= sunrise.getTime() && now <= sunset.getTime();

  return {
    sunrise,
    sunset,
    solarNoon,
    dayLengthMinutes: 2 * halfDayMinutes,
    isDaylight,
  };
}

/**
 * Geometría SVG de la fase lunar REAL para el artefacto sol/luna del agente.
 *
 * Dibuja la porción ILUMINADA del disco como un path de dos arcos:
 *   - arco exterior sobre el limbo iluminado (semicírculo del lado lit),
 *   - arco interior sobre el terminador (semielipse rx = r·|cos(2πf)|).
 * Convención hemisferio norte (Colombia ~4°N): creciente ilumina la derecha.
 *
 * La FASE es astronomía real (±12h con el ciclo sinódico medio) — mostrarla es
 * válido. Lo que NO hace este módulo (ni debe hacer la UI) es recomendar
 * labores agrícolas por fase lunar: eso es folclore sin base física
 * (ADR-033 / DR-AGUA 2026 — fuerza de marea ~10⁻⁷ de g).
 *
 * @param {number} fraction  posición en el ciclo 0..1 (0 = luna nueva, 0.5 = llena)
 * @param {number} cx @param {number} cy @param {number} r
 * @returns {{ kind: 'new'|'full'|'partial', d: string|null }}
 *   kind 'new'  → no dibujar disco iluminado (solo contorno tenue)
 *   kind 'full' → dibujar círculo completo
 *   kind 'partial' → usar `d` como path de la zona iluminada
 */
export function moonPathD(fraction, cx = 32, cy = 32, r = 13) {
  const f = ((Number(fraction) % 1) + 1) % 1;
  const illum = (1 - Math.cos(2 * Math.PI * f)) / 2;
  if (illum < 0.03) return { kind: 'new', d: null };
  if (illum > 0.97) return { kind: 'full', d: null };

  const waxing = f < 0.5;
  const rx = Math.abs(Math.cos(2 * Math.PI * f)) * r;
  const outerSweep = waxing ? 1 : 0; // creciente: limbo derecho; menguante: izquierdo
  const gibbous = illum > 0.5; // gibosa: el terminador se curva hacia el lado oscuro
  const innerSweep = gibbous ? outerSweep : 1 - outerSweep;
  const d = [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 1 ${outerSweep} ${cx} ${cy + r}`,
    `A ${rx.toFixed(2)} ${r} 0 1 ${innerSweep} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
  return { kind: 'partial', d };
}

/**
 * Formatea una fecha como HH:MM en hora local (24h).
 */
export function formatLocalHM(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formatea minutos como "Xh Ym".
 */
export function formatDayLength(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
