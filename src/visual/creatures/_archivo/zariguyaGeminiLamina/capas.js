/**
 * zariguyaGeminiLamina/capas — hornea `zariguya-gemini-hero.png` en 8 capas
 * por ALFA (cuerpo + cabeza + orejas ×2 + mandíbula + brazoLapiz +
 * brazoBrujula + cola) más los dos parches de párpado.
 *
 * PORT DIRECTO de `zariguyaLamina/capas.js` (rama `feat/zariguya-lamina-viva`
 * — mismas máscaras, mismas prioridades, mismo corte duro ≥93%, mismos
 * párpados robados de la propia piel) con UNA resta deliberada:
 *
 *   - SIN `pielDePatas`/`pintaGarra`: aquella cirugía runtime oscurecía los
 *     GUANTES BLANCOS de `zariguya.png` y les pintaba garras. La hero del SET
 *     GEMINI aprobado ya trae PATAS NATURALISTAS con dedos EN LOS PÍXELES
 *     (el retoque aprobado por el operador) — aplicarle la cirugía las
 *     embarraría (el umbral de luz agarraría la piel rosada clara). Aquí la
 *     lámina se sirve tal cual: cero píxel inventado fuera del interior de
 *     boca sintético y el inpaint de pecho (píxeles clonados de la misma
 *     lámina).
 *
 * ¿Por qué duplicar y no importar del viejo? El viejo módulo queda como está
 * (otros consumidores: `CREATURES.zariguya` → `ZariguyaLaminaViva`), acopla
 * sus máscaras a SU anatomía y trae la cirugía de guantes que esta lámina no
 * debe correr. Divergen a propósito; este es el carril Gemini.
 *
 * Defensivo por diseño: sin Canvas2D real (jsdom) `hornearZariguyaGemini()`
 * devuelve null y el llamador se queda en la lámina plana — nunca truena.
 *
 * @module visual/creatures/zariguyaGeminiLamina/capas
 */
import {
  CABEZA, OJO, OJO_2, OREJA_IZQ, OREJA_DER, MANDIBULA,
  BRAZO_LAPIZ, BRAZO_BRUJULA, INPAINT_PECHO, COLA,
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

/** Banda suave sobre la recta (px,py)+(nx,ny). */
function proyeccion(x, y, corte) {
  return corte.nx * (x - corte.px) + corte.ny * (y - corte.py);
}

/** Cabeza: lado u<0 de la recta del cuello × desvanecido de pecho por Y. */
export function mascaraCabeza(x, y) {
  const { cuello, fadePecho } = CABEZA;
  const base = 1 - ss(cuello.u0, cuello.u1, proyeccion(x, y, cuello));
  const pecho = 1 - ss(fadePecho.y0, fadePecho.y1, y);
  return base * pecho;
}

/** Oreja: caja en X (bordes suaves) × desvanecido hacia la base. */
function mascaraOreja(x, y, { box, base }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  return fx * (1 - ss(base.y0, base.y1, y));
}

/** Resta de oreja sobre la cabeza: solo la parte ALTA (anti-hueco). */
function mascaraOrejaSub(x, y, { box, baseSub }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  return fx * (1 - ss(baseSub.y0, baseSub.y1, y));
}

/** Caja suave 2D (excluye el colmillo superior de la mandíbula). */
function cajaSuave(x, y, { x0, x1, xFade, y0, y1, yFade }) {
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(y0, y0 + yFade, y) * (1 - ss(y1 - yFade, y1, y));
  return fx * fy;
}

/** Mandíbula: caja × banda labio→mentón, SIN el colmillo superior. */
export function mascaraMandibula(x, y) {
  const { box, labio, menton, colmillo } = MANDIBULA;
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
  return fx * fy * (1 - cajaSuave(x, y, colmillo));
}

/**
 * Cápsula: distancia al segmento (ax,ay)→(bx,by), fade radial y —opcional—
 * axial (t0..t1 sobre el eje: el extremo que se funde con el cuerpo).
 * @param {number} x
 * @param {number} y
 * @param {{ax:number, ay:number, bx:number, by:number, r:number, rFade:number, t0?:number, t1?:number}} capsula
 */
function mascaraCapsula(x, y, { ax, ay, bx, by, r, rFade, t0, t1 }) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const tRaw = ((x - ax) * dx + (y - ay) * dy) / len2;
  const t = clamp(tRaw, 0, 1);
  const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
  let a = 1 - ss(r, r + rFade, d);
  if (t0 !== undefined) a *= 1 - ss(t0, t1, tRaw);
  return a;
}

/** Elipse suave (las patas-mano): fade sobre el radio normalizado e0→e1. */
function mascaraElipse(x, y, { cx, cy, rx, ry, e0, e1 }) {
  const rn = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return 1 - ss(e0, e1, rn);
}

/** Disco suave (la brújula, coronita incluida). */
function mascaraDisco(x, y, { cx, cy, r, rFade }) {
  return 1 - ss(r, r + rFade, Math.hypot(x - cx, y - cy));
}

/** Brazo del lápiz = lápiz ∪ pata ∪ antebrazo (máximo de las tres). */
export function mascaraBrazoLapiz(x, y) {
  return Math.max(
    mascaraCapsula(x, y, BRAZO_LAPIZ.lapiz),
    mascaraElipse(x, y, BRAZO_LAPIZ.guante),
    mascaraCapsula(x, y, BRAZO_LAPIZ.antebrazo),
  );
}

