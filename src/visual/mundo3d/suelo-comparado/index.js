/*
 * suelo-comparado/ — EL MISMO SUELO, DOS VECES: la red micorrízica encendida y
 * la red apagada bajo fumigación repetida.
 *
 * El argumento contra el glifosato que NO es moral y por eso funciona: no le
 * decimos al campesino que es mala persona (no le sirve, y además el químico es
 * barato y sirve). Le mostramos que le está apagando el suelo que le da de
 * comer, y que un suelo apagado lo vuelve dependiente del bulto.
 *
 *   import EscenaSueloComparado from '../suelo-comparado';
 *   <EscenaSueloComparado tier="medio" reducedMotion={false} />
 *
 * Monta dentro de un host que provea altura. Importa three → siempre perezoso.
 *
 * ── ANTES DE TOCAR ESTO, LEA ESTO ─────────────────────────────────────────
 * La pieza tiene reglas duras de honestidad, y no son decoración: son la razón
 * por la que le creen. Están largas en `sueloComparado.geom.js` (cabecera) y en
 * `sueloComparadoTextos.js`. El resumen:
 *
 *   1. NADA de cáncer ni salud humana. Esto va del SUELO, donde la evidencia es
 *      clara y el argumento es del propio bolsillo del campesino. La salud
 *      humana está en disputa real y una disputa no se dibuja como hecho.
 *   2. NADA de quelación, manganeso, AMPA ni "resistencia de malezas": CERO
 *      hits en el corpus (verificado por grep sobre los 20 .jsonl). No están →
 *      no se dicen. Lo que sí está —y es mejor argumento— es que la micorriza
 *      DESPEGA el fósforo del hierro y la arcilla: matás la red y el fósforo
 *      sigue ahí, quieto, sin que la mata lo alcance. Ahí está la trampa.
 *   3. LA MATA NO SE MUERE. Se dibuja viva y verde de los dos lados, porque en
 *      la finca está viva y verde. Ese es el problema, y esa honestidad es lo
 *      que nos da permiso para todo lo demás.
 *   4. Ni calaveras, ni rojo de alarma, ni panfleto. El lado apagado no es
 *      horror: es silencio.
 *   5. La concesión de la voz del corpus ("un uso puntual y focalizado puede ser
 *      la única salida... lo que no hacemos es recetarlo como rutina de
 *      calendario") SE QUEDA. Un arte que no concede nada no lo creen.
 *
 * Fuentes: `Chagra-strategy/ops/corpus-maestros/teacher-micorrizas.jsonl` y
 * `dpo-frontera-agroecologica.jsonl` (las 7 entradas de glifosato; ojo que las
 * cifras de dosis viven en el campo `rejected` — son la voz que el corpus
 * RECHAZA, nunca la nuestra). Cada afirmación de la pieza lleva su cita.
 */
export { default } from './EscenaSueloComparado.jsx';
export { default as EscenaSueloComparado, FRENTE } from './EscenaSueloComparado.jsx';

/* la geometría pura (headless, testeable: cero GL, cero azar por frame) */
export {
  PALETA,
  SUELO,
  LADOS,
  PARAMS_TIER,
  VELOCIDAD,
  paramsDeTier,
  saludEn,
  avanzarFrente,
  rng,
  sistemaRaices,
  nodosLibres,
  construirRed,
  curvaHilo,
  geometriaRed,
  geometriaRaices,
  tuboRaizGeom,
  raicillasFinas,
  pulsosDeRed,
  colorPulso,
  fosforoPegado,
  lombricesYTuneles,
  agregados,
  porosAgua,
  bancoEsporas,
  hojarascaSuperficie,
} from './sueloComparado.geom.js';

/* la voz (con la fuente de cada frase pegada al lado) */
export {
  TITULO,
  LADOS as TEXTO_LADOS,
  HOTSPOTS,
  CIERRE,
  CONCESION,
  CADENCIAS,
  CONTROL,
  hotspotsDe,
} from './sueloComparadoTextos.js';
