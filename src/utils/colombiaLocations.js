/**
 * colombiaLocations.js — cascade Departamento -> Municipio offline.
 *
 * #338: la lista mantenida a mano (25 deptos / 117 municipios, incompleta y
 * propensa a errores) fue reemplazada por el catalogo oficial DIVIPOLA del
 * DANE (Marco Geoestadistico Nacional): 33 departamentos + ~1.122 municipios,
 * cada uno con su codigo DIVIPOLA + coordenadas del centroide.
 *
 * El dataset NO se tipea a mano: lo genera `scripts/gen-colombia-locations.mjs`
 * desde la fuente DANE (datos.gov.co, dataset gdxc-w37w) y se materializa en
 * `src/data/colombia-locations.dane.json`. Para regenerarlo (p. ej. cuando el
 * DANE actualice la division territorial):
 *
 *   node scripts/gen-colombia-locations.mjs
 *
 * Altitud (msnm): el DANE no la publica. Se conservan las altitudes curadas
 * del dataset legacy (IGAC/OSM) por match de nombre; el resto sale `null` y la
 * resuelve online el altitudeService (Open-Elevation) usando lat/lng. Offline
 * degrada con gracia: si no hay altitud, el piso termico simplemente no se
 * precalcula hasta tener red.
 *
 * Shape de export conservado para no romper el consumidor (#187/#338):
 *   COLOMBIA_LOCATIONS: { [departamento]: { name, lat, lng, altitud, codigo }[] }
 *   getDepartamentos() / getMunicipios(dpto) / findMunicipio(query)
 */

import dataset from '../data/colombia-locations.dane.json';

/**
 * Estructura: { departamento: [ { name, lat, lng, altitud, codigo } ] }.
 * Derivada del JSON generado. `codigo` es el DIVIPOLA de 5 digitos (nuevo,
 * aditivo — el consumidor existente ignora campos extra sin romperse).
 */
export const COLOMBIA_LOCATIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(dataset.departamentos).map(([dpto, info]) => [
      dpto,
      info.municipios.map((m) => ({
        name: m.name,
        lat: m.lat,
        lng: m.lng,
        altitud: m.altitud,
        codigo: m.codigo,
      })),
    ])
  )
);

/** Metadatos de procedencia del dataset (fuente, fecha, conteos). */
export const COLOMBIA_LOCATIONS_META = Object.freeze(dataset._meta);

/**
 * Lista alfabetica de departamentos.
 * @returns {string[]}
 */
export function getDepartamentos() {
  return Object.keys(COLOMBIA_LOCATIONS).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Municipios de un departamento.
 * @param {string} departamento
 * @returns {{name:string,lat:number,lng:number,altitud:number|null,codigo:string}[]}
 */
export function getMunicipios(departamento) {
  return COLOMBIA_LOCATIONS[departamento] || [];
}

/**
 * Normaliza un nombre para matching tolerante a tildes/mayusculas.
 * "Popayan" -> "popayan", "BOGOTA D.C." -> "bogota d.c.". Mismo criterio que
 * el generador (`scripts/gen-colombia-locations.mjs#normalizeName`).
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca un municipio por nombre (offline, tolerante a tildes y mayusculas).
 * Util para auto-fill desde texto libre SIN red. El query puede venir como
 * "Municipio" o "Municipio, Departamento" — la parte tras la coma desempata
 * cuando hay homonimos (p. ej. varios "San Vicente").
 *
 * Prioridad de match: exacto > prefijo. El exacto se prefiere SIEMPRE sobre un
 * prefijo (antes "Cali" podia hacer prefix-match con "Calima" segun el orden
 * del dataset antes de llegar al "Cali" exacto).
 *
 * @param {string} query
 * @returns {{departamento:string,name:string,lat:number,lng:number,altitud:number|null,codigo:string}|null}
 */
export function findMunicipio(query) {
  if (!query) return null;
  const [rawName, rawDpto] = String(query).split(',');
  const q = normalize(rawName);
  if (!q) return null;
  const dptoHint = rawDpto ? normalize(rawDpto) : null;

  let prefixHit = null;
  for (const [dpto, munis] of Object.entries(COLOMBIA_LOCATIONS)) {
    if (dptoHint && !normalize(dpto).includes(dptoHint)) continue;
    for (const m of munis) {
      const name = normalize(m.name);
      if (name === q) return { departamento: dpto, ...m };
      if (!prefixHit && name.startsWith(q)) {
        prefixHit = { departamento: dpto, ...m };
      }
    }
  }
  return prefixHit;
}

/**
 * Reverse-geocoding OFFLINE: dado un par (lat, lng) devuelve el municipio DANE
 * mas cercano por distancia a su centroide. Cubre el caso offline-first en que
 * el GPS si entrega coordenadas pero NO hay red para consultar Nominatim — el
 * campesino igual ve su municipio + departamento + piso termico.
 *
 * Distancia: euclidea sobre lat/lng con la longitud corregida por el coseno de
 * la latitud (los grados de longitud se acortan acercandose a los polos). Para
 * distancias intra-Colombia el error vs. la geodesica real es despreciable y
 * basta para asignar el municipio correcto.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {{departamento:string,name:string,lat:number,lng:number,altitud:number|null,codigo:string,distanciaKm:number}|null}
 */
export function findNearestMunicipio(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestD2 = Infinity;
  for (const [dpto, munis] of Object.entries(COLOMBIA_LOCATIONS)) {
    for (const m of munis) {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') continue;
      const dLat = m.lat - lat;
      const dLng = (m.lng - lng) * cosLat;
      const d2 = dLat * dLat + dLng * dLng;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { departamento: dpto, ...m };
      }
    }
  }
  if (!best) return null;
  // ~111 km por grado. Aproximacion para mostrar que tan lejos cae el centroide
  // (sanity / debug), no para geofence.
  const distanciaKm = Math.round(Math.sqrt(bestD2) * 111 * 10) / 10;
  return { ...best, distanciaKm };
}
