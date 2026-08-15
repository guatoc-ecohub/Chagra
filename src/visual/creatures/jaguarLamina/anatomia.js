/**
 * jaguarLamina/anatomia — la anatomía MEDIDA de `jaguar-natural.png` (la
 * lámina real, Humboldt/Gemini, 705×394) contra el ESQUELETO real del rig
 * de `~/demos/3d/compai/rigs/jaguar.rig.svg` + `jaguar.css`.
 *
 * QUÉ ES ESTO. La orden del operador (rama `feat/jaguar-lamina-sobre-
 * esqueleto`): la PIEL tiene que ser la lámina exacta (nunca redibujada, ni
 * a mano ni a vector) y el ESQUELETO/movimiento tiene que salir del rig real
 * (`#cuerpoRig`, `#cabezaRig`, `.pataTras`, `#colaRig`, `.ojo` — y su
 * variante de perfil `#jaguarLado`/`#troncoLado`/`#cabezaLado`/`.pataLado`/
 * `#colaLado`, la única con pose de MARCHA). Como `jaguar-natural.png` es un
 * jaguar caminando de perfil (cabeza a la izquierda), el análogo correcto
 * del rig es `#jaguarLado` — el `#cuerpoRig` frontal no aplica a esta pose.
 * Ver `jaguarLamina.css` para el trasplante de los `@keyframes` reales.
 *
 * CÓMO SE MIDIÓ (honestidad del método — no ciencia exhaustiva): sobre
 * `jaguar-natural.png` (705×394, confirmado con `sharp().metadata()`), se
 * generaron recortes con grilla de coordenadas superpuesta (`_gate/
 * anatomia-jaguar/crops.mjs` y `crop-ojo.mjs`, no versionados) y se leyeron
 * los cortes A OJO sobre esa grilla — el mismo método (y la misma honestidad
 * sobre sus límites) que documenta `piloto-lamina.js`. Se verificó además
 * NUMÉRICAMENTE con un prototipo Node/`sharp` (`_gate/anatomia-jaguar/
 * anatomia.mjs` + `hornear.mjs` + `diff.mjs`, mismas fórmulas que `capas.js`)
 * que la recomposición de las 5 capas contra el original da **0% de píxeles
 * perdidos** (huecos) — la única garantía dura que se pudo obtener sin
 * browser/GPU. La calidad de la COSTURA (qué tan natural se ve el corte) NO
 * se verificó con ojo humano en vivo — eso queda para el gate GPU del
 * operador.
 *
 * LAS 4 PIEZAS RECORTADAS (más el cuerpo, que es el resto):
 *   - cabeza: corte CASI VERTICAL (la pose es de perfil, no frontal — por
 *     eso el eje no es horizontal como en los bustos de piloto-lamina.js),
 *     con una franja de mezcla + un desvanecido adicional por Y (la mandíbula
 *     no puede seguir "siendo cabeza" más abajo del cuello real).
 *   - patasDelanteras: las DOS patas delanteras se recortan como UNA sola
 *     pieza. Se intentó separarlas — en esta lámina las patas delantera y
 *     trasera-lejana están tan próximas y su límite de alfa es tan continuo
 *     que un corte propio entre ellas se veía como una fractura, no como una
 *     articulación (ver el reporte de la tarea). Rota como bloque desde el
 *     hombro: pierde la alternancia de zancada individual del rig, gana no
 *     partir el arte donde no hay borde real.
 *   - pataTrasera: la pata trasera CERCANA (la única con silueta separable
 *     con confianza; la trasera-lejana no se distingue del cuerpo/la cercana
 *     en el alfa de esta lámina — no se inventa un corte donde no hay señal).
 *   - cola: corte casi vertical en la base de la cola (arranca detrás de la
 *     grupa). Una sola pieza rígida — el rig separa cola/punta de cola en dos
 *     huesos (`colaLado`/`colaLadoPunta`); aquí solo se replica el hueso base
 *     (`colaLadoOndea`), ver jaguarLamina.css.
 *
 * Los pivotes (`pivote`) son puntos en coordenadas de PÍXEL DE LA LÁMINA
 * (0..ancho, 0..altoPx), el mismo espacio que usa `capas.js` para las
 * máscaras — el componente los convierte a % del stage para el
 * `transform-origin` CSS (igual que hacía `CompaiLamina.jsx`).
 *
 * @module visual/creatures/jaguarLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'jaguar-natural.png';
export const ANCHO = 705;
export const ALTO = 394;

/**
 * Corte cabeza/cuerpo: banda de mezcla proyectada sobre la recta
 * (px,py)+(nx,ny), MÁS un desvanecido por Y (la cabeza no puede extenderse
 * más abajo de la mandíbula real aunque la recta lo permita — sin este
 * segundo término, la pierna delantera —que cae del lado "cabeza" de la
 * recta en x pequeño— se leería como parte de la cabeza).
 */
export const CABEZA = {
  cuello: { px: 179, py: 130, nx: 0.947, ny: -0.322, u0: -25, u1: 25 },
  fadeMandibula: { y0: 230, y1: 270 },
  pivote: [215, 235],
};

/** El ojo visible (perfil/¾: el otro ojo, más lejano, no se midió — ver README de la tarea). */
export const OJO = { cx: 115, cy: 79, r: 22 };

/** Caja + banda de articulación (en Y) para un apéndice que cuelga del cuerpo. */
export const PATAS_DELANTERAS = {
  box: { x0: 145, x1: 300, xFade: 15 },
  joint: { y0: 228, y1: 258 },
  pivote: [220, 238],
};

export const PATA_TRASERA = {
  box: { x0: 455, x1: 590, xFade: 15 },
  joint: { y0: 233, y1: 260 },
  pivote: [505, 246],
};

/** Corte cuerpo/cola: banda casi vertical en la base de la cola. */
export const COLA = {
  cut: { px: 465, py: 190, nx: 1, ny: 0, u0: -20, u1: 20 },
  pivote: [465, 190],
};

/**
 * Pivote del CUERPO para el bob de tronco (`troncoLadoBob` — ver
 * jaguarLamina.css). El rig usa `transform-origin:50% 60%` DEL BBOX PROPIO
 * de `#troncoLado`; acá no hay un bbox de capa recortada tan preciso, así
 * que se aproxima con el centro de masa del torso (entre el hombro ~230 y
 * la cadera ~420, a la altura del vientre).
 */
export const CUERPO_PIVOTE = [330, 140];

export default {
  CARPETA_LAMINA, ARCHIVO_LAMINA, ANCHO, ALTO, CABEZA, OJO, PATAS_DELANTERAS, PATA_TRASERA, COLA, CUERPO_PIVOTE,
};
