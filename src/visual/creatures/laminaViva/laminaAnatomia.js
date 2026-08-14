/**
 * laminaAnatomia — la anatomía MEDIDA de cada lámina real del compAI.
 *
 * SPEC del operador (feat/compai-laminas-en-movimiento): la apariencia de
 * cada compAI tiene que ser la lámina EXACTA de `~/demos/3d/compai/laminas/`
 * (arte Humboldt, hecho con Gemini) — nunca redibujada, ni a mano ni a
 * vector. La técnica que autoriza a MOVER esa lámina sin redibujarla es la
 * de `~/demos/3d/juegos/chagra-kart/js/piloto-lamina.js` («piloto-lámina»):
 * recortar el PNG en capas por ALFA (cuerpo / cabeza) más un parche de piel
 * propia para el párpado, y animar esas capas — nunca pintar un píxel nuevo.
 *
 * QUÉ CAMBIA respecto a piloto-lamina.js (documentado para quien compare):
 *   1. El corte de cuello ahí es SOLO horizontal (`cuello:[cA,cB]`, un rango
 *      de Y) porque sus 8 laminas son bustos verticales de cámara frontal.
 *      Estas 6 laminas incluyen un jaguar en PERFIL CAMINANDO (cabeza a la
 *      izquierda, cuerpo horizontal) y una abeja en pose diagonal — un corte
 *      solo-Y no les sirve. Aquí el corte es una BANDA A LO LARGO DE UNA
 *      RECTA cualquiera: `cuello:{px,py,nx,ny,u0,u1}` — proyección de cada
 *      píxel sobre la recta (px,py)+(nx,ny) normal, banda de transición
 *      [u0,u1]. Con nx=0,ny=1 es EXACTAMENTE el caso horizontal original
 *      (oso/zariguya/luciérnaga/chivito, todos bustos frontales); jaguar y
 *      angelita usan una recta inclinada. La fórmula de máscara es la MISMA
 *      (`1 - smoothstep(u0,u1,u)`, ver laminaCapas.js) — se generalizó el eje,
 *      no el método.
 *   2. El párpado NO viene de un rectángulo de "frente" elegido a mano y
 *      compartido entre los dos ojos (como el jaguar de piloto-lamina.js,
 *      que tiene una frente lisa central perfecta para eso). Estas 6 laminas
 *      tienen máscaras faciales, plumaje o quitina que cambian de un lado al
 *      otro de la cara — un solo rectángulo compartido no calza en todas. En
 *      su lugar, CADA ojo roba el parche que tiene ENCIMA DE SÍ MISMO (misma
 *      idea del operador — "pelo/piel propia del animal", solo que la fuente
 *      es local a cada ojo en vez de una frente única) — sigue siendo 100%
 *      píxeles propios, cero dibujo nuevo; ver `laminaCapas.js` función
 *      `parcheParpado()`.
 *   3. No se midió brazo/anca (sin `capas.brazo` — igual que piloto-lamina.js
 *      hoy: su propio archivo documenta que esa parte NUNCA se pobló con
 *      números reales, ver `_gate/anatomia-lamina/` en el repo del valle,
 *      solo bbox grueso). El alcance mínimo obligado por el SPEC es
 *      ojos+cabeza+respiración — eso es lo que se mide y se cablea.
 *
 * CÓMO SE MIDIÓ (honestidad del método, no ciencia exhaustiva): dimensiones
 * reales vía `identify` (imagemagick) — OJO: `angelita.png` y `oso.png` se
 * regeneraron después de que piloto-lamina.js fijara sus números (434×319 y
 * 615×630 reales, contra 414×493 y 611×629 en ese archivo — NO se copiaron
 * los viejos). cuello/ojos/pivCuello se leyeron A OJO sobre la lámina y sobre
 * recortes de verificación de la zona de cabeza (Read tool, visión), sin una
 * segunda pasada de afinado por binary-search — son coordenadas RAZONABLES,
 * no medidas exhaustivas píxel-a-píxel. Si al verificar con GPU un párpado o
 * el corte de cuello se ve desplazado, el arreglo es ajustar estos números,
 * NUNCA redibujar la máscara a mano.
 *
 * @module visual/creatures/laminaViva/laminaAnatomia
 */

