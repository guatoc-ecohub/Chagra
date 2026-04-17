/**
 * spatialAnalysis.ts — Utilidades de análisis espacial offline (Fase 19).
 *
 * Funciones de distancia, proximity check, y vinculación automática de
 * activos huérfanos a la zona (asset--land) más cercana.
 */

import { wktToGeoJson, type Coord, type Geometry } from './geo';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Distancia Haversine entre dos puntos [lon, lat] en metros.
 */
export const haversineDistance = ([lon1, lat1]: Coord, [lon2, lat2]: Coord): number => {
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
export const getCoords = (geometry: Geometry | null | undefined): Coord | null => {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] || [];
    if (ring.length === 0) return null;
    const sum = ring.reduce<Coord>(
      ([sLon, sLat], [lon, lat]) => [sLon + lon, sLat + lat],
      [0, 0]
    );
    return [sum[0] / ring.length, sum[1] / ring.length];
  }
  return null;
};

export interface ProximityResult {
  distance: number;
  isClose: boolean;
}

/**
 * Verifica la distancia entre la posición GPS del dispositivo y una geometría.
 */
export const proximityCheck = (
  gpsPosition: GeolocationPosition,
  geometry: Geometry | null | undefined,
  threshold = 50
): ProximityResult => {
  const deviceCoords: Coord = [gpsPosition.coords.longitude, gpsPosition.coords.latitude];
  const targetCoords = getCoords(geometry);
  if (!targetCoords) return { distance: Infinity, isClose: false };
  const distance = haversineDistance(deviceCoords, targetCoords);
  return { distance: Math.round(distance), isClose: distance <= threshold };
};

interface LandLike {
  attributes?: {
    intrinsic_geometry?: { value?: string } | string | null;
  };
  [key: string]: unknown;
}

/**
 * Busca la zona (asset--land) más cercana a un punto dado.
 */
export const findNearestLand = (
  pointWkt: string,
  lands: LandLike[]
): { land: LandLike; distance: number } | null => {
  const pointGeo = wktToGeoJson(pointWkt);
  if (!pointGeo) return null;
  const ptCoords = getCoords(pointGeo);
  if (!ptCoords) return null;

  let nearest: LandLike | null = null;
  let minDist = Infinity;

  for (const land of lands) {
    const rawGeo = land.attributes?.intrinsic_geometry;
    const landWkt =
      typeof rawGeo === 'object' && rawGeo !== null ? rawGeo?.value : (rawGeo as string | undefined);
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

interface PlantLike {
  name?: string;
  attributes?: {
    name?: string;
    intrinsic_geometry?: { value?: string } | string | null;
  };
  [key: string]: unknown;
}

/**
 * Chequeo de especie invasora: busca activos cercanos cuyo nombre
 * contenga alguna keyword de alerta (Thunbergia, Ojo de Poeta, etc.).
 */
const INVASIVE_KEYWORDS = ['thunbergia', 'ojo de poeta', 'retamo', 'ulex'];

export const checkInvasiveProximity = (
  coords: Coord,
  allPlants: PlantLike[],
  radius = 10
): Array<{ asset: PlantLike; distance: number }> => {
  const alerts: Array<{ asset: PlantLike; distance: number }> = [];
  for (const plant of allPlants) {
    const name = (plant.attributes?.name || plant.name || '').toLowerCase();
    const isInvasive = INVASIVE_KEYWORDS.some((kw) => name.includes(kw));
    if (!isInvasive) continue;

    const rawGeo = plant.attributes?.intrinsic_geometry;
    const plantWkt =
      typeof rawGeo === 'object' && rawGeo !== null ? rawGeo?.value : (rawGeo as string | undefined);
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
