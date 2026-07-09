/**
 * veredaLookupService.js — vereda por POINT-IN-POLYGON contra el dataset DANE.
 *
 * Reescritura del onboarding (spec 2026-07-08 §2): el reverse-geocoding
 * público (Nominatim) llega a municipio pero NO a vereda en la Colombia rural
 * — devuelve el lugar NOMBRADO más cercano (ej. "Potrero Grande") en vez de
 * la vereda geométricamente correcta (ej. "El Curí"). Este servicio lo
 * arregla de raíz: carga los polígonos oficiales DANE del municipio detectado
 * (`/veredas/{codDANE}.json`, generado por scripts/gen-veredas.mjs) y resuelve
 * la vereda por geometría, no por nombre cercano.
 *
 *   1. codDANE (DIVIPOLA 5 dígitos) → fetch(`/veredas/{cod}.json`) — un solo
 *      archivo liviano (10–80 veredas, ~10–100 KB), cacheado en memoria y
 *      cache-on-use por el SW (offline tras la primera carga).
 *   2. Point-in-polygon (ray casting even-odd, soporta MultiPolygon y huecos).
 *   3. Fallback: centroide más cercano entre las veredas de ESE municipio.
 *   4. `opciones` = TODAS las veredas del municipio, para la corrección
 *      inline (picker/autocomplete) — la vereda correcta SIEMPRE está en la
 *      lista (a diferencia de OSM/Overpass).
 *
 * OFFLINE-FIRST: degrada con gracia — sin red y sin cache devuelve null y el
 * flujo sigue (la vereda se puede escoger después o escribir a mano).
 * Sin hosts/tokens internos (repo público — SOP §2). 100% client-side.
 *
 * Español colombiano (usted, SIN voseo argentino).
 *
 * @module veredaLookupService
 */

const FETCH_TIMEOUT_MS = 8000;

/** Cache en memoria por código de municipio: codDANE → {veredas}|null. */
const memoryCache = new Map();

/**
 * Ray casting even-odd: ¿el punto (lng, lat) cae dentro del anillo?
 * Anillo GeoJSON: [[lng,lat], ...] cerrado.
 *
 * @param {number} lng
 * @param {number} lat
 * @param {Array<Array<number>>} ring
 * @returns {boolean}
 */
export function pointInRing(lng, lat, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * ¿El punto (lat, lng) cae dentro de una geometría GeoJSON Polygon o
 * MultiPolygon? Regla even-odd: caer en un hueco (anillo interior) cuenta
 * como FUERA.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{type: string, coordinates: Array<any>}|null|undefined} geometry
 * @returns {boolean}
 */
