/**
 * build-boca — set de boca/mandíbula de la zarigüeya (lienzo 481×444,
 * registrado con la lámina). La lámina YA sonríe con la boca abierta:
 * jaw=0 = lámina EXACTA (anatomia.js); abrir es abrir MÁS.
 *   mandibula-inferior.png  la pieza aprobada tal cual (banda labio→mentón,
 *                           SIN el colmillo superior grande — es maxilar
 *                           superior; la lengua y los dientes inferiores del
 *                           grin real viajan EN la pieza). Pivote [134,110].
 *   boca-interior.png       fauces NUEVAS en técnica de grabado DENTRO de la
 *                           geometría aprobada del runtime: caja BOCA
 *                           (cx189 cy141 ancho68 → x155-223, alto 34) con la
 *                           CUÑA aprobada (bisagra a la IZQUIERDA: ahí la
 *                           apertura es ~0 y el interior no asoma; crece
 *                           hacia la trufa — lección del gate 03). Colores
 *                           del radial aprobado (#6a3c3c→#341715→#180a09) +
 *                           achurado cruzado y punteado de grabado.
 *                           ÚNICO arte 100% nuevo del set.
 *   boca-{cerrada,entreabierta,abierta,ancha}.png  visemas listos para swap
 *                           con la matemática EXACTA del runtime
 *                           (zariguyaLamina.css): rot = jaw·4° (charnela
 *                           comisura izq) + ty = jaw·1.4%·ALTO (6.22px);
 *                           interior con scaleY = jaw desde el borde alto.
 *                           JAW_DE_VISEMA: V1=0 · V2=0.42 · V3=1 · V4=0.36.
 */
import {
  cargarLamina, capa, idx, ss, clamp, lerp, guardarPNG, debugCrop, hard, lum,
  mCabezaFull, mascaraMandibula, mascaraOreja, mascaraOrejaSub,
  MANDIBULA, BOCA, OREJA_IZQ, OREJA_DER, ALTO, OUT, sharp,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const PIV = MANDIBULA.pivote; // [134,110]

/* ── pieza de mandíbula (corte aprobado) ── */
const mMand = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
const jaw = capa(W, H);
for (let y = 120; y < 200; y++) for (let x = 118; x < 254; x++) {
  const m = mMand(x, y);
  if (m <= 0.004) continue;
  const i = idx(W, x, y);
  if (!sd[i + 3]) continue;
  jaw[i] = sd[i]; jaw[i + 1] = sd[i + 1]; jaw[i + 2] = sd[i + 2]; jaw[i + 3] = sd[i + 3] * m;
}

/* ── paleta: cavidad del CSS aprobado; tinta muestreada de la lámina ── */
const parche = (x0, y0, w, h) => {
  const px = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = idx(W, x, y);
    if (sd[i + 3] > 220) px.push([sd[i], sd[i + 1], sd[i + 2]]);
  }
  px.sort((a, b) => lum(...a) - lum(...b));
  return px;
};
const bordeBoca = parche(150, 144, 60, 8);        // trazo de tinta del labio
const INK = bordeBoca[(bordeBoca.length * 0.06) | 0];
console.log('INK', INK);
const CAV_ALTA = [0x6a, 0x3c, 0x3c];   // #6a3c3c — aprobados en el CSS
const CAV_MEDIA = [0x34, 0x17, 0x15];  // #341715
const CAV_HONDA = [0x18, 0x0a, 0x09];  // #180a09

/* ── interior: la PLACA cubre exactamente la región que la mandíbula puede
 *    EXPONER (el hueco duro mMand≥0,996 que queda en la cabeza, con una
 *    falda corta 0,85→0,99 bajo el respaldo). La caja BOCA del runtime
 *    (x155-223) es más ANGOSTA que ese hueco (x≈136-244): a jaw=1 asomaba
 *    FONDO a la derecha del interior — bug latente del runtime, medido acá.
 *    Con la placa = hueco, la "cuña que no asoma en la bisagra" (lección del
 *    gate 03) emerge SOLA de la rotación: cerca de la charnela la mandíbula
 *    casi no destapa. Colores del radial aprobado + grabado. ── */
