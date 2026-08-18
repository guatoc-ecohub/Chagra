/**
 * luciernagaLamina/anatomia — la anatomía MEDIDA de `luciernaga.png` (la
 * lámina aprobada del elenco compai, 367×507): la luciérnaga científica DE
 * PIE, frontal ¾, con el lápiz alzado en la mano izquierda (del espectador),
 * el cuaderno abrazado contra el pecho, guantes y botas, y la linterna
 * (abdomen-glow) encendida entre las piernas.
 *
 * QUÉ ES ESTO. La orden del operador (rama `feat/luciernaga-lamina-viva`):
 * la PIEL tiene que ser la lámina exacta (nunca redibujada, ni a mano ni a
 * vector) y la VIDA tiene que ser la misma del jaguar lámina-viva y de
 * Angelita (useVidaIdle + useRitmoPropio + useMiradaUsted + visema). El
 * método de corte es el MISMO de `jaguarLamina/` (aprobado por el operador):
 * capas por alfa cortadas de la propia lámina, cara INTACTA, cero dibujo
 * nuevo (única excepción heredada: el interior de boca sintético).
 *
 * CÓMO SE MIDIÓ (honestidad del método — no ciencia exhaustiva): sobre
 * `luciernaga.png` (367×507, confirmado con el header PNG y `sharp`), se
 * generaron recortes con grilla de coordenadas superpuesta
 * (`_gate/luciernaga-lamina/crops.mjs`, no versionado) y se leyeron los
 * cortes A OJO sobre esa grilla — el mismo método (y la misma honestidad
 * sobre sus límites) que documentan `jaguarLamina/anatomia.js` y
 * `piloto-lamina.js`. Se verificó además NUMÉRICAMENTE con un prototipo
 * Node/`sharp` (`_gate/luciernaga-lamina/hornear-verifica.mjs`, mismas
 * fórmulas que `capas.js`) que la recomposición de las capas contra el
 * original no pierde píxeles (huecos) — la garantía dura que se puede
 * obtener sin browser/GPU. La calidad de la COSTURA la juzga el gate 2.5D
 * DOM (microapp + juez visual) y el ojo del operador.
 *
 * LAS PIEZAS RECORTADAS (más el cuerpo, que es el resto):
 *   - cabeza: banda de desvanecido en el CUELLO (y200→218) × caja en X del
 *     ancho de la testa. La CARA VA ENTERA EN LA PIEZA — ojos, cejas, nariz
 *     y la sonrisa completa quedan intactos (regla dura de la orden); el
 *     único corte dentro de la cabeza es la mandíbula (DEBAJO del labio).
 *   - antenaIzq / antenaDer: las dos antenas filiformes (su firma
 *     Lampyridae, ver luciernagaIdentidad.js) — cajas en X disjuntas × un
 *     desvanecido hacia la BASE donde nacen de la frente (el patrón de las
 *     orejas del jaguar, con el mismo ANTI-HUECO: se restan de la cabeza
 *     solo por su parte alta, la base queda también en la cabeza de
 *     respaldo, y la rotación es giro puro desde el pivote).
 *   - mandibula: el mentón/labio inferior DEBAJO de la línea de la sonrisa
 *     (la sonrisa entera queda en la cabeza). Al hablar baja y revela el
 *     interior sintético — mismo trato honesto que el jaguar.
 *   - manoLapiz: el guante con el lápiz (la mano alzada del espectador a la
 *     izquierda) — caja en X × desvanecido en la MUÑECA. Es la pieza de
 *     GESTO (escribe en el aire / saluda). El ANTEBRAZO se queda en el
 *     cuerpo: emerge de detrás de la capa de élitros y no hay borde de alfa
 *     que lo separe con confianza — no se inventa un corte donde no hay
 *     señal (el mismo límite honesto que la pata trasera lejana del
 *     jaguar). Detrás del guante hay casi puro fondo transparente: la
 *     rotación chica desde la muñeca no destapa nada.
 *   - linterna: el abdomen-glow (su alma — la orden lo pide como capa
 *     aparte) — elipse suave EXCLUYENDO las dos franjas de PIERNA que lo
 *     cruzan por delante. Así la linterna puede LATIR/DESTELLAR por filtro
 *     CSS sin tocar las piernas ni abrir huecos: no se mueve nunca, solo
 *     cambia su brillo. Las piernas + botas se quedan en el cuerpo,
 *     ESTÁTICAS: están plantadas al piso y detrás de ellas no hay píxeles
 *     (documentado como límite, igual que el gait del jaguar plano).
 *   - cuadernoBrazo: NO se corta. El brazo del cuaderno está abrazado
 *     contra el pecho/abdomen — cualquier movimiento independiente abriría
 *     un hueco sin respaldo. Se mueve CON el cuerpo (respiración).
 *
 * Los pivotes (`pivote`) son puntos en coordenadas de PÍXEL DE LA LÁMINA
 * (0..ANCHO, 0..ALTO), el mismo espacio que usa `capas.js` para las
 * máscaras — el componente los convierte a % del stage para el
 * `transform-origin` CSS (igual que `JaguarLaminaViva.jsx`).
 *
 * @module visual/creatures/luciernagaLamina/anatomia
 */

