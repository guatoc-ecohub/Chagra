/**
 * locationService.js — resolución y enriquecimiento de ubicación (#201).
 *
 * Toma una coordenada (GPS o municipio escrito) y devuelve un objeto
 * enriquecido para la pantalla "ubicación detectada":
 *   - municipio, departamento (reverse-geocoding OSM Nominatim online; con
 *     FALLBACK OFFLINE al municipio DANE más cercano por centroide — #338)
 *   - altitud msnm (Open-Elevation online; fallback offline a la altitud
 *     curada del municipio DANE más cercano)
 *   - piso térmico (derivado de la altitud, offline-safe)
 *   - cultivos recomendados para esa zona (conocimiento agronómico público)
 *
 * DEGRADACIÓN GRACEFUL (offline-first):
 *   - Si no hay red, devuelve lo que pueda derivar localmente: municipio +
 *     departamento por nearest-centroid sobre el dataset DANE embebido, piso
 *     térmico desde la altitud curada, recomendaciones por zona. NUNCA lanza.
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
import { findNearestMunicipio, findMunicipio } from '../utils/colombiaLocations.js';
import { lookupVereda } from './veredaLookupService.js';

const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Umbral (en metros) del radio de incertidumbre `position.coords.accuracy`
 * por encima del cual NO confiamos en la posición para derivar la altitud de
 * la finca (#coarse-location, 2026-05-30).
 *
 * Contexto: `navigator.geolocation` reporta `accuracy` como el radio del
 * círculo de confianza. GPS real de celular suele dar <50 m; un navegador de
 * escritorio sin GPS (Brave/Chromium en NixOS) ubica por IP/wifi y da varios
 * kilómetros — cae en la cabecera municipal o en Bogotá, no en la finca. Si
 * derivamos la altitud de ESA posición guardamos la altura de la cabecera
 * (ej. Choachí 1923 msnm) en vez de la finca real (ej. 2580 msnm), lo que
 * envenena la viabilidad de cultivos y las alertas de helada del agente.
 *
 * 5000 m es un umbral conservador: deja pasar GPS de celular y la mayoría de
 * lecturas wifi urbanas precisas, pero atrapa la geolocalización gruesa por IP.
 */
export const COARSE_ACCURACY_THRESHOLD_M = 5000;

/**
 * ¿La lectura de geolocalización es DEMASIADO gruesa para derivar la altitud
 * de la finca de forma confiable?
 *
 * @param {number|null|undefined} accuracy - radio de incertidumbre en metros
 *   (`position.coords.accuracy`).
 * @param {number} [threshold] - umbral en metros (default
 *   COARSE_ACCURACY_THRESHOLD_M). Parametrizable para tests / ajustes.
 * @returns {boolean} true si la posición es gruesa (accuracy > threshold).
 *   Si `accuracy` no es un número finito, devolvemos false (no podemos afirmar
 *   que es gruesa; el navegador no reportó incertidumbre).
 */
export function isCoarseLocation(accuracy, threshold = COARSE_ACCURACY_THRESHOLD_M) {
  const n = Number(accuracy);
  if (!Number.isFinite(n)) return false;
  return n > threshold;
}

/**
 * ¿La ubicación PERSISTIDA en el perfil es demasiado gruesa para afirmar el
 * municipio/zona con confianza? (mitad geo de #364, 2026-06-03).
 *
 * A diferencia de `isCoarseLocation` (que mira una lectura GPS en vivo), este
 * predicado mira lo que quedó GUARDADO en el perfil durante el onboarding. El
 * caso del operador: en Brave los Shields difuminan el GPS y se grabó la
 * cabecera del municipio grande/caliente (no su vereda) con un radio de
 * incertidumbre de varios km. El clima/saludo lee esa ubicación guardada y
 * afirma el municipio equivocado "como si fuera cierto".
 *
 * Es coarse ⇔ `ubicacion_accuracy` es un número > umbral Y el usuario NO
 * corrigió la altitud a mano (`altitud_source !== 'manual'`). Una altitud
 * manual significa que el usuario YA confirmó su zona → no molestar. Sin
 * `ubicacion_accuracy` (perfiles fijados por pin/búsqueda, o perfiles viejos)
 * no podemos afirmar que es gruesa → devolvemos false (no molestamos).
 *
 * @param {Object|null|undefined} profile - perfil del usuario (userProfileService).
 * @param {number} [threshold] - umbral en metros (default COARSE_ACCURACY_THRESHOLD_M).
 * @returns {boolean}
 */
