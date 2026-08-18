/**
 * chivitoLamina/anatomia — la anatomía MEDIDA de `chivito-punk.png` (la
 * lámina aprobada del elenco compai, 397×654): el chivito de páramo
 * (Oxypogon guerinii) versión punk DE PIE, frontal ¾ — la cresta mohawk de
 * puntas moradas (su firma), la barba-gorguera verde sobre el pecho, la
 * pañoleta de campo, el lápiz alzado en la mano izquierda (del espectador),
 * la libreta abrazada bajo la otra ala y las dos patas de colibrí plantadas.
 *
 * QUÉ ES ESTO. La orden del operador (rama `feat/chivito-punk-lamina-viva`,
 * quinta del lote lámina-viva): la PIEL tiene que ser la lámina exacta
 * (nunca redibujada, ni a mano ni a vector) y la VIDA tiene que ser la misma
 * del jaguar lámina-viva y de Angelita (useVidaIdle + useRitmoPropio +
 * useMiradaUsted + visema). El método de corte es el MISMO de
 * `jaguarLamina/` y `luciernagaLamina/` (aprobado por el operador): capas
 * por alfa cortadas de la propia lámina, cara INTACTA, cero dibujo nuevo
 * (única excepción heredada: el interior de boca sintético).
 *
 * CÓMO SE MIDIÓ (honestidad del método — no ciencia exhaustiva): sobre
 * `chivito-punk.png` (397×654, confirmado con el header PNG y `sharp`,
 * bbox de alfa x2..394 / y3..651), se generaron recortes con grilla de
 * coordenadas superpuesta (`_gate/chivito-punk-lamina/crops.mjs`, no
 * versionado) y se leyeron los cortes A OJO sobre esa grilla — el mismo
 * método (y la misma honestidad sobre sus límites) que documentan
 * `jaguarLamina/anatomia.js` y `luciernagaLamina/anatomia.js`. Se verificó
 * además NUMÉRICAMENTE con un prototipo Node/`sharp`
 * (`_gate/chivito-punk-lamina/hornear-verifica.mjs`, mismas fórmulas que
 * `capas.js`) que la recomposición de las capas contra el original no
 * pierde píxeles (huecos). La calidad de la COSTURA la juzga el gate 2.5D
 * DOM (microapp + juez visual) y el ojo del operador.
 *
 * LAS PIEZAS RECORTADAS (más el cuerpo, que es el resto):
 *   - cabeza: banda de desvanecido en el CUELLO (y274→296) × caja en X del
 *     ancho de la testa CON LA CRESTA COMPLETA (x82..322 cubre desde la
 *     púa izquierda x≈97 hasta el rizo derecho x≈310). La CARA VA ENTERA
 *     EN LA PIEZA — ojos, pico superior, mejillas Y LA CRESTA PUNK quedan
 *     intactos (regla dura de la orden: la cresta es la firma del
 *     personaje, NO se recorta de la cabeza ni se aplana — se mueve CON la
 *     testa: el headbang es de cabeza entera). El único corte dentro de la
 *     cabeza es la mandíbula (DEBAJO de la línea de la boca).
 *   - mandibula: el pico INFERIOR + el mentón, DEBAJO de la línea de la
 *     boca (la comisura en ≈(213,240), la punta en ≈(110,246) — la línea
 *     entera queda en la cabeza). Al hablar baja/rota desde la comisura
 *     (el pico abre en tijera, como pájaro) y revela el interior sintético.
 *     La banda `menton` se desvanece sobre el ARRANQUE de la barba (el
 *     mentón del chivito lleva barba — baja con él, crossfade de 12px).
 *   - manoLapiz: la mano-garra clara con el lápiz (la mano alzada del
 *     espectador a la izquierda) — caja en X × desvanecido en la MUÑECA.
 *     Es la pieza de GESTO (apunta/escribe en el aire / saluda punk). El
 *     ALA-BRAZO se queda en el cuerpo: emerge del plumaje del hombro y no
 *     hay borde de alfa que la separe con confianza — no se inventa un
 *     corte donde no hay señal (el mismo límite honesto que la pata
 *     trasera lejana del jaguar y el antebrazo de la luciérnaga). Detrás
 *     de la mano hay puro fondo transparente: la rotación chica desde la
 *     muñeca no destapa nada.
 *
 * LO QUE NO SE CORTA (límites honestos — detrás no hay píxeles o no hay
 * borde de alfa; inventar píxeles es peor que no mover):
 *   - PATAS (izq x≈150-215, der x≈250-330, y≈540-651): plantadas al piso,
 *     detrás de ellas no hay nada. ESTÁTICAS, como las botas de la
 *     luciérnaga y el gait plano del jaguar.
 *   - LIBRETA + su ala (x≈235-335, y≈355-500): abrazada contra el flanco —
 *     cualquier movimiento independiente abriría un hueco sin respaldo. Se
 *     mueve CON el cuerpo (respiración), como el cuaderno de la luciérnaga.
 *   - COLA (x≈250-394, y≈430-600): su base nace OCULTA tras la libreta y
 *     el flanco, y las plumas cruzan la región de la pata derecha — no hay
 *     borde de alfa limpio donde anclar un giro sin disputar píxeles con
 *     dos piezas que no se mueven. ESTÁTICA, documentado como límite.
 *   - BARBA (gorguera verde, x≈145-225, y≈250-302): el tercio alto viaja
 *     con cabeza/mandíbula (es el mentón barbado), el resto queda en el
 *     cuerpo con crossfade en la banda del cuello — mismo trato que el
 *     mentón de la luciérnaga con su cuello.
 *
 * Los pivotes (`pivote`) son puntos en coordenadas de PÍXEL DE LA LÁMINA
 * (0..ANCHO, 0..ALTO), el mismo espacio que usa `capas.js` para las
 * máscaras — el componente los convierte a % del stage para el
 * `transform-origin` CSS (igual que `JaguarLaminaViva.jsx`).
 *
 * @module visual/creatures/chivitoLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'chivito-punk.png';
export const ANCHO = 397;
export const ALTO = 654;

/**
 * Corte cabeza/cuerpo: banda de desvanecido en el cuello × caja en X que
 * abarca testa + cresta completa. El pico remata abajo en y≈262 y la
 * mandíbula termina su fade en y=274: la banda arranca ahí para que TODO
 * el pico y el mentón barbado viajen con la cabeza. Por la derecha la caja
 * llega a 322 (el rizo de cresta más externo remata en x≈310; en la banda
 * del cuello eso solo cruza plumas de hombro, que crossfadean).
 */
