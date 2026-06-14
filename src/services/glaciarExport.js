/**
 * glaciarExport — Servicio de exportación GeoJSON de reportes glaciares.
 *
 * Convierte reportes de puntos glaciares (db/glaciarReportes) a GeoJSON
 * FeatureCollection según RFC 7946 y permite descargarlos como archivo
 * .geojson para visualizarlos en herramientas GIS (QGIS, ArcGIS, Google
 * Earth, etc.). Todo offline-first: la descarga se arma en el cliente.
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

import { glaciarReportes } from '../db/glaciarReportes';

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

/**
 * Genera un GeoJSON con solo los reportes de un punto fijo (serie temporal del
 * retroceso de ese frente).
 *
 * @param {string} puntoId - ID del punto fijo
 * @returns {Promise<object>} FeatureCollection GeoJSON
 */
export async function toGeoJSONByPunto(puntoId) {
  const reportes = await glaciarReportes.getByPunto(puntoId);
  return toGeoJSON(reportes);
}

/**
 * Serializa un FeatureCollection y dispara su descarga como archivo .geojson.
 *
 * Helper interno reutilizado por las funciones públicas de descarga. En
 * entornos sin DOM (SSR/tests sin jsdom) no intenta tocar `document`; igual
 * devuelve el tamaño calculado para que el llamador dé feedback.
 *
 * @param {object} geoJSON - FeatureCollection a descargar
 * @param {string} filename - Nombre del archivo (.geojson)
 * @returns {{ filename: string, sizeBytes: number, featureCount: number }}
 */
function descargarGeoJSON(geoJSON, filename) {
  const jsonString = JSON.stringify(geoJSON, null, 2);
  const blob = new Blob([jsonString], { type: 'application/geo+json;charset=utf-8' });

  if (typeof document !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  return {
    filename,
    sizeBytes: blob.size,
    featureCount: geoJSON.features.length,
  };
}

/** Sello de fecha YYYY-MM-DD para el nombre del archivo exportado. */
function selloFecha() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Exporta TODOS los reportes guardados como archivo .geojson.
 *
 * Pensado para la pantalla de Historial: se exportan reportes ya guardados,
 * no un formulario en blanco.
 *
 * @returns {Promise<{ filename: string, sizeBytes: number, featureCount: number }>}
 * @throws {Error} si no hay reportes guardados.
 */
export async function downloadGeoJSON() {
  const reportes = await glaciarReportes.getAll();
  if (reportes.length === 0) {
    throw new Error('No hay reportes guardados para exportar.');
  }
  const geoJSON = toGeoJSON(reportes);
  if (geoJSON.features.length === 0) {
    throw new Error('Los reportes guardados no tienen coordenadas para exportar.');
  }
  return descargarGeoJSON(geoJSON, `glaciares-reportes-${selloFecha()}.geojson`);
}

/**
 * Exporta un único reporte como archivo .geojson.
 *
 * Pensado para el detalle del Historial: exportar el reporte que se está
 * viendo. El reporte debe tener coordenadas GPS.
 *
 * @param {object} reporte - Reporte a exportar.
 * @returns {{ filename: string, sizeBytes: number, featureCount: number }}
 * @throws {Error} si el reporte no tiene coordenadas válidas.
 */
export function downloadReporteGeoJSON(reporte) {
  const geoJSON = toGeoJSON(reporte ? [reporte] : []);
  if (geoJSON.features.length === 0) {
    throw new Error('Este reporte no tiene coordenadas para exportar.');
  }
  const sufijo = reporte?.puntoId || reporte?.id || selloFecha();
  return descargarGeoJSON(geoJSON, `glaciar-${sufijo}.geojson`);
}

/**
 * Exporta todos los reportes de un punto fijo como archivo .geojson.
 *
 * @param {string} puntoId - ID del punto fijo.
 * @returns {Promise<{ filename: string, sizeBytes: number, featureCount: number }>}
 * @throws {Error} si el punto no tiene reportes con coordenadas.
 */
export async function downloadGeoJSONByPunto(puntoId) {
  const reportes = await glaciarReportes.getByPunto(puntoId);
  const geoJSON = toGeoJSON(reportes);
  if (geoJSON.features.length === 0) {
    throw new Error(`No hay reportes con coordenadas para el punto ${puntoId}.`);
  }
  return descargarGeoJSON(geoJSON, `glaciar-${puntoId}-${selloFecha()}.geojson`);
}

export default toGeoJSON;
