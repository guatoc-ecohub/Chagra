/**
 * luciernagaLamina/capas — hornea `luciernaga.png` en capas por ALFA para el
 * rig 2.5D (corte C4): cuerpo COMPLETO (con cabeza — no se corta cuello) +
 * alaIzq/alaDer (élitros) + 2 antenas + manoLapiz + linterna + mandíbula,
 * más los dos parches de párpado. Motor del jaguar (`jaguarLamina/capas.js`,
 * aprobado por el operador) con las lecciones de la ronda de costuras.
 *
 * EL MÉTODO:
 *   - Todo el color sale del PNG (única excepción aprobada: la cirugía de
 *     tarsos, que repinta las manoplas claras como tarsos de insecto con la
 *     huella intacta — `pielDeTarsos`). Aquí solo se decide, píxel a píxel,
 *     QUÉ ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" se DESVANECE en el borde de su corte
 *     (`smoothstep`). Las capas de ABAJO NO se desvanecen: se borran con
 *     corte duro SOLO donde la pieza de encima ya es ~opaca (≥99,6%) — el
 *     `hard` que cerró las costuras (una resta blanda (1−m) deja un anillo
 *     translúcido PERMANENTE; con `hard` la capa de abajo conserva el píxel
 *     completo de respaldo y la pieza pinta encima: en reposo el compuesto
 *     es idéntico a la lámina, al articular el respaldo queda detrás).
 *   - ORDEN Z (de atrás a adelante): alas < cuerpo < linterna < manoLapiz <
 *     antenas < interiorBoca < mandíbula < párpados. Las ALAS van DETRÁS:
 *     emergen de las hombreras y se meten bajo el tórax/cuaderno, así su
 *     giro se esconde solo.
 *   - RESPALDO DE VIAJE de las alas (`extenderRespaldo`): la textura del
 *     ala se extiende por dilatación unos px hacia los píxeles de silueta
 *     que la ocluyen (armadura, farol, cuaderno, brazo). Oculto en reposo
 *     (el cuerpo pinta encima), emerge CON el ala al girar: el flanco no
 *     abre fondo ni hacia afuera (el respaldo sale de abajo) ni hacia
 *     adentro (el ala se mete bajo el cuerpo). Es el cuerpo-inpaint de este
 *     corte, viajando con la pieza móvil.
 *   - La LINTERNA excluye las franjas de pierna que la cruzan por delante:
 *     LATE por filtro, no se mueve — ver anatomia.js.
 *   - El párpado es un parche de LA PROPIA lámina (la piel de la frente
 *     encima de cada ojo) recortado a elipse y alfa-recortado con la
 *     silueta real en el punto de destino — parpadeo real, nunca un
 *     párpado dibujado. Dos parches que comparten cadencia.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearLuciernaga()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/luciernagaLamina/capas
 */
import {
  OJO, OJO_2, MANDIBULA,
  ANTENA_IZQ, ANTENA_DER, MANO_LAPIZ,
  ALA_IZQ, ALA_DER, CUADERNO_GUANTE,
  LINTERNA, PIERNA_IZQ, PIERNA_DER,
} from './anatomia.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function haySoporteCanvas() {
  if (typeof document === 'undefined') return false;
  try {
    const cv = document.createElement('canvas');
    return !!(cv.getContext && cv.getContext('2d'));
  } catch {
    return false;
  }
}

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Caja en X con bordes suaves — el ladrillo de todas las máscaras. */
function fxCaja(x, { x0, x1, xFade }) {
  return ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
}