const BASE_URL = import.meta.env?.BASE_URL || '/';
export const CARPETA_LAMINA = `${BASE_URL}compai/laminas/`;
export const ARCHIVO_LAMINA = 'luciernaga.png';
export const ANCHO = 367;
export const ALTO = 507;

/**
 * Corte cabeza/cuerpo: banda de desvanecido en el cuello (la pose es
 * frontal y simétrica — no hace falta la recta inclinada del jaguar de
 * perfil) × caja en X del ancho de la testa (así los hombros/capa que
 * suben por fuera de la testa se quedan en el cuerpo). El mentón real
 * remata en y≈208: la banda arranca en 200 para que TODO el mentón viaje
 * con la cabeza (la pieza de mandíbula lo recorta después por su cuenta).
 */
export const CABEZA = {
  cuello: { y0: 200, y1: 218 },
  box: { x0: 116, x1: 254, xFade: 8 },
  pivote: [186, 206],
};

/**
 * Los DOS ojos de la cara cartoon (grandes, con ceja pícara). Medidos a ojo
 * sobre el recorte 4× (`zoom-cabeza`/`zoom-boca`): el blanco del ojo
 * izquierdo (del espectador) va de x140-176 / y127-158 y el derecho de
 * x197-237 / y125-155; el radio toma el ojo completo con su contorno de
 * tinta (no solo el blanco). Alimentan los parches de párpado (capas.js):
 * piel de la propia frente que baja a tapar el ojo — parpadeo real, nunca
 * un párpado dibujado.
 */
export const OJO = { cx: 158, cy: 142, r: 20 };
export const OJO_2 = { cx: 212, cy: 138, r: 20 };

/**
 * MANDÍBULA / mentón. La línea de la sonrisa (comisuras en ≈(127,167) y
 * ≈(228,166), panza en y≈190) queda ENTERA en la cabeza: esta pieza es solo
 * lo de DEBAJO del labio inferior — se desvanece hacia arriba en la banda
 * `labio` y hacia abajo en `menton` (no invade el cuello). El `pivote` es
 * la charnela al centro de la boca: al hablar baja + rota apenas.
 *
 * HONESTIDAD (heredada del jaguar): la lámina es un retrato de BOCA
 * CERRADA sonriendo. Al bajar el mentón se abre un hueco sin píxeles de
 * boca detrás; lo tapa el interior sintético (`BOCA`, el ÚNICO píxel que
 * no sale del PNG en toda la luciérnaga).
 */
export const MANDIBULA = {
  box: { x0: 130, x1: 224, xFade: 10 },
  labio: { y0: 176, y1: 190 },
  menton: { y0: 202, y1: 216 },
  pivote: [177, 184],
};

/** Centro de la boca para el interior sintético (se convierte a % del stage). */
export const BOCA = { cx: 177, cy: 190, ancho: 70 };

