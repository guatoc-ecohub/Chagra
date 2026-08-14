/**
 * laminaCapas — hornea la lámina real en capas por ALFA (cuerpo / cabeza /
 * párpados). Puerto DOM/Canvas2D de `hornear()` en
 * `~/demos/3d/juegos/chagra-kart/js/piloto-lamina.js` (esa versión pinta
 * canvases para subirlos como texturas de Three.js; esta los deja como
 * `<canvas>`/`HTMLCanvasElement` para pintarlos directo en el DOM — mismo
 * método, otro consumidor).
 *
 * EL MÉTODO (idéntico al original, ver el docstring largo de piloto-lamina.js
 * si hace falta el porqué completo):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - La capa de ENCIMA (cabeza) se DESVANECE en el borde del corte de
 *     cuello (`smoothstep`). El CUERPO de abajo NO se desvanece: se borra
 *     con corte duro SOLO donde la cabeza ya cubre ≥93% — eso es lo que
 *     evita la banda translúcida cruzando el cuello (el mismo detalle que
 *     documenta piloto-lamina.js: si las dos capas se desvanecieran juntas,
 *     el compuesto daría cobertura 1−αa·αb < 1 a mitad de la franja).
 *   - El párpado es un parche de LA PROPIA lámina — el área ENCIMA de cada
 *     ojo (ver README de `laminaAnatomia.js`, punto 2: acá cada ojo roba su
 *     propio parche, no uno de "frente" compartido) — recortado a una
 *     elipse y aplicado con el alfa de la CABEZA en el punto de destino, así
 *     nunca asoma fuera de la silueta real.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearLamina()`
 * devuelve `null` y el llamador (`CompaiLamina.jsx`) se queda en el `<img>`
 * plano — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/laminaViva/laminaCapas
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function haySoporteCanvas() {
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
 * Máscara de la cabeza en (x,y): 1 antes del corte, 0 después, con franja de
 * mezcla [u0,u1] proyectada sobre la recta (px,py)+(nx,ny). Con nx=0,ny=1 es
 * el caso horizontal (bustos frontales); con nx≈1 es el caso casi-vertical
 * (jaguar de perfil, angelita en diagonal). Misma fórmula que
 * piloto-lamina.js, generalizada al eje (ver laminaAnatomia.js, punto 1).
 */
function mascaraCabeza(cuello) {
  const { px, py, nx, ny, u0, u1 } = cuello;
  return (x, y) => 1 - ss(u0, u1, nx * (x - px) + ny * (y - py));
}

/**
 * Hornea las capas a partir de la imagen ya cargada. Devuelve canvases del
 * MISMO tamaño que el PNG (comparten encuadre, cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {import('./laminaAnatomia.js').LAMINA_ANATOMIA[string]} anatomia
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,parpados:Array<{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number,cx:number,cy:number}>}|null}
 */
export function hornearLamina(img, anatomia) {
  if (!haySoporteCanvas()) return null;
  const W = img.naturalWidth || anatomia.ancho;
  const H = img.naturalHeight || anatomia.altoPx;
  if (!W || !H) return null;

  const base = lienzo(W, H);
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, 0, 0, W, H);
  let src;
  try {
    src = bctx.getImageData(0, 0, W, H);
  } catch {
    // canvas "tainted" (CORS) o getImageData no implementado — sin capas,
    // el llamador cae al <img> plano.
    return null;
  }
  const sd = src.data;

  const mCabeza = mascaraCabeza(anatomia.cuello);
  // El cuerpo se borra SÓLO donde la cabeza ya tapa del todo (≥93%) — ver el
  // porqué en el docstring del módulo.
  const mCuerpo = (x, y) => 1 - ss(0.93, 1.0, mCabeza(x, y));

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

  // ── párpados: cada ojo roba el parche que tiene ENCIMA DE SÍ MISMO ───────
  const parpados = (anatomia.ojos || []).map((o) => parcheParpado(sd, W, H, o));

  return { W, H, cuerpo: pintar(mCuerpo), cabeza: pintar(mCabeza), parpados };
}

/**
 * Construye el parche de párpado para UN ojo: roba el rectángulo de píxeles
 * que está inmediatamente ARRIBA del propio ojo (mismo ancho, un poco más
 * bajo que alto — como una ceja/frente local), lo recorta a una elipse del
 * tamaño del ojo y lo alfa-recorta con la silueta real de la cabeza en el
 * punto de DESTINO (encima del ojo) — así el párpado nunca asoma fuera del
 * contorno del animal aunque la fuente esté un poco más arriba, en pelo o
 * pluma que sí pertenece a la silueta.
 */
function parcheParpado(sd, W, H, ojo) {
  const { cx, cy, r } = ojo;
  const w = Math.ceil(r * 2.1);
  const h = Math.ceil(r * 1.6);
  // fuente: centrada en el mismo cx, desplazada hacia arriba 1.9×r (fuera
  // del propio ojo, dentro de la cabeza en casi todas las poses medidas).
  const fx0 = Math.round(cx - w / 2);
  const fy0 = Math.round(cy - r * 1.9 - h / 2);
  // destino: directamente sobre el ojo.
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
      // alfa de DESTINO (la silueta real donde va a caer el párpado): el
      // párpado nunca dibuja fuera del contorno del animal.
      const dx = clamp(x0 + x, 0, W - 1);
      const dy = clamp(y0 + y, 0, H - 1);
      const k = (dy * W + dx) * 4;
      const aDestino = sd[k + 3];
      const nx = (x - (w - 1) / 2) / (w / 2);
      const ny = (y - (h - 1) / 2) / (h / 2);
      const elipse = 1 - ss(0.78, 1.02, Math.hypot(nx, ny));
      d[i] = sd[j]; d[i + 1] = sd[j + 1]; d[i + 2] = sd[j + 2];
      d[i + 3] = aDestino * elipse;
    }
  }
  g.putImageData(im, 0, 0);
  return { cv, x0, y0, w, h, cx, cy };
}

export { haySoporteCanvas };
export default { hornearLamina, haySoporteCanvas };
