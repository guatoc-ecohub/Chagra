/**
 * climaEscenaEstado.js — el ESTADO de la escena atmosférica de la página del
 * tiempo y las lecturas pedagógicas derivadas del dato real. Funciones puras
 * (sin DOM, sin red), testeables en Node.
 *
 * Regla D-2 del spec (unificar-2d-clima): MANDA EL SERVICIO. La condición del
 * cielo la decide `atmosphereService.deriveCondicion` con sus umbrales
 * documentados; este módulo solo le acerca el dato que la pantalla ya tiene:
 *   1. el snapshot del sidecar (cuando está habilitado), tal cual;
 *   2. si el sidecar no trae señal, el payload de agroMeteoService (Open-Meteo
 *      directo — el MISMO upstream que el sidecar proxya) ADAPTADO a la forma
 *      de snapshot que el servicio ya lee. Cero fetch nuevo.
 * Sin dato de ninguna de las dos → condición null: la escena solo modula la
 * luz (reloj + efemérides). Nunca se inventa un cielo (D-4, CA-6).
 *
 * Regla D-5: los estados se pueden FORZAR solo por query param (`?clima=`,
 * `?luz=`) para capturas deterministas del gate. Nunca hay un control visible.
 */
import { deriveLuz, deriveCondicion, deriveEnso } from '../../services/atmosphereService.js';

export const CONDICIONES_ESCENA = Object.freeze(['despejado', 'nublado', 'lluvia', 'niebla']);
export const LUCES_ESCENA = Object.freeze(['amanecer', 'dia', 'atardecer', 'noche']);

/** Alias que ya usa el mundo 3D (`demos/3d/clima.js?clima=sol|lluvia|niebla`). */
const ALIAS_CLIMA = Object.freeze({ sol: 'despejado', soleado: 'despejado', nubes: 'nublado' });

const ETIQUETA_PISO = Object.freeze({
  calido: 'piso cálido',
  templado: 'piso templado',
  frio: 'piso frío',
  paramo: 'páramo',
});

