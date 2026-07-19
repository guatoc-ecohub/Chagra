/**
 * recorridoService.js — TRIPAS del "Recorrido de finca por voz".
 *
 * FEATURE: el campesino camina su finca con el modo campo prendido y narra lo
 * que ve ("aquí sembré 20 tomates", "este lote está seco", "mira esta mata").
 * Chagra registra cada narración, le pega la coordenada GPS actual, resuelve a
 * qué lote pertenece (point-in-polygon contra la geometría del asset--land) y
 * arma un resumen que puede leer en voz alta.
 *
 * Esta capa es PURA / testable y NO decide UI: expone la lógica para que el
 * canvas del croquis (Fable) y el hook de voz solo consuman.
 *
 * ── Piezas ──────────────────────────────────────────────────────────────────
 *   1. GPS → lote:  pointInRing / resolveLoteForPoint / buildObservacion /
 *      capturarObservacion  (deliverable 1).
 *   3. Readback:    construirResumenRecorrido / leerResumenRecorrido
 *      (deliverable 3 — arma el texto y dispara el TTS kokoro existente).
 *   4. Intención:   detectarIntencionCamara / detectarIntencionResumen
 *      (deliverable 4 — detectores deterministas on-device, sin red).
 *
 * ── Grounding / offline-first ────────────────────────────────────────────────
 * - La geometría de los lotes se lee del MISMO loteService (asset--land WKT)
 *   que ya usa el croquis; no inventamos backend ni fuente de datos nueva.
 * - Si el GPS falla (permiso denegado, timeout, sin señal), la observación se
 *   registra igual SIN coordenada — el recorrido nunca se cae por falta de
 *   señal (offline-first).
 * - Los detectores de intención son deterministas y síncronos (sin red, sin
 *   LLM), en la línea de voiceFieldExtractor: funcionan caminando sin datos.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module recorridoService
 */

import { getCurrentPosition } from './gpsFincaDetector';
import * as loteService from './loteService';
import { haversineMeters } from '../utils/geo';
// (2026-07-19) El TTS ya no se importa directo: el habla sale por la
// garganta única de Angelita (angelitaVoz, import perezoso más abajo).
import { normalize } from '../utils/entityMatcher';
import { newUlid } from '../utils/id';

/**
 * @typedef {{ lat:number, lng:number }} LatLng
 */

/**
 * @typedef {Object} ObservacionRecorrido
 * @property {string} id             ULID único de la observación.
 * @property {string} texto          transcripción cruda de lo que narró el campesino.
 * @property {string} tipo           'observacion' | 'planta_foto' | string libre.
 * @property {LatLng|null} coord     coordenada capturada, o null si no hubo GPS.
 * @property {number|null} accuracy  precisión GPS en metros, o null.
 * @property {string|null} loteId    id del asset--land resuelto, o null.
 * @property {string|null} loteNombre nombre legible del lote, o null.
 * @property {'dentro'|'cercano'|'sin_lote'} pertenencia  cómo se resolvió el lote.
 * @property {number|null} distanciaM  distancia al lote (0 si dentro), o null.
 * @property {number} timestamp      epoch ms del registro.
 * @property {Object|null} [especie] resultado de reconocimiento (si vino de cámara).
 */

/**
 * @typedef {Object} ResolucionLote
 * @property {Object|null} lote
 * @property {string|null} loteId
 * @property {string|null} loteNombre
 * @property {'dentro'|'cercano'|'sin_lote'} pertenencia
 * @property {number|null} distanciaM
 */

// ── 1. GPS → lote ─────────────────────────────────────────────────────────────

/** Radio (m) para considerar que una coord "cae cerca" de un lote sin contenerla. */
const DEFAULT_MAX_NEARBY_M = 30;

/** Resolución vacía reutilizable (sin lote). */
const SIN_LOTE = Object.freeze({
  lote: null,
  loteId: null,
  loteNombre: null,
  pertenencia: 'sin_lote',
  distanciaM: null,
});

/**
 * Point-in-polygon por ray casting (algoritmo par/impar). El anillo se da como
 * lista de vértices {lat,lng}; el punto como {lat,lng}. No requiere que el
 * anillo esté cerrado (usa el vértice anterior de forma circular).
 *
 * @param {LatLng} point
 * @param {Array<LatLng>} ring
 * @returns {boolean} true si el punto cae dentro del anillo.
 */
export function pointInRing(point, ring) {
  if (!point || !Array.isArray(ring) || ring.length < 3) return false;
  const x = point.lng;
  const y = point.lat;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) {
      continue;
    }
    const intersect = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extrae el anillo exterior de un lote como lista de vértices {lat,lng}, o null
 * si el lote no tiene geometría de polígono (un punto no "contiene" nada).
 *
 * @param {Object} lote - asset--land (shape de loteService).
 * @returns {Array<LatLng>|null}
 */