/** Interpola x sobre una polilínea de puntos [y, x] (clavada en los extremos). */
function interpY(pts, y) {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const t = (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

/** Antena: caja en X × desvanecido hacia la BASE (opaca arriba — la punta
 *  del hilo—, se funde a 0 donde nace de la frente). Patrón oreja-jaguar. */
function mascaraAntena(x, y, antena) {
  return fxCaja(x, antena.box) * (1 - ss(antena.base.y0, antena.base.y1, y));
}

/** Antena para RESTARLA del cuerpo: se corta más ARRIBA (`baseSub`) —
 *  deja la base también en el cuerpo, de respaldo anti-hueco al girar. */
function mascaraAntenaSub(x, y, antena) {
  return fxCaja(x, antena.box) * (1 - ss(antena.baseSub.y0, antena.baseSub.y1, y));
}

/** Mandíbula: caja en X × opaca ENTRE el labio (arriba) y el fin del
 *  mentón (abajo). La sonrisa queda arriba, en el cuerpo (cara intacta). */
function mascaraMandibula(x, y) {
  const { box, labio, menton } = MANDIBULA;
  return fxCaja(x, box) * ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
}

/** Frente del ala izquierda a la altura `y` (bajo y≈292 el brazo terminó y
 *  el frente es la propia silueta: sin cota). */
const xFrenteAlaIzq = (y) => (y < 292 ? interpY(ALA_IZQ.borde, y) : -60);

/** Mano del lápiz: caja en X × techo (arriba pasa la antena izquierda) ×
 *  desvanecido en la MUÑECA × exclusión del borde de ataque del élitro
 *  (ese filo es píxel del ALA — el corte anterior lo arrastraba al
 *  gesticular). */
function mascaraMano(x, y) {
  const xF = xFrenteAlaIzq(y);
  return fxCaja(x, MANO_LAPIZ.box)
    * ss(MANO_LAPIZ.techo.y0, MANO_LAPIZ.techo.y1, y)
    * (1 - ss(MANO_LAPIZ.muneca.y0, MANO_LAPIZ.muneca.y1, y))
    * (1 - ss(xF - 8, xF - 1, x));
}

/** Banda de pierna: distancia al segmento cadera→bota con borde suave.
 *  Solo EXCLUYE la pierna de la linterna — la pierna vive en el cuerpo. */
function bandaPierna(x, y, p) {
  const dx = p.x1 - p.x0;
  const dy = p.y1 - p.y0;
  const t = clamp(((x - p.x0) * dx + (y - p.y0) * dy) / (dx * dx + dy * dy), 0, 1);
  const d = Math.hypot(x - (p.x0 + t * dx), y - (p.y0 + t * dy));
  return 1 - ss(p.medio, p.medio + 6, d);
}

/** Linterna: elipse suave sobre el farol × (1 − piernas por delante). */
function mascaraLinterna(x, y) {
  const nx = (x - LINTERNA.cx) / LINTERNA.rx;
  const ny = (y - LINTERNA.cy) / LINTERNA.ry;
  const elipse = 1 - ss(0.85, 1.03, Math.hypot(nx, ny));
  return elipse * (1 - bandaPierna(x, y, PIERNA_IZQ)) * (1 - bandaPierna(x, y, PIERNA_DER));
}

/** Ala izquierda: banda en Y (techo bajo la hombrera → punta) × a la
 *  IZQUIERDA del contorno interior × a la DERECHA del frente (guante/brazo
 *  quedan fuera). La silueta externa la pone el alfa del PNG. */
function mascaraAlaIzq(x, y) {
  const A = ALA_IZQ;
  const banda = ss(A.techo.y0, A.techo.y1, y) * (1 - ss(A.fondo.y0, A.fondo.y1, y));
  if (banda <= 0) return 0;
  const xInt = interpY(A.interior, y);
  const xF = xFrenteAlaIzq(y);
  return banda * (1 - ss(xInt - 3, xInt + 3, x)) * ss(xF - 5, xF + 2, x);
}

/** Cuaderno + guante que lo sujeta: oclusor del ala derecha que SE QUEDA en
 *  el cuerpo (quad de 4 semiplanos con feather + elipse del guante). */
function mascaraCuadernoGuante(x, y) {
  const q = CUADERNO_GUANTE.quad;
  let quad = 1;
  for (let i = 0; i < 4 && quad > 0; i++) {
    const [ax, ay] = q[i];
    const [bx, by] = q[(i + 1) % 4];
    const d = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay);
    quad *= ss(-3, 3, d);
  }
  const guante = 1 - ss(0.9, 1.06,
    Math.hypot((x - TARSO_CUADERNO.cx) / TARSO_CUADERNO.rx, (y - TARSO_CUADERNO.cy) / TARSO_CUADERNO.ry));
  return Math.max(quad, guante);
}

/** Ala derecha: banda en Y × a la DERECHA del contorno interior × fuera del
 *  cuaderno/guante. La silueta externa la pone el alfa del PNG. */
function mascaraAlaDer(x, y) {
  const A = ALA_DER;
  const banda = ss(A.techo.y0, A.techo.y1, y) * (1 - ss(A.fondo.y0, A.fondo.y1, y));
  if (banda <= 0) return 0;
  const xInt = interpY(A.interior, y);
  return banda * ss(xInt - 3, xInt + 3, x) * (1 - mascaraCuadernoGuante(x, y));
}

/* Cirugía de los dos tarsos (aprobada): la lámina trae manoplas claras, pero
 * en un insecto los extremos de las patas deben leer como tarsos
 * articulados. Las elipses solo acotan los píxeles de las manos; los útiles
 * quedan fuera mediante sus ejes y el alfa original se conserva. */
const TARSO_LAPIZ = { cx: 44, cy: 230, rx: 43, ry: 40 };
const TARSO_CUADERNO = { cx: 280, cy: 355, rx: 40, ry: 34 };

function distanciaSegmento(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

function dentroElipse(x, y, { cx, cy, rx, ry }) {
  return Math.hypot((x - cx) / rx, (y - cy) / ry) <= 1;
}

function esLapiz(x, y, r, g, b) {
  return distanciaSegmento(x, y, 4, 262, 82, 195) < 7
    && r - b > 50 && g - b > 30;
}

function esPagina(x, y, r, g, b) {
  return x >= 200 && x < 258 && y < 350 && r - b > 28 && g - b > 10;
}

function enTarso(x, y) {
  return dentroElipse(x, y, TARSO_LAPIZ) || dentroElipse(x, y, TARSO_CUADERNO);
}

function pintaGarra(d, src, W, H, x0, y0, x1, y1, ancho) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  for (let y = Math.floor(Math.min(y0, y1) - ancho); y <= Math.ceil(Math.max(y0, y1) + ancho); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - ancho); x <= Math.ceil(Math.max(x0, x1) + ancho); x++) {
      const t = clamp(((x - x0) * dx + (y - y0) * dy) / (len * len), 0, 1);
      const w = ancho * (1 - t) * 0.5;
      const px = x0 + t * dx;
      const py = y0 + t * dy;
      if (Math.hypot(x - px, y - py) > w || !enTarso(x, y) || x < 0 || x >= W || y < 0 || y >= H) continue;
      const i = (y * W + x) * 4;
      if (i < 0 || i + 3 >= src.length || !src[i + 3]
        || esLapiz(x, y, src[i], src[i + 1], src[i + 2])) continue;
      d[i] = 37; d[i + 1] = 29; d[i + 2] = 24;
    }
  }
}

