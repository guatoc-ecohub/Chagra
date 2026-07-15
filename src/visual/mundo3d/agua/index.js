/*
 * agua/ — EL CICLO DEL AGUA EN LA FINCA, de la nube a la nube.
 *
 * Una microcuenca cortada como un barranco: la misma loma, bajo la misma nube,
 * tratada de dos maneras. A la izquierda el suelo vivo se traga el aguacero y lo
 * devuelve limpio por el nacimiento todo el verano; a la derecha el suelo pelado
 * lo bota de una, con la loma adentro. El contraste ES la lección.
 *
 * Tres capas, cada una consumible sola:
 *   - cicloAgua.geom   → el terreno, los horizontes, el freático y el MODELO
 *                        HIDROLÓGICO (`cicloAguacero`, `frentes`) en funciones
 *                        puras three-free-de-JSX: corre headless, se testea.
 *   - piezasAgua       → las piezas r3f (frailejón, briznas, matorral, tanque,
 *                        cerca, surcos). Sin árboles, a propósito.
 *   - EscenaCicloAgua  → EL mundo: monta el bloque, el agua viva y el cielo
 *                        (que le presta `atmosfera/`, no lo duplica).
 *   - DemoCicloAgua    → viñeta aislada de QA/arte (no cableada a rutas): para
 *                        parar el aguacero en un instante y comparar.
 *
 * Importa three → montar SIEMPRE perezoso.
 */
export { default as EscenaCicloAgua } from './EscenaCicloAgua.jsx';
export { default as DemoCicloAgua } from './DemoCicloAgua.jsx';
export {
  Frailejonal,
  Briznas,
  Matorral,
  Nube,
  CasaTanque,
  CercaRonda,
  Hoyos,
  SurcosContorno,
  Zanja,
  LineaGoteo,
} from './piezasAgua.jsx';
export {
  PAL,
  VALLE,
  NACIMIENTO,
  BOCA_SECA,
  MOMENTO_QUIETO,
  PARAMS_TIER,
  paramsDeTier,
  alturaValle,
  esViva,
  uDeX,
  xDeU,
  espesores,
  columnaCorte,
  freatico,
  cicloAguacero,
  frentes,
} from './cicloAgua.geom.js';