export function loteRing(lote) {
  const geo = /** @type {any} */ (loteService.loteGeoJson(lote));
  if (!geo || geo.type !== 'Polygon' || !Array.isArray(geo.coordinates)) return null;
  const ring = geo.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  return ring
    .filter((c) => Array.isArray(c) && c.length >= 2)
    .map(([lon, lat]) => ({ lat, lng: lon }));
}

/** ¿La coordenada cae DENTRO del polígono del lote? */
export function pointInLote(point, lote) {
  const ring = loteRing(lote);
  return ring ? pointInRing(point, ring) : false;
}

const nombreDe = (lote) => lote?.attributes?.name || lote?.name || 'Lote sin nombre';

/**
 * Resuelve a qué lote pertenece una coordenada.
 *
 * Estrategia:
 *   1. Contención: los lotes cuyo polígono contiene el punto. Si varios lo
 *      contienen (lotes anidados: una era dentro de un potrero) gana el de
 *      MENOR área — el más específico.
 *   2. Cercanía (fallback): si ningún polígono lo contiene, el lote con el
 *      centroide más cercano dentro de `maxNearbyM` metros → pertenencia
 *      'cercano' (cubre lotes-punto y GPS impreciso en el borde).
 *   3. Nada → 'sin_lote'.
 *
 * @param {LatLng} point
 * @param {Array<Object>} lotes - asset--land[].
 * @param {{ maxNearbyM?: number }} [opts]
 * @returns {ResolucionLote}
 */
export function resolveLoteForPoint(point, lotes = [], opts = {}) {
  const maxNearbyM = Number.isFinite(opts.maxNearbyM) ? opts.maxNearbyM : DEFAULT_MAX_NEARBY_M;
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !Array.isArray(lotes)) {
    return { ...SIN_LOTE };
  }

  // 1. Contención (el más específico = menor área).
  /** @type {Array<{lote:any, area:number}>} */
  const containers = [];
  for (const lote of lotes) {
    if (pointInLote(point, lote)) {
      const area = loteService.loteAreaSqMeters(lote) || Number.POSITIVE_INFINITY;
      containers.push({ lote, area });
    }
  }
  if (containers.length > 0) {
    containers.sort((a, b) => a.area - b.area);
    const best = containers[0].lote;
    return {
      lote: best,
      loteId: best.id || null,
      loteNombre: nombreDe(best),
      pertenencia: 'dentro',
      distanciaM: 0,
    };
  }

  // 2. Cercanía por centroide.
  let nearest = null;
  let nearestD = Number.POSITIVE_INFINITY;
  for (const lote of lotes) {
    const c = loteService.loteCentroid(lote);
    if (!c) continue;
    const d = haversineMeters(point, c);
    if (d < nearestD) {
      nearestD = d;
      nearest = lote;
    }
  }
  if (nearest && nearestD <= maxNearbyM) {
    return {
      lote: nearest,
      loteId: nearest.id || null,
      loteNombre: nombreDe(nearest),
      pertenencia: 'cercano',
      distanciaM: Math.round(nearestD),
    };
  }

  return { ...SIN_LOTE };
}

/**
 * Construye (SIN tocar GPS ni red) una observación de recorrido a partir de una
 * coordenada ya conocida. Función pura — el punto de prueba para el pipeline.
 *
 * @param {Object} [args]
 * @param {string} [args.texto='']
 * @param {string} [args.tipo='observacion']
 * @param {LatLng|null} [args.coord=null]
 * @param {number|null} [args.accuracy=null]
 * @param {Array<Object>} [args.lotes=[]]
 * @param {number} [args.now=Date.now()]
 * @param {string} [args.id]
 * @param {Object|null} [args.especie=null]
 * @returns {ObservacionRecorrido}
 */
export function buildObservacion({
  texto = '',
  tipo = 'observacion',
  coord = null,
  accuracy = null,
  lotes = [],
  now = Date.now(),
  id,
  especie = null,
} = {}) {
  const validCoord = coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng)
    ? { lat: coord.lat, lng: coord.lng }
    : null;
  const resolved = validCoord ? resolveLoteForPoint(validCoord, lotes) : { ...SIN_LOTE };
  return {
    id: id || newUlid(),
    texto: (texto || '').toString().trim(),
    tipo: tipo || 'observacion',
    coord: validCoord,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    loteId: resolved.loteId,
    loteNombre: resolved.loteNombre,
    pertenencia: resolved.pertenencia,
    distanciaM: resolved.distanciaM,
    timestamp: Number.isFinite(now) ? now : Date.now(),
    especie: especie || null,
  };
}

