/**
 * jaguarLamina/capas — hornea `jaguar-natural.png` en 5 capas por ALFA
 * (cuerpo + cabeza + patasDelanteras + pataTrasera + cola) más el parche de
 * párpado, puerto DOM/Canvas2D de `hornear()` en `~/demos/3d/juegos/
 * chagra-kart/js/piloto-lamina.js` («el piloto es la LÁMINA, y la lámina
 * ESTÁ VIVA») generalizado de 2 piezas (cuerpo/cabeza, más brazo opcional) a
 * 4, con PRIORIDAD entre ellas.
 *
 * EL MÉTODO (idéntico en espíritu al original — ver su docstring largo si
 * hace falta el porqué completo):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" (cabeza, patasDelanteras, pataTrasera, cola) se
 *     DESVANECE en el borde de su corte (`smoothstep`). El CUERPO de abajo
 *     NO se desvanece: se borra con corte duro SOLO donde una pieza de
 *     encima ya es ≥93% opaca — el mismo detalle que evita la banda
 *     translúcida en piloto-lamina.js.
 *   - Con 4 piezas (no 1) hace falta un ORDEN DE PRIORIDAD para que dos
 *     piezas nunca se disputen el mismo píxel al mismo tiempo (si no, ambas
 *     se pintan semi-opacas ahí y el compuesto sale más claro/oscuro de lo
 *     debido). Prioridad: cabeza > patasDelanteras > pataTrasera > cola >
 *     cuerpo. Cada máscara se multiplica por `(1 - máscara de mayor
 *     prioridad)` antes de decidir su propio borde — mismo patrón que usa
 *     piloto-lamina.js entre `mBrazo` y `mCabeza`.
 *   - El párpado es un parche de LA PROPIA lámina (el área ENCIMA del ojo,
 *     igual que `laminaCapas.js` del intento anterior — ver README ahí)
 *     recortado a elipse y alfa-recortado con la silueta real de la cabeza
 *     en el punto de destino.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearJaguar()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/jaguarLamina/capas
 */
import { CABEZA, OJO, PATAS_DELANTERAS, PATA_TRASERA, COLA } from './anatomia.js';

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

/** Máscara de la cabeza: banda proyectada sobre la recta del cuello, MÁS un
 *  desvanecido por Y (la cabeza no sigue existiendo bajo la mandíbula real —
 *  ver el docstring de `anatomia.js`, es lo que evita que la pata delantera
 *  quede clasificada como cabeza). */
function mascaraCabeza(x, y) {
  const { cuello, fadeMandibula } = CABEZA;
  const u = cuello.nx * (x - cuello.px) + cuello.ny * (y - cuello.py);
  const base = 1 - ss(cuello.u0, cuello.u1, u);
  const mandibula = 1 - ss(fadeMandibula.y0, fadeMandibula.y1, y);
  return base * mandibula;
}

/** Máscara de un apéndice colgante (pata): caja en X con bordes suaves × banda de articulación en Y. */
function mascaraApendice(x, y, { box, joint }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(joint.y0, joint.y1, y);
  return fx * fy;
}

/** Máscara de la cola: banda casi-vertical en su base. */
function mascaraCola(x, y) {
  const { cut } = COLA;
  const u = cut.nx * (x - cut.px) + cut.ny * (y - cut.py);
  return ss(cut.u0, cut.u1, u);
}

/**
 * Hornea las 5 capas + el parche de párpado a partir de la imagen ya
 * cargada. Devuelve canvases del MISMO tamaño que el PNG (comparten
 * encuadre — cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún
 *   no cargó (naturalWidth/Height en 0) — en producción no debería hacer
 *   falta, pero blinda contra un `onload` que dispara antes de tiempo.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,
 *   patasDelanteras:HTMLCanvasElement,pataTrasera:HTMLCanvasElement,cola:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearJaguar(img, dims = {}) {
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

  // Prioridad: cabeza > patasDelanteras > pataTrasera > cola > cuerpo. Cada
  // una se calcula EXCLUYENDO lo que ya reclamaron las de mayor prioridad —
  // así dos piezas nunca compiten semi-opacas por el mismo píxel.
  const mCabeza = (x, y) => mascaraCabeza(x, y);
  const mPatasDelanteras = (x, y) => mascaraApendice(x, y, PATAS_DELANTERAS) * (1 - mCabeza(x, y));
  const mPataTrasera = (x, y) => mascaraApendice(x, y, PATA_TRASERA) * (1 - mCabeza(x, y));
  const mCola = (x, y) => mascaraCola(x, y) * (1 - mCabeza(x, y)) * (1 - mPataTrasera(x, y));
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mCuerpo = (x, y) => hard(mCabeza(x, y)) * hard(mPatasDelanteras(x, y)) * hard(mPataTrasera(x, y)) * hard(mCola(x, y));

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

  return {
    W,
    H,
    cuerpo: pintar(mCuerpo),
    cabeza: pintar(mCabeza),
    patasDelanteras: pintar(mPatasDelanteras),
    pataTrasera: pintar(mPataTrasera),
    cola: pintar(mCola),
    parpado,
  };
}

/**
 * Parche de párpado: roba el rectángulo de píxeles que está ENCIMA del ojo
 * (misma idea que `laminaCapas.js` del intento anterior: piel/pelo propio
 * del animal, nunca un color inventado), lo recorta a elipse y lo
 * alfa-recorta con la silueta real de la cabeza en el punto de DESTINO.
 */
function parcheParpado(sd, W, H, ojo) {
  const { cx, cy, r } = ojo;
  const w = Math.ceil(r * 2.1);
  const h = Math.ceil(r * 1.6);
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

export default { hornearJaguar, haySoporteCanvas };
