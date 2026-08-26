/**
 * build-boca — set de boca/mandíbula del oso (lienzo 615×630, registrado con
 * la lámina). La sonrisota va EN DIAGONAL (testa ¾): todo sigue la polilínea
 * del labio aprobada, no una banda horizontal.
 *   mandibula-inferior.png  la pieza de mandíbula tal cual (corte aprobado)
 *   boca-interior.png       fauces NUEVAS en técnica de grabado: cavidad +
 *                           encía + lengua con surco y achurado en arcos.
 *                           ÚNICO arte 100% dibujado del set (la lámina es
 *                           una sonrisa cerrada — anatomia.js lo documenta;
 *                           los dientes superiores del grin real quedan en
 *                           la cara, encima del labio).
 *   boca-cerrada.png        = mandíbula en reposo
 *   boca-entreabierta.png   interior + mandíbula 3.5° / +6px
 *   boca-abierta.png        interior + dientes inferiores + mandíbula 8° / +14px
 *   boca-ancha.png          interior + dientes inf. + mandíbula 4° / +9px ×1.08
 * Pivote de charnela: la comisura izquierda [296,152] (aprobada).
 * Paleta: crema de dientes y tinta MUESTREADAS de la lámina (mentón/trufa);
 * lengua en ladrillo apagado coherente con grabado coloreado a mano.
 */
import {
  cargarLamina, capa, idx, ss, clamp, lerp, guardarPNG, debugCrop, OUT, sharp, lum,
  interpolarY, mascaraCabeza, mascaraMandibula, mascaraOreja, mascaraOrejaSub,
  hard, MANDIBULA, OREJA_IZQ, OREJA_DER,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const PIV = MANDIBULA.pivote; // [296,152]

/* ── pieza de mandíbula (corte aprobado) ── */
const mMand = (x, y) => mascaraMandibula(x, y) * mascaraCabeza(x, y);
const jaw = capa(W, H);
for (let y = 130; y < 220; y++) for (let x = 275; x < 392; x++) {
  const m = mMand(x, y);
  if (m <= 0.004) continue;
  const i = idx(W, x, y);
  if (!sd[i + 3]) continue;
  jaw[i] = sd[i]; jaw[i + 1] = sd[i + 1]; jaw[i + 2] = sd[i + 2]; jaw[i + 3] = sd[i + 3] * m;
}

/* ── paleta muestreada ── */
const parche = (x0, y0, w, h) => {
  const px = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = idx(W, x, y);
    if (sd[i + 3] > 220) px.push([sd[i], sd[i + 1], sd[i + 2]]);
  }
  px.sort((a, b) => lum(...a) - lum(...b));
  return px;
};
const chin = parche(292, 188, 24, 14);   // mentón blanco de la bezuda (runs claros medidos y189-204)
const nose = parche(364, 118, 24, 16);   // trufa oscura
const CREMA = chin[(chin.length * 0.8) | 0];
const INK = nose[(nose.length * 0.06) | 0];
console.log('CREMA', CREMA, 'INK', INK);
const LENGUA = [149, 89, 77], LENGUA_SOMBRA = [104, 57, 49], LENGUA_LUZ = [187, 129, 111];
const ENCIA = [98, 54, 46], CAVIDAD = [45, 27, 21], GARGANTA = [25, 14, 12];

/* ── interior de fauces: la ELIPSE APROBADA del runtime (BOCA: cx336 cy158
 * ancho78 giro14°) — entre los labios del grin, no una banda propia. El
 * primer horneo ancló al labio inferior (boca doble bajo el mentón) y el
 * segundo a una banda profunda propia (mancha sobre el mentón): lo aprobado
 * es la elipse del componente, en técnica de grabado. */
