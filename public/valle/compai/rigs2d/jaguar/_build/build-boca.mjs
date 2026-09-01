/**
 * build-boca — set de boca/mandíbula del jaguar (lienzo 705x394, registrado
 * con la lámina):
 *   mandibula-inferior.png  la pieza de mandíbula tal cual (corte medido)
 *   boca-interior.png       fauces NUEVAS en técnica de grabado: encía+dientes
 *                           superiores, lengua con surco, garganta achurada.
 *                           ÚNICO arte 100% dibujado del set (la lámina es un
 *                           retrato de boca cerrada — anatomia.js lo documenta)
 *   boca-cerrada.png        = mandíbula en reposo
 *   boca-entreabierta.png   interior + mandíbula bajada 6px / 3.5°
 *   boca-abierta.png        interior + dientes inferiores + mandíbula 14px / 8°
 *   boca-ancha.png          interior + dientes inf. + mandíbula 9px / 4° x1.08
 * Paleta: crema de dientes y tinta muestreadas de la lámina; lengua en ladrillo
 * apagado coherente con grabado coloreado a mano (documentado en NOTAS.md).
 */
import {
  cargarLamina, capa, idx, ss, clamp, lerp, guardarPNG, tinta, debugCrop, OUT, sharp, lum,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();

/* ── máscara de mandíbula (anatomia.js MANDIBULA x mCabeza) ── */
const mCabeza = (x, y) => (1 - ss(-25, 25, 0.947 * (x - 179) - 0.322 * (y - 130))) * (1 - ss(230, 270, y));
const mMand = (x, y) =>
  ss(42, 52, x) * (1 - ss(122, 132, x)) * ss(146, 160, y) * (1 - ss(184, 204, y)) * mCabeza(x, y);

const jaw = capa(W, H);
for (let y = 130; y < 220; y++) for (let x = 30; x < 145; x++) {
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
const chin = parche(64, 160, 28, 18);
const nose = parche(58, 118, 30, 20);
const CREMA = chin[(chin.length * 0.8) | 0];          // diente = crema del mentón
const INK = nose[(nose.length * 0.06) | 0];           // tinta = lo más oscuro de la nariz
console.log('CREMA', CREMA, 'INK', INK);
// lengua/encía: ladrillo apagado (grabado coloreado a mano; no existe en la lámina)
const LENGUA = [149, 89, 77], LENGUA_SOMBRA = [104, 57, 49], LENGUA_LUZ = [187, 129, 111];
const ENCIA = [98, 54, 46], CAVIDAD = [45, 27, 21], GARGANTA = [25, 14, 12];

/* ── interior de fauces ── */
const tTop = (x) => 146.5 + 5.5 * ((x - 84) / 34) ** 2;   // línea del labio superior
const interior = capa(W, H);
const semilla = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0);
for (let y = 140; y < 206; y++) for (let x = 44; x < 126; x++) {
  const i = idx(W, x, y);
  const top = tTop(x);
  const aCab = sd[i + 3] / 255;           // el interior solo existe DENTRO del hocico real
  const plate = aCab * ss(52, 57, x) * (1 - ss(113, 118, x))
    * ss(top - 1.5, top + 1, y) * (1 - ss(184, 192, y));
  if (plate <= 0.01) continue;
  // 1) cavidad base con garganta al fondo
  const dG = Math.hypot((x - 84) / 20, (y - 166) / 13);
  let r = lerp(CAVIDAD[0], GARGANTA[0], 1 - ss(0.6, 1.15, dG));
  let g = lerp(CAVIDAD[1], GARGANTA[1], 1 - ss(0.6, 1.15, dG));
  let b = lerp(CAVIDAD[2], GARGANTA[2], 1 - ss(0.6, 1.15, dG));
  // achurado cruzado de la cavidad
  const h1 = 0.5 + 0.5 * Math.sin((x + y) * (Math.PI / 2.6));
  const h2 = 0.5 + 0.5 * Math.sin((x - y) * (Math.PI / 3.1));
  const hA = 0.13 * ss(0.6, 0.95, h1) + 0.1 * ss(0.6, 0.95, h2);
  r = lerp(r, 8, hA); g = lerp(g, 5, hA); b = lerp(b, 4, hA);
  // 2) encía superior (banda bajo el labio)
  const gum = ss(top - 1, top + 0.5, y) * (1 - ss(top + 3.5, top + 6, y));
  r = lerp(r, ENCIA[0], gum); g = lerp(g, ENCIA[1], gum); b = lerp(b, ENCIA[2], gum);
  // 3) lengua
  const dT = Math.hypot((x - 85) / 31, (y - 182) / 17);
  const tf = 1 - ss(0.82, 1.04, dT);
  if (tf > 0) {
    const sombra = ss(0.55, 1, dT);
    let tr = lerp(LENGUA[0], LENGUA_SOMBRA[0], sombra * 0.85);
    let tg = lerp(LENGUA[1], LENGUA_SOMBRA[1], sombra * 0.85);
    let tb = lerp(LENGUA[2], LENGUA_SOMBRA[2], sombra * 0.85);
    const luz = (1 - ss(0.0, 0.5, dT)) * ss(174, 179, y) * (1 - ss(184, 190, y));
    tr = lerp(tr, LENGUA_LUZ[0], luz * 0.6); tg = lerp(tg, LENGUA_LUZ[1], luz * 0.6); tb = lerp(tb, LENGUA_LUZ[2], luz * 0.6);
    // surco central + achurado en arcos que siguen la forma
    const surco = (1 - ss(1.1, 2.2, Math.abs(x - 85))) * ss(168, 172, y) * (1 - ss(192, 196, y));
    const arco = 0.5 + 0.5 * Math.sin((y + 6 * Math.cos((x - 85) / 12)) * (Math.PI / 2.4));
    const aA = 0.13 * ss(0.62, 0.95, arco) + 0.42 * surco;
    tr = lerp(tr, LENGUA_SOMBRA[0] * 0.6, aA); tg = lerp(tg, LENGUA_SOMBRA[1] * 0.6, aA); tb = lerp(tb, LENGUA_SOMBRA[2] * 0.6, aA);
    r = lerp(r, tr, tf); g = lerp(g, tg, tf); b = lerp(b, tb, tf);
  }
  // 4) punteado de grabado global
  const dot = (semilla(x, y) % 997) / 997;
  if (dot < 0.1) { const dk = 0.25; r = lerp(r, INK[0], dk); g = lerp(g, INK[1], dk); b = lerp(b, INK[2], dk); }
  interior[i] = clamp(r, 0, 255); interior[i + 1] = clamp(g, 0, 255); interior[i + 2] = clamp(b, 0, 255);
  interior[i + 3] = 255 * plate;
}

/* dientes superiores: 2 colmillos + incisivos, con borde de tinta */
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
      const rim = ss(-0.8, 0.5, d);      // borde -> tinta
      r = lerp(r, INK[0], rim * 0.8); g = lerp(g, INK[1], rim * 0.8); b = lerp(b, INK[2], rim * 0.8);
      const aN = cov * ss(tTop(x) - 1, tTop(x) + 0.5, y);   // nace bajo el labio
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
diente(interior, 60, 148, 63, 164, 3.2, 1);          // colmillo izq (~14px, escala felina)
diente(interior, 110, 147, 107, 160.5, 3.0, 0.96);   // colmillo der (3/4, un pelo más corto)
for (const [cx, hh] of [[72, 4.5], [79, 5], [86, 5], [93, 5], [100, 4.5]]) {
  diente(interior, cx, 148, cx, 148 + hh, 2.5, 0.93); // incisivos cortos
}
await guardarPNG(interior, W, H, `${OUT}/boca-interior.png`);
await guardarPNG(jaw, W, H, `${OUT}/mandibula-inferior.png`);

/* dientes inferiores (viajan con la mandíbula en abierta/ancha) */
const dientesInf = capa(W, H);
const topInf = (x) => 154 + 1.8 * ((x - 84) / 30) ** 2;
diente(dientesInf, 57, 155, 59, 161, 2.8, 0.95);
diente(dientesInf, 109, 154, 107.5, 159.5, 2.6, 0.92);
for (const [cx, hh] of [[68, 3.5], [76, 4], [84, 4], [92, 4], [100, 3.5]]) {
  diente(dientesInf, cx, 155, cx, 155 + hh, 2.3, 0.88);
}
// los dientes inferiores nacen de una banda de encía propia
for (let y = 152; y < 168; y++) for (let x = 52; x < 116; x++) {
  const i = idx(W, x, y);
  const band = ss(topInf(x) - 2, topInf(x), y) * (1 - ss(topInf(x) + 2.5, topInf(x) + 5, y))
    * ss(53, 58, x) * (1 - ss(110, 115, x));
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

/* ── transformar mandíbula: rotación θ + traslación T sobre el pivote (87,150) ── */
const transformar = (src, grados, tx, ty, sx = 1) => {
  const out = capa(W, H);
  const th = (grados * Math.PI) / 180;
  const cos = Math.cos(-th), sin = Math.sin(-th);
  for (let y = 128; y < 240; y++) for (let x = 20; x < 160; x++) {
    const dx = x - 87 - tx, dy = y - 150 - ty;
    const sxp = 87 + (dx * cos - dy * sin) / sx;
    const syp = 150 + (dx * sin + dy * cos);
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
for (let y = 0; y < 280; y++) for (let x = 0; x < 260; x++) {
  const m = mCabeza(x, y) * (1 - mMand(x, y));
  if (m <= 0.004) continue;
  const i = idx(W, x, y);
  if (!sd[i + 3]) continue;
  cabezaSin[i] = sd[i]; cabezaSin[i + 1] = sd[i + 1]; cabezaSin[i + 2] = sd[i + 2];
  cabezaSin[i + 3] = sd[i + 3] * m;
}
for (const [nombre] of Object.entries(VISEMAS)) {
  const { data } = await sharp(`${OUT}/${nombre}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const comp = clonar(cabezaSin);
  pegar(comp, data);
  await debugCrop(comp, W, H, [25, 95, 130, 125], 3, `${OUT}/_build/crops/dbg-${nombre}.png`);
}
console.log('boca lista');
