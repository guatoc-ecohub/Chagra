/**
 * glaciarExport — Servicio de exportación GeoJSON de reportes glaciares.
 *
 * Convierte reportes de puntos glaciares (db/glaciarReportes) a GeoJSON
 * FeatureCollection según RFC 7946.
 *
 * Especificaciones:
 *   - Tipo: "FeatureCollection"
 *   - Features: array, cada reporte = Feature Point
 *   - Coordenadas: [lng, lat] ORDEN LON-LAT (NUNCA lat-lon)
 *   - Properties: { puntoId, montana, guia, fechaISO, altitud, dureza, tipoSuperficie, estado, distanciaBordeHieloM }
 *   - SIN miembro "crs" (WGS 84 implícito por defecto en RFC 7946)
 *
 * @module services/glaciarExport
 */

/**
 * Convierte un array de reportes glaciares a GeoJSON FeatureCollection.
 *
 * @param {Array<object>} reportes - Array de reportes desde db/glaciarReportes
 * @returns {object} GeoJSON FeatureCollection según RFC 7946
 */
export function toGeoJSON(reportes) {
  // Tolerar inputs no-array (undefined/null) → array vacío
  const reportesArray = Array.isArray(reportes) ? reportes : [];

  // Filtrar reportes sin coordenadas válidas
  const reportesConCoords = reportesArray.filter(
    (r) => r.lat != null && r.lng != null && !isNaN(r.lat) && !isNaN(r.lng)
  );

  // Crear Features
  const features = reportesConCoords.map((reporte) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [reporte.lng, reporte.lat], // ORDEN LON-LAT
    },
    properties: {
      puntoId: reporte.puntoId || null,
      montana: reporte.montana || null,
      guia: reporte.guia || null,
      fechaISO: reporte.fechaISO || null,
      altitud: reporte.altitud != null ? reporte.altitud : null,
      dureza: reporte.dureza || null,
      tipoSuperficie: reporte.tipoSuperficie || null,
      estado: reporte.estado || null,
      distanciaBordeHieloM: reporte.distanciaBordeHieloM != null ? reporte.distanciaBordeHieloM : null,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export default toGeoJSON;