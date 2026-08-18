/**
 * osoLamina/anatomia — la anatomía MEDIDA de `oso.png` (la lámina real
 * aprobada del oso del bastón, 615×630: el caminante ERGUIDO sobre su roca,
 * brazo en jarra, la zarpa derecha empuñando el bastón coronado de frailejón
 * y orquídeas) para el corte por alfa de `capas.js` — el MISMO método del
 * jaguar (`jaguarLamina/anatomia.js`): la piel es la lámina exacta, nunca
 * redibujada; aquí solo viven los CORTES y PIVOTES medidos.
 *
 * CÓMO SE MIDIÓ (honestidad del método — no ciencia exhaustiva): sobre
 * `oso.png` (615×630, confirmado con `sharp().metadata()`) se generaron
 * recortes con grilla de coordenadas superpuesta (`_gate/oso-lamina-viva/
 * medir.mjs`, no versionado) y zooms 2×-6× de cabeza/ojos/boca/bastón, y se
 * leyeron los cortes A OJO sobre esa grilla — el mismo método (y la misma
 * honestidad sobre sus límites) que documentan `piloto-lamina.js` y el
 * jaguar. La recomposición de capas contra el original se verificó
 * NUMÉRICAMENTE offline (0% de píxeles perdidos, ver `capas.js` y el
 * reporte de la rama).
 *
 * DIFERENCIAS HONESTAS CON EL JAGUAR (la pose manda, no la receta):
 *   - POSE ERGUIDA ¾: el cuello NO es una recta (el jaguar de perfil sí lo
 *     permitía) — es una POLILÍNEA medida (hombro izq alto → mentón bajo →
 *     hombro der) que `capas.js` interpola. Mismo espíritu, geometría real.
 *   - UN SOLO OJO VISIBLE: la testa va girada ¾ a la derecha y el ojo lejano
 *     NO está en la lámina (verificado con zoom 6× — solo mechones de la
 *     bezuda blanca). Un párpado, no dos: parpadear con el único ojo en
 *     cuadro ES la anatomía de esta pose, no un guiño.
 *   - SIN COLA NI PATAS SUELTAS: el oso está PLANTADO en su roca (los pies y
 *     la roca son cuerpo — separarlos no tiene señal de alfa ni sentido de
 *     rig). El contrapeso vivo del oso es su firma: LA CORONA del bastón
 *     (frailejón + flor) cabecea desde su base — pieza propia, ver CORONA.
 *   - EL BASTÓN NO SE SEPARA ENTERO: la zarpa lo empuña (píxeles de zarpa
 *     ENCIMA del palo) y las orquídeas se funden con el brazo — cortar ahí
 *     no tiene señal limpia (la lección de las patas del jaguar: no se
 *     inventa un corte donde no hay borde). Solo la corona, que sí lo tiene.
 *
 * Los pivotes son puntos en PÍXELES DE LA LÁMINA (0..ANCHO, 0..ALTO), el
 * mismo espacio de las máscaras — el componente los convierte a % del stage
 * para `transform-origin` (igual que el jaguar).
 *
 * @module visual/creatures/osoLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'oso.png';
export const ANCHO = 615;
export const ALTO = 630;

/**
 * LA CABEZA — caja en X (mechones de los cachetes incluidos: los penachos de
 * la izquierda llegan a ~x215) × la POLILÍNEA DEL CUELLO (se interpola por
 * tramos y se desvanece ±fade): hombro izq (el cuello nace alto, ~y148) →
 * mentón (lo más bajo, ~y203 bajo la sonrisa) → hombro der (~y178).
 *
 * ANTI-HUECO (el "cuerpo-inpaint" de la casa, sin inventar un solo píxel):
 * el cuerpo NO se recorta hasta la polilínea real sino hasta `CUELLO_SUB` px
 * MÁS ARRIBA — la franja del cuello queda TAMBIÉN en el cuerpo, de respaldo
 * (misma piel; la cabeza la tapa en reposo → compuesto idéntico). Cuando la
 * testa cabecea o sigue al usuario, el respaldo evita que se abra fondo.
 * Es el mismo truco `baseSub` de las orejas del jaguar, aplicado al cuello.
 */