/** Brazo de la brújula = brújula ∪ pata ∪ antebrazo. */
export function mascaraBrazoBrujula(x, y) {
  return Math.max(
    mascaraDisco(x, y, BRAZO_BRUJULA.brujula),
    mascaraElipse(x, y, BRAZO_BRUJULA.guante),
    mascaraCapsula(x, y, BRAZO_BRUJULA.antebrazo),
  );
}

/** Cola: lado u>0 de la banda vertical en la grupa. */
export function mascaraCola(x, y) {
  return ss(COLA.cut.u0, COLA.cut.u1, proyeccion(x, y, COLA.cut));
}

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad. Prioridad: brazos > cabeza > orejas/mandíbula (viven
 * DENTRO de la cabeza) > cola > cuerpo. Las restas son de corte DURO
 * (`hard`): con (1-m) la banda de fade compone 0.5-over-0.5 = 0.75 de alfa
 * — un anillo translúcido permanente (medido en la lámina hermana: 2.07% de
 * huecos con (1-m); 0.000% con hard).
 */
export function mascaras() {
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mBrazoLapiz = (x, y) => mascaraBrazoLapiz(x, y);
  const mBrazoBrujula = (x, y) => mascaraBrazoBrujula(x, y) * hard(mBrazoLapiz(x, y));
  const mCabezaFull = (x, y) => mascaraCabeza(x, y)
    * hard(mBrazoLapiz(x, y)) * hard(mBrazoBrujula(x, y));
  const mOrejaIzq = (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabezaFull(x, y);
  const mOrejaDer = (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabezaFull(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
  const mCabezaRender = (x, y) => mCabezaFull(x, y)
    * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
    * hard(mMandibula(x, y));
  const mCola = (x, y) => mascaraCola(x, y) * (1 - mCabezaFull(x, y));
  const mCuerpo = (x, y) => hard(mCabezaFull(x, y)) * hard(mBrazoLapiz(x, y))
    * hard(mBrazoBrujula(x, y)) * hard(mCola(x, y));
  return {
    mBrazoLapiz, mBrazoBrujula, mCabezaFull, mOrejaIzq, mOrejaDer,
    mMandibula, mCabezaRender, mCola, mCuerpo,
  };
}

/**
 * Hornea las 8 capas + los 2 parches de párpado a partir de la imagen ya
 * cargada. Canvases del MISMO tamaño que el PNG (comparten encuadre).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,
 *   orejaIzq:HTMLCanvasElement,orejaDer:HTMLCanvasElement,mandibula:HTMLCanvasElement,
 *   brazoLapiz:HTMLCanvasElement,brazoBrujula:HTMLCanvasElement,cola:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearZariguyaGemini(img, dims = {}) {
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
    return null; // canvas "tainted" (CORS) o getImageData no implementado.
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

  // CUERPO-INPAINT: detrás de la pata de la brújula hay pecho. Se clona la
  // lanilla del vientre (offset +dx,+dy verificado libre de piezas) POR
  // DEBAJO de lo que el corte dejó, con entrada suave desde el umbral.
  const cuerpo = pintar(m.mCuerpo);
  {
    const g = cuerpo.getContext('2d');
    const { x0, x1, y0, y1, dx, dy, umbral } = INPAINT_PECHO;
    const im = g.getImageData(x0, y0, x1 - x0, y1 - y0);
    const d = im.data;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const mb = mascaraBrazoBrujula(x, y);
        if (mb <= umbral) continue;
        const j = (clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)) * 4;
        const i = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
        const entra = ss(umbral, umbral + 0.25, mb);
        const cA = (sd[j + 3] / 255) * entra;
        if (!cA) continue;
        const eA = d[i + 3] / 255;
        const outA = eA + cA * (1 - eA);
        // el clon entra POR DEBAJO (el resto del corte queda encima).
        d[i] = (d[i] * eA + sd[j] * cA * (1 - eA)) / outA;
        d[i + 1] = (d[i + 1] * eA + sd[j + 1] * cA * (1 - eA)) / outA;
        d[i + 2] = (d[i + 2] * eA + sd[j + 2] * cA * (1 - eA)) / outA;
        d[i + 3] = outA * 255;
      }
    }
    g.putImageData(im, x0, y0);
  }

  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    cuerpo,
    cabeza: pintar(m.mCabezaRender),
    orejaIzq: pintar(m.mOrejaIzq),
    orejaDer: pintar(m.mOrejaDer),
    mandibula: pintar(m.mMandibula),
    brazoLapiz: pintar(m.mBrazoLapiz),
    brazoBrujula: pintar(m.mBrazoBrujula),
    cola: pintar(m.mCola),
    parpado,
    parpado2,
  };
}

/**
 * Parche de párpado — técnica de la casa (jaguar/zariguya): roba el
 * rectángulo de piel ENCIMA del ojo (ceja/antifaz — piel propia, nunca un
 * color inventado), recorte a elipse, alfa-recorte con la silueta real en
 * el destino.
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

export default { hornearZariguyaGemini, haySoporteCanvas, mascaras };
