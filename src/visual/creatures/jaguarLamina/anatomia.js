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
};
