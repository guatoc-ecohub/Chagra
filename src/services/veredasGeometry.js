/**
 * veredasGeometry.js — helpers puros de geometria para veredas de Colombia.
 *
 * Los mismos algoritmos viven en scripts/gen-veredas.mjs para el generador
 * del dataset particionado. Este modulo los expone sin dependencias de Node
 * para que el bundle cliente pueda resolver veredas on-demand.
 */

export function normalizeName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lng, lat, rings) {
  if (!rings || !rings.length) return false;
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(lng, lat, rings[h])) return false;
  }
  return true;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{type:string, coordinates:any}} geometry
 * @returns {boolean}
 */
export function pointInPolygon(lat, lng, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(lng, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInPolygonRings(lng, lat, poly));
  }
  return false;
}

/**
 * Resuelve que vereda contiene un punto. Si ninguna contiene el punto,
 * devuelve la vereda con el centroide mas cercano.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{nombre:string, centroid:{lat:number,lng:number}, geometry:object}>} veredas
 * @returns {{nombre:string, method:string}|null}
 */
export function resolveVereda(lat, lng, veredas) {
  if (!Array.isArray(veredas) || !veredas.length) return null;
  for (const v of veredas) {
    if (pointInPolygon(lat, lng, v.geometry)) {
      return { nombre: v.nombre, method: 'point-in-polygon' };
    }
  }
  let best = null;
  let bestD = Infinity;
  for (const v of veredas) {
    const c = v.centroid;
    if (!c || c.lat == null || c.lng == null) continue;
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best ? { nombre: best.nombre, method: 'nearest-centroid' } : null;
}