const G = (14 * Math.PI) / 180;
const cosG = Math.cos(G), sinG = Math.sin(G);
const BX = 336, BY = 158, RU = 39, RW = 13;
const interior = capa(W, H);
const semilla = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0);
for (let y = 130; y < 200; y++) for (let x = 288; x < 384; x++) {
  const i = idx(W, x, y);
  const u = cosG * (x - BX) + sinG * (y - BY);
  const w = -sinG * (x - BX) + cosG * (y - BY);
  const aCab = (sd[i + 3] / 255) * mascaraCabeza(x, y);
  const plate = aCab * (1 - ss(0.9, 1.05, Math.hypot(u / RU, w / RW)));
  if (plate <= 0.01) continue;
  // 1) cavidad con garganta al fondo
  const dG2 = Math.hypot(u / 26, (w + 1) / 9);
  let r = lerp(CAVIDAD[0], GARGANTA[0], 1 - ss(0.55, 1.05, dG2));
  let g = lerp(CAVIDAD[1], GARGANTA[1], 1 - ss(0.55, 1.05, dG2));
  let b = lerp(CAVIDAD[2], GARGANTA[2], 1 - ss(0.55, 1.05, dG2));
  const h1 = 0.5 + 0.5 * Math.sin((x + y) * (Math.PI / 2.6));
  const h2 = 0.5 + 0.5 * Math.sin((x - y) * (Math.PI / 3.1));
  const hA = 0.13 * ss(0.6, 0.95, h1) + 0.1 * ss(0.6, 0.95, h2);
  r = lerp(r, 8, hA); g = lerp(g, 5, hA); b = lerp(b, 4, hA);
  // 2) encía superior (borde alto de la elipse)
  const gum = (1 - ss(-RW + 4.5, -RW + 7, w)) * ss(-RW - 1, -RW + 2, w);
  r = lerp(r, ENCIA[0], gum); g = lerp(g, ENCIA[1], gum); b = lerp(b, ENCIA[2], gum);
  // 3) lengua (mitad baja de la elipse)
  const dT = Math.hypot((u - 2) / 27, (w - 6) / 7.5);
  const tf = 1 - ss(0.82, 1.04, dT);
  if (tf > 0) {
    const sombra = ss(0.55, 1, dT);
    let tr = lerp(LENGUA[0], LENGUA_SOMBRA[0], sombra * 0.85);
    let tg = lerp(LENGUA[1], LENGUA_SOMBRA[1], sombra * 0.85);
    let tb = lerp(LENGUA[2], LENGUA_SOMBRA[2], sombra * 0.85);
    const luz = (1 - ss(0.0, 0.5, dT)) * ss(2, 4, w) * (1 - ss(8, 11, w));
    tr = lerp(tr, LENGUA_LUZ[0], luz * 0.6); tg = lerp(tg, LENGUA_LUZ[1], luz * 0.6); tb = lerp(tb, LENGUA_LUZ[2], luz * 0.6);
    const surco = (1 - ss(1.1, 2.2, Math.abs(u - 2))) * ss(1, 3, w) * (1 - ss(10, 12, w));
    const arco = 0.5 + 0.5 * Math.sin((w + 6 * Math.cos(u / 12)) * (Math.PI / 2.4));
    const aA = 0.13 * ss(0.62, 0.95, arco) + 0.42 * surco;
    tr = lerp(tr, LENGUA_SOMBRA[0] * 0.6, aA); tg = lerp(tg, LENGUA_SOMBRA[1] * 0.6, aA); tb = lerp(tb, LENGUA_SOMBRA[2] * 0.6, aA);
    r = lerp(r, tr, tf); g = lerp(g, tg, tf); b = lerp(b, tb, tf);
  }
  // 4) punteado de grabado
  const dot = (semilla(x, y) % 997) / 997;
  if (dot < 0.1) { const dk = 0.25; r = lerp(r, INK[0], dk); g = lerp(g, INK[1], dk); b = lerp(b, INK[2], dk); }
  interior[i] = clamp(r, 0, 255); interior[i + 1] = clamp(g, 0, 255); interior[i + 2] = clamp(b, 0, 255);
  interior[i + 3] = 255 * plate;
}