function num(value) {
  // null/'' NO son 0: un dato ausente jamás se convierte en "cielo despejado".
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Formato es-CO de una cifra con una decimal como máximo ("3,7", "16"). */
export function fmtCifra(value, decimales = 1) {
  const n = num(value);
  if (n == null) return null;
  const redondeado = Math.round(n * 10 ** decimales) / 10 ** decimales;
  return String(redondeado).replace('.', ',');
}

/** "2 680 m s. n. m." — separador de miles: espacio fino indivisible (U+202F). */
export function formatoMsnm(value) {
  const n = num(value);
  if (n == null) return null;
  const entero = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return `${entero} m s. n. m.`;
}

export function etiquetaPiso(id) {
  return id ? ETIQUETA_PISO[id] || null : null;
}

/** Saludo por hora local (usted, sin nombre inventado). */
export function saludoPorHora(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Hora corta en es-CO ("4:12 p. m."); cae a HH:MM si el runtime no tiene el locale. */
export function horaCorta(date = new Date()) {
  try {
    return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Lee `?clima=` y `?luz=` de una cadena de búsqueda (window.location.search o
 * el tramo `?…` del hash). Devuelve solo valores válidos; lo demás se ignora.
 */
export function leerOverrideEscena(search = '') {
  const out = { clima: null, luz: null };
  if (!search || typeof search !== 'string') return out;
  let params;
  try {
    params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  } catch (_) {
    return out;
  }
  const clima = (params.get('clima') || '').trim().toLowerCase();
  const luz = (params.get('luz') || '').trim().toLowerCase();
  const climaNorm = ALIAS_CLIMA[clima] || clima;
  if (CONDICIONES_ESCENA.includes(climaNorm)) out.clima = climaNorm;
  if (LUCES_ESCENA.includes(luz)) out.luz = luz;
  return out;
}

/**
 * El fenómeno PRESENTE según el código WMO de Open-Meteo (lo que describe
 * `describeWeathercode`). Es la observación del fenómeno, no la cobertura:
 * si el código dice lluvia, llueve, aunque el acumulado diario sea bajo.
 * Devuelve un `estado` que `deriveCondicion` acepta como "clasificado río
 * arriba", o null para dejar que decidan sus umbrales de nubosidad/lluvia.
 */
export function estadoDesdeWmo(weather) {
  if (!weather || typeof weather !== 'object') return null;
  const familia = String(weather.family || '');
  const etiqueta = String(weather.label || '').toLowerCase();
  if (familia === 'lluvia' || familia === 'tormenta') return 'lluvia';
  if (/neblina|niebla/.test(etiqueta)) return 'niebla';
  return null;
}

/**
 * Adapta el payload de agroMeteoService (Open-Meteo directo) a la forma de
 * snapshot que `deriveCondicion` ya lee (`openmeteo.forecast_7d[].{date,
 * precip_mm, cloud_cover, estado}` + `openmeteo.current.cloud_cover`). Para el
 * día de HOY la nubosidad es la ACTUAL (lo que el cielo muestra ahora), no la
 * media del día; los demás días llevan su media.
 */
export function snapshotDesdeAgrometeo(agrometeo) {
  if (!agrometeo || typeof agrometeo !== 'object') return null;
  const daily = Array.isArray(agrometeo.daily) ? agrometeo.daily : [];
  const now = agrometeo.now && typeof agrometeo.now === 'object' ? agrometeo.now : null;
  const hoy = agrometeo.today?.date || null;
  if (daily.length === 0 && !now) return null;
  const estadoAhora = estadoDesdeWmo(now?.weather);
  const forecast_7d = daily.map((d) => {
    const esHoy = hoy != null && d?.date === hoy;
    const entrada = {
      date: d?.date ?? null,
      precip_mm: num(d?.precip_mm),
      cloud_cover: esHoy ? (num(now?.cloud) ?? num(d?.cloud_mean)) : num(d?.cloud_mean),
    };
    if (esHoy && estadoAhora) entrada.estado = estadoAhora;
    return entrada;
  });
  if (forecast_7d.length === 0 && now) {
    forecast_7d.push({ date: hoy, precip_mm: num(now.precip), cloud_cover: num(now.cloud), estado: estadoAhora || undefined });
  }
  return {
    openmeteo: {
      available: true,
      forecast_7d,
      current: now ? { cloud_cover: num(now.cloud), precipitation: num(now.precip) } : null,
    },
    location_context: { elevation: num(agrometeo.elevation) },
  };
}

/** 'el_nino' | 'la_nina' | 'neutral' (ensoService) → 'nino' | 'nina' | 'neutral' | null */
export function ensoDesdeFase(phase) {
  if (typeof phase !== 'string' || !phase) return null;
  if (phase === 'el_nino' || phase.startsWith('nino')) return 'nino';
  if (phase === 'la_nina' || phase.startsWith('nina')) return 'nina';
  return phase === 'neutral' ? 'neutral' : null;
}

/**
 * Estado completo de la escena. Orden de autoridad: override del gate →
 * snapshot del sidecar → Open-Meteo directo adaptado → sin condición.
 *
 * @returns {{condicion:string|null, luz:string, enso:string|null, fuente:'sidecar'|'openmeteo'|null, forzado:boolean}}
 */
export function estadoEscena({ snapshot = null, agrometeo = null, now = new Date(), location = null, ensoPhase = null, search = '' } = {}) {
  const luz = deriveLuz(now, location);
  const elevation = num(location?.elevation) ?? num(agrometeo?.elevation);
  let condicion = deriveCondicion({ snapshot, now, luz, elevation });
  let fuente = condicion ? 'sidecar' : null;
  if (!condicion) {
    const adaptado = snapshotDesdeAgrometeo(agrometeo);
    if (adaptado) {
      condicion = deriveCondicion({ snapshot: adaptado, now, luz, elevation });
      fuente = condicion ? 'openmeteo' : null;
    }
  }
  const enso = deriveEnso(snapshot) ?? ensoDesdeFase(ensoPhase);
  const forzado = leerOverrideEscena(search);
  return {
    condicion: forzado.clima ?? condicion,
    luz: forzado.luz ?? luz,
    enso,
    fuente,
    forzado: Boolean(forzado.clima || forzado.luz),
  };
}

const FUENTE_LECTURA = 'Lectura de Chagra a partir de Open-Meteo (nubosidad, lluvia, ETo, mínima) y las reglas agroclimáticas del piso térmico';

/**
 * LA LECTURA DEL CIELO — una frase que enseña la CAUSA (diseñador instruccional):
 * qué hace este cielo con el agua, la hoja o el frío, y qué conviene hacer.
 * Derivada del dato real; sin condición no se inventa nada (null).
 *
 * @param {{condicion:string|null, luz:string, now:object|null, today:object|null, piso:string|null, ensoFamily:string|null}} p
 * @returns {{texto:string, fuente:string}|null}
 */
export function lecturaDelCielo({ condicion, luz, now, today, piso, ensoFamily } = {}) {
  if (!condicion) return null;
  const cloud = num(now?.cloud);
  const rh = num(now?.rh);
  const uv = num(today?.uv_max);
  const eto = num(today?.eto_mm);
  const precip = num(today?.precip_mm);
  const prob = num(today?.precip_prob);
  const tmin = num(today?.temp_min);
  const frio = piso === 'frio' || piso === 'paramo';
  const pisoTexto = frio ? 'piso frío' : 'montaña';
  let texto = null;

  if (condicion === 'lluvia') {
    const cifra = precip != null ? ` (${fmtCifra(precip)} mm previstos hoy${prob != null ? `, ${Math.round(prob)} % de probabilidad` : ''})` : '';
    texto = `Lluvia sobre la finca${cifra}: la hoja queda mojada y el foliar se lava antes de actuar. Deje descansar los biopreparados de hoja y no pise las eras encharcadas.`;
  } else if (condicion === 'niebla') {
    const hum = rh != null ? ` con ${Math.round(rh)} % de humedad` : '';
    texto = `Niebla de ${pisoTexto}${hum}: la hoja amanece mojada, y cada hora de hoja húmeda es hongo que avanza. Espere a que seque para podar o cosechar.`;
  } else if (condicion === 'nublado') {
    const cob = cloud != null ? ` al ${Math.round(cloud)} %` : '';
    const sed = eto != null ? ` (hoy el aire pide ${fmtCifra(eto)} mm)` : '';
    texto = `Cielo cubierto${cob}: menos sol es menos evaporación${sed}. La tierra guarda el agua de hoy; no hace falta regar a mediodía.`;
  } else {
    const nocheFria = frio && tmin != null && tmin <= 3 && (luz === 'noche' || luz === 'atardecer' || luz === 'amanecer');
    if (nocheFria) {
      texto = `Cielo despejado en piso frío: sin nubes, el calor del suelo se escapa al cielo y la madrugada puede helar (mínima prevista ${fmtCifra(tmin)} °C). Riegue o cubra lo tierno antes de acostarse.`;
      if (ensoFamily === 'nino') texto += ' Con El Niño en piso frío hay más heladas, no más calor.';
    } else if (luz === 'noche') {
      const min = tmin != null ? ` (mínima prevista ${fmtCifra(tmin)} °C)` : '';
      texto = `Noche despejada: sin nubes el suelo suelta al cielo el calor del día y amanece fresco${min}. Buena noche para regar despacio: el agua no se evapora.`;
    } else if (uv != null && uv >= 8) {
      const sed = eto != null ? ` y el aire pide ${fmtCifra(eto)} mm de agua hoy` : '';
      texto = `Sol franco con UV ${Math.round(uv)}${sed}: riegue temprano o al caer la tarde; a mediodía el agua se evapora antes de llegar a la raíz.`;
    } else {
      const sed = eto != null ? ` y el aire pide ${fmtCifra(eto)} mm de agua hoy` : '';
      texto = `Cielo despejado: el sol trabaja para usted${sed}. Buen día para secar grano y deshierbar.`;
    }
  }
  return texto ? { texto, fuente: FUENTE_LECTURA } : null;
}

const RE_HELADA = /helad|escarch|frost/i;

/**
 * La helada como ALERTA sobre la escena (D-3), no como piel de fondo.
 * 1. Manda la alerta local del snapshot si la hay (origen 'alerta').
 * 2. Si no, la misma regla que useClima3DVivo: mínima ≤ 3 °C con cielo
 *    despejado en piso frío/páramo (origen 'derivado', fuente explícita).
 *
 * @returns {{origen:'alerta'|'derivado', mensaje:string, dias?:string[], fuente:string}|null}
 */
export function riesgoHelada({ alertas = [], today = null, condicion = null, piso = null } = {}) {
  const alerta = (Array.isArray(alertas) ? alertas : []).find((a) => RE_HELADA.test(`${a?.tipo || ''} ${a?.mensaje || ''}`));
  if (alerta) {
    return {
      origen: 'alerta',
      mensaje: alerta.mensaje || 'Alerta de helada para su zona.',
      dias: Array.isArray(alerta.dias) ? alerta.dias : undefined,
      fuente: 'Alerta local del pronóstico (sidecar de Chagra · IDEAM / Open-Meteo)',
    };
  }
  const tmin = num(today?.temp_min);
  const frio = piso === 'frio' || piso === 'paramo';
  if (frio && tmin != null && tmin <= 3 && condicion === 'despejado') {
    return {
      origen: 'derivado',
      mensaje: `Riesgo de helada de madrugada: mínima prevista ${fmtCifra(tmin)} °C con cielo despejado en ${etiquetaPiso(piso)}. Reserve agua para riego anti-helada y cubra los cultivos tiernos.`,
      fuente: 'Estimado por Chagra · Open-Meteo (mínima + nubosidad) · piso térmico del perfil',
    };
  }
  return null;
}
