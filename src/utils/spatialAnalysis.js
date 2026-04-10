/**
 * spatialAnalysis.js — Utilidades de análisis espacial offline (Fase 19).
 *
 * Funciones de distancia, proximity check, y vinculación automática de
 * activos huérfanos a la zona (asset--land) más cercana.
 */

import { wktToGeoJson } from './geo';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Distancia Haversine entre dos puntos [lon, lat] en metros.
 */
export const haversineDistance = ([lon1, lat1], [lon2, lat2]) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/**
 * Extrae coordenadas [lon, lat] de un GeoJSON Point o del centroide de un Polygon.
 * Retorna null si no se puede resolver.
 */
export const getCoords = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] || [];
    if (ring.length === 0) return null;
    const sum = ring.reduce(([sLon, sLat], [lon, lat]) => [sLon + lon, sLat + lat], [0, 0]);
    return [sum[0] / ring.length, sum[1] / ring.length];
  }
  return null;
};

/**
 * Verifica la distancia entre la posición GPS del dispositivo y una geometría.
 * Retorna { distance: number (metros), isClose: boolean }.
 *
 * @param {GeolocationPosition} gpsPosition — navigator.geolocation result
 * @param {object} geometry — GeoJSON
 * @param {number} threshold — umbral en metros (default 50)
 */
export const proximityCheck = (gpsPosition, geometry, threshold = 50) => {
  const deviceCoords = [gpsPosition.coords.longitude, gpsPosition.coords.latitude];
  const targetCoords = getCoords(geometry);
  if (!targetCoords) return { distance: Infinity, isClose: false };
  const distance = haversineDistance(deviceCoords, targetCoords);
  return { distance: Math.round(distance), isClose: distance <= threshold };
};

/**
 * Busca la zona (asset--land) más cercana a un punto dado.
 *
 * @param {string} pointWkt — WKT del punto (ej. "POINT(-73.9247 4.5306)")
 * @param {Array} lands — array de assets con attributes.intrinsic_geometry
 * @returns {{ land: object, distance: number } | null}
 */
export const findNearestLand = (pointWkt, lands) => {
  const pointGeo = wktToGeoJson(pointWkt);
  if (!pointGeo) return null;
  const ptCoords = getCoords(pointGeo);
  if (!ptCoords) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const land of lands) {
    const rawGeo = land.attributes?.intrinsic_geometry;
    const landWkt = typeof rawGeo === 'object' ? rawGeo?.value : rawGeo;
    if (!landWkt) continue;
    const landGeo = wktToGeoJson(landWkt);
    const landCoords = getCoords(landGeo);
    if (!landCoords) continue;

    const dist = haversineDistance(ptCoords, landCoords);
    if (dist < minDist) {
      minDist = dist;
      nearest = land;
    }
  }

  return nearest ? { land: nearest, distance: Math.round(minDist) } : null;
};

/**
 * Chequeo de especie invasora: busca activos cercanos cuyo nombre
 * contenga alguna keyword de alerta (Thunbergia, Ojo de Poeta, etc.).
 *
 * @param {Array<number>} coords — [lon, lat] de la ubicación marcada
 * @param {Array} allPlants — array de assets--plant
 * @param {number} radius — umbral en metros (default 10)
 * @returns {Array<{asset, distance}>}
 */
const INVASIVE_KEYWORDS = ['thunbergia', 'ojo de poeta', 'retamo', 'ulex'];

export const checkInvasiveProximity = (coords, allPlants, radius = 10) => {
  const alerts = [];
  for (const plant of allPlants) {
    const name = (plant.attributes?.name || plant.name || '').toLowerCase();
    const isInvasive = INVASIVE_KEYWORDS.some((kw) => name.includes(kw));
    if (!isInvasive) continue;

    const rawGeo = plant.attributes?.intrinsic_geometry;
    const plantWkt = typeof rawGeo === 'object' ? rawGeo?.value : rawGeo;
    if (!plantWkt) continue;
    const plantGeo = wktToGeoJson(plantWkt);
    const plantCoords = getCoords(plantGeo);
    if (!plantCoords) continue;

    const dist = haversineDistance(coords, plantCoords);
    if (dist <= radius) {
      alerts.push({ asset: plant, distance: Math.round(dist) });
    }
  }
  return alerts;
};