export function isSavedLocationCoarse(profile, threshold = COARSE_ACCURACY_THRESHOLD_M) {
  if (!profile || typeof profile !== 'object') return false;
  // El usuario ya fijó su altura real a mano → confirmó su zona, no molestar.
  if (profile.altitud_source === 'manual') return false;
  return isCoarseLocation(profile.ubicacion_accuracy, threshold);
}

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
 * Reverse-geocoding: de (lat, lng) a { vereda, municipio, departamento, pais,
 * display }. Usa OSM Nominatim. Degrada a null sin lanzar si offline o
 * timeout.
 *
 * En Colombia (OSM Nominatim):
 *   - city = vereda o cabecera municipal
 *   - county = municipio
 *   - state = departamento
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{vereda: string|null, municipio: string|null, departamento: string|null, pais: string|null, display: string|null}|null>}
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const base = getNominatimBase();
  // zoom=14 para capturar veredas (city/town/village)
  const url = `${base}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&accept-language=es`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};

    // En Colombia: city=vereda, county=municipio, state=departamento
    // city puede ser vereda O cabecera municipal, así que la extraemos
    const vereda = a.city || a.town || a.village || a.hamlet || null;
    const municipio = a.county || a.municipality || null;
    const departamento = a.state || a.region || null;
    // BARRIO urbano (reescritura onboarding §2): en cabeceras/ciudades OSM sí
    // trae suburb/neighbourhood — es el equivalente urbano de la vereda para
    // el saludo/clima ("Chapinero" en vez de nada).
    const barrio = a.suburb || a.neighbourhood || a.quarter || null;
    return {
      vereda,
      barrio,
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
 * Fuente de la altitud devuelta por resolveUbicacion.
 *
 *   'dado'          — altitud pasada explícitamente por el caller (GPS real,
 *                     onboarding, valor ya confirmado). Es la más confiable.
 *   'elevation_api' — proviene de Open-Elevation para el punto exacto (red).
 *                     Confiable: corresponde a las coordenadas, no a la cabecera.
 *   'cabecera'      — fallback offline: altitud curada del centroide DANE del
 *                     municipio más cercano. Corresponde a la CABECERA del
 *                     municipio, no a la finca real. Puede diferir cientos de
 *                     metros (ej. Choachí cabecera=1923 vs finca alta=2580).
 *                     NUNCA debe sobrescribir una altitud ya confirmada.
 *
 * @typedef {'dado'|'elevation_api'|'cabecera'} AltitudFuente
 */

/**
 * Resuelve y enriquece una ubicación a partir de coordenadas y/o altitud
 * conocida. Combina reverse-geocoding + piso térmico + cultivos.
 *
 * PRECEDENCIA de altitud (mayor → menor confiabilidad):
 *   1. `altitud` explícita del caller — GPS de la finca, valor confirmado.
 *   2. Open-Elevation para el punto exacto — precisa pero requiere red.
 *   3. Altitud curada del municipio DANE más cercano (cabecera) — fallback
 *      de último recurso; marcada con `altitud_fuente: 'cabecera'` para que
 *      los consumidores puedan elegir NO persistirla sobre una buena altitud.
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {number} [params.altitud] - msnm si ya se conoce (evita red)
 * @returns {Promise<{
 *   lat: number, lng: number,
 *   municipio: string|null, departamento: string|null,
 *   altitud: number|null,
 *   altitud_fuente: AltitudFuente|null,
 *   pisoTermico: Object|null,
 *   cultivosRecomendados: string[],
 * }>}
 */
export async function resolveUbicacion({ lat, lng, altitud = null }) {
  const altitudDada =
    typeof altitud === 'number' && Number.isFinite(altitud) ? Math.round(altitud) : null;

  const result = {
    lat,
    lng,
    vereda: null,
    /** @type {'poligono_dane'|'centroide_dane'|'nominatim'|null} de dónde salió la vereda */
    vereda_fuente: null,
    /** @type {string|null} código DANE de la vereda (si vino del dataset) */
    vereda_codigo: null,
    /** Veredas del municipio para la corrección inline (picker). */
    veredaOptions: [],
    barrio: null,
    municipio: null,
    /** @type {string|null} DIVIPOLA 5 dígitos del municipio resuelto */
    municipio_codigo: null,
    departamento: null,
    altitud: altitudDada,
    /** @type {AltitudFuente|null} */
    altitud_fuente: altitudDada != null ? 'dado' : null,
    pisoTermico: null,
    cultivosRecomendados: [],
  };

  // Reverse-geocoding (online, graceful degrade).
  const geo = await reverseGeocode(lat, lng);
  if (geo) {
    result.vereda = geo.vereda;
    result.vereda_fuente = geo.vereda ? 'nominatim' : null;
    result.barrio = geo.barrio || null;
    result.municipio = geo.municipio;
    result.departamento = geo.departamento;
  }

  // Fallback OFFLINE: si la red no resolvio municipio/departamento, usar el
  // municipio DANE mas cercano por centroide (offline-first). Tambien sirve de
  // fuente de altitud curada cuando Open-Elevation no esta disponible.
  let nearest = null;
  if (!result.municipio || !result.departamento) {
    nearest = findNearestMunicipio(lat, lng);
    if (nearest) {
      result.municipio = result.municipio || nearest.name;
      result.departamento = result.departamento || nearest.departamento;
    }
  }

  // Código DIVIPOLA del municipio: del match DANE por nombre (si Nominatim lo
  // resolvió) o del nearest-centroid. Habilita el lookup de vereda por polígono.
  if (nearest?.codigo) {
    result.municipio_codigo = String(nearest.codigo);
  } else if (result.municipio) {
    const hit = findMunicipio(
      result.departamento ? `${result.municipio}, ${result.departamento}` : result.municipio,
    );
    if (hit?.codigo) {
      result.municipio_codigo = String(hit.codigo);
      // Normalizar el nombre al catálogo DANE (consistencia con clima/saludo).
      result.municipio = hit.name;
      result.departamento = result.departamento || hit.departamento;
    }
  }

  // VEREDA por POINT-IN-POLYGON contra el dataset DANE del municipio
  // (reescritura onboarding §2.2): la geometría manda sobre el "lugar nombrado
  // más cercano" de Nominatim (caso operador: Nominatim decía "Potrero Grande"
  // cuando la finca está en "El Curí"). Degrada con gracia: sin dataset del
  // municipio (404/offline sin cache) se conserva el guess de Nominatim, y
  // `veredaOptions` queda para la corrección inline cuando haya datos.
  if (result.municipio_codigo) {
    try {
      const vLookup = await lookupVereda({ lat, lng, municipioCodigo: result.municipio_codigo });
      result.veredaOptions = vLookup.opciones;
      if (vLookup.vereda) {
        result.vereda = vLookup.vereda.nombre;
        result.vereda_codigo = vLookup.vereda.codigo;
        result.vereda_fuente = vLookup.metodo === 'poligono' ? 'poligono_dane' : 'centroide_dane';
      }
    } catch (e) {
      console.debug('[location] lookupVereda fail:', e?.message || e);
    }
  }

  // Altitud: si no vino dada, intentar Open-Elevation (online).
  if (result.altitud == null) {
    const ele = await fetchElevation(lat, lng);
    if (ele != null) {
      result.altitud = Math.round(ele);
      result.altitud_fuente = 'elevation_api';
    }
  }

  // Fallback OFFLINE de altitud: la altitud curada (IGAC/OSM) del municipio DANE
  // mas cercano, si la hay. Permite precalcular el piso termico sin red.
  //
  // ADVERTENCIA: es la altitud de la CABECERA, no de la finca. Se marca
  // 'cabecera' para que handleConfirm (LocationDetectedScreen) NO la persista
  // si el perfil ya tiene una altitud confirmada del usuario (#1213-regression).
  if (result.altitud == null) {
    if (nearest == null) nearest = findNearestMunicipio(lat, lng);
    if (nearest && typeof nearest.altitud === 'number') {
      result.altitud = nearest.altitud;
      result.altitud_fuente = 'cabecera';
    }
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
 * Consulta de elevación puntual. Degrada a null sin lanzar.
 *
 * Fuente por defecto (reescritura onboarding §2.4): **Open-Meteo Elevation**
 * (Copernicus DEM GLO-90, sin API key, alta disponibilidad) — el MISMO
 * proveedor que ya usa climaService (cero host nuevo, repo-público-safe).
 * Reemplaza a open-elevation.com (host flaky, cuota 1000 req/mes) que hacía
 * caer la altitud a la cabecera municipal y envenenaba el piso térmico.
 *
 * Override: VITE_ELEVATION_API_URL. Se aceptan AMBOS formatos de query y de
 * respuesta para que un override estilo Open-Elevation siga funcionando:
 *   - Open-Meteo:       ?latitude=..&longitude=..  → { elevation: [n] }
 *   - Open-Elevation:   ?locations=lat,lng         → { results: [{ elevation }] }
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number|null>}
 */
async function fetchElevation(lat, lng) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const override = import.meta.env?.VITE_ELEVATION_API_URL;
    const url = override
      ? `${override}?locations=${lat},${lng}&latitude=${lat}&longitude=${lng}`
      : `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Formato Open-Meteo: { elevation: [n] }
    const om = Array.isArray(data?.elevation) ? data.elevation[0] : null;
    if (typeof om === 'number' && Number.isFinite(om)) return om;
    // Formato Open-Elevation: { results: [{ elevation: n }] }
    const ele = data?.results?.[0]?.elevation;
    return ele != null ? ele : null;
  } catch (e) {
    console.debug('[location] fetchElevation fail:', e?.message || e);
    return null;
  }
}
