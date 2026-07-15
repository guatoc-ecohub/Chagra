/*
 * cuaderno/ — EL CUADERNO VIVO en una sola puerta.
 *
 * La columna educativa de Chagra (observar → registrar → aprender) hecha
 * objeto: el cuaderno de finca que le devuelve al campesino su propia
 * tierra con claridad. DOM/SVG puro, cero three, cero fetch: seguro en el
 * bundle base.
 *
 *   import CuadernoVivo from './visual/cuaderno';
 *   <CuadernoVivo reducedMotion={reducedMotion} />
 *
 * Piezas sueltas (para componer en otras vistas):
 *
 *   import {
 *     PaginaCuaderno, EcoDelCuaderno, TresTemporadas, LaPaciencia,
 *     SubrayadoVivo, GlifoClima, GlifoMirada, HojaPrensada, HiloQueUne,
 *     TINTAS, PAPEL, tintaPorEdad, giroDePagina,
 *     MIRADAS, DEMO_CUADERNO,
 *   } from './visual/cuaderno';
 *
 * Cómo adoptar (reglas duras y antipatrones): ./GUIA.md — en especial la
 * regla de CERO gamificación, que no es opinión sino contrato.
 */
export { default as CuadernoVivo, default } from './CuadernoVivo.jsx';
export { default as PaginaCuaderno, EcoDelCuaderno } from './PaginaCuaderno.jsx';
export { default as TresTemporadas } from './TresTemporadas.jsx';
export { default as LaPaciencia } from './LaPaciencia.jsx';

export {
  SubrayadoVivo,
  GlifoClima,
  GlifoMirada,
  HojaPrensada,
  HiloQueUne,
  CLIMA_TIPOS,
  MIRADA_TIPOS,
} from './TrazoVivo.jsx';

export {
  PAPEL,
  TINTAS,
  ACENTO_CUADERNO,
  MANO_CUADERNO,
  tintaPorEdad,
  giroDePagina,
  mezclarHex,
} from './cuadernoTokens.js';

export {
  MIRADAS,
  PAGINAS,
  TEMPORADAS,
  LECCION_TEMPORADAS,
  PACIENCIA,
  DEMO_CUADERNO,
} from './cuadernoData.js';
