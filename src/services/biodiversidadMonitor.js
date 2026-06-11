import BIO from '../data/biodiversidad-indicadores.json';

export function checklistBiodiversidad() {
  return BIO.indicadores.map((ind) => ({
    nombre: ind.nombre,
    como_se_hace: ind.como_se_hace,
    umbral: ind.umbral,
    confiabilidad: ind.confiabilidad,
  }));
}
