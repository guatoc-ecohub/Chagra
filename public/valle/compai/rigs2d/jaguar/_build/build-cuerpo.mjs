/**
 * build-cuerpo v2 — cuerpo-inpaint.png: el cuerpo SIN partes móviles con los
 * píxeles ocultos rellenados por clonado dirigido de la propia lámina.
 *
 * Orden Z del rig (documentado en NOTAS.md):
 *   pata-tras-lejana  (DETRÁS del cuerpo, se ve por la ventana)
 *   cuerpo-inpaint
 *   pata-del-lejana / pata-tras-cercana / cola / patasDel-naranja / cabeza
 * Rellenos: cuello/pecho tras la cabeza (clon x+48), línea de pecho/vientre
 * tras las patas (clon vertical + contorno), grupa tras la cola (clon x-46).
 * La ventana del muslo trasero lejano queda TRANSPARENTE a propósito.
 */
import {
  cargarLamina, capa, idx, ss, clamp, lerp, guardarPNG,
  tinta, debugCrop, OUT, sharp, ventanaTrasLejana,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const TINTA_OSCURA = [46, 32, 20];

const interp = (pts, v) => {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (v - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  }
  return pts[pts.length - 1][1];
};

/* ── máscaras (rectas medidas de anatomia.js/capas.js + las nuevas) ── */
const CUELLO = { px: 179, py: 130, nx: 0.947, ny: -0.322, u0: -25, u1: 25 };
const mCabeza = (x, y) => (1 - ss(CUELLO.u0, CUELLO.u1, CUELLO.nx * (x - CUELLO.px) + CUELLO.ny * (y - CUELLO.py)))
  * (1 - ss(230, 270, y));

const mApendiceDel = (x, y) =>
  ss(145, 160, x) * (1 - ss(285, 300, x)) * ss(228, 258, y) * (1 - mCabeza(x, y));

const xCutTrasR = (y) => (y < 296 ? 467 - 0.064 * (y - 226) : lerp(467 - 0.064 * 70, 510, ss(296, 308, y)));
const xIzqTras = (y) => lerp(383, 342, ss(252, 300, y));
const mPataTrasCerca = (x, y) =>
  ss(xIzqTras(y), xIzqTras(y) + 8, x) * ss(224, 248, y) * (1 - ss(xCutTrasR(y) - 4, xCutTrasR(y) + 4, x));

const mCola = (x, y) => ss(-20, 20, x - 465) * (1 - mCabeza(x, y))
  * (1 - ss(228, 258, y) * ss(455, 470, x) * (1 - ss(575, 590, x)));

const hard = (m) => 1 - ss(0.93, 1.0, m);

/* línea de pecho/vientre reconstruida (medida sobre la silueta) */
const BLINE = [[136, 296], [220, 292], [300, 276], [350, 260], [392, 246], [462, 252]];
const B = (x) => interp(BLINE, x);

/* ── cuerpo base ── */
const buf = capa(W, H);
const bodyA = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(W, x, y);
  const a = sd[i + 3] / 255;
  if (!a) continue;
  let m = hard(mCabeza(x, y)) * hard(mApendiceDel(x, y)) * hard(mPataTrasCerca(x, y))
    * hard(mCola(x, y)) * hard(ventanaTrasLejana(x, y));
  if (x >= 128 && x <= 462 && y > B(x) + 4) m = 0;   // sin anillos fantasma bajo el vientre
  if (x > 510 && x < 600 && y > 298) m = 0;          // zona libre de la pata lejana
  const av = a * m;
  if (av <= 0.004) continue;
  buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2]; buf[i + 3] = av * 255;
  bodyA[y * W + x] = av;
}

/* ── relleno 1: cuello/pecho detrás del corte de cabeza (clon x+48) ── */
const cutX = (y) => 179 + (0.322 / 0.947) * (y - 130);
for (let y = 45; y < 252; y++) for (let x = 118; x < 215; x++) {
  const cx = cutX(y);
  if (x > cx + 12) continue;
  const f = 1 - ss(20, 44, cx - x);
  if (f <= 0.01) continue;
  const i = idx(W, x, y);
  if (bodyA[y * W + x] > 0.92) continue;
  const j = idx(W, x + 48, y);
  const aj = (sd[j + 3] / 255) * (1 - mCabeza(x + 48, y));
  const aN = aj * f * (1 - bodyA[y * W + x]);
  if (aN <= 0.01) continue;
  const aO = buf[i + 3] / 255;
  const na = aO + aN * (1 - aO);
  for (let c = 0; c < 3; c++) buf[i + c] = (buf[i + c] * aO + sd[j + c] * aN * (1 - aO)) / na;
  buf[i + 3] = na * 255;
}