const BX0 = BOCA.cx - BOCA.ancho / 2;   // 155 (caja aprobada: ancla del radial)
const BY0 = BOCA.cy;                    // 141
const BW = BOCA.ancho;                  // 68
const BH = BOCA.ancho * 0.5;            // 34
const semilla = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0);
const interior = capa(W, H);
for (let y = 130; y < 200; y++) for (let x = 118; x < 254; x++) {
  const cov = ss(0.85, 0.99, mMand(x, y));
  if (cov <= 0.01) continue;
  const i = idx(W, x, y);
  const u = (x - BX0) / BW, v = clamp((y - BY0) / BH, 0, 1.2);
  // radial aprobado: centro (55%, 0%) de la caja BOCA
  const dR = Math.hypot((u - 0.55) / 1.10, v / 1.30);
  let r, g, b;
  if (dR < 0.52) {
    const t = dR / 0.52;
    r = lerp(CAV_ALTA[0], CAV_MEDIA[0], t); g = lerp(CAV_ALTA[1], CAV_MEDIA[1], t); b = lerp(CAV_ALTA[2], CAV_MEDIA[2], t);
  } else {
    const t = clamp((dR - 0.52) / 0.48, 0, 1);
    r = lerp(CAV_MEDIA[0], CAV_HONDA[0], t); g = lerp(CAV_MEDIA[1], CAV_HONDA[1], t); b = lerp(CAV_MEDIA[2], CAV_HONDA[2], t);
  }
  // achurado de grabado: arcos horizontales + cruzado tenue hacia el fondo
  const h1 = 0.5 + 0.5 * Math.sin((y + 3 * Math.cos(x / 9)) * (Math.PI / 2.4));
  const h2 = 0.5 + 0.5 * Math.sin((x - y) * (Math.PI / 3.0));
  const hA = 0.16 * ss(0.62, 0.95, h1) + 0.10 * ss(0.66, 0.95, h2) * ss(0.3, 0.8, dR);
  r = lerp(r, 10, hA); g = lerp(g, 6, hA); b = lerp(b, 5, hA);
  // punteado
  if ((semilla(x, y) % 997) / 997 < 0.09) { r = lerp(r, INK[0], 0.3); g = lerp(g, INK[1], 0.3); b = lerp(b, INK[2], 0.3); }
  // a la izquierda de la caja BOCA (zona de barbilla junto a la bisagra) la
  // placa expuesta no debe leer "boca": se funde a sombra de tinta
  const tIzq = ss(BX0 - 22, BX0, x);
  r = lerp(30, r, tIzq); g = lerp(22, g, tIzq); b = lerp(18, b, tIzq);
  interior[i] = clamp(r, 0, 255); interior[i + 1] = clamp(g, 0, 255); interior[i + 2] = clamp(b, 0, 255);
  interior[i + 3] = 255 * cov;
}
await guardarPNG(interior, W, H, `${OUT}/boca-interior.png`);
await guardarPNG(jaw, W, H, `${OUT}/mandibula-inferior.png`);

/* ── transformar mandíbula sobre la charnela (rot + ty del runtime) ── */
const transformar = (src, grados, ty) => {
  const out = capa(W, H);
  const th = (grados * Math.PI) / 180;
  const cos = Math.cos(-th), sin = Math.sin(-th);
  for (let y = 100; y < 230; y++) for (let x = 100; x < 280; x++) {
    const dx = x - PIV[0], dy = y - PIV[1] - ty;
    const sxp = PIV[0] + (dx * cos - dy * sin);
    const syp = PIV[1] + (dx * sin + dy * cos);
    const x0 = Math.floor(sxp), y0 = Math.floor(syp);
    if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) continue;
    const fx = sxp - x0, fy = syp - y0;
    const i = idx(W, x, y);
    let acc = [0, 0, 0, 0];
    for (const [ox, oy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const j = idx(W, x0 + ox, y0 + oy);
      const a = src[j + 3] / 255;
      acc[0] += src[j] * a * wgt; acc[1] += src[j + 1] * a * wgt; acc[2] += src[j + 2] * a * wgt; acc[3] += a * wgt;
    }
    if (acc[3] <= 0.004) continue;
    out[i] = acc[0] / acc[3]; out[i + 1] = acc[1] / acc[3]; out[i + 2] = acc[2] / acc[3];
    out[i + 3] = acc[3] * 255;
  }
  return out;
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
const clonar = (b) => Buffer.from(b);

/* jaw → transform del runtime: rot jaw·4°, ty jaw·1.4%·ALTO */
const TY_MAX = 0.014 * ALTO; // 6.22px
const VISEMAS = {
  'boca-cerrada': 0,
  'boca-entreabierta': 0.42,
  'boca-abierta': 1,
  'boca-ancha': 0.36,
};
for (const [nombre, jawV] of Object.entries(VISEMAS)) {
  const comp = capa(W, H);
  if (jawV > 0) pegar(comp, clonar(interior));
  pegar(comp, jawV > 0 ? transformar(jaw, jawV * 4, jawV * TY_MAX) : clonar(jaw));
  await guardarPNG(comp, W, H, `${OUT}/${nombre}.png`);
}

/* ── debug: cabeza sin mandíbula + cada visema, a 3x ── */
const cabezaSin = capa(W, H);
for (let y = 0; y < 250; y++) for (let x = 60; x < 320; x++) {
  const m = mCabezaFull(x, y)
    * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
    * hard(mMand(x, y));
  if (m <= 0.004) continue;
  const i = idx(W, x, y);
  if (!sd[i + 3]) continue;
  cabezaSin[i] = sd[i]; cabezaSin[i + 1] = sd[i + 1]; cabezaSin[i + 2] = sd[i + 2];
  cabezaSin[i + 3] = sd[i + 3] * m;
}
for (const O of [OREJA_IZQ, OREJA_DER]) {
  for (let y = 0; y < 120; y++) for (let x = 60; x < 320; x++) {
    const m = mascaraOreja(x, y, O) * mCabezaFull(x, y);
    if (m <= 0.004) continue;
    const i = idx(W, x, y);
    if (!sd[i + 3]) continue;
    const aS = (sd[i + 3] / 255) * m, aD = cabezaSin[i + 3] / 255;
    const na = aS + aD * (1 - aS);
    for (let c = 0; c < 3; c++) cabezaSin[i + c] = (sd[i + c] * aS + cabezaSin[i + c] * aD * (1 - aS)) / na;
    cabezaSin[i + 3] = na * 255;
  }
}
for (const nombre of Object.keys(VISEMAS)) {
  const { data } = await sharp(`${OUT}/${nombre}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const comp = clonar(cabezaSin);
  pegar(comp, data);
  await debugCrop(comp, W, H, [110, 60, 180, 140], 3, `${OUT}/_build/crops/dbg-${nombre}.png`);
}
console.log('boca lista');