export function pointInGeometry(lat, lng, geometry) {
  if (!geometry || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const polys =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : null;
  if (!polys) return false;
  for (const poly of polys) {
    if (!Array.isArray(poly)) continue;
    let inside = false;
    for (const ring of poly) {
      if (pointInRing(lng, lat, ring)) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

/**
 * Normaliza un nombre para matching tolerante (sin tildes, minúsculas).
 * Mismo criterio que veredaService/colombiaLocations.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeNombre(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Carga las veredas de UN municipio desde `/veredas/{codDANE}.json`.
 *
 * Cachea en memoria (por sesión); el SW las deja cache-on-use para offline.
 * Degrada a null sin lanzar (404 = municipio aún no generado, offline, etc.).
 *
 * @param {string|number} codigoDane - DIVIPOLA 5 dígitos (ej. '25181')
 * @returns {Promise<{_meta: Object, veredas: Array}|null>}
 */
export async function loadVeredasMunicipio(codigoDane) {
  const cod = String(codigoDane ?? '').trim();
  if (!/^\d{5}$/.test(cod)) return null;
  if (memoryCache.has(cod)) return memoryCache.get(cod);

  let result = null;
  // Un 404 es definitivo (municipio aún no generado) y se cachea para no
  // re-pedirlo en bucle. Un fallo de RED (timeout/offline sin cache SW) NO se
  // cachea: cuando vuelva la señal, el siguiente intento debe ir a la red.
  let cacheable = false;
  try {
    // Cast a any: ImportMeta no declara `env` en el jsconfig (vite lo inyecta).
    const base = ((/** @type {any} */ (import.meta)).env?.BASE_URL || '/').replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/veredas/${cod}.json`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.veredas)) {
          result = data;
          cacheable = true;
        }
      } else if (res.status === 404) {
        cacheable = true;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.debug('[veredaLookup] loadVeredasMunicipio fail:', e?.message || e);
  }
  if (cacheable) memoryCache.set(cod, result);
  return result;
}

/**
 * Vereda cuyo CENTROIDE está más cerca del punto (fallback cuando el
 * point-in-polygon no matchea, p. ej. GPS apenas fuera del borde municipal).
 *
 * Distancia euclídea con longitud corregida por coseno de latitud (mismo
 * criterio que findNearestMunicipio).
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{centroide?: Array<number>|null}>} veredas
 * @returns {Object|null} la vereda más cercana, o null
 */
export function nearestVeredaByCentroid(lat, lng, veredas) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Array.isArray(veredas)) return null;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestD2 = Infinity;
  for (const v of veredas) {
    const c = v?.centroide;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const dLat = c[0] - lat;
    const dLng = (c[1] - lng) * cosLat;
    const d2 = dLat * dLat + dLng * dLng;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = v;
    }
  }
  return best;
}

/**
 * Resuelve la vereda para un punto DENTRO de una lista de veredas ya cargada.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array} veredas - array de veredas del municipio (con geometry)
 * @returns {{vereda: Object, metodo: 'poligono'|'centroide'}|null}
 */
export function findVeredaAt(lat, lng, veredas) {
  if (!Array.isArray(veredas) || veredas.length === 0) return null;
  for (const v of veredas) {
    if (pointInGeometry(lat, lng, v?.geometry)) return { vereda: v, metodo: 'poligono' };
  }
  const nearest = nearestVeredaByCentroid(lat, lng, veredas);
  return nearest ? { vereda: nearest, metodo: 'centroide' } : null;
}

/**
 * Lookup completo: (lat, lng, codDANE municipio) → vereda best-guess +
 * opciones para la corrección inline.
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {string|number} params.municipioCodigo - DIVIPOLA 5 dígitos
 * @returns {Promise<{
 *   vereda: {codigo: string, nombre: string, nombre_dane: string}|null,
 *   metodo: 'poligono'|'centroide'|null,
 *   opciones: Array<{codigo: string, nombre: string, nombre_dane: string}>,
 * }>} nunca lanza; sin dataset devuelve { vereda: null, metodo: null, opciones: [] }
 */
export async function lookupVereda({ lat, lng, municipioCodigo }) {
  const empty = { vereda: null, metodo: null, opciones: [] };
  const data = await loadVeredasMunicipio(municipioCodigo);
  if (!data) return empty;

  const opciones = data.veredas.map((v) => ({
    codigo: v.codigo,
    nombre: v.nombre,
    nombre_dane: v.nombre_dane,
  }));

  const hit =
    Number.isFinite(lat) && Number.isFinite(lng) ? findVeredaAt(lat, lng, data.veredas) : null;
  if (!hit) return { ...empty, opciones };

  return {
    vereda: {
      codigo: hit.vereda.codigo,
      nombre: hit.vereda.nombre,
      nombre_dane: hit.vereda.nombre_dane,
    },
    metodo: hit.metodo,
    opciones,
  };
}

/**
 * Filtro para el autocomplete de corrección inline: veredas del municipio
 * cuyo nombre contiene el query (tolerante a tildes/mayúsculas). Query vacío
 * devuelve todas (para el modo "bajar la lista y tocar").
 *
 * @param {Array<{nombre?: string, nombre_dane?: string}>} opciones
 * @param {string} query
 * @returns {Array<any>}
 */
export function filterVeredaOptions(opciones, query = '') {
  if (!Array.isArray(opciones)) return [];
  const q = normalizeNombre(query);
  if (!q) return opciones;
  return opciones.filter(
    (o) => normalizeNombre(o?.nombre).includes(q) || normalizeNombre(o?.nombre_dane).includes(q),
  );
}

/** Resetea el cache en memoria (solo tests). */
export function _resetVeredaLookupCache() {
  memoryCache.clear();
}
