/**
 * osoLamina/capas — hornea `oso.png` en capas por ALFA (cuerpo + cabeza +
 * orejas + mandíbula + corona del bastón) más el parche de párpado del único
 * ojo visible. Puerto directo del método del jaguar (`jaguarLamina/capas.js`,
 * a su vez puerto de `piloto-lamina.js`: «el piloto es la LÁMINA, y la lámina
 * ESTÁ VIVA») a la pose ERGUIDA del oso del bastón.
 *
 * EL MÉTODO (idéntico en espíritu — ver el docstring largo del jaguar):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" (cabeza, orejas, mandíbula, corona) se DESVANECE
 *     en el borde de su corte (`smoothstep`). El CUERPO de abajo se borra con
 *     corte duro SOLO donde una pieza de encima ya es ≥93% opaca.
 *   - ANTI-HUECO por RESPALDO (el "cuerpo-inpaint" honesto de la casa): el
 *     cuerpo se recorta contra versiones SUB de cabeza y corona (la línea de
 *     corte corrida hacia dentro de la pieza), así la franja de la costura
 *     queda TAMBIÉN en el cuerpo — misma piel, cero píxeles inventados. La
 *     pieza la tapa en reposo (compuesto idéntico) y, al moverse, el respaldo
 *     evita que se abra fondo. Es el truco `baseSub` de las orejas del
 *     jaguar, generalizado a cuello y corona.
 *   - La pose ¾ erguida no da rectas de corte: cuello y labio son POLILÍNEAS
 *     medidas (`anatomia.js`) que aquí se interpolan por tramos.
 *
 * QUÉ NO SE CORTA (honestidad, la lección de las patas del jaguar):
 *   - El BASTÓN entero: la zarpa lo empuña (píxeles de zarpa encima del palo)
 *     y las orquídeas se funden con el brazo — no hay borde de alfa que los
 *     separe. Solo la CORONA (frailejón), que sí tiene silueta propia.
 *   - Pies/roca/brazos: el oso está PLANTADO; el andar del compai se lee del
 *     roaming del overlay, no de un gait fingido sobre un dibujo plano.
 *
 * Defensivo por diseño: sin `canvas.getContext('2d')` (jsdom sin el paquete
 * `canvas`, navegador exótico) `hornearOso()` devuelve `null` y el llamador
 * se queda en el `<img>` plano de la lámina completa — nunca truena.
 *
 * @module visual/creatures/osoLamina/capas
 */
