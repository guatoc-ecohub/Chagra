/**
 * zariguyaLamina/anatomia — la anatomía MEDIDA de `zariguya.png` (la lámina
 * aprobada del elenco compai, estilo grabado, 481×444) para el rig
 * lámina-viva de la zarigüeya — hermana de `jaguarLamina/anatomia.js`, el
 * MISMO método y las MISMAS garantías.
 *
 * QUÉ ES ESTO. La orden del operador (rama `feat/zariguya-lamina-viva`): la
 * PIEL tiene que ser la lámina exacta (nunca redibujada, ni a mano ni a
 * vector — el error de los 5 días) y la VIDA tiene que salir del mismo
 * sistema de Angelita/el jaguar (`useVidaIdle` + `useRitmoPropio` +
 * `useMiradaUsted` + visemas). La lámina es un retrato ¾ ERGUIDO: la
 * zarigüeya de pie, PATA canela con garras y LÁPIZ en la mano alzada (lado
 * izquierdo de la lámina), BRÚJULA en la otra manito contra el pecho, COLA
 * PRENSIL desnuda enroscada en C al lado derecho, boca abierta sonriendo
 * con dientes. Los "extras" de la orden (lápiz+brújula, cola prensil) NO se
 * dibujan: ya están EN la lámina — aquí solo se ARTICULAN.
 *
 * NOTA 2026-08-18 (`fix/zariguya-sin-guantes-v2`): las manos, que en la
 * lámina original eran guantes blancos tipo Mickey, se REPINTARON en el
 * propio PNG como patas reales (canela de los dedos traseros + dedos
 * entintados + garras + muñeca peluda), con la HUELLA intacta: las
 * primitivas de este archivo (la elipse se sigue llamando `guante`) y
 * el INPAINT_PECHO siguen midiendo lo mismo. Gate: judge-vl control
 * positivo sí→no + 0 blancos L>205 en ambas elipses
 * (`_gate/zariguya-sin-guantes/`).
 *
 * CÓMO SE MIDIÓ (honestidad del método — el mismo de anatomia.js del
 * jaguar): sobre `zariguya.png` (481×444, confirmado con
 * `sharp().metadata()`), recortes con grilla de coordenadas superpuesta
 * (`_gate/zariguya-lamina/grid.mjs` + `zoom*.mjs`, no versionados) leídos A
 * OJO sobre esa grilla, con lupas ×5-×6 en las zonas críticas (ojos, oreja
 * derecha vs ojo, punta del lápiz vs bigotes, bigotes derechos vs nuca). Se
 * verificó NUMÉRICAMENTE (script `_gate/zariguya-lamina/verifica.mjs`,
 * mismas fórmulas que `capas.js` vía import directo) que la recomposición
 * de las capas contra el original no pierde píxeles — la misma garantía
 * dura que dio el jaguar. La calidad de la COSTURA la juzga el gate 2.5D
 * DOM (microapp-shot + judge-vl) y el ojo del operador.
 *
 * DECISIONES DE CORTE (las tres reglas duras de la orden):
 *   1. CARA INTACTA: la cabeza se corta con el cuello + un desvanecido de
 *      pecho, y las lupas confirmaron que ojos, trufa, boca y TODOS los
 *      bigotes quedan dentro (los bigotes derechos terminan en x≤301, nunca
 *      tocan el corte; los izquierdos terminan en x≥93 y la punta del lápiz
 *      llega máximo a x≈84 — hay un canal de fondo transparente entre
 *      ambos, medido en `zoom-bigote-lapiz.png`).
 *   2. PIEL = LÁMINA: todo el color sale del PNG. Los únicos píxeles no-PNG
 *      son (a) el interior de boca sintético al abrir MÁS la mandíbula
 *      (mismo trato honesto que el jaguar) y (b) el clonado dirigido del
 *      pecho detrás del guante de la brújula (INPAINT_PECHO: pelo del
 *      propio vientre copiado con offset — píxeles de la lámina, movidos).
 *   3. NO DEFORMAR: cada pieza rota RÍGIDA desde su pivote; los pivotes
 *      caen junto a las bandas de desvanecido, así la costura casi no se
 *      desplaza al articular.
 *
 * LAS PIEZAS (más el cuerpo, que es el resto):
 *   - cabeza: recta del cuello (de bajo la mejilla izquierda a la nuca) +
 *     desvanecido de pecho por Y. La testa gira (mirada/gestos) SIN tocar
 *     la cara por dentro.
 *   - orejas ×2: mismas técnicas anti-hueco del jaguar (la pieza llega a la
 *     base con fade; a la cabeza solo se le resta la parte ALTA — la base
 *     queda de respaldo). La derecha linda con el ojo derecho (medido:
 *     oreja hasta y≈58, órbita del ojo desde y≈52): su fade de base es alto
 *     y su perk corto para no arrastrar la ceja.
 *   - mandíbula: la boca YA ESTÁ ABIERTA sonriendo en la lámina — jaw=0 es
 *     EXACTO la lámina aprobada; el visema la abre MÁS. El colmillo
 *     superior grande (x 214-248) se EXCLUYE de la pieza (cae en la banda
 *     de la mandíbula pero es maxilar superior — cortarlo con la mandíbula
 *     lo estiraría al hablar).
 *   - brazoLapiz: cápsula del lápiz + elipse del guante + cápsula de
 *     antebrazo que se desvanece hacia el hombro. Gesto: ESCRIBE en el aire
 *     al pensar.
 *   - brazoBrujula: disco de la brújula + elipse del guante + antebrazo al
 *     codo. Detrás del guante hay PECHO (no fondo): ver INPAINT_PECHO.
 *   - cola: corte casi vertical en x≈352 — todo el rulo prensil vive a la
 *     derecha; la base peluda queda repartida por la banda (respaldo).
 *   - párpados ×2: parches de la PROPIA piel encima de cada ojo (técnica
 *     parcheParpado del jaguar, sin dibujar nada).
 *   - patas: NO se cortan. Lección del jaguar ("3-4 patas"): un dibujo
 *     plano no da gait por-pata sin fantasmas; de pie y quieta, el peso se
 *     lee del respirar del cuerpo. El caminar lo pone el roaming del host.
 *
 * Los pivotes son puntos en PÍXEL DE LÁMINA (0..ancho, 0..alto), el mismo
 * espacio de las máscaras de `capas.js`; el componente los convierte a %.
 *
 * @module visual/creatures/zariguyaLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'zariguya.png';
export const ANCHO = 481;
export const ALTO = 444;

/**
 * Corte cabeza/cuerpo: banda de mezcla proyectada sobre la recta del cuello
 * (pasa por ≈(140,206)→(300,154); normal apuntando al lado CUERPO), MÁS un
 * desvanecido de PECHO por Y (la cabeza no sigue existiendo bajo y≈226
 * aunque la recta lo permita — sin esto reclamaría el pecho del lado del
 * lápiz). El mentón (y≈164) y los bigotes derechos sobre fondo (hasta
 * (301,84)) quedan MEDIDOS del lado cabeza.
 */