/* pincel de diente (puerto del jaguar): cono con sombreado y borde de tinta */
const diente = (buf, cx0, y0, tipX, tipY, wBase, colorK) => {
  for (let y = y0 - 1; y <= tipY + 1; y++) {
    const t = clamp((y - y0) / (tipY - y0), 0, 1);
    const cx = lerp(cx0, tipX, t * t);
    const w = lerp(wBase, 0.9, t);
    for (let x = Math.floor(cx - w - 1.5); x <= Math.ceil(cx + w + 1.5); x++) {
      const d = Math.abs(x - cx) - w;
      const cov = 1 - ss(-0.8, 0.8, d);
      if (cov <= 0.01) continue;
      const i = idx(W, x, y);
      const lado = clamp((x - cx) / Math.max(w, 0.001), -1, 1);
      const shade = (1 - 0.22 * ss(0.15, 1, Math.abs(lado))) * (1 - 0.12 * t) * colorK;
      let r = CREMA[0] * shade, g = CREMA[1] * shade, b = CREMA[2] * shade;
      const rim = ss(-0.8, 0.5, d);
      r = lerp(r, INK[0], rim * 0.8); g = lerp(g, INK[1], rim * 0.8); b = lerp(b, INK[2], rim * 0.8);
      const aN = cov;
      const aO = buf[i + 3] / 255;
      const na = aN + aO * (1 - aN);
      if (na <= 0) continue;
      buf[i] = (r * aN + buf[i] * aO * (1 - aN)) / na;
      buf[i + 1] = (g * aN + buf[i + 1] * aO * (1 - aN)) / na;
      buf[i + 2] = (b * aN + buf[i + 2] * aO * (1 - aN)) / na;
      buf[i + 3] = na * 255;
    }
  }
};

/* dientes superiores: 2 colmillos modestos + incisivos, nacen bajo el labio
 * superior (fijos en el interior — no viajan con la mandíbula) */
{
  // borde alto de la elipse en x: y = BY + (w·cosG − u·sinG) con w=−RW+2
  const nace = (x) => BY + ((-RW + 2.5) * cosG) + Math.tan(G) * (x - BX);
  diente(interior, 306, nace(306), 307, nace(306) + 8.5, 3.0, 1);
  diente(interior, 364, nace(364), 363, nace(364) + 7.5, 2.8, 0.96);
  for (const [cx, hh] of [[317, 5], [327, 5.5], [336, 5.5], [345, 5.5], [355, 5]]) {
    diente(interior, cx, nace(cx), cx, nace(cx) + hh, 2.4, 0.93);
  }
}
await guardarPNG(interior, W, H, `${OUT}/boca-interior.png`);
await guardarPNG(jaw, W, H, `${OUT}/mandibula-inferior.png`);

/* dientes inferiores (viajan con la mandíbula en abierta/ancha): nacen del
 * labio inferior aprobado (el corte de la mandíbula) */
const tInf = (x) => interpolarY(MANDIBULA.labio.puntos, x) - 0.5;
const dientesInf = capa(W, H);
for (const [cx, hh, wb] of [[310, 4, 2.4], [320, 4.5, 2.6], [331, 4.5, 2.6], [342, 4.5, 2.6], [353, 4, 2.4], [363, 3.5, 2.2]]) {
  const y0 = tInf(cx) + 1;
  diente(dientesInf, cx, y0, cx, y0 + hh, wb, 0.9);
}
for (let x = 302; x < 372; x++) {
  const y0 = tInf(x) - 1;
  for (let y = Math.floor(y0 - 2); y <= Math.ceil(y0 + 4); y++) {
    const i = idx(W, x, y);
    const band = ss(y0 - 2, y0, y) * (1 - ss(y0 + 2.5, y0 + 4.5, y)) * ss(302, 308, x) * (1 - ss(366, 372, x));
    if (band <= 0.01) continue;
    const aO = dientesInf[i + 3] / 255;
    const aN = band * 0.9 * (1 - aO);
    if (aN <= 0.01) continue;
    const na = aO + aN;
    dientesInf[i] = (dientesInf[i] * aO + ENCIA[0] * aN) / na;
    dientesInf[i + 1] = (dientesInf[i + 1] * aO + ENCIA[1] * aN) / na;
    dientesInf[i + 2] = (dientesInf[i + 2] * aO + ENCIA[2] * aN) / na;
    dientesInf[i + 3] = na * 255;
  }
}

