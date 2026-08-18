/**
 * lib — helpers compartidos para hornear las capas del rig 2.5D del jaguar.
 * Todo el color sale de jaguar-natural.png salvo donde se documenta
 * (interior de boca, contornos de tinta de las completaciones).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

export const SRC = '/home/kortux/demos/3d/compai/laminas/jaguar-natural.png';
export const OUT = '/home/kortux/demos/3d/compai/rigs2d/jaguar';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

export async function cargarLamina() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { sd: data, W: info.width, H: info.height };
}

export const idx = (W, x, y) => (y * W + x) * 4;

/** capa RGBA vacía */
export const capa = (W, H) => Buffer.alloc(W * H * 4, 0);

export async function guardarPNG(buf, W, H, ruta) {
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(ruta);
  console.log('->', ruta);
}

/** blur de caja separable sobre un Float32Array (máscaras) */
export function blurMask(m, W, H, r) {
  if (r <= 0) return m;
  const tmp = new Float32Array(m.length);
  const out = new Float32Array(m.length);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += m[y * W + clamp(x, 0, W - 1)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / n;
      acc += m[y * W + clamp(x + r + 1, 0, W - 1)] - m[y * W + clamp(x - r, 0, W - 1)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, H - 1) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / n;
      acc += tmp[clamp(y + r + 1, 0, H - 1) * W + x] - tmp[clamp(y - r, 0, H - 1) * W + x];
    }
  }
  return out;
}

export const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
export const satOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };

/** RGB suavizado 5x5 (para clasificar sin que el achurado meta ruido) */
export function suavizar(sd, W, H) {
  const out = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, wsum = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = clamp(x + dx, 0, W - 1), yy = clamp(y + dy, 0, H - 1);
      const i = idx(W, xx, yy);
      const a = sd[i + 3] / 255;
      r += sd[i] * a; g += sd[i + 1] * a; b += sd[i + 2] * a; wsum += a;
    }
    const j = (y * W + x) * 3;
    if (wsum > 0.5) { out[j] = r / wsum; out[j + 1] = g / wsum; out[j + 2] = b / wsum; }
  }
  return out;
}

/** gradeo de profundidad in-place: satK hacia gris, brillo briK — solo píxeles con alfa */
export function gradear(buf, W, H, satK, briK) {
  for (let i = 0; i < buf.length; i += 4) {
    if (!buf[i + 3]) continue;
    const g = lum(buf[i], buf[i + 1], buf[i + 2]);
    for (let c = 0; c < 3; c++) buf[i + c] = clamp((g + (buf[i + c] - g) * satK) * briK, 0, 255);
  }
}

/** disco de tinta (contorno dibujado) sobre la capa */
export function tinta(buf, W, H, x, y, rad, [r, g, b], a) {
  const x0 = Math.max(0, Math.floor(x - rad - 1)), x1 = Math.min(W - 1, Math.ceil(x + rad + 1));
  const y0 = Math.max(0, Math.floor(y - rad - 1)), y1 = Math.min(H - 1, Math.ceil(y + rad + 1));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const d = Math.hypot(xx - x, yy - y);
    const cov = 1 - ss(rad - 0.8, rad + 0.8, d);
    if (cov <= 0) continue;
    const i = idx(W, xx, yy);
    const aa = a * cov;
    const oldA = buf[i + 3] / 255;
    const na = aa + oldA * (1 - aa);
    if (na <= 0) continue;
    for (let c = 0; c < 3; c++) buf[i + c] = ([r, g, b][c] * aa + buf[i + c] * oldA * (1 - aa)) / na;
    buf[i + 3] = na * 255;
  }
}

/** debug: pieza compuesta sobre gris medio, recortada y ampliada */
export async function debugCrop(buf, W, H, box, escala, ruta) {
  const fondo = Buffer.alloc(W * H * 4);
  for (let i = 0; i < fondo.length; i += 4) { fondo[i] = fondo[i + 1] = fondo[i + 2] = 118; fondo[i + 3] = 255; }
  const plano = await sharp(fondo, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: buf, raw: { width: W, height: H, channels: 4 } }])
    .png().toBuffer();
  await sharp(plano)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .resize({ width: box[2] * escala, kernel: 'lanczos3' }).png().toFile(ruta);
}

/* ── geometría COMPARTIDA de la pata trasera lejana (pieza y ventana del
 *    cuerpo deben casar exacto, por eso vive acá) ── */
const _interp = (pts, v) => {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * ((v - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  }
  return pts[pts.length - 1][1];
};
export const TAIL_IZQ = [[200, 545], [206, 547], [212, 550], [218, 553], [224, 555], [230, 558], [236, 562],
  [242, 565], [248, 569], [254, 574], [260, 578], [266, 584], [272, 592], [278, 600], [284, 612], [290, 631]];
export const xTail = (y) => (y > 292 ? 700 : _interp(TAIL_IZQ, y));

/** ventana de la pata trasera lejana: franja del muslo visible + tira junto a
 *  la grupa + tramo libre bajo la grupa (polígonos medidos por runs de alfa) */
export function ventanaTrasLejana(x, y) {
  const noTail = 1 - ss(xTail(y) - 6, xTail(y) - 1, x);
  const xSliv = _interp([[210, 545], [232, 540], [254, 522]], y);
  const sliver = ss(498, 504, x) * (1 - ss(xSliv - 3, xSliv + 2, x)) * ss(208, 215, y) * (1 - ss(246, 254, y)) * noTail;
  const xStr = _interp([[250, 556], [270, 547], [290, 536]], y);
  const strip = ss(xStr - 3, xStr + 3, x) * (1 - ss(586, 592, x)) * ss(246, 254, y) * (1 - ss(288, 296, y)) * noTail;
  const libre = ss(514, 520, x) * (1 - ss(592, 598, x)) * ss(288, 296, y) * (1 - ss(372, 378, y));
  return Math.max(sliver, Math.max(strip, libre));
}