/** Carpeta pública donde viven las 6 láminas reales (copiadas verbatim). */
export const CARPETA_LAMINAS = '/compai/laminas/';

/**
 * @typedef {Object} Ojo
 * @property {number} cx
 * @property {number} cy
 * @property {number} r
 */

/**
 * @typedef {Object} Cuello
 * @property {number} px  punto de la recta de corte
 * @property {number} py
 * @property {number} nx  normal UNITARIA (dirección en la que crece "hacia el cuerpo")
 * @property {number} ny
 * @property {number} u0  proyección donde empieza la mezcla (mCabeza=1 antes)
 * @property {number} u1  proyección donde termina la mezcla (mCabeza=0 después)
 */

/**
 * El elenco de 6 compAI con lámina real medida. Slugs = los de
 * `compai/nucleo/elenco.js` (ELENCO), así `CompaiLamina` recibe `tipo` con
 * el mismo vocabulario que el resto de la app. `guacamaya` NO está: no existe
 * lámina PNG suya en `~/demos/3d/compai/laminas/` (solo el rig vectorial F24
 * — ver README del módulo). No se fabrica arte para completar el 7º.
 */
export const LAMINA_ANATOMIA = {
  angelita: {
    archivo: 'angelita.png',
    ancho: 434,
    altoPx: 319,
    // Pose diagonal (cabeza arriba-izquierda, abdomen redondo a la derecha):
    // corte casi-vertical con leve inclinación, NO horizontal.
    cuello: { px: 152, py: 105, nx: 0.97, ny: -0.24, u0: -22, u1: 24 },
    ojos: [{ cx: 57, cy: 96, r: 42 }],
    pivCuello: [150, 130],
  },
  jaguar: {
    archivo: 'jaguar.png',
    ancho: 705,
    altoPx: 394,
    // Perfil caminando (cabeza a la izquierda, cuerpo horizontal a la
    // derecha): corte casi-vertical, inclinado con el cuello.
    cuello: { px: 168, py: 130, nx: 0.99, ny: -0.15, u0: -26, u1: 26 },
    ojos: [{ cx: 60, cy: 78, r: 23 }],
    pivCuello: [168, 150],
  },
  'oso-baston': {
    archivo: 'oso-baston.png',
    ancho: 615,
    altoPx: 630,
    // Busto vertical de cara — corte horizontal, como el caso original.
    cuello: { px: 271, py: 195, nx: 0, ny: 1, u0: -26, u1: 26 },
    ojos: [
      { cx: 226, cy: 90, r: 22 },
      { cx: 317, cy: 88, r: 22 },
    ],
    pivCuello: [271, 195],
  },
  zariguya: {
    archivo: 'zariguya.png',
    ancho: 481,
    altoPx: 444,
    cuello: { px: 201, py: 165, nx: 0, ny: 1, u0: -20, u1: 20 },
    ojos: [
      { cx: 152, cy: 96, r: 25 },
      { cx: 250, cy: 90, r: 24 },
    ],
    pivCuello: [201, 165],
  },
  luciernaga: {
    archivo: 'luciernaga.png',
    ancho: 367,
    altoPx: 507,
    cuello: { px: 183, py: 200, nx: 0, ny: 1, u0: -20, u1: 20 },
    ojos: [
      { cx: 150, cy: 132, r: 18 },
      { cx: 215, cy: 130, r: 18 },
    ],
    pivCuello: [183, 200],
  },
  'chivito-punk': {
    archivo: 'chivito-punk.png',
    ancho: 397,
    altoPx: 654,
    cuello: { px: 222, py: 310, nx: 0, ny: 1, u0: -25, u1: 25 },
    ojos: [
      { cx: 177, cy: 217, r: 27 },
      { cx: 267, cy: 215, r: 27 },
    ],
    pivCuello: [222, 310],
  },
};

/** ¿Este slug del elenco tiene lámina real medida? */
export function tieneLaminaViva(tipo) {
  return !!LAMINA_ANATOMIA[tipo];
}

export default { CARPETA_LAMINAS, LAMINA_ANATOMIA, tieneLaminaViva };