/**
 * ANTENA IZQUIERDA (lado izquierdo de la lámina, x pequeño): el hilo de
 * cuentas que arranca en la frente (base ≈(178,104)) y arquea hasta la
 * punta en ≈(15,45). Caja en X × desvanecido hacia la BASE (opaca arriba,
 * se funde donde nace de la frente — patrón oreja-jaguar con la Y al
 * revés de las patas). ANTI-HUECO: de la cabeza se resta solo la parte
 * ALTA (`baseSub`); la base queda también en la cabeza de respaldo, así el
 * giro desde el pivote no abre fondo. Giro CHICO y sin levantar.
 */
export const ANTENA_IZQ = {
  box: { x0: 0, x1: 190, xFade: 8 },
  base: { y0: 96, y1: 114 },
  baseSub: { y0: 76, y1: 94 },
  pivote: [178, 104],
};

/** ANTENA DERECHA (x grande): base ≈(207,102); la punta llega hasta x≈356
 *  (medido por banda de alfa y0-60), por eso la caja abre hasta el borde. */
export const ANTENA_DER = {
  box: { x0: 196, x1: 367, xFade: 8 },
  base: { y0: 94, y1: 112 },
  baseSub: { y0: 74, y1: 92 },
  pivote: [207, 102],
};

/**
 * MANO DEL LÁPIZ: el guante (x≈28-115, y≈198-262) + el lápiz que cruza en
 * diagonal (de ≈(14,212) a ≈(100,187)). Caja en X × desvanecido en la
 * MUÑECA (la pieza es opaca arriba y se funde donde el guante remata en el
 * antebrazo). El `pivote` es la muñeca: el gesto es un giro chico
 * (escribe/saluda), nunca una traslación que despegue el guante del brazo.
 */
export const MANO_LAPIZ = {
  // x0 negativo = sin desvanecido al borde izquierdo: la punta del lápiz
  // llega hasta x≈2 (medido por banda de alfa y180-280) y a su izquierda
  // no hay nada que separar.
  box: { x0: -10, x1: 122, xFade: 8 },
  // `techo`: la pieza aparece DEBAJO de y≈180 (el lápiz arranca en y≈183).
  // Sin este tope la caja reclamaba el arco de la ANTENA izquierda que pasa
  // por arriba (x52-120, y5-40) — píxel duplicado que rotaría con la mano
  // (fuga detectada en la revisión a ojo de `capa-manoLapiz.png`).
  techo: { y0: 165, y1: 180 },
  muneca: { y0: 252, y1: 278 },
  pivote: [100, 262],
};

/**
 * LA LINTERNA (abdomen-glow, su alma): elipse suave sobre el farol
 * amarillo-verde (x≈162-258, y≈308-458). Las dos franjas de PIERNA que lo
 * cruzan por delante se EXCLUYEN de la pieza (se quedan en el cuerpo): la
 * linterna late por FILTRO (brillo/halo), jamás se mueve — así el latido
 * no arrastra las piernas ni abre huecos. Cada pierna es una banda con
 * borde suave a lo largo del segmento medido (cadera→bota).
 */
export const LINTERNA = { cx: 210, cy: 385, rx: 48, ry: 76 };
// Los segmentos siguen la pierna HASTA el puño de la bota (y≈450): con el
// corte en la rodilla/caña, la elipse medio-reclamaba el puño de la bota
// izquierda y el latido lo habría hecho pulsar (fuga detectada a ojo en
// `capa-linterna.png`).
export const PIERNA_IZQ = { x0: 162, y0: 315, x1: 186, y1: 450, medio: 12 };
export const PIERNA_DER = { x0: 250, y0: 335, x1: 264, y1: 452, medio: 12 };

/**
 * Pivote del CUERPO para la respiración (`llv-respira`): el centro de masa
 * del tórax acorazado, entre los hombros (~y230) y la cadera (~y340).
 */
export const CUERPO_PIVOTE = [195, 290];

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
  ANTENA_IZQ,
  ANTENA_DER,
  MANO_LAPIZ,
  LINTERNA,
  PIERNA_IZQ,
  PIERNA_DER,
  CUERPO_PIVOTE,
};
