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
 * LAS PIEZAS RECORTADAS (más el cuerpo, que es el resto):
 *   - cabeza: corte CASI VERTICAL (la pose es de perfil, no frontal — por
 *     eso el eje no es horizontal como en los bustos de piloto-lamina.js),
 *     con una franja de mezcla + un desvanecido adicional por Y (la mandíbula
 *     no puede seguir "siendo cabeza" más abajo del cuello real).
 *   - patasDelanteras (`feat/compai-caminar-explica`, 2026-08-15): las dos
 *     patas delanteras vuelven a ser UN SOLO BLOQUE limpio (`PATAS_DEL`), sin
 *     el corte por color `patasDelCerca`/`patasDelLejana` del pulido anterior.
 *     POR QUÉ SE REVIRTIÓ (feedback del operador: "el caminado está rarísimo,
 *     las patas de adelante a veces se ven 3 y 4"): partir el envolvente en dos
 *     piezas y rotarlas en FASES DISTINTAS (una a 0s, otra a -.66s) las hacía
 *     divergir; sumado al `SOLAPE_PATA_DEL_CERCA` (la pieza de abajo se hacía
 *     55px más ancha para tapar el hueco de rotación) el borde compartido se
 *     leía como un CONTORNO DOBLE — dos patas donde hay una, y con la trasera
 *     detrás daban la ilusión de 3-4 patas. La causa de fondo es honesta y no
 *     tiene arreglo dentro del plano: un DIBUJO PLANO de una sola pose no se
 *     deja separar las patas en un gait limpio — cualquier corte por color deja
 *     un filo que, al rotar cada mitad por su lado, fantasmea. Para un gait
 *     REAL por-pata haría falta dibujar las patas separadas (capas propias con
 *     su alfa). Mientras tanto el "caminar" se lee del DESPLAZAMIENTO del compai
 *     por la pantalla (`useCompaiRoam`) + el bob del cuerpo + la cola; el bloque
 *     de patas solo hace un balanceo/lift SUTIL sincronizado con ese bob (nunca
 *     dos piezas en fase opuesta). Ver jaguarLamina.css.
 *   - pataTrasera: la pata trasera CERCANA (la única con silueta separable
 *     con confianza; la trasera-lejana no se distingue del cuerpo/la cercana
 *     en el alfa de esta lámina — no se inventa un corte donde no hay señal;
 *     sigue sin cortarse, documentado como límite pendiente).
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

/**
 * Los DOS ojos visibles: la testa está girada ¾ hacia cámara (no es un
 * perfil puro), así que ambos ojos entran en cuadro y se miden los dos —
 * antes solo se cortaba `OJO` (el derecho/más central) y el parpadeo era un
 * GUIÑO de un solo ojo, ni siquiera un parpadeo real. Medidos por centroide
 * de brillo (`sd[i]>190 && sd[i+1]>150 && brillo>60`, script Node/`sharp` no
 * versionado) + lectura fina a ojo sobre un recorte 10× para el radio real
 * del anillo oscuro del párpado (el centroide de brillo solo agarra el
 * iris encendido, más chico que el ojo completo).
 */
export const OJO = { cx: 115, cy: 79, r: 22 };
export const OJO_2 = { cx: 48, cy: 78, r: 17 };

/**
 * PATAS DELANTERAS — un SOLO bloque limpio (caja en X + banda de articulación
 * en Y). Antes (`feat/jaguar-pulido`) esta caja era el envolvente COMPARTIDO
 * `PATAS_DEL_ENVOLVENTE` que un corte por color (`CORTE_PATAS_DEL`) repartía en
 * dos piezas `patasDelCerca`/`patasDelLejana` con un solape de respaldo
 * (`SOLAPE_PATA_DEL_CERCA`). Eso se ELIMINÓ (ver el docstring del módulo): al
 * rotar las dos mitades en fases distintas el borde compartido fantasmeaba como
 * un contorno doble → "3-4 patas". Ahora es una pieza única con un solo
 * `pivote` (el hombro, donde el bloque articula con el tronco): rota como bloque
 * con un balanceo SUTIL sincronizado con el bob del cuerpo, sin borde interno
 * que pueda duplicarse. El `pivote` cae dentro de la caja, arriba-centro (la
 * inserción del hombro), aproximadamente el promedio de los dos pivotes viejos.
 */
export const PATAS_DEL = {
  box: { x0: 145, x1: 300, xFade: 15 },
  joint: { y0: 228, y1: 258 },
  pivote: [200, 236],
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
 * de `#troncoLado`; aquí no hay un bbox de capa recortada tan preciso, así
 * que se aproxima con el centro de masa del torso (entre el hombro ~230 y
 * la cadera ~420, a la altura del vientre).
 */
export const CUERPO_PIVOTE = [330, 140];

/* ════════════════════════════════════════════════════════════════════════════
 * PIEZAS NUEVAS PARA LA VIDA (rama `feat/jaguar-miss-minutes`).
 *
 * El objetivo de esta rama NO es cortar mejor la piel (eso ya lo hizo
 * `feat/jaguar-pulido` — cuerpo/cabeza/patas×3/cola/2 párpados, aprobado por
 * el operador) sino DARLE LA VIDA DE ANGELITA a esa piel: que ESCUCHE (pare
 * la oreja), HABLE (mueva la mandíbula con el lip-sync) y VEA/gesticule con
 * el mismo sistema de `Angelita.jsx` (useVidaIdle + useRitmoPropio +
 * useMiradaUsted + useLipSync). Para eso hacen falta piezas que el corte
 * aprobado no separaba: las DOS OREJAS y la MANDÍBULA.
 *
 * MEDIDO sobre `jaguar-natural.png` (705×394) igual que el resto de este
 * archivo: perfil de contorno superior columna a columna + recortes 10× a
 * ojo (script Node/`sharp` no versionado, `_gate/`), y verificado que las
 * piezas nuevas se restan de la cabeza sin dejar hueco (0% de píxeles
 * perdidos en la recomposición — la misma garantía dura que ya daba capas.js).
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * OREJA IZQUIERDA (la del lado izquierdo de la lámina, x pequeño). Caja en X
 * (con bordes suaves) × un desvanecido por la BASE (la oreja deja de existir
 * hacia abajo, donde se funde con la frente — no hay borde de alfa que la
 * separe del cráneo, igual que las patas se funden con el tronco). El
 * `pivote` es la BASE de la oreja (donde articula): al parar/mecer la oreja
 * rota desde ahí, así la punta se mueve y la base casi no.
 *
 * ANTI-HUECO (verificado con recorte offline `sharp`): la oreja se RESTA de la
 * cabeza SOLO por su parte alta (`baseSub`, más arriba que `base`), no entera —
 * así la BASE de la oreja queda TAMBIÉN en la cabeza (misma piel; la oreja la
 * tapa en reposo → compuesto idéntico) y, cuando la oreja rota desde el pivote,
 * la piel de la cabeza RESPALDA la base y no se abre fondo. Aun así la rotación
 * es CHICA y SIN levantar (solo giro): levantar la oreja destaparía fondo bajo
 * ella (medido — ver el reporte).
 */
export const OREJA_IZQ = {
  box: { x0: 0, x1: 52, xFade: 8 },
  base: { y0: 40, y1: 58 },      // la PIEZA: opaca arriba (punta), se desvanece hacia la base
  baseSub: { y0: 18, y1: 34 },   // lo que se RESTA de la cabeza: solo la parte ALTA
  pivote: [36, 52],
};

/** OREJA DERECHA (lado derecho de la lámina, x grande). Misma técnica. */
export const OREJA_DER = {
  box: { x0: 108, x1: 160, xFade: 8 },
  base: { y0: 40, y1: 58 },
  baseSub: { y0: 18, y1: 34 },
  pivote: [124, 52],
};

/**
 * MANDÍBULA / boca (el maxilar inferior + mentón). Caja en X × un desvanecido
 * por la LÍNEA DE LA BOCA (la mandíbula empieza DEBAJO de los labios ~y150 y
 * baja al mentón ~y196). El `pivote` es la charnela (comisura), arriba-centro:
 * al hablar la pieza baja + rota apenas desde ahí, como una mandíbula real.
 *
 * HONESTIDAD (lo dice el reporte): la lámina es un RETRATO DE BOCA CERRADA. Al
 * bajar la mandíbula se abre un hueco entre labio superior y mentón; detrás NO
 * hay píxeles de fauces (la foto no los tiene). Ese hueco lo tapa un INTERIOR
 * DE BOCA SINTÉTICO (`BOCA`, dibujado en JaguarLaminaViva.jsx — el ÚNICO píxel
 * que no sale del PNG en todo el jaguar). Es un lip-sync creíble a tamaño de
 * avatar, pero para una boca abierta 100% fiel al trazo de Humboldt haría
 * falta un dibujito de fauces del operador (las otras láminas —`jaguar-
 * actuando`/`jaguar-gesto`— tienen boca abierta pero en estilo caricatura, no
 * pegan con esta cabeza realista). Ver el reporte.
 */
export const MANDIBULA = {
  box: { x0: 42, x1: 132, xFade: 10 },
  labio: { y0: 146, y1: 160 },    // se desvanece hacia arriba (bajo el labio)
  menton: { y0: 184, y1: 204 },   // …y hacia abajo (fin del mentón): NO invade el cuello
  pivote: [87, 150],
};

/**
 * Centro de la BOCA (comisura) para el interior sintético y el punto de
 * apertura de la mandíbula. En px de la lámina (se convierte a % del stage).
 */
export const BOCA = { cx: 87, cy: 152, ancho: 46 };

/* ════════════════════════════════════════════════════════════════════════════
 * RIG DE MARCHA (rama `feat/jaguar-lamina-caminando`, 2026-08-18).
 *
 * POR QUÉ AHORA SÍ HAY GAIT POR-PATA. El límite honesto documentado arriba
 * (`PATAS_DEL`: "un dibujo plano de una sola pose no se deja separar las patas
 * en un gait limpio") era del PLANO ÚNICO: cortar por color deja un filo
 * compartido que fantasmea contorno doble al rotar cada mitad. Ese límite se
 * levantó DIBUJANDO las patas como capas propias (set de arte 2.5D en
 * `~/demos/3d/compai/rigs2d/jaguar/`, ver su NOTAS.md): cuerpo-inpaint SIN
 * patas (los píxeles ocultos rellenados por clonado de la propia lámina) + 3
 * patas con alfa propio y garras completadas. La CUARTA pata (delantera
 * cercana, naranja) sí se sigue cortando de la lámina — su respaldo ya no es
 * la otra mitad del envolvente sino la pata blanca PRE-CORTADA + el pecho
 * inpainted, así el filo compartido que fantasmeaba ya no existe.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Carpeta pública de las capas pre-cortadas del rig (mismo lienzo 705×394 que
 *  la lámina — comparten registración, se apilan sin cuentas de UV). */
export const CARPETA_RIG = '/compai/laminas/jaguar-rig/';
export const CAPAS_RIG = {
  cuerpo: 'cuerpo-inpaint.png',
  delLejana: 'pata-del-lejana.png',
  trasCercana: 'pata-tras-cercana.png',
  trasLejana: 'pata-tras-lejana.png',
};

/**
 * La recta que separa las dos patas delanteras dentro de `PATAS_DEL` (misma
 * medición de `feat/jaguar-pulido`: cruce de color R-B fila a fila, x≈167..190
 * entre y=225 y y=380). `u>0` = pata NARANJA (lado cercano del animal);
 * `u<0` = pata blanca/vientre (lado lejano, que ahora es PNG pre-cortado).
 *
 * OJO — esto NO revive el corte-por-color que fantasmeaba "3-4 patas": aquí el
 * corte solo EXTRae la pieza naranja de la lámina; la blanca nunca vuelve a
 * cortarse de este envolvente (es `pata-del-lejana.png`, con su garra
 * completada y su pliegue real de contorno). No queda ningún borde compartido
 * entre dos mitades del mismo plano.
 */
export const CORTE_PATAS_DEL = {
  px: 179, py: 310, nx: 0.99, ny: 0.1406, u0: -9, u1: 9,
  /* A nivel de ZARPA la recta de columnas atraviesa los DEDOS de la pata
   * naranja (sus dedos alcanzan x≈168, medido en la grilla del refino
   * arte-patas 2026-08-18): con la recta sola, la pieza blanca se llevaba
   * una copia feathered de los arcos de dedos naranjas —la "garra fantasma"
   * que colgaba bajo la zarpa blanca al caminar— y la naranja perdía su
   * punta por el feather. Bajo `zarpa.y0..y1` el corte se DOBLA a una
   * frontera vertical en el canal de sombra entre las dos zarpas (x≈163),
   * con feather corto: la naranja se queda con su bloque de dedos COMPLETO
   * y la blanca termina limpia en su talón repintado (ver el PNG). */
  zarpa: { y0: 348, y1: 360, x: 163, u0: -5, u1: 5 },
};

/**
 * ESQUELETO de las 4 patas: articulación (hombro/cadera) → rodilla → pie, en
 * px de lámina. Articulaciones = pivotes MEDIDOS (anatomia/capas de las ramas
 * previas + NOTAS.md del set de arte). Rodillas y pies = medidos sobre los
 * PNG de cada pata con grilla de coordenadas (mismo método que el resto de
 * este archivo; recortes 3× en `_gate/jaguar-gait/`, no versionados).
 *
 *   `lado` = hacia dónde apunta el VÉRTICE al doblar (signo del IK de 2
 *   huesos): las delanteras doblan por el carpo con el vértice hacia
 *   ADELANTE (−x, la garra cuelga detrás de la muñeca al levantar); las
 *   traseras doblan por el corvejón con el vértice hacia ATRÁS (+x). Con
 *   estos signos el IK sobre el pie de REPOSO reproduce la rodilla medida
 *   (verificado numéricamente en marcha.test.js) → entrar/salir de la marcha
 *   no da tirón.
 *
 *   `fase` = momento del CONTACTO del pie en el ciclo (0..1), secuencia
 *   lateral de marcha felina: trasera cercana → delantera cercana → trasera
 *   lejana → delantera lejana, a cuartos de ciclo.
 *
 *   `anclaje` = pisada neutra de MEDIO APOYO. En las DELANTERAS el anclaje es
 *   (casi) el pie dibujado: la pata está a un soplo de la extensión total
 *   (d reposo ≈ L1+L2), así que correr el objetivo apenas 3px (arriba o
 *   atrás) doblaba el carpo −20°..−29° durante TODO el apoyo — la zarpa
 *   colgaba plegada mientras cargaba peso, el "caminar rarísimo" (refino
 *   arte-patas 2026-08-18). Con el anclaje en el pie, el apoyo pasa por el
 *   reposo (flexión ≤9°, como las traseras) y el sobre-alcance en los
 *   extremos de zancada lo absorbe la proyección del IK (≤3.5px de acorte,
 *   un touch-down suave — medido en la simulación del ciclo, sin clamp de
 *   dMin en apoyo). En la trasera lejana el X del anclaje queda 12px
 *   ADELANTE del pie de reposo (no 20): re-centrar su barrido hacia el reposo
 *   acota la rotación del muslo y la cápsula sintética no asoma por detrás de
 *   la grupa (refino 2026-08-18, ver abajo).
 *
 *   `rodillaCorte` = dónde se parte el arte de la pata en segmento superior /
 *   inferior (banda horizontal con solape de respaldo — ver capas.js).
 *
 * REFINO DE PATAS (2026-08-18, feedback del operador: traseras con la
 * articulación rara, delanteras "algo raro" en el ciclo):
 *   `plieMax` = tope de FLEXIÓN de la rodilla en grados sobre el reposo. El IK
 *   lo convierte en un piso de distancia articulación→pie (`dMin`): si el
 *   objetivo del vuelo queda más cerca, el pie se proyecta sobre la misma
 *   recta (el carpo delantero llegaba a −59° y la zarpa se enroscaba contra
 *   la pata blanca leyéndose rota; 36° la tapó a medias; con 28° el vuelo
 *   pliega el carpo con la discreción felina de las traseras, refino
 *   arte-patas 2026-08-18). En APOYO el tope NUNCA muerde (verificado en
 *   marcha.test.js): la pisada clavada no se toca.
 *   PIVOTES traseros ARRIBA (240 → 226/228): la cabeza del fémur vive DENTRO
 *   del cuerpo, no en el borde del corte. Con el pivote en el borde, el arte
 *   del muslo barría con brazo de palanca largo: la cápsula sintética del
 *   muslo lejano asomaba por detrás de la grupa (~12px), las islitas de
 *   pelaje del cuerpo quedaban desfasadas sobre la pata y la ventana vacante
 *   mostraba fondo (la cuña beige del gif). Pivote adentro + anclaje
 *   re-centrado + `amplitud` 25 dejan el borde superior del arte trasero en
 *   ≤5px de desplazamiento en los extremos — bajo los desvanecidos.
 *   `lift` traseras 16/14 → 10: en la marcha felina los pies traseros
 *   levantan poco; menos lift = menos colapso de `d` = menos pistón de cadera
 *   (la trasera cercana pasaba de −43° a −33° de pico).
 */
export const RIG_MARCHA = {
  delLejana: {
    articulacion: [160, 236], rodilla: [154, 332], pie: [155, 384],
    lado: -1, fase: 0.75, lift: 11, anclaje: [159, 384], rodillaCorte: 332,
    plieMax: 28,
  },
  delCercana: {
    articulacion: [208, 236], rodilla: [196, 335], pie: [193, 386],
    lado: -1, fase: 0.25, lift: 11, anclaje: [197, 386], rodillaCorte: 335,
    plieMax: 28,
  },
  trasCercana: {
    articulacion: [428, 226], rodilla: [448, 298], pie: [385, 357],
    lado: 1, fase: 0, lift: 10, anclaje: [420, 357], rodillaCorte: 298,
    plieMax: 26,
  },
  trasLejana: {
    articulacion: [522, 228], rodilla: [570, 315], pie: [540, 363],
    lado: 1, fase: 0.5, lift: 10, anclaje: [528, 363], rodillaCorte: 315,
    plieMax: 26,
  },
};

/**
 * Parámetros del ciclo de marcha. `amplitud` = media zancada (px de lámina;
 * el pie barre anclaje±amplitud). `duty` = fracción del ciclo con el pie
 * APOYADO (0.62, marcha cuadrúpeda típica). `velocidadPxS` = velocidad de
 * pantalla que asume el anclaje de pisada — DEBE coincidir con `PX_POR_SEG`
 * de `useCompaiRoam.js` (34 px/s): el período del ciclo se deriva de ella
 * (T = 2·amplitud·escala / (duty·v)) para que el pie apoyado quede CLAVADO
 * en el suelo mientras el compai se desplaza — cero moonwalk. `bob` = vaivén
 * vertical de la masa (2 por ciclo), en px de lámina.
 */
export const MARCHA = {
  duty: 0.62,
  amplitud: 25,
  velocidadPxS: 34,
  bob: 2.2,
};

export default {
  CARPETA_LAMINA,
  ARCHIVO_LAMINA,
  ANCHO,
  ALTO,
  CABEZA,
  OJO,
  OJO_2,
  PATAS_DEL,
  PATA_TRASERA,
  COLA,
  CUERPO_PIVOTE,
  OREJA_IZQ,
  OREJA_DER,
  MANDIBULA,
  BOCA,
  CARPETA_RIG,
  CAPAS_RIG,
  CORTE_PATAS_DEL,
  RIG_MARCHA,
  MARCHA,
};