/**
 * Captura la posición GPS actual, resuelve el lote y arma la observación.
 * Orquestador async del deliverable 1.
 *
 * `getPosition` es inyectable (default: gpsFincaDetector.getCurrentPosition)
 * para poder testear sin navegador. Si la captura de GPS falla, la observación
 * se registra igual sin coordenada (offline-first): perder señal NO puede
 * perder la nota del campesino.
 *
 * @param {Object} [args]
 * @param {string} [args.texto='']
 * @param {string} [args.tipo='observacion']
 * @param {Array<Object>} [args.lotes=[]]
 * @param {Function} [args.getPosition] - default: gpsFincaDetector.getCurrentPosition.
 * @param {number} [args.now]
 * @param {number} [args.timeout]
 * @param {Object|null} [args.especie]
 * @returns {Promise<ObservacionRecorrido>}
 */
export async function capturarObservacion({
  texto = '',
  tipo = 'observacion',
  lotes = [],
  getPosition = getCurrentPosition,
  now,
  timeout,
  especie = null,
} = {}) {
  const ts = Number.isFinite(now) ? now : Date.now();
  let coord = null;
  let accuracy = null;
  try {
    const pos = await getPosition({ timeout });
    if (pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
      coord = { lat: pos.lat, lng: pos.lng };
      accuracy = Number.isFinite(pos.accuracy) ? pos.accuracy : null;
    }
  } catch (_) {
    // Sin GPS (permiso denegado / timeout / offline): registramos sin coord.
    coord = null;
  }
  return buildObservacion({ texto, tipo, coord, accuracy, lotes, now: ts, especie });
}

// ── 4. Detección de intención (on-device, sin red) ───────────────────────────

// "mira esta mata", "revisa esta planta", "qué tiene este árbol", "tómale foto".
const CAMARA_VERB_RE = /\b(mira|mire|mir[aá]|vea|ve[aá]|revisa|revis[aá]|chequea|chequ[eé]a|observa|f[ií]jate|f[ií]jese|toma|t[oó]male|reconoce|reconoc[eé]|identifica|identific[aá]|foto|fotea|retrata|que\s+es|qu[eé]\s+es|que\s+tiene|qu[eé]\s+tiene|que\s+le\s+pasa|qu[eé]\s+le\s+pasa)\b/;
// Sujeto deíctico + sustantivo de planta ("esta mata", "ese palo", "aquel arbolito").
// (el texto llega normalizado: sin acentos y en minúscula).
const CAMARA_SUJETO_RE = /\b(esta|este|esa|ese|aquella|aquel|la|el)\s+(mata|matas|matica|maticas|planta|plantas|plantica|planticas|palo|palito|arbol|arbolito|arbolitos|arbusto|arbustos|hoja|hojas|fruto|frutos|flor|flores|racimo|racimos|cultivo|siembra|rama|ramas)\b/;

/**
 * Detecta la intención "mira esta mata / revisa esta planta" → señal para abrir
 * la cámara y correr `recognizeSpeciesGrounded`. Determinista, sin red.
 *
 * Requiere AMBOS: un verbo/gatillo de mirar-fotografiar Y un sujeto deíctico de
 * planta ("esta mata"). Así "mira el cielo" o "revisa la cerca" NO disparan.
 *
 * @param {string} texto - transcripción cruda.
 * @returns {{ match: boolean, sujeto: 'planta'|null, frase: string }}
 */
export function detectarIntencionCamara(texto) {
  const t = normalize((texto || '').toString());
  if (!t) return { match: false, sujeto: null, frase: '' };
  const match = CAMARA_VERB_RE.test(t) && CAMARA_SUJETO_RE.test(t);
  return {
    match,
    sujeto: match ? 'planta' : null,
    frase: match ? (texto || '').toString().trim() : '',
  };
}

// Gatillo de resumen ("cómo quedó", "resumen", "qué llevo registrado", "léeme").
const RESUMEN_CUE_RE = /\b(resumen|res[uú]meme|resume|repasa|repaso|leeme|l[eé]eme|leel[oa]|l[eé]el[oa]|como\s+quedo|como\s+qued[oó]|como\s+va|como\s+vamos|como\s+fue|que\s+llevo|qu[eé]\s+llevo|que\s+registr\w*|qu[eé]\s+registr\w*|que\s+anot\w*|qu[eé]\s+anot\w*|que\s+apunt\w*|qu[eé]\s+apunt\w*)\b/;
// Contexto que confirma que se habla DEL recorrido (no otra cosa).
const RESUMEN_CONTEXTO_RE = /\b(recorrido|recorri\w*|caminata|vuelta|la\s+finca|registrad\w*|apuntad\w*|anotad\w*|hoy)\b/;