export function pielDeTarsos(src, W, H) {
  const d = new Uint8ClampedArray(src);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!enTarso(x, y)) continue;
      const i = (y * W + x) * 4;
      if (!src[i + 3] || esPagina(x, y, src[i], src[i + 1], src[i + 2])
        || esLapiz(x, y, src[i], src[i + 1], src[i + 2])) continue;
      const luz = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const t = ss(105, 220, luz);
      if (!t) continue;
      d[i] = src[i] * (1 - t) + (50 + src[i] * 0.18) * t;
      d[i + 1] = src[i + 1] * (1 - t) + (36 + src[i + 1] * 0.14) * t;
      d[i + 2] = src[i + 2] * (1 - t) + (25 + src[i + 2] * 0.10) * t;
    }
  }
  const garras = [
    [57, 218, 43, 209, 4], [58, 229, 41, 220, 3.8],
    [59, 241, 43, 239, 3.6], [52, 250, 42, 255, 3.2],
    [278, 349, 263, 342, 3.6], [285, 355, 268, 351, 3.4],
    [287, 363, 271, 365, 3.4], [281, 370, 269, 375, 3.1],
  ];
  for (const garra of garras) pintaGarra(d, src, W, H, ...garra);
  return d;
}

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad para `hornearLuciernaga`, el candado de tests y los
 * medidores offline (el medidor importa ESTAS fórmulas, no una copia que no
 * vería un fix).
 *
 * Prioridad de encima hacia abajo: párpados/mandíbula/antenas/mano/linterna
 * > cuerpo > alas. El CUERPO no se corta al cuello: la testa (con toda la
 * cara menos el mentón-pieza) viaja fusionada — regla dura del corte C4.
 */