/* ── transformar mandíbula sobre la charnela (comisura izq [296,152]) ── */
const transformar = (src, grados, tx, ty, sx = 1) => {
  const out = capa(W, H);
  const th = (grados * Math.PI) / 180;
  const cos = Math.cos(-th), sin = Math.sin(-th);
  for (let y = 120; y < 250; y++) for (let x = 260; x < 400; x++) {
    const dx = x - PIV[0] - tx, dy = y - PIV[1] - ty;
    const sxp = PIV[0] + (dx * cos - dy * sin) / sx;
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

const VISEMAS = {
  'boca-cerrada': { jaw: [0, 0, 0, 1], interior: false, dientesInf: false },
  'boca-entreabierta': { jaw: [3.5, 0, 6, 1], interior: true, dientesInf: false },
  'boca-abierta': { jaw: [8, 1, 14, 1], interior: true, dientesInf: true },
  'boca-ancha': { jaw: [4, 0, 9, 1.08], interior: true, dientesInf: true },
};
for (const [nombre, v] of Object.entries(VISEMAS)) {
  const [g, tx, ty, sx] = v.jaw;
  const comp = capa(W, H);
  if (v.interior) pegar(comp, interior);
  if (v.dientesInf) pegar(comp, transformar(dientesInf, g, tx, ty, sx));
  pegar(comp, g || ty ? transformar(jaw, g, tx, ty, sx) : clonar(jaw));
  await guardarPNG(comp, W, H, `${OUT}/${nombre}.png`);
}

/* ── debug: cabeza sin mandíbula + cada visema, a 3x ── */
const cabezaSin = capa(W, H);
for (let y = 0; y < 260; y++) for (let x = 190; x < 460; x++) {
  const m = mascaraCabeza(x, y)
    * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
    * hard(mMand(x, y));
  if (m <= 0.004) continue;
  const i = idx(W, x, y);
  if (!sd[i + 3]) continue;
  cabezaSin[i] = sd[i]; cabezaSin[i + 1] = sd[i + 1]; cabezaSin[i + 2] = sd[i + 2];
  cabezaSin[i + 3] = sd[i + 3] * m;
}
// orejas encima para el contexto del debug
for (const O of [OREJA_IZQ, OREJA_DER]) {
  for (let y = 0; y < 120; y++) for (let x = 220; x < 460; x++) {
    const m = mascaraOreja(x, y, O) * mascaraCabeza(x, y);
    if (m <= 0.004) continue;
    const i = idx(W, x, y);
    if (!sd[i + 3]) continue;
    const aS = (sd[i + 3] / 255) * m, aD = cabezaSin[i + 3] / 255;
    const na = aS + aD * (1 - aS);
    for (let c = 0; c < 3; c++) cabezaSin[i + c] = (sd[i + c] * aS + cabezaSin[i + c] * aD * (1 - aS)) / na;
    cabezaSin[i + 3] = na * 255;
  }
}
for (const [nombre] of Object.entries(VISEMAS)) {
  const { data } = await sharp(`${OUT}/${nombre}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const comp = clonar(cabezaSin);
  pegar(comp, data);
  await debugCrop(comp, W, H, [230, 60, 200, 170], 3, `${OUT}/_build/crops/dbg-${nombre}.png`);
}
console.log('boca lista');
