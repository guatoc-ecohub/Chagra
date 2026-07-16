/*
 * paleta/ — el SISTEMA VISUAL MADRE de Chagra en una sola puerta.
 *
 * Un mundo nuevo importa de aquí y ya habla el idioma de la casa:
 *
 *   import {
 *     VERDES, TIERRAS, CORTEZAS, AGUAS, NIEBLAS, LUCES, ACENTOS, NEUTROS,
 *     crearMaterialMadre, crearMaterialVertexColors,
 *     LuzMadre, LUZ_MADRE,
 *     ATMOSFERA, CIELOS, PALETA, BLOOM, mezclar, mezclarCielo,
 *   } from '../paleta';
 *
 * Cómo adoptar (el detalle y los antipatrones): ./GUIA.md
 *
 * El BLOOM sutil del tier alto NO se importa de aquí: es un chunk lazy
 * (escenas/BloomSutil.jsx) que solo EscenaBase3D monta con
 * `tier === 'alto' && !reducedMotion` — medio y bajo ni lo descargan.
 * Aquí solo viaja su receta (BLOOM, de atmosferaMadre).
 */
export {
  /* atmósfera (re-export de atmosferaMadre: la ley no se duplica) */
  ATMOSFERA,
  CIELOS,
  PALETA,
  BLOOM,
  mezclar,
  mezclarCielo,
  /* la paleta madre andina */
  VERDES,
  EJE_TERMICO,
  TIERRAS,
  CORTEZAS,
  AGUAS,
  NIEBLAS,
  LUCES,
  ACENTOS,
  CASA,
  NEUTROS,
} from './paletaMadre.js';

export {
  RECETAS,
  crearMaterialMadre,
  crearMaterialVertexColors,
} from './materialesMadre.js';

export { default as LuzMadre, LUZ_MADRE } from './LuzMadre.jsx';