export const CABEZA = {
  cuello: { px: 220, py: 180, nx: 0.309, ny: 0.951, u0: -12, u1: 12 },
  fadePecho: { y0: 196, y1: 226 },
  pivote: [200, 168],
};

/**
 * Los DOS ojos (lupa ×6 `zoom-dos-ojos.png`): globo + órbita oscura del
 * antifaz. `r` es el radio útil para el parche de párpado (cubre la
 * abertura, no todo el antifaz). El derecho linda arriba con la oreja
 * derecha (órbita desde y≈52; oreja hasta y≈58) — por eso la oreja derecha
 * tiene su base de fade ALTA (ver OREJA_DER).
 */
export const OJO = { cx: 184, cy: 76, r: 20 };
export const OJO_2 = { cx: 242, cy: 73, r: 20 };

/**
 * OREJA IZQUIERDA (la grande con interior rosado, lado izquierdo de la
 * lámina; x 84-152, y 18-98). Caja en X × desvanecido hacia la BASE (misma
 * técnica del jaguar). ANTI-HUECO: a la cabeza solo se le resta la parte
 * ALTA (`baseSub`) — la base queda también en la cabeza, de respaldo, y el
 * perk es SOLO giro desde el pivote (la banda de fade queda pegada al
 * pivote: casi no se desplaza).
 * La caja termina en x=148 porque la órbita del ojo izquierdo empieza en
 * x≈158 (medido): la oreja no puede reclamar ceja/ojo.
 */
export const OREJA_IZQ = {
  box: { x0: 84, x1: 148, xFade: 6 },
  base: { y0: 74, y1: 96 },
  baseSub: { y0: 48, y1: 68 },
  pivote: [118, 86],
};

/**
 * OREJA DERECHA (x 222-295, y 6-78 — más grande de lo que aparenta, medida
 * en `zoom-oreja-der.png`). Su base linda con la órbita del ojo derecho
 * (y≈52): el fade de base sube a y 42-58 para que el 80% alto de la oreja
 * (la que se ve mover) sea pieza limpia y la franja de contacto quede casi
 * quieta junto al pivote.
 */
export const OREJA_DER = {
  box: { x0: 226, x1: 296, xFade: 6 },
  base: { y0: 42, y1: 58 },
  baseSub: { y0: 22, y1: 38 },
  pivote: [258, 56],
};

/**
 * MANDÍBULA (el maxilar inferior de la sonrisa ABIERTA: dientes de abajo +
 * lengua + mentón; comisura-bisagra a la IZQUIERDA en (134,110), el hocico
 * apunta a la trufa del lado derecho). Caja en X × banda del labio (se
 * desvanece hacia arriba, bajo la fila de dientes superiores) × fin del
 * mentón (no invade el pecho). `colmillo` EXCLUYE el colmillo superior
 * grande (y el borde bajo de la trufa) que cae dentro de la banda pero es
 * maxilar SUPERIOR — se queda quieto en la cabeza, como corresponde.
 *
 * HONESTIDAD: jaw=0 = la lámina EXACTA (que ya sonríe con la boca abierta).
 * Al abrir MÁS se destapa una franja sin píxeles detrás: la tapa el
 * interior sintético (`BOCA`, único píxel no-PNG del dibujo — mismo trato
 * que el jaguar, documentado, no disfrazado).
 */
