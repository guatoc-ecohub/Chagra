import BIO from '../data/biodiversidad-indicadores.json';

/**
 * Retorna lista de indicadores de biodiversidad del JSON de datos.
 * @returns {Array<{nombre: string, como_se_hace: string, umbral: string, confiabilidad: string}>}
 */
export function checklistBiodiversidad() {
  return BIO.indicadores.map((ind) => ({
    nombre: ind.nombre,
    como_se_hace: ind.como_se_hace,
    umbral: ind.umbral,
    confiabilidad: ind.confiabilidad,
  }));
}