/**
 * Detecta la intención "¿cómo quedó el recorrido?" → señal para armar y leer el
 * resumen hablado. Determinista, sin red.
 *
 * @param {string} texto
 * @returns {{ match: boolean, frase: string }}
 */
export function detectarIntencionResumen(texto) {
  const t = normalize((texto || '').toString());
  if (!t) return { match: false, frase: '' };
  const match = RESUMEN_CUE_RE.test(t) && RESUMEN_CONTEXTO_RE.test(t);
  return { match, frase: match ? (texto || '').toString().trim() : '' };
}

// ── 3. Readback hablado del resumen ──────────────────────────────────────────

/**
 * Forma mínima que necesita el readback (subconjunto de ObservacionRecorrido).
 * @typedef {{ texto: string, loteNombre?: (string|null) }} ResumenItem
 */

/**
 * Arma el TEXTO del resumen del recorrido, agrupado por lote y listo para TTS
 * (sin markdown). Función pura — testeable sin audio.
 *
 * @param {Array<ResumenItem>} observaciones
 * @param {{ maxPorLote?: number }} [opts]
 * @returns {string} resumen hablado en español colombiano.
 */
export function construirResumenRecorrido(observaciones = [], opts = {}) {
  const maxPorLote = Number.isFinite(opts.maxPorLote) ? opts.maxPorLote : 3;
  const obs = Array.isArray(observaciones)
    ? observaciones.filter((o) => o && typeof o.texto === 'string' && o.texto.trim())
    : [];
  if (obs.length === 0) {
    return 'Todavía no has registrado nada en este recorrido.';
  }

  const total = obs.length;
  /** @type {Map<string, Array<ResumenItem>>} */
  const grupos = new Map();
  for (const o of obs) {
    const key = o.loteNombre || 'Sin lote';
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)?.push(o);
  }

  const partes = [
    `En este recorrido registraste ${total} ${total === 1 ? 'observación' : 'observaciones'}.`,
  ];
  for (const [nombre, items] of grupos) {
    const etiqueta = nombre === 'Sin lote' ? 'Sin lote asignado' : nombre;
    const textos = items.map((i) => i.texto.trim()).filter(Boolean);
    const listadas = textos.slice(0, maxPorLote).join('; ');
    const restantes = textos.length - Math.min(textos.length, maxPorLote);
    const colita = restantes > 0 ? ` y ${restantes} más` : '';
    const nNotas = items.length === 1 ? 'nota' : 'notas';
    partes.push(`En ${etiqueta}: ${items.length} ${nNotas}. ${listadas}${colita}.`);
  }
  return partes.join(' ');
}

/**
 * Arma el resumen y lo lee en voz alta con el TTS existente (kokoro vía
 * speakSentences, con fallback Web Speech interno). Deliverable 3.
 *
 * `speak` es inyectable (default: ttsService.speakSentences) para tests. Un TTS
 * caído NO tumba el resumen: el texto igual se devuelve para que la UI lo pinte.
 *
 * @param {Array<ResumenItem>} observaciones
 * @param {{ maxPorLote?: number, speak?: (t:string)=>Promise<any> }} [opts]
 * @returns {Promise<string>} el texto del resumen (ya emitido a TTS).
 */
export async function leerResumenRecorrido(observaciones = [], opts = {}) {
  const texto = construirResumenRecorrido(observaciones, opts);
  // GARGANTA ÚNICA (2026-07-19): por defecto el resumen habla por la cola
  // de Angelita (prioridad RESPUESTA — el campesino lo pidió) en vez del
  // speakSentences suelto; así no se pisa con narraciones de mundos ni
  // avisos. `opts.speak` inyectable se mantiene para tests.
  const hablar = typeof opts.speak === 'function'
    ? opts.speak
    : (t) => import('./angelitaVoz.js').then((m) => m.decir(t, {
        prioridad: m.PRIORIDAD.RESPUESTA,
        reemplaza: true,
        origen: 'recorrido-resumen',
      }));
  try {
    await hablar(texto);
  } catch (_) {
    // TTS caído: devolvemos el texto igual para que la vista lo muestre.
  }
  return texto;
}

export default {
  pointInRing,
  loteRing,
  pointInLote,
  resolveLoteForPoint,
  buildObservacion,
  capturarObservacion,
  detectarIntencionCamara,
  detectarIntencionResumen,
  construirResumenRecorrido,
  leerResumenRecorrido,
};
