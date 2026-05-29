/**
 * locationService.js — resolución y enriquecimiento de ubicación (#201).
 *
 * Toma una coordenada (GPS o municipio escrito) y devuelve un objeto
 * enriquecido para la pantalla "ubicación detectada":
 *   - municipio, departamento (reverse-geocoding OSM Nominatim, online)
 *   - altitud msnm (delegado a altitudeService → Open-Elevation, online)
 *   - piso térmico (derivado de la altitud, offline-safe)
 *   - cultivos recomendados para esa zona (conocimiento agronómico público)
 *
 * DEGRADACIÓN GRACEFUL (offline-first):
 *   - Si no hay red, devuelve lo que pueda derivar localmente (piso térmico
 *     desde altitud cacheada, recomendaciones por zona). NUNCA lanza.
 *
 * SEGURIDAD (repo público — SOP §2):
 *   - Sin hostnames/IPs/tokens internos. Reverse-geocoding va contra el
 *     servicio público OSM Nominatim, configurable vía
 *     VITE_NOMINATIM_URL si el operador prefiere su propio proxy.
 *
 * Español colombiano (tú/usted, SIN voseo argentino).
 *
 * @module locationService
 */

import { deriveThermalZoneFromAltitud } from './externalAiPromptBuilder.js';

const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Metadatos visuales + cultivos recomendados por piso térmico colombiano.
 * Clasificación IDEAM / Caldas. Conocimiento agronómico público (OSS-safe):
 * los cultivos típicos de cada piso térmico son hechos de extensión rural
 * documentados (Federación de Cafeteros, ICA, manuales SENA).
 */
export const PISO_TERMICO_INFO = {
  cálido: {
    slug: 'cálido',
    label: 'Cálido',
    rango: '0–1000 msnm',
    emoji: '🌴',
    color: 'orange',
    cultivos: ['Plátano', 'Cacao', 'Yuca', 'Mango', 'Caña panelera', 'Cítricos'],
  },
  templado: {
    slug: 'templado',
    label: 'Templado',
    rango: '1000–2000 msnm',
    emoji: '🌤️',
    color: 'amber',
    cultivos: ['Café', 'Aguacate', 'Cítricos', 'Plátano', 'Caña panelera', 'Tomate de árbol'],
  },
  frío: {
    slug: 'frío',
    label: 'Frío',
    rango: '2000–3000 msnm',
    emoji: '⛅',
    color: 'green',
    cultivos: ['Papa', 'Arveja', 'Hortalizas', 'Maíz', 'Fresa', 'Mora', 'Curuba'],
  },
  páramo: {
    slug: 'páramo',
    label: 'Páramo',
    rango: '3000–3600 msnm',
    emoji: '🏔️',
    color: 'indigo',
    cultivos: ['Papa', 'Cubios', 'Hibias', 'Frailejón (conservación)', 'Pastos nativos'],
  },
  glacial: {
    slug: 'glacial',
    label: 'Alta montaña',
    rango: '> 3600 msnm',
    emoji: '❄️',
    color: 'sky',
    cultivos: ['Conservación de páramo', 'Pastos de alta montaña'],
  },
};

/**
 * Devuelve el bloque de info del piso térmico para una altitud dada.
 * Offline-safe (no red). Null si la altitud no es válida.
 *
 * @param {number} altitudMsnm
 * @returns {Object|null}
 */
export function getPisoTermicoInfo(altitudMsnm) {
  const slug = deriveThermalZoneFromAltitud(altitudMsnm);
  if (!slug) return null;
  return PISO_TERMICO_INFO[slug] || null;
}

function getNominatimBase() {
  const fromEnv = import.meta.env?.VITE_NOMINATIM_URL;
  if (fromEnv && typeof fromEnv === 'string') return fromEnv.replace(/\/$/, '');
  return 'https://nominatim.openstreetmap.org';
}

/**
 * Reverse-geocoding: de (lat, lng) a { municipio, departamento, pais,
 * display }. Usa OSM Nominatim. Degrada a null sin lanzar si offline o
 * timeout.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{municipio: string|null, departamento: string|null, pais: string|null, display: string|null}|null>}
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const base = getNominatimBase();
  const url = `${base}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&accept-language=es`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    const municipio =
      a.city || a.town || a.village || a.municipality || a.county || a.hamlet || null;
    const departamento = a.state || a.region || null;
    return {
      municipio,
      departamento,
      pais: a.country || null,
      display: data?.display_name || null,
    };
  } catch (e) {
    console.debug('[location] reverseGeocode fail:', e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Forward-geocoding: de un nombre de municipio a { lat, lng, municipio,
 * departamento }. Para el caso "el usuario escribió el municipio".
 * Sesga la búsqueda a Colombia. Degrada a null sin lanzar.
 *
 * @param {string} query - municipio o "municipio, departamento"
 * @returns {Promise<{lat: number, lng: number, municipio: string|null, departamento: string|null, display: string|null}|null>}
 */
export async function forwardGeocode(query) {
  if (!query || typeof query !== 'string') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const base = getNominatimBase();
  const q = encodeURIComponent(query.trim());
  const url = `${base}/search?format=jsonv2&q=${q}&countrycodes=co&limit=1&accept-language=es&addressdetails=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const hit = arr[0];
    const a = hit.address || {};
    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      municipio:
        a.city || a.town || a.village || a.municipality || a.county || hit.name || null,
      departamento: a.state || a.region || null,
      display: hit.display_name || null,
    };
  } catch (e) {
    console.debug('[location] forwardGeocode fail:', e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resuelve y enriquece una ubicación a partir de coordenadas y/o altitud
 * conocida. Combina reverse-geocoding + piso térmico + cultivos.
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {number} [params.altitud] - msnm si ya se conoce (evita red)
 * @returns {Promise<{
 *   lat: number, lng: number,
 *   municipio: string|null, departamento: string|null,
 *   altitud: number|null,
 *   pisoTermico: Object|null,
 *   cultivosRecomendados: string[],
 * }>}
 */
export async function resolveUbicacion({ lat, lng, altitud = null }) {
  const result = {
    lat,
    lng,
    municipio: null,
    departamento: null,
    altitud: typeof altitud === 'number' && Number.isFinite(altitud) ? Math.round(altitud) : null,
    pisoTermico: null,
    cultivosRecomendados: [],
  };

  // Reverse-geocoding (online, graceful degrade).
  const geo = await reverseGeocode(lat, lng);
  if (geo) {
    result.municipio = geo.municipio;
    result.departamento = geo.departamento;
  }

  // Altitud: si no vino dada, intentar Open-Elevation (online).
  if (result.altitud == null) {
    const ele = await fetchElevation(lat, lng);
    if (ele != null) result.altitud = Math.round(ele);
  }

  // Piso térmico + cultivos (offline-safe a partir de la altitud).
  if (result.altitud != null) {
    const info = getPisoTermicoInfo(result.altitud);
    if (info) {
      result.pisoTermico = info;
      result.cultivosRecomendados = info.cultivos;
    }
  }

  return result;
}

/**
 * Consulta de elevación puntual (Open-Elevation público o el override
 * VITE_ELEVATION_API_URL). Degrada a null sin lanzar.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number|null>}
 */
async function fetchElevation(lat, lng) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const baseUrl =
      import.meta.env?.VITE_ELEVATION_API_URL || 'https://api.open-elevation.com/api/v1/lookup';
    const url = `${baseUrl}?locations=${lat},${lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ele = data?.results?.[0]?.elevation;
    return ele != null ? ele : null;
  } catch (e) {
    console.debug('[location] fetchElevation fail:', e?.message || e);
    return null;
  }
}