export const CABEZA = {
  cuello: { y0: 274, y1: 296 },
  box: { x0: 82, x1: 322, xFade: 8 },
  pivote: [205, 268],
};

/**
 * Los DOS ojos de la cara (grandes, con antifaz de plumas oscuras). Medidos
 * a ojo sobre el recorte 3× (`zoom-cabeza`): el blanco del ojo izquierdo
 * (del espectador) va de x≈152-186 / y≈194-236 y el derecho de x≈204-250 /
 * y≈185-233; el radio toma el ojo completo con su contorno de tinta (no
 * solo el blanco). Alimentan los parches de párpado (capas.js): piel del
 * propio antifaz/frente que baja a tapar el ojo — parpadeo real, nunca un
 * párpado dibujado.
 */
export const OJO = { cx: 168, cy: 214, r: 23 };
export const OJO_2 = { cx: 227, cy: 209, r: 25 };

/**
 * MANDÍBULA / pico inferior + mentón barbado. La línea de la boca (punta en
 * ≈(110,246), comisura en ≈(213,240)) queda ENTERA en la cabeza: esta pieza
 * es solo lo de DEBAJO — se desvanece hacia arriba en la banda `labio`
 * (bajo la línea) y hacia abajo en `menton` (sobre el arranque de la
 * barba, sin invadir el cuello). El `pivote` es la comisura: al hablar el
 * pico inferior baja + rota desde ahí (abre en tijera, como pájaro).
 *
 * HONESTIDAD (heredada del jaguar): la lámina es un retrato de PICO
 * CERRADO. Al bajar el pico inferior se abre un hueco sin fauces detrás;
 * lo tapa el interior sintético (`BOCA`, el ÚNICO píxel que no sale del
 * PNG en todo el chivito).
 */
export const MANDIBULA = {
  box: { x0: 94, x1: 222, xFade: 8 },
  labio: { y0: 242, y1: 252 },
  menton: { y0: 262, y1: 274 },
  pivote: [212, 244],
};

/** Centro de la boca para el interior sintético (se convierte a % del stage). */
export const BOCA = { cx: 160, cy: 246, ancho: 92 };

/**
 * MANO DEL LÁPIZ: la mano-garra clara (x≈20-72, y≈285-352) + el lápiz que
 * cruza en diagonal (del tajado en ≈(8,350) al borrador en ≈(78,275)).
 * Caja en X × techo (la pieza solo existe debajo de y≈270 — por encima no
 * hay nada suyo, y el pico de la cabeza queda lejos en x) × desvanecido en
 * la MUÑECA (opaca arriba, se funde donde la mano remata en el plumaje del
 * ala-brazo). El `pivote` es la muñeca: el gesto es un giro chico
 * (apunta/escribe/saluda), nunca una traslación que despegue la mano.
 *
 * CANDADO (fuga cerrada en la revisión offline de `capa-cuerpo.png`): el
 * TAJADO del lápiz (x≈5-15) baja hasta y≈358 y cruzaba la banda de muñeca
 * horizontal — el puntazo quedaba medio en el cuerpo y medio en la mano
 * (fantasma doble al gesticular). La unión real mano/brazo es DIAGONAL
 * (sube de izquierda a derecha), así que la banda de muñeca es INCLINADA:
 * su borde superior está en `muneca.y0` en el lado del brazo (x=x1) y cae
 * `muneca.caidaIzq` píxeles más abajo en el borde izquierdo (x=0), pasando
 * por DEBAJO del tajado. `muneca.alto` es el grosor del desvanecido.
 */
export const MANO_LAPIZ = {
  // x0 negativo = sin desvanecido al borde izquierdo: la punta del lápiz
  // llega hasta x≈6 (medido en `zoom-mano-lapiz`) y a su izquierda no hay
  // nada que separar.
  box: { x0: -12, x1: 96, xFade: 12 },
  techo: { y0: 256, y1: 270 },
  muneca: { y0: 346, caidaIzq: 16, alto: 26 },
  pivote: [58, 350],
};

/**
 * Pivote del CUERPO para la respiración (`clv-respira`): el centro de masa
 * del torso emplumado, entre los hombros (~y330) y la cadera (~y530).
 */
export const CUERPO_PIVOTE = [200, 430];

export default {
  CARPETA_LAMINA,
  ARCHIVO_LAMINA,
  ANCHO,
  ALTO,
  CABEZA,
  OJO,
  OJO_2,
  MANDIBULA,
  BOCA,
  MANO_LAPIZ,
  CUERPO_PIVOTE,
};
