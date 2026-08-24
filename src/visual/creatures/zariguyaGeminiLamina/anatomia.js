/**
 * zariguyaGeminiLamina/anatomia — la anatomía MEDIDA del SET GEMINI aprobado
 * por el operador (2026-08-23, `pixel-cosecha/zariguya-gemini/
 * SET-APROBADO-OPERADOR.md`): la HERO `zariguya-gemini-hero.png` (481×444,
 * estilo grabado/tinta: erguida, LÁPIZ en la pata alzada, BRÚJULA en la otra,
 * cola prensil en C) como cuerpo base articulado, MÁS el manifiesto de las
 * POSES PLENAS del set (de-frente cute, ver-lupa, muerta, escucha ×4) y la
 * colocación de la pieza de rig `cola` para el enroscado 2.5D.
 *
 * DE DÓNDE SALEN LOS NÚMEROS (honestidad del método):
 *   - Las medidas del cuerpo/cara sobre la HERO se HEREDAN VERBATIM de
 *     `zariguyaLamina/anatomia.js` (rama `feat/zariguya-lamina-viva`): esa
 *     lámina (`zariguya.png`, 481×444) es EL MISMO ENCUADRE que la hero del
 *     set Gemini — verificado con `sharp`/ImageMagick: AE 766 píxeles
 *     distintos de 213 564 (0.36%), concentrados en las MANOS (ver abajo).
 *     Re-medir desde cero habría sido reinventar lo aprobado.
 *   - La ÚNICA diferencia de píxeles entre ambas versiones: la hero del
 *     SET-LIMPIO ya trae PATAS NATURALISTAS con dedos (el retoque aprobado);
 *     `zariguya.png` traía guantes blancos que `zariguyaLamina/capas.js`
 *     oscurecía en runtime (`pielDePatas`). Esa cirugía aquí NO EXISTE — los
 *     píxeles buenos ya vienen en la lámina (ver capas.js de esta carpeta).
 *   - La colocación de `PARTE_COLA` y los bbox de las poses se midieron con
 *     `sharp` (bbox por alfa) + grillas de coordenadas superpuestas, y se
 *     afinan contra capturas Chromium reales (la vitrina del informe).
 *
 * Los pivotes son puntos en PÍXEL DE LÁMINA (0..ANCHO, 0..ALTO), el mismo
 * espacio de las máscaras de `capas.js`; el componente los convierte a %.
 *
 * @module visual/creatures/zariguyaGeminiLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'zariguya-gemini-hero.png';
export const ANCHO = 481;
export const ALTO = 444;

/** Corte cabeza/cuerpo: recta del cuello + desvanecido de pecho por Y
 *  (heredado verbatim de zariguyaLamina — mismo encuadre, ver docstring). */
export const CABEZA = {
  cuello: { px: 220, py: 180, nx: 0.309, ny: 0.951, u0: -12, u1: 12 },
  fadePecho: { y0: 196, y1: 226 },
  pivote: [200, 168],
};

/** Los DOS ojos (globo + órbita del antifaz); `r` = radio del parche de
 *  párpado. Idénticos en ambas versiones de la lámina (el retoque no tocó
 *  la cara). */
export const OJO = { cx: 184, cy: 76, r: 20 };
export const OJO_2 = { cx: 242, cy: 73, r: 20 };

/** Oreja izquierda (interior rosado). ANTI-HUECO: a la cabeza solo se le
 *  resta la parte ALTA (`baseSub`); la base queda de respaldo. */
export const OREJA_IZQ = {
  box: { x0: 84, x1: 148, xFade: 6 },
  base: { y0: 74, y1: 96 },
  baseSub: { y0: 48, y1: 68 },
  pivote: [118, 86],
};

/** Oreja derecha — linda con la órbita del ojo derecho (y≈52): fade alto,
 *  perk corto. */
export const OREJA_DER = {
  box: { x0: 226, x1: 296, xFade: 6 },
  base: { y0: 42, y1: 58 },
  baseSub: { y0: 22, y1: 38 },
  pivote: [258, 56],
};