/* ── relleno 2: pecho/vientre detrás de las patas, hasta la línea B(x) ── */
for (let x = 133; x <= 462; x++) {
  const yB = B(x);
  const fxFront = ss(133, 141, x);                    // frente de pecho con feather
  for (let y = 218; y <= yB + 3; y++) {
    const i = idx(W, x, y);
    if (bodyA[y * W + x] > 0.92) continue;
    const dy = x <= 300 ? 58 : 42;
    const j = idx(W, x, Math.max(0, y - dy));
    if (sd[j + 3] < 200) continue;
    const borde = 1 - ss(yB - 9, yB + 2, y);
    const k = lerp(0.78, 1, borde);
    const f = (1 - ss(yB + 1, yB + 3, y)) * fxFront;
    const aN = f * (1 - bodyA[y * W + x]);
    if (aN <= 0.01) continue;
    const aO = buf[i + 3] / 255;
    const na = aO + aN * (1 - aO);
    for (let c = 0; c < 3; c++) buf[i + c] = (buf[i + c] * aO + sd[j + c] * k * aN * (1 - aO)) / na;
    buf[i + 3] = na * 255;
  }
  tinta(buf, W, H, x, yB, 1.1, TINTA_OSCURA, 0.4);
}
// contorno vertical del frente de pecho (se ve solo cuando la pata lejana se abre)
for (let y = 240; y <= 292; y += 0.5) {
  tinta(buf, W, H, 141 - 0.05 * (y - 240), y, 1.0, TINTA_OSCURA, 0.35 * ss(240, 254, y));
}

/* ── relleno 3: grupa detrás del corte de cola (clon x-46) ── */
for (let y = 148; y < 236; y++) for (let x = 470; x < 514; x++) {
  const i = idx(W, x, y);
  if (bodyA[y * W + x] > 0.92) continue;
  const f = 1 - ss(486, 510, x);
  if (f <= 0.01) continue;
  const j = idx(W, x - 46, y);
  const aN = (sd[j + 3] / 255) * f * (1 - bodyA[y * W + x]);
  if (aN <= 0.01) continue;
  const aO = buf[i + 3] / 255;
  const na = aO + aN * (1 - aO);
  for (let c = 0; c < 3; c++) buf[i + c] = (buf[i + c] * aO + sd[j + c] * aN * (1 - aO)) / na;
  buf[i + 3] = na * 255;
}

await guardarPNG(buf, W, H, `${OUT}/cuerpo-inpaint.png`);
await debugCrop(buf, W, H, [0, 0, 705, 394], 1, `${OUT}/_build/crops/dbg-cuerpo.png`);

/* ── recomposición de control en reposo (orden Z real del rig) ── */
const cargarPieza = async (p) => (await sharp(`${OUT}/${p}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const pintar = (mfn) => {
  const c = capa(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(W, x, y);
    if (!sd[i + 3]) continue;
    const m = mfn(x, y);
    if (m <= 0.004) continue;
    c[i] = sd[i]; c[i + 1] = sd[i + 1]; c[i + 2] = sd[i + 2]; c[i + 3] = sd[i + 3] * m;
  }
  return c;
};
const pegar = (dst, src) => {
  for (let i = 0; i < dst.length; i += 4) {
    const aS = src[i + 3] / 255, aD = dst[i + 3] / 255;
    const na = aS + aD * (1 - aS);
    if (na <= 0) continue;
    for (let c = 0; c < 3; c++) dst[i + c] = (src[i + c] * aS + dst[i + c] * aD * (1 - aS)) / na;
    dst[i + 3] = na * 255;
  }
};

const comp = capa(W, H);
pegar(comp, await cargarPieza('pata-tras-lejana.png'));                    // detrás del cuerpo
pegar(comp, buf);                                                          // cuerpo
pegar(comp, await cargarPieza('pata-del-lejana.png'));                     // delante del cuerpo
pegar(comp, await cargarPieza('pata-tras-cercana.png'));
pegar(comp, pintar((x, y) => mCola(x, y) * (1 - ventanaTrasLejana(x, y))));
// pata delantera cercana del rig = solo el lado naranja (corte medido de capas.js)
pegar(comp, pintar((x, y) => mApendiceDel(x, y) * ss(-9, 9, 0.99 * (x - 179) + 0.1406 * (y - 310))));
pegar(comp, pintar(mCabeza));

let nDif = 0, nTot = 0, nHueco = 0;
const difBuf = capa(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(W, x, y);
  if (sd[i + 3] < 128) continue;
  nTot++;
  if (comp[i + 3] < 128) { nHueco++; difBuf[i] = 255; difBuf[i + 3] = 255; continue; }
  const d = Math.abs(comp[i] - sd[i]) + Math.abs(comp[i + 1] - sd[i + 1]) + Math.abs(comp[i + 2] - sd[i + 2]);
  if (d > 90) { nDif++; difBuf[i + 1] = 255; difBuf[i + 3] = 255; }
}
console.log(`recomposición: ${nTot} px opacos | huecos ${nHueco} (${(100 * nHueco / nTot).toFixed(3)}%) | color distinto ${nDif} (${(100 * nDif / nTot).toFixed(2)}%)`);
await guardarPNG(comp, W, H, `${OUT}/_build/crops/dbg-recomp.png`);
await guardarPNG(difBuf, W, H, `${OUT}/_build/crops/dbg-dif.png`);