export const MANDIBULA = {
  box: { x0: 128, x1: 244, xFade: 8 },
  labio: { y0: 138, y1: 148 },
  menton: { y0: 160, y1: 176 },
  colmillo: { x0: 214, x1: 248, xFade: 5, y0: 124, y1: 152, yFade: 6 },
  pivote: [134, 110],
};

/** Centro/ancho de la BOCA para el interior sintético (px de lámina). El
 *  borde superior (cy) va DEBAJO de las puntas de los dientes superiores
 *  (y≈133-140) y el ancho para ANTES del colmillo grande (x≈214): el gate
 *  01→03 mostró que un interior más alto/ancho tapa dentadura y colmillo. */
export const BOCA = { cx: 189, cy: 141, ancho: 68 };

/**
 * BRAZO DEL LÁPIZ (mano enguantada alzada, lado izquierdo). Unión de tres
 * primitivas: cápsula del LÁPIZ (eje (14,228)→(84,132), radio corto — la
 * lupa `zoom-bigote-lapiz.png` midió que las puntas de bigote más cercanas
 * quedan en x≥93 y este radio las deja AFUERA con margen), elipse del
 * GUANTE y cápsula del ANTEBRAZO que se desvanece hacia el hombro
 * (t0..t1 sobre su eje) — el hombro queda de respaldo en el cuerpo, igual
 * que la base de las orejas. Pivote en el hombro: gestos de amplitud CHICA
 * (±2-4°) — la pieza flota casi toda sobre fondo transparente.
 */
export const BRAZO_LAPIZ = {
  lapiz: { ax: 14, ay: 228, bx: 84, by: 132, r: 10, rFade: 3 },
  guante: { cx: 58, cy: 175, rx: 42, ry: 41, e0: 0.78, e1: 1.02 },
  antebrazo: { ax: 92, ay: 198, bx: 178, by: 258, r: 24, rFade: 8, t0: 0.62, t1: 0.95 },
  pivote: [162, 242],
};

/**
 * BRAZO DE LA BRÚJULA (manito enguantada contra el pecho). Disco de la
 * BRÚJULA (incluye la coronita del reloj), elipse del GUANTE y antebrazo
 * corto al codo. Detrás de la brújula hay FONDO (la mano sobresale del
 * contorno); detrás del GUANTE hay PECHO — ese hueco lo rellena
 * INPAINT_PECHO en el cuerpo.
 */
export const BRAZO_BRUJULA = {
  brujula: { cx: 112, cy: 262, r: 31, rFade: 4 },
  guante: { cx: 151, cy: 263, rx: 36, ry: 36, e0: 0.8, e1: 1.0 },
  antebrazo: { ax: 168, ay: 246, bx: 206, by: 222, r: 20, rFade: 7, t0: 0.55, t1: 0.9 },
  pivote: [198, 232],
};

/**
 * INPAINT del pecho: donde el guante de la brújula tapa pelo de pecho, el
 * cuerpo-capa se rellena CLONANDO la lanilla del propio vientre con offset
 * (+dx,+dy) — píxeles de la lámina, movidos; cero color inventado. La
 * fuente (x+70, y+40) cae en vientre crema libre de piezas (verificado
 * contra las primitivas del brazo). Solo dentro de esta caja y solo donde
 * la máscara del brazo pasa el umbral.
 */
export const INPAINT_PECHO = {
  x0: 142, x1: 196, y0: 226, y1: 302, dx: 70, dy: 40, umbral: 0.45,
};

/**
 * Corte cuerpo/cola: banda vertical en x≈352 — todo el rulo prensil (tip
 * interior en ≈(392,250), C hasta x≈478) vive a la derecha; la base peluda
 * (x 335-370, y 330-395) queda repartida por la banda como respaldo. La
 * cola se ENROSCA/mece rígida desde la grupa.
 */
export const COLA = {
  cut: { px: 352, py: 330, nx: 1, ny: 0, u0: -16, u1: 16 },
  pivote: [358, 360],
};

/** Pivote del CUERPO para respirar/bob (centro de masa del tronco). */
export const CUERPO_PIVOTE = [235, 300];

export default {
  CARPETA_LAMINA,
  ARCHIVO_LAMINA,
  ANCHO,
  ALTO,
  CABEZA,
  OJO,
  OJO_2,
  OREJA_IZQ,
  OREJA_DER,
  MANDIBULA,
  BOCA,
  BRAZO_LAPIZ,
  BRAZO_BRUJULA,
  INPAINT_PECHO,
  COLA,
  CUERPO_PIVOTE,
};