/** Mandíbula de la sonrisa YA abierta (jaw=0 = lámina exacta; el visema la
 *  abre MÁS). `colmillo` excluye el colmillo superior (maxilar de arriba). */
export const MANDIBULA = {
  box: { x0: 128, x1: 244, xFade: 8 },
  labio: { y0: 138, y1: 148 },
  menton: { y0: 160, y1: 176 },
  colmillo: { x0: 214, x1: 248, xFade: 5, y0: 124, y1: 152, yFade: 6 },
  pivote: [134, 110],
};

/** Interior de boca sintético (único píxel no-PNG): bajo los dientes
 *  superiores, para ANTES del colmillo grande. */
export const BOCA = { cx: 189, cy: 141, ancho: 68 };

/** Brazo del lápiz (pata alzada): cápsula lápiz + elipse pata + antebrazo
 *  con fade axial hacia el hombro. Las puntas de bigote quedan a ≥9px del
 *  lápiz (medido en la versión anterior; el retoque no movió el lápiz). */
export const BRAZO_LAPIZ = {
  lapiz: { ax: 14, ay: 228, bx: 84, by: 132, r: 10, rFade: 3 },
  guante: { cx: 58, cy: 175, rx: 42, ry: 41, e0: 0.78, e1: 1.02 },
  antebrazo: { ax: 92, ay: 198, bx: 178, by: 258, r: 24, rFade: 8, t0: 0.62, t1: 0.95 },
  pivote: [162, 242],
};

/** Brazo de la brújula (pata contra el pecho). Detrás de la pata hay PECHO —
 *  lo rellena INPAINT_PECHO en el cuerpo. */
export const BRAZO_BRUJULA = {
  brujula: { cx: 112, cy: 262, r: 31, rFade: 4 },
  guante: { cx: 151, cy: 263, rx: 36, ry: 36, e0: 0.8, e1: 1.0 },
  antebrazo: { ax: 168, ay: 246, bx: 206, by: 222, r: 20, rFade: 7, t0: 0.55, t1: 0.9 },
  pivote: [198, 232],
};

/** Inpaint del pecho tras la pata de la brújula: clona lanilla del propio
 *  vientre (+dx,+dy) — píxeles de la lámina, movidos; cero color inventado. */
export const INPAINT_PECHO = {
  x0: 142, x1: 196, y0: 226, y1: 302, dx: 70, dy: 40, umbral: 0.45,
};

/** Corte cuerpo/cola de la HERO (banda vertical en la grupa, x≈352). La capa
 *  horneada de cola EXISTE (respaldo si la pieza de rig no carga) pero en el
 *  componente la reemplaza PARTE_COLA — ver abajo. */
export const COLA = {
  cut: { px: 352, py: 330, nx: 1, ny: 0, u0: -16, u1: 16 },
  pivote: [358, 360],
};

/** Pivote del cuerpo para respirar/bob (centro de masa del tronco). */
export const CUERPO_PIVOTE = [235, 300];

/* ════════════════════════════════════════════════════════════════════════════
 * LO NUEVO DEL SET GEMINI: la pieza de rig de la cola y las poses plenas.
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * PARTE_COLA — `zariguya-gemini-rig-cola.png` (399×323, del despiece
 * `SET-LIMPIO/rig/` aprobado para 2.5D): la cola prensil COMPLETA dibujada
 * aparte, con todos sus píxeles. A diferencia de la cola horneada (recorte
 * rígido de la lámina que solo tolera ±3° antes de delatar el corte), esta
 * pieza puede ENROSCARSE con amplitud real sin abrir fondo — vive casi toda
 * sobre transparencia y su base peluda queda DETRÁS del cuerpo.
 *
 * COLOCACIÓN (medida con grillas sharp sobre ambas imágenes): se ancla la
 * transición pelo→piel desnuda de la pieza (≈(190,295) en px de la pieza) a
 * la emergencia de la cola en la grupa de la hero (≈(370,350) en px de
 * lámina), escala 0.42 (la C de la pieza queda del alto de la C de la hero:
 * 311px×0.42≈131px = alto medido del rulo hero). El muñón desvanecido que el
 * corte de banda deja en el cuerpo (x 336-368) queda DEBAJO de la base de la
 * pieza — misma zona, píxeles de cola sobre píxeles de cola.
 *
 *   x,y     → esquina superior-izquierda de la pieza, en px de LÁMINA hero.
 *   w,h     → tamaño de la pieza YA escalada, en px de lámina.
 *   pivote  → punto de giro (la emergencia en la grupa), en px de lámina.
 *
 * QUÉ NO SE USA DEL DESPIECE (decisión mirada, no omisión): `mano.png` trae
 * GUANTES BLANCOS estilo cartoon y la hero aprobada tiene PATAS naturalistas
 * — mezclarlos cambiaría el personaje a mitad de gesto. `cabeza.png` mira al
 * lado CONTRARIO (¾ derecha) y con otra expresión: pegarla sobre la testa de
 * la hero sería otro animal. `pata-1..3.png` son para MARCHA (superficie
 * kart/valle, trabajo aparte) — el avatar del agente no camina con patas
 * propias (lección "3-4 patas" del jaguar).
 */
