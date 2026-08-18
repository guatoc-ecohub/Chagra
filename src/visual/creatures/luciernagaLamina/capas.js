/**
 * luciernagaLamina/capas — hornea `luciernaga.png` en capas por ALFA
 * (cuerpo + cabeza + mandíbula + 2 antenas + manoLapiz + linterna) más los
 * dos parches de párpado. Puerto directo del motor del jaguar
 * (`jaguarLamina/capas.js`, aprobado por el operador) a la anatomía de la
 * luciérnaga — mismas fórmulas, mismas garantías.
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
 *     píxel: antenas > cabeza > mandíbula > manoLapiz > linterna > cuerpo.
 *     (Las antenas van sobre la cabeza con el patrón ANTI-HUECO de las
 *     orejas del jaguar: la pieza usa la máscara completa, de la cabeza se
 *     resta solo la parte alta — la base queda de respaldo en las dos.)
 *   - La LINTERNA excluye las franjas de pierna que la cruzan por delante
 *     (las piernas se quedan en el cuerpo): es una capa que LATE por
 *     filtro, no una pieza que se mueva — ver anatomia.js.
 *   - El párpado es un parche de LA PROPIA lámina (la piel de la frente
 *     encima de cada ojo) recortado a elipse y alfa-recortado con la
 *     silueta real en el punto de destino — parpadeo real, nunca un
 *     párpado dibujado. Dos parches (uno por ojo) que comparten cadencia:
 *     parpadeo de verdad, no un guiño.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearLuciernaga()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/luciernagaLamina/capas
 */
import {
  CABEZA, OJO, OJO_2, MANDIBULA,
  ANTENA_IZQ, ANTENA_DER, MANO_LAPIZ,
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

/** Cabeza: caja en X de la testa × desvanecido en la banda del cuello. */
export function mascaraCabeza(x, y) {
  return fxCaja(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
}

/** Antena: caja en X × desvanecido hacia la BASE (opaca arriba — la punta
 *  del hilo—, se funde a 0 donde nace de la frente). Patrón oreja-jaguar. */
function mascaraAntena(x, y, antena) {
  return fxCaja(x, antena.box) * (1 - ss(antena.base.y0, antena.base.y1, y));
}

/** Antena para RESTARLA de la cabeza: se corta más ARRIBA (`baseSub`) —
 *  deja la base también en la cabeza, de respaldo anti-hueco al girar. */
function mascaraAntenaSub(x, y, antena) {
  return fxCaja(x, antena.box) * (1 - ss(antena.baseSub.y0, antena.baseSub.y1, y));
}

/** Mandíbula: caja en X × opaca ENTRE el labio (arriba) y el fin del
 *  mentón (abajo). La sonrisa queda arriba, en la cabeza. */
function mascaraMandibula(x, y) {
  const { box, labio, menton } = MANDIBULA;
  return fxCaja(x, box) * ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
}

/** Mano del lápiz: caja en X × techo (arriba pasa la antena izquierda — la
 *  pieza solo existe debajo de y≈180) × desvanecido en la MUÑECA. */
function mascaraMano(x, y) {
  return fxCaja(x, MANO_LAPIZ.box)
    * ss(MANO_LAPIZ.techo.y0, MANO_LAPIZ.techo.y1, y)
    * (1 - ss(MANO_LAPIZ.muneca.y0, MANO_LAPIZ.muneca.y1, y));
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

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad para `hornearLuciernaga`, el candado de tests y los
 * medidores offline (patrón `zariguyaLamina/capas.js`: el medidor importa
 * ESTAS fórmulas, no una copia que no vería un fix).
 *
 * Prioridad: antenas > cabeza > mandíbula > manoLapiz > linterna > cuerpo.
 * `mCabezaFull` es la cabeza COMPLETA (incluye mentón y las bases de
 * antena): sirve para (a) excluir la cabeza de la mano y (b) el corte duro
 * del cuerpo — así el cuerpo se borra bajo TODA la testa.
 */
export function mascaras() {
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mCabezaFull = (x, y) => mascaraCabeza(x, y);
  const mAntenaIzq = (x, y) => mascaraAntena(x, y, ANTENA_IZQ);
  const mAntenaDer = (x, y) => mascaraAntena(x, y, ANTENA_DER);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
  // La cabeza que se PINTA = testa completa menos lo que vive aparte. Las
  // antenas se restan por su parte ALTA (`baseSub`): la base queda TAMBIÉN
  // en la cabeza (anti-hueco al girar); la mandíbula se resta entera (baja
  // en bloque, el interior sintético respalda el hueco).
  const mCabezaRender = (x, y) => mCabezaFull(x, y)
    * (1 - mascaraAntenaSub(x, y, ANTENA_IZQ)) * (1 - mascaraAntenaSub(x, y, ANTENA_DER))
    * (1 - mMandibula(x, y));
  const mManoLapiz = (x, y) => mascaraMano(x, y) * (1 - mCabezaFull(x, y));
  const mLinterna = (x, y) => mascaraLinterna(x, y);
  const mCuerpo = (x, y) => hard(mCabezaFull(x, y)) * hard(mAntenaIzq(x, y))
    * hard(mAntenaDer(x, y)) * hard(mManoLapiz(x, y)) * hard(mLinterna(x, y));
  return {
    mCuerpo, mCabezaRender, mMandibula, mAntenaIzq, mAntenaDer,
    mManoLapiz, mLinterna, mCabezaFull,
  };
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
 *   mandibula:HTMLCanvasElement,antenaIzq:HTMLCanvasElement,antenaDer:HTMLCanvasElement,
 *   manoLapiz:HTMLCanvasElement,linterna:HTMLCanvasElement,
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

  // Prioridad y fórmulas: la sección pura `mascaras()` — única fuente de
  // verdad compartida con el candado de tests y los medidores offline.
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

export default { hornearLuciernaga, haySoporteCanvas, mascaras };
