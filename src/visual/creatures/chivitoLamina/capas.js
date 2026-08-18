/**
 * chivitoLamina/capas — hornea `chivito-punk.png` en capas por ALFA
 * (cuerpo + cabeza + mandíbula + manoLapiz) más los dos parches de párpado.
 * Puerto directo del motor del jaguar (`jaguarLamina/capas.js`, aprobado
 * por el operador) vía el puerto más reciente (`luciernagaLamina/capas.js`)
 * a la anatomía del chivito punk — mismas fórmulas, mismas garantías.
 *
 * EL MÉTODO (idéntico en espíritu a piloto-lamina.js — ver el docstring
 * largo del jaguar si hace falta el porqué completo):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" se DESVANECE en el borde de su corte
 *     (`smoothstep`). El CUERPO de abajo NO se desvanece: se borra con
 *     corte duro SOLO donde una pieza de encima ya es ≥93% opaca — el
 *     detalle que evita la banda translúcida.
 *   - ORDEN DE PRIORIDAD para que dos piezas nunca se disputen el mismo
 *     píxel: cabeza > mandíbula > manoLapiz > cuerpo. (La CRESTA no es
 *     pieza: viaja ENTERA dentro de la cabeza — regla dura de la orden.)
 *   - El párpado es un parche de LA PROPIA lámina (la piel del antifaz/
 *     frente encima de cada ojo) recortado a elipse y alfa-recortado con
 *     la silueta real en el punto de destino — parpadeo real, nunca un
 *     párpado dibujado. Dos parches (uno por ojo) que comparten cadencia:
 *     parpadeo de verdad, no un guiño.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearChivito()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/chivitoLamina/capas
 */
import {
  CABEZA, OJO, OJO_2, MANDIBULA, MANO_LAPIZ,
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

/** Cabeza: caja en X de testa+cresta × desvanecido en la banda del cuello. */
export function mascaraCabeza(x, y) {
  return fxCaja(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
}

/** Mandíbula: caja en X × opaca ENTRE el labio (bajo la línea de la boca)
 *  y el fin del mentón barbado. La línea de la boca queda en la cabeza. */
function mascaraMandibula(x, y) {
  const { box, labio, menton } = MANDIBULA;
  return fxCaja(x, box) * ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
}

/** Mano del lápiz: caja en X × techo (por encima no hay nada suyo) ×
 *  desvanecido INCLINADO en la MUÑECA (el borde cae hacia la izquierda y
 *  pasa por debajo del tajado del lápiz — candado documentado en
 *  anatomia.js). */
function mascaraMano(x, y) {
  const { box, techo, muneca } = MANO_LAPIZ;
  const xN = clamp(x, 0, box.x1) / box.x1;
  const borde = muneca.y0 + muneca.caidaIzq * (1 - xN);
  return fxCaja(x, box)
    * ss(techo.y0, techo.y1, y)
    * (1 - ss(borde, borde + muneca.alto, y));
}

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad para `hornearChivito`, el candado de tests
 * (`__tests__/recomposicion.test.js`) y los medidores offline (mismo patrón
 * que `zariguyaLamina/capas.js`): un medidor que reimplementa las fórmulas
 * no ve los fixes de este módulo.
 *
 * Prioridad: cabeza > mandíbula > manoLapiz > cuerpo. `mCabezaFull` es la
 * cabeza COMPLETA (incluye el mentón barbado): sirve para (a) excluir la
 * cabeza de la mano y (b) el corte duro del cuerpo — así el cuerpo se borra
 * bajo TODA la testa.
 */
export function mascaras() {
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mCabezaFull = (x, y) => mascaraCabeza(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
  // La cabeza que se PINTA = testa completa (cresta incluida) menos la
  // mandíbula (baja en bloque, el interior sintético respalda el hueco).
  const mCabezaRender = (x, y) => mCabezaFull(x, y) * (1 - mMandibula(x, y));
  const mManoLapiz = (x, y) => mascaraMano(x, y) * (1 - mCabezaFull(x, y));
  const mCuerpo = (x, y) => hard(mCabezaFull(x, y)) * hard(mManoLapiz(x, y));
  return { mCabezaFull, mMandibula, mCabezaRender, mManoLapiz, mCuerpo };
}

/**
 * Hornea las capas + los parches de párpado a partir de la imagen ya
 * cargada. Devuelve canvases del MISMO tamaño que el PNG (comparten
 * encuadre — cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún
 *   no cargó (naturalWidth/Height en 0) — blinda contra un `onload` que
 *   dispara antes de tiempo.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,
 *   mandibula:HTMLCanvasElement,manoLapiz:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearChivito(img, dims = {}) {
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

  const m = mascaras();

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

  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    cuerpo: pintar(m.mCuerpo),
    cabeza: pintar(m.mCabezaRender),
    mandibula: pintar(m.mMandibula),
    manoLapiz: pintar(m.mManoLapiz),
    parpado,
    parpado2,
  };
}

/**
 * Parche de párpado: roba el rectángulo de píxeles que está ENCIMA del ojo
 * (el antifaz de plumas propio del bicho, nunca un color inventado), lo
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

export default { hornearChivito, haySoporteCanvas, mascaras };
