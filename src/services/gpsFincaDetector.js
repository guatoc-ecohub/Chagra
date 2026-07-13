/**
 * gpsFincaDetector.js — detecta la finca más cercana a la ubicación GPS del operador.
 *
 * Implementa 062.1 + 062.2 del roadmap multi-finca GPS context-aware
 * (queue/062-gps-context-aware-multi-finca.md).
 *
 * Privacy (D4): GPS coords NUNCA se sincronizan a server. Solo se usan
 * client-side para lookup contra fincas-publicas.json. La función NO loguea
 * ni persiste la posición, solo retorna la finca matched.
 *
 * Edge cases (D5-D7 del queue):
 * - Sin permiso GPS → retorna null + reason='permission_denied'
 * - GPS falla / timeout → retorna null + reason='gps_error'
 * - Operador fuera de cualquier finca → retorna null + reason='out_of_range'
 * - 2 fincas equidistantes → la más cercana (resolverá deterministicamente).
 *
 * Tolerancias por default conservadoras (5 km radio finca). Operador puede
 * ajustar via `options.maxDistanceKm` si tiene fincas grandes.
 */

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_DISTANCE_KM = 5; // radio inclusivo: una finca de 50 hectáreas tiene ~700m de extensión, 5km es muy holgado
const DEFAULT_GPS_TIMEOUT_MS = 10000;

/**
 * Calcula distancia Haversine entre 2 puntos (lat, lng) en km.
 *
 * @param {[number, number]} coord1 - [lat, lng]
 * @param {[number, number]} coord2 - [lat, lng]
 * @returns {number} distancia en km
 */
export function distanceKm(coord1, coord2) {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Obtiene la posición GPS actual del navegador.
 *
 * @param {Object} options
 * @param {number} [options.timeout] - ms, default 10000
 * @param {boolean} [options.highAccuracy] - default true
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 * @throws {Error} si permiso denegado o timeout
 */
export function getCurrentPosition({ timeout = DEFAULT_GPS_TIMEOUT_MS, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation_unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        const reasons = {
          1: 'permission_denied',
          2: 'position_unavailable',
          3: 'timeout',
        };
        reject(new Error(reasons[err.code] || `gps_error_${err.code}`));
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 60000 },
    );
  });
}

/**
 * Detecta cuál finca está más cerca de la posición GPS actual.
 *
 * Pipeline:
 * 1. Obtener GPS → lat, lng, accuracy
 * 2. Para cada finca en `fincas`, calcular distancia Haversine
 * 3. Si la más cercana está dentro de `maxDistanceKm` → match
 * 4. Si no → null (operator está fuera de cualquier finca conocida)
 *
 * @param {Array<{slug: string, coords: [number, number]}>} fincas - registry desde fincas-publicas.json
 * @param {Object} [options]
 * @param {number} [options.maxDistanceKm] - radio máximo para considerar match (default 5)
 * @param {number} [options.timeout] - GPS timeout ms (default 10000)
 * @returns {Promise<{finca: Object|null, distanceKm: number|null, accuracy: number|null, reason: string|null}>}
 *
 * @example
 *   const fincas = await fetch('/fincas-publicas.json').then(r => r.json());
 *   const result = await detectFincaByGps(fincas);
 *   if (result.finca) {
 *     console.log(`Estás en ${result.finca.nombre} (${result.distanceKm.toFixed(2)} km)`);
 *   } else {
 *     console.log(`Out: ${result.reason}`);
 *   }
 */
export async function detectFincaByGps(fincas, { maxDistanceKm = DEFAULT_MAX_DISTANCE_KM, timeout } = {}) {
  if (!Array.isArray(fincas) || fincas.length === 0) {
    return { finca: null, distanceKm: null, accuracy: null, reason: 'no_fincas' };
  }

  let position;
  try {
    position = await getCurrentPosition({ timeout });
  } catch (err) {
    return { finca: null, distanceKm: null, accuracy: null, reason: err.message };
  }

  const myCoord = [position.lat, position.lng];
  let closest = null;
  let closestDistance = Infinity;
  for (const finca of fincas) {
    if (!Array.isArray(finca.coords) || finca.coords.length !== 2) continue;
    // @ts-expect-error finca.coords is runtime-validated as [number,number]
    const d = distanceKm(myCoord, finca.coords);
    if (d < closestDistance) {
      closestDistance = d;
      closest = finca;
    }
  }

  if (!closest) {
    return { finca: null, distanceKm: null, accuracy: position.accuracy, reason: 'no_valid_finca_coords' };
  }

  if (closestDistance > maxDistanceKm) {
    return {
      finca: null,
      distanceKm: closestDistance,
      accuracy: position.accuracy,
      reason: 'out_of_range',
    };
  }

  return {
    finca: closest,
    distanceKm: closestDistance,
    accuracy: position.accuracy,
    reason: null,
  };
}

export default {
  distanceKm,
  getCurrentPosition,
  detectFincaByGps,
};
