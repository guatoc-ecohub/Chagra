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
 * Busca un municipio por nombre (case-insensitive, partial match).
 * Util para auto-fill desde texto libre.
 * @param {string} query
 * @returns {{departamento:string,name:string,lat:number,lng:number,altitud:number|null,codigo:string}|null}
 */
export function findMunicipio(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  for (const [dpto, munis] of Object.entries(COLOMBIA_LOCATIONS)) {
    for (const m of munis) {
      if (m.name.toLowerCase() === q || m.name.toLowerCase().startsWith(q)) {
        return { departamento: dpto, ...m };
      }
    }
  }
  return null;
}