export const CABEZA = {
  box: { x0: 206, x1: 445, xFade: 13 },
  cuello: {
    puntos: [[232, 148], [300, 190], [345, 203], [445, 178]],
    fade: 16,
  },
  /** cuánto se SUBE la polilínea para el recorte del cuerpo (el respaldo). */
  cuelloSub: 26,
  pivote: [330, 195],
};

/**
 * EL ÚNICO OJO VISIBLE (pose ¾, el lejano no está en la lámina — medido con
 * zoom 6×: pupila en ~(328,98), esclera x312..347). El radio abarca el ojo
 * completo dentro de su antifaz, no solo la pupila.
 */
export const OJO = { cx: 326, cy: 97, r: 16 };

/**
 * OREJAS — mismas reglas del jaguar: caja en X × desvanecido hacia la BASE
 * (opaca arriba —la punta—, se funde a 0 donde nace del cráneo). `baseSub`
 * (más arriba que `base`) es lo que se RESTA de la cabeza: la base de la
 * oreja queda también en la cabeza de respaldo (ANTI-HUECO al rotar). El
 * pivote es la base articular.
 */
export const OREJA_IZQ = {
  box: { x0: 238, x1: 302, xFade: 8 },
  base: { y0: 48, y1: 66 },
  baseSub: { y0: 28, y1: 44 },
  pivote: [270, 58],
};

export const OREJA_DER = {
  box: { x0: 378, x1: 442, xFade: 8 },
  base: { y0: 52, y1: 70 },
  baseSub: { y0: 30, y1: 48 },
  pivote: [410, 62],
};

/**
 * MANDÍBULA / boca — la sonrisota va EN DIAGONAL (la testa ¾), así que el
 * labio también es POLILÍNEA (comisura izq → curva del labio → bajo la
 * trufa), no la banda horizontal del jaguar. La pieza vive ENTRE el labio
 * (arriba, fade ±fade) y el fin del mentón (abajo, banda horizontal — no
 * invade el pecho). El pivote es la charnela (comisura izquierda).
 */
export const MANDIBULA = {
  box: { x0: 290, x1: 378, xFade: 10 },
  labio: {
    puntos: [[290, 148], [330, 168], [378, 184]],
    fade: 8,
  },
  menton: { y0: 188, y1: 204 },
  pivote: [296, 152],
};

/**
 * LA CORONA DEL BASTÓN — el frailejón (roseta + flor) que remata el cayado:
 * el contrapeso vivo del oso (la "corola cabecea" de `OsoBaston.jsx`, ahora
 * sobre la lámina real). Caja en X × desvanecido hacia su BASE en el palo
 * (opaca arriba, se funde a 0 hacia y1). `baseSub` deja el arranque del palo
 * también en el cuerpo, de respaldo (ANTI-HUECO — mismo truco de orejas).
 * Pivote en la base: cabecea desde donde nace, la punta se mece y la base no.
 */
export const CORONA = {
  box: { x0: 482, x1: 600, xFade: 10 },
  base: { y0: 168, y1: 192 },
  baseSub: { y0: 148, y1: 166 },
  pivote: [545, 178],
};

/**
 * Pivote del CUERPO para la respiración: el CENTRO DE LOS APOYOS (entre las
 * dos plantas sobre la roca) — así el pecho hincha hacia ARRIBA y los pies
 * quedan PLANTADOS (un oso parado no respira desde el ombligo: se yergue).
 */
export const CUERPO_PIVOTE = [300, 505];

/**
 * Centro de la BOCA para el interior sintético (el ÚNICO píxel que no sale
 * del PNG — precedente jaguar: la lámina es de boca cerrada y detrás de la
 * mandíbula no hay fauces dibujadas). `giro` inclina el interior con la
 * diagonal real de la sonrisa.
 */
export const BOCA = { cx: 336, cy: 158, ancho: 78, giro: 14 };

export default {
  CARPETA_LAMINA,
  ARCHIVO_LAMINA,
  ANCHO,
  ALTO,
  CABEZA,
  OJO,
  OREJA_IZQ,
  OREJA_DER,
  MANDIBULA,
  CORONA,
  CUERPO_PIVOTE,
  BOCA,
};
