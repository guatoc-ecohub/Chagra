/**
 * geo.js — Serialización GeoJSON ↔ WKT para FarmOS `intrinsic_geometry`.
 *
 * FarmOS v2 persiste geometrías en `asset.attributes.intrinsic_geometry.value`
 * como strings WKT (Well-Known Text). Internamente manejamos GeoJSON por
 * ergonomía en JS y convertimos al momento de construir payloads JSON:API.
 *
 * Soporte actual:
 *   - Point            → "POINT(lon lat)"
 *   - Polygon          → "POLYGON((lon lat, lon lat, ...))"
 *   - MultiPolygon     → "MULTIPOLYGON(((...)),((...)))"
 *
 * Precisión: 7 decimales (≈ 1 cm) — más que suficiente para agricultura.
 */

const PRECISION = 7;

const fmt = (n) => Number.parseFloat(n).toFixed(PRECISION);

// GeoJSON coordenadas: [lon, lat]. WKT: "lon lat" (sin coma).
const coordToWkt = ([lon, lat]) => `${fmt(lon)} ${fmt(lat)}`;

const ringToWkt = (ring) => `(${ring.map(coordToWkt).join(', ')})`;

export const geoJsonToWkt = (geometry) => {
  if (!geometry || !geometry.type) return '';

  switch (geometry.type) {
    case 'Point':
      return `POINT(${coordToWkt(geometry.coordinates)})`;

    case 'Polygon': {
      // Polygon: coordinates es un array de rings (exterior + holes).
      // Un polígono cerrado repite el primer punto al final.
      const rings = geometry.coordinates.map(ringToWkt).join(', ');
      return `POLYGON(${rings})`;
    }

    case 'MultiPolygon': {
      const polygons = geometry.coordinates
        .map((poly) => `(${poly.map(ringToWkt).join(', ')})`)
        .join(', ');
      return `MULTIPOLYGON(${polygons})`;
    }

    default:
      console.warn('[geo] Tipo de geometría no soportado:', geometry.type);
      return '';
  }
};

// Cierra un ring abierto (añade el primer punto al final si falta).
export const closeRing = (ring) => {
  if (ring.length < 3) return ring;
  const [first] = ring;
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
};

// Construye una Feature GeoJSON desde coordenadas de Leaflet.
// Leaflet entrega LatLng: { lat, lng }. GeoJSON espera [lon, lat].
export const latLngToPoint = (latlng) => ({
  type: 'Point',
  coordinates: [latlng.lng, latlng.lat],
});

export const latLngsToPolygon = (latlngs) => {
  const ring = latlngs.map((ll) => [ll.lng, ll.lat]);
  return {
    type: 'Polygon',
    coordinates: [closeRing(ring)],
  };
};

// Parsea un WKT simple (POINT o POLYGON) de vuelta a GeoJSON para renderizar
// geometrías existentes que llegan del servidor.
export const wktToGeoJson = (wkt) => {
  if (!wkt || typeof wkt !== 'string') return null;
  const trimmed = wkt.trim().toUpperCase();

  const pointMatch = trimmed.match(/^POINT\s*\(([-\d.\s]+)\)$/);
  if (pointMatch) {
    const [lon, lat] = pointMatch[1].trim().split(/\s+/).map(Number);
    return { type: 'Point', coordinates: [lon, lat] };
  }

  const polyMatch = trimmed.match(/^POLYGON\s*\(\((.+)\)\)$/);
  if (polyMatch) {
    const ring = polyMatch[1]
      .split(',')
      .map((pair) => pair.trim().split(/\s+/).map(Number));
    return { type: 'Polygon', coordinates: [ring] };
  }

  return null;
};