export function mascaras() {
  // Corte DURO para restar una pieza de la capa de ABAJO: la capa conserva
  // el píxel COMPLETO hasta que la pieza de encima es ~opaca (umbral 0,996;
  // con un umbral menor, en la banda del desvanecido ambas capas quedan
  // semiopacas y el compuesto over pierde alfa — banda pálida visible).
  // Regla de la casa: resta sobre capa de ABAJO → dura; VENTANA sobre capa
  // de ENCIMA (p. ej. las piernas en la linterna) → suave.
  const hard = (m) => 1 - ss(0.996, 1, m);
  const mAlaIzq = (x, y) => mascaraAlaIzq(x, y);
  const mAlaDer = (x, y) => mascaraAlaDer(x, y);
  const mAntenaIzq = (x, y) => mascaraAntena(x, y, ANTENA_IZQ);
  const mAntenaDer = (x, y) => mascaraAntena(x, y, ANTENA_DER);
  const mMandibula = (x, y) => mascaraMandibula(x, y);
  const mManoLapiz = (x, y) => mascaraMano(x, y);
  const mLinterna = (x, y) => mascaraLinterna(x, y);
  // El cuerpo (CON cabeza) = todo menos: las alas visibles (viven detrás —
  // si el cuerpo las pintara, taparía el aleteo con una copia quieta), las
  // antenas por su parte ALTA (`baseSub`: la base queda de respaldo), la
  // mandíbula, la mano y la linterna donde son ~opacas. Todas las restas
  // son duras: bajo cada banda de desvanecido el cuerpo conserva el píxel
  // completo de respaldo.
  const mCuerpo = (x, y) => hard(mAlaIzq(x, y)) * hard(mAlaDer(x, y))
    * hard(mascaraAntenaSub(x, y, ANTENA_IZQ)) * hard(mascaraAntenaSub(x, y, ANTENA_DER))
    * hard(mMandibula(x, y)) * hard(mManoLapiz(x, y)) * hard(mLinterna(x, y));
  return {
    mCuerpo, mAlaIzq, mAlaDer, mMandibula,
    mAntenaIzq, mAntenaDer, mManoLapiz, mLinterna,
  };
}

/**
 * RESPALDO DE VIAJE: dilata la textura ya pintada de una capa hacia los
 * píxeles de silueta sólida adyacentes que NO son suyos (los que la ocluyen:
 * armadura, farol, cuaderno, brazo). El respaldo queda OCULTO en reposo (la
 * capa de encima conserva allí su píxel completo) y emerge con la pieza al
 * girar — el flanco nunca abre fondo. `pasos` acota la extensión en px y
 * debe superar el desplazamiento máximo del giro (±2,5° a ~210px de la raíz
 * ≈ 9px; 14 deja margen).
 *
 * Pura sobre buffers (sin canvas): el medidor offline ejercita ESTA función.
 * @param {Uint8ClampedArray} d    capa RGBA ya pintada (se muta)
 * @param {Uint8ClampedArray|Buffer} sd  lámina RGBA (fuente de silueta)
 * @param {number} W @param {number} H @param {number} [pasos]
 */
export function extenderRespaldo(d, sd, W, H, pasos = 14) {
  for (let k = 0; k < pasos; k++) {
    const nuevos = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] >= 200) continue;     // ya es sólido (textura o respaldo)
        if (sd[i + 3] < 200) continue;     // fuera de silueta sólida: jamás
        for (const j of [i - 4, i + 4, i - W * 4, i + W * 4]) {
          if (d[j + 3] >= 200) { nuevos.push([i, j]); break; }
        }
      }
    }
    if (!nuevos.length) return;
    for (const [i, j] of nuevos) {
      // la banda de desvanecido del borde (alfa parcial) también se
      // solidifica — sin esto el crecimiento nunca cruza el propio fade de
      // la pieza y el respaldo no llega al flanco. Su color ya es el bueno;
      // a los píxeles vacíos se les clona el del vecino.
      if (!d[i + 3]) { d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; }
      // clavado a la silueta original: el respaldo nunca la excede
      d[i + 3] = sd[i + 3];
    }
  }
}