import {
  CABEZA, OJO, OREJA_IZQ, OREJA_DER, MANDIBULA, CORONA,
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

/**
 * Interpola una POLILÍNEA [[x,y],…] en x (clampeada a los extremos): la
 * geometría real del cuello/labio de una pose erguida ¾, donde una sola
 * recta (el atajo del jaguar de perfil) cortaría hombro o dientes.
 */
export function interpolarY(puntos, x) {
  if (x <= puntos[0][0]) return puntos[0][1];
  const ultimo = puntos[puntos.length - 1];
  if (x >= ultimo[0]) return ultimo[1];
  for (let i = 1; i < puntos.length; i++) {
    const [x0, y0] = puntos[i - 1];
    const [x1, y1] = puntos[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return ultimo[1];
}

/** Caja en X con bordes suaves (el mismo `fx` de todas las piezas). */
function fxBox(x, { x0, x1, xFade }) {
  return ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
}

/**
 * Máscara de la CABEZA: caja en X × «por encima de la polilínea del cuello»
 * (desvanecido ±fade alrededor de la línea interpolada). `subir` corre la
 * línea hacia ARRIBA (px): con `subir=CUELLO_SUB` produce la versión SUB que
 * recorta el cuerpo dejando el respaldo del cuello (ANTI-HUECO).
 */
function mascaraCabeza(x, y, subir = 0) {
  const yCorte = interpolarY(CABEZA.cuello.puntos, x) - subir;
  const f = CABEZA.cuello.fade;
  return fxBox(x, CABEZA.box) * (1 - ss(yCorte - f, yCorte + f, y));
}

/** Máscara de una OREJA (pieza): caja × desvanecido hacia la base (opaca
 *  arriba — la punta — se funde a 0 hacia abajo). Igual que el jaguar. */
function mascaraOreja(x, y, { box, base }) {
  return fxBox(x, box) * (1 - ss(base.y0, base.y1, y));
}

/** Oreja para RESTARLA de la cabeza: corta más ARRIBA (`baseSub`) — la base
 *  queda también en la cabeza, de respaldo (ANTI-HUECO al rotar). */
function mascaraOrejaSub(x, y, { box, baseSub }) {
  return fxBox(x, box) * (1 - ss(baseSub.y0, baseSub.y1, y));
}

/**
 * Máscara de la MANDÍBULA: caja en X × «por debajo de la polilínea del
 * labio» (la sonrisa va en diagonal — pose ¾) × banda del mentón (la pieza
 * termina antes del pecho).
 */
function mascaraMandibula(x, y) {
  const yLabio = interpolarY(MANDIBULA.labio.puntos, x);
  const f = MANDIBULA.labio.fade;
  const bajoLabio = ss(yLabio - f, yLabio + f, y);
  const hastaMenton = 1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y);
  return fxBox(x, MANDIBULA.box) * bajoLabio * hastaMenton;
}

/** CORONA del bastón (pieza): caja × desvanecido hacia su base en el palo —
 *  misma forma que una oreja (cuelga hacia arriba desde donde nace). */
function mascaraCorona(x, y) {
  return fxBox(x, CORONA.box) * (1 - ss(CORONA.base.y0, CORONA.base.y1, y));
}

/** Corona para RESTARLA del cuerpo: corta más ARRIBA (`baseSub`) — el
 *  arranque queda también en el cuerpo, de respaldo (ANTI-HUECO). */
function mascaraCoronaSub(x, y) {
  return fxBox(x, CORONA.box) * (1 - ss(CORONA.baseSub.y0, CORONA.baseSub.y1, y));
}

/**
 * Hornea las capas + el parche de párpado a partir de la imagen ya cargada.
 * Devuelve canvases del MISMO tamaño que el PNG (comparten encuadre — cero
 * cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún no
 *   cargó (naturalWidth/Height en 0) — blinda contra un `onload` prematuro.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,
 *   orejaIzq:HTMLCanvasElement,orejaDer:HTMLCanvasElement,
 *   mandibula:HTMLCanvasElement,corona:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearOso(img, dims = {}) {
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

  // Prioridad: cabeza > corona > cuerpo. Orejas y mandíbula viven DENTRO de
  // la cabeza (× mCabeza) y se restan de la cabeza-render; el cuerpo se
  // recorta contra las versiones SUB (respaldo anti-hueco en cuello y base
  // de corona — ver el docstring del módulo).
  const mCabeza = (x, y) => mascaraCabeza(x, y);
  const mOrejaIzq = (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabeza(x, y);
  const mOrejaDer = (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabeza(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabeza(x, y);
  // La cabeza que se PINTA = cabeza completa menos lo que ahora vive aparte.
  // Las orejas se restan solo por su parte ALTA (`baseSub`): la base queda de
  // respaldo. La mandíbula se resta entera (baja en bloque).
  const mCabezaRender = (x, y) => mCabeza(x, y)
    * (1 - mascaraOrejaSub(x, y, OREJA_IZQ)) * (1 - mascaraOrejaSub(x, y, OREJA_DER))
    * (1 - mMandibula(x, y));
  const mCorona = (x, y) => mascaraCorona(x, y) * (1 - mCabeza(x, y));
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mCuerpo = (x, y) => hard(mascaraCabeza(x, y, CABEZA.cuelloSub))
    * hard(mascaraCoronaSub(x, y));

  const pintar = (mascara) => {
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    const d = im.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = sd[i + 3];
        if (!a) { d[i + 3] = 0; continue; }
        d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2];
        d[i + 3] = a * mascara(x, y);
      }
    }
    g.putImageData(im, 0, 0);
    return cv;
  };

  return {
    W,
    H,
    cuerpo: pintar(mCuerpo),
    cabeza: pintar(mCabezaRender),
    orejaIzq: pintar(mOrejaIzq),
    orejaDer: pintar(mOrejaDer),
    mandibula: pintar(mMandibula),
    corona: pintar(mCorona),
    parpado: parcheParpado(sd, W, H, OJO),
  };
}

/**
 * Parche de párpado — idéntico al del jaguar (pulido 2026-08-14, con el
 * tamaño 3.1r×2.6r que se midió que SÍ mueve la aguja): roba el rectángulo
 * de píxeles que está ENCIMA del ojo (piel/pelo propio del animal — aquí la
 * ceja blanca del antifaz, nunca un color inventado), lo recorta a elipse y
 * lo alfa-recorta con la silueta real de la cabeza en el punto de DESTINO.
 * UN solo parche: el ojo lejano no está en la lámina (pose ¾ — ver
 * `anatomia.js`), así que parpadear con este único ojo es anatomía, no guiño.
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

export default { hornearOso, haySoporteCanvas, interpolarY };