export const PARTE_COLA = {
  archivo: 'zariguya-gemini-rig-cola.png',
  W: 399,
  H: 323,
  escala: 0.42,
  x: 290.2,
  y: 226.1,
  w: 167.6, // 399 × 0.42
  h: 135.7, // 323 × 0.42
  pivote: [365, 350],
};

/**
 * POSES PLENAS — láminas completas del set aprobado que el componente
 * intercambia por crossfade cuando el estado lo pide. Cada una con su
 * tamaño real (para reservar layout) y su anclaje: todas van CONTENIDAS en
 * el stage de la hero, ancladas al piso (objectPosition '50% 100%') para
 * que la línea de pies no salte entre poses (bbox por alfa medido: el
 * margen inferior de contenido es ≤8px en todas).
 *
 *   cute    → idle/momento 'reposo': se voltea de frente, quieta y tierna.
 *   verlupa → thinking: lupa + documento (la investigadora trabajando).
 *   muerta  → idle/momento 'tanatosis': el gag firma ("playing possum",
 *             lengua afuera). Va ACOSTADA — el anclaje al piso la tiende.
 *   escucha → listening: 02→03→04 (cuerpo entero, misma escala de figura,
 *             la oreja crece — medido: alturas de contenido 444/452/434).
 *             `escucha-01` es un CLOSE-UP de cabeza+mano (otro encuadre):
 *             NO entra al ciclo (sería un corte de cámara); se usa como
 *             plano único cuando el avatar es chico (size < UMBRAL_CLOSEUP)
 *             — a 48px una cabeza gigante lee mejor que un cuerpo lejano.
 */
export const POSES = {
  cute: { archivo: 'zariguya-gemini-cute.png', W: 434, H: 700 },
  verlupa: { archivo: 'zariguya-gemini-verlupa.png', W: 800, H: 588 },
  muerta: { archivo: 'zariguya-gemini-muerta.png', W: 800, H: 390 },
  'escucha-01': { archivo: 'zariguya-gemini-escucha-01.png', W: 444, H: 419 },
  'escucha-02': { archivo: 'zariguya-gemini-escucha-02.png', W: 438, H: 456 },
  'escucha-03': { archivo: 'zariguya-gemini-escucha-03.png', W: 439, H: 464 },
  'escucha-04': { archivo: 'zariguya-gemini-escucha-04.png', W: 467, H: 446 },
};

/** El ciclo de escucha (cuerpo entero): sube 02→03→04 y baja por 03 — un
 *  vaivén de atención, no un loop que "salta" del 04 al 02. */
export const ESCUCHA_CICLO = ['escucha-02', 'escucha-03', 'escucha-04', 'escucha-03'];

/** ms por paso del ciclo de escucha (con crossfade CSS de ~240ms encima). */
export const ESCUCHA_PASO_MS = 760;

/** Por debajo de este size (px) `listening` usa el close-up `escucha-01`. */
export const UMBRAL_CLOSEUP = 120;

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
  PARTE_COLA,
  POSES,
  ESCUCHA_CICLO,
  ESCUCHA_PASO_MS,
  UMBRAL_CLOSEUP,
};
