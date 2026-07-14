/*
 * transiciones — el lenguaje de transición Odyssey entre mundos de Chagra.
 *
 * Barrel DOM-SAFE: nada de aquí importa three. La mitad 3D (la cámara del
 * cruce) se importa DIRECTO desde su archivo para quedar en el chunk
 * vendor-three del host que la use:
 *
 *   import { CamaraCruce, poseDesdeArrays } from './transiciones/CamaraCruce.jsx';
 *
 * Piezas:
 *   · VeloOdyssey    — el velo/cortina con identidad andina por destino;
 *   · useCruceMundo  — la máquina de estados del viaje (entrar/volver/swap);
 *   · velosData      — datos y reloj puros (velos, duraciones, curvaCruce).
 */
export { default as VeloOdyssey } from './VeloOdyssey.jsx';
export { useCruceMundo } from './useCruceMundo.js';
export {
  VELOS,
  VELO_IDS,
  familiaDeVelo,
  veloDeDestino,
  duracionCruce,
  momentoCubierto,
  curvaCruce,
  ANTICIPACION_FRAC,
  CUBIERTO_FRAC,
  REDUCIDA_MS,
  FACTOR_TIER_BAJO,
  EASE_LANZA,
  EASE_DESCUBRE,
  EASE_REGRESA,
} from './velosData.js';