/**
 * Hornea las capas + los parches de párpado a partir de la imagen ya
 * cargada. Devuelve canvases del MISMO tamaño que el PNG (comparten
 * encuadre — cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún
 *   no cargó (naturalWidth/Height en 0) — blinda contra un `onload` que
 *   dispara antes de tiempo.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,
 *   alaIzq:HTMLCanvasElement,alaDer:HTMLCanvasElement,
 *   mandibula:HTMLCanvasElement,antenaIzq:HTMLCanvasElement,
 *   antenaDer:HTMLCanvasElement,manoLapiz:HTMLCanvasElement,
 *   linterna:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearLuciernaga(img, dims = {}) {
  const { ancho, altoPx } = dims;
  if (!haySoporteCanvas()) return null;
  const W = img.naturalWidth || ancho;
  const H = img.naturalHeight || altoPx;
  if (!W || !H) return null;

  const base = lienzo(W, H);
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, 0, 0, W, H);
  let src;
  try {
    src = bctx.getImageData(0, 0, W, H);
  } catch {
    // canvas "tainted" (CORS) o getImageData no implementado.
    return null;
  }
  const sd = src.data;
  const sdTarsos = pielDeTarsos(sd, W, H);

  const m = mascaras();

  const pintarBuf = (mascara) => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = sdTarsos[i + 3];
        if (!a) continue;
        const ma = a * mascara(x, y);
        if (ma < 0.5) continue;
        d[i] = sdTarsos[i]; d[i + 1] = sdTarsos[i + 1]; d[i + 2] = sdTarsos[i + 2];
        d[i + 3] = ma;
      }
    }
    return d;
  };
  const aCanvas = (d) => {
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    im.data.set(d);
    g.putImageData(im, 0, 0);
    return cv;
  };
  const pintar = (mascara) => aCanvas(pintarBuf(mascara));

  // Las alas llevan respaldo de viaje (ver extenderRespaldo).
  const alaIzqBuf = pintarBuf(m.mAlaIzq);
  const alaDerBuf = pintarBuf(m.mAlaDer);
  extenderRespaldo(alaIzqBuf, sd, W, H);
  extenderRespaldo(alaDerBuf, sd, W, H);

  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    cuerpo: pintar(m.mCuerpo),
    alaIzq: aCanvas(alaIzqBuf),
    alaDer: aCanvas(alaDerBuf),
    mandibula: pintar(m.mMandibula),
    antenaIzq: pintar(m.mAntenaIzq),
    antenaDer: pintar(m.mAntenaDer),
    manoLapiz: pintar(m.mManoLapiz),
    linterna: pintar(m.mLinterna),
    parpado,
    parpado2,
  };
}

/**
 * Parche de párpado: roba el rectángulo de píxeles que está ENCIMA del ojo
 * (piel de la frente propia del bicho, nunca un color inventado), lo
 * recorta a elipse y lo alfa-recorta con la silueta real en el punto de
 * DESTINO. Puerto 1:1 del jaguar (incluido su tamaño 3.1r×2.6r, medido con
 * Playwright que sí mueve la aguja a tamaño de avatar — ver el docstring
 * original en jaguarLamina/capas.js).
 */
function parcheParpado(sd, W, H, ojo) {
  const { cx, cy, r } = ojo;
  const w = Math.ceil(r * 3.1);
  const h = Math.ceil(r * 2.6);
  const fx0 = Math.round(cx - w / 2);
  const fy0 = Math.round(cy - r * 1.5 - h / 2);
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);

  const cv = lienzo(w, h);
  const g = cv.getContext('2d');
  const im = g.createImageData(w, h);
  const d = im.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sx = clamp(fx0 + x, 0, W - 1);
      const sy = clamp(fy0 + y, 0, H - 1);
      const j = (sy * W + sx) * 4;
      // alfa de FUENTE: un punto en fondo transparente no tiene color real
      // (RGB queda en 0,0,0) — sin este peso, un offset que cae fuera de la
      // silueta pintaría un parche negro sobre el ojo.
      const aFuente = sd[j + 3] / 255;
      const dx = clamp(x0 + x, 0, W - 1);
      const dy = clamp(y0 + y, 0, H - 1);
      const k = (dy * W + dx) * 4;
      const aDestino = sd[k + 3];
      const nx = (x - (w - 1) / 2) / (w / 2);
      const ny = (y - (h - 1) / 2) / (h / 2);
      const elipse = 1 - ss(0.78, 1.02, Math.hypot(nx, ny));
      d[i] = sd[j]; d[i + 1] = sd[j + 1]; d[i + 2] = sd[j + 2];
      d[i + 3] = aDestino * elipse * aFuente;
    }
  }
  g.putImageData(im, 0, 0);
  return { cv, x0, y0, w, h };
}

export default { hornearLuciernaga, haySoporteCanvas };
