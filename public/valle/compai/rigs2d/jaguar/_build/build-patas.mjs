/**
 * build-patas v2 — hornea las 3 patas nuevas del rig 2.5D (lienzo 705x394):
 *   pata-del-lejana.png   blanca/vientre completada + gradeo profundidad
 *   pata-tras-cercana.png naranja que pisa adelante, separada limpia
 *   pata-tras-lejana.png  crema, muslo oculto completado + gradeo
 */
import {
  cargarLamina, capa, idx, ss, clamp, lerp, blurMask, guardarPNG,
  gradear, tinta, debugCrop, suavizar, lum, satOf, OUT,
  xTail, ventanaTrasLejana,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const sm = suavizar(sd, W, H);
const TINTA_OSCURA = [46, 32, 20];

const interp = (pts, y) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  }
  return pts[pts.length - 1][1];
};

/* ════════════ 1) PATA DELANTERA LEJANA (blanca, vientre) ════════════ */
{
  const xCorte = (y) => 179 - 0.142 * (y - 310);
  const PAW = [[336, 181], [344, 186], [352, 190], [360, 194], [368, 196], [378, 196], [384, 193], [390, 185]];
  // arriba el borde es el PLIEGUE oscuro que la propia lámina dibuja entre
  // las dos patas (contorno natural, cero síntesis); abajo se completa la garra
  const xR = (y) => {
    const arriba = xCorte(y) + 2;
    if (y < 332) return arriba;
    if (y > 344) return interp(PAW, y);
    return lerp(arriba, interp(PAW, 344), ss(332, 344, y));
  };

  const m = new Float32Array(W * H);
  for (let y = 200; y < H; y++) for (let x = 118; x < 212; x++) {
    // borde izquierdo: arriba pegado a la mejilla (138); abajo abierto (124)
    // para que la garra entre COMPLETA (columnas 130-137 de la lámina)
    const xLef = lerp(138, 124, ss(245, 280, y));
    const fxL = ss(xLef, xLef + 8, x);
    const fyT = ss(203, 225, y);
    const fyB = 1 - ss(383, 389, y);
    const der = 1 - ss(xR(y) - 2, xR(y) + 3, x);
    m[y * W + x] = fxL * fyT * fyB * der;
  }
  const mB = blurMask(m, W, H, 1);

  const buf = capa(W, H);
  for (let y = 200; y < H; y++) {
    const xc = xCorte(y);
    for (let x = 118; x < 212; x++) {
      const mv = mB[y * W + x];
      if (mv <= 0.004) continue;
      const i = idx(W, x, y);
      let r, g, b, aSrc;
      if (x > xc - 1 && y > 330) {
        // territorio de mezcla/naranja: pelaje blanco por espejo bien adentro del lado blanco
        let sx = Math.round(xc - (x - xc) - 10);
        sx = Math.min(sx, Math.round(xc) - 9);
        let j = idx(W, clamp(sx, 0, W - 1), y);
        if (sd[j + 3] < 200) { sx = clamp(x - 32, 0, W - 1); j = idx(W, sx, clamp(y - 2, 0, H - 1)); }
        if (sd[j + 3] < 200) continue;
        r = sd[j]; g = sd[j + 1]; b = sd[j + 2];
        aSrc = 1;
      } else {
        r = sd[i]; g = sd[i + 1]; b = sd[i + 2]; aSrc = sd[i + 3] / 255;
      }
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255 * mv * aSrc;
    }
  }
  for (let y = 292; y <= 388; y += 0.5) {
    tinta(buf, W, H, xR(y), y, 1.2, TINTA_OSCURA, 0.7 * ss(292, 316, y));
  }
  // gradeo en RAMPA: pleno en la pata, nulo en el respaldo de pecho de arriba
  // (esta pieza va DELANTE del cuerpo: un respaldo gradeado mancharía el reposo)
  for (let y = 200; y < H; y++) for (let x = 118; x < 212; x++) {
    const i = idx(W, x, y);
    if (!buf[i + 3]) continue;
    const t = ss(222, 242, y);
    const satK = lerp(1, 0.84, t), briK = lerp(1, 0.9, t);
    const g = 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
    for (let c = 0; c < 3; c++) buf[i + c] = clamp((g + (buf[i + c] - g) * satK) * briK, 0, 255);
  }
  await guardarPNG(buf, W, H, `${OUT}/pata-del-lejana.png`);
  await debugCrop(buf, W, H, [120, 195, 100, 199], 3, `${OUT}/_build/crops/dbg-del-lejana.png`);
}

/* ════════════ 2) PATA TRASERA CERCANA (naranja, pisa adelante) ════════════ */
{
  const xCutR = (y) => {
    if (y < 296) return 467 - 0.064 * (y - 226);
    return lerp(467 - 0.064 * 70, 510, ss(296, 308, y));
  };
  // borde izquierdo: arriba pegado al muslo (x383) para no arrastrar vientre;
  // abajo abierto (x342) para la garra que pisa adelante
  const xIzq = (y) => lerp(383, 342, ss(252, 300, y));
  const m = new Float32Array(W * H);
  for (let y = 218; y < H; y++) for (let x = 330; x < 520; x++) {
    const fxL = ss(xIzq(y), xIzq(y) + 8, x);
    const fyT = ss(224, 248, y);
    const der = 1 - ss(xCutR(y) - 4, xCutR(y) + 4, x);
    m[y * W + x] = fxL * fyT * der;
  }
  const mB = blurMask(m, W, H, 1);
  const buf = capa(W, H);
  for (let y = 218; y < H; y++) for (let x = 330; x < 520; x++) {
    const mv = mB[y * W + x];
    if (mv <= 0.004) continue;
    const i = idx(W, x, y);
    if (!sd[i + 3]) continue;
    buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2];
    buf[i + 3] = sd[i + 3] * mv;
  }
  await guardarPNG(buf, W, H, `${OUT}/pata-tras-cercana.png`);
  await debugCrop(buf, W, H, [330, 210, 190, 184], 3, `${OUT}/_build/crops/dbg-tras-cercana.png`);
}

/* ════════════ 3) PATA TRASERA LEJANA (crema, muslo completado) ════════════ */
{
  // cápsula del muslo siguiendo las franjas crema visibles: (512,212) -> (556,300)
  const tCap = (y) => clamp((y - 212) / (300 - 212), 0, 1);
  const xcCap = (y) => lerp(512, 556, tCap(y));
  const wCap = (y) => lerp(17, 13, tCap(y));

  // paleta real de la canilla crema (mediana de parche 530-578 x 302-352)
  const muestra = [];
  for (let y = 302; y < 352; y += 2) for (let x = 530; x < 578; x += 2) {
    const i = idx(W, x, y);
    if (sd[i + 3] > 200) muestra.push([sd[i], sd[i + 1], sd[i + 2]]);
  }
  muestra.sort((p, q) => lum(...p) - lum(...q));
  const med = muestra[(muestra.length * 0.55) | 0];
  const claro = muestra[(muestra.length * 0.85) | 0];
  const oscuro = muestra[(muestra.length * 0.18) | 0];
  console.log('paleta crema med/claro/oscuro:', med, claro, oscuro);

  const mVis = new Float32Array(W * H);
  const mCap = new Float32Array(W * H);
  for (let y = 200; y < H; y++) for (let x = 480; x < 610; x++) {
    const noTail = 1 - ss(xTail(y) - 6, xTail(y) - 1, x);
    // la VENTANA compartida con el cuerpo (lib.mjs): por ahí se ve esta pieza
    mVis[y * W + x] = ventanaTrasLejana(x, y);
    const dx = Math.abs(x - xcCap(y));
    mCap[y * W + x] = (1 - ss(wCap(y) - 3, wCap(y) + 2, dx)) * ss(206, 220, y) * (1 - ss(298, 308, y)) * noTail;
  }
  const mVisB = blurMask(mVis, W, H, 1);
  const mCapB = blurMask(mCap, W, H, 1);

  const buf = capa(W, H);
  // base de la cápsula: crema sombreado (forma de cilindro) + achurado procedural
  for (let y = 200; y < 314; y++) for (let x = 480; x < 610; x++) {
    const mv = mCapB[y * W + x];
    if (mv <= 0.004) continue;
    const i = idx(W, x, y);
    const u = (x - xcCap(y)) / wCap(y);           // -1..1 a lo ancho
    const forma = 1 - 0.2 * ss(0.35, 1, Math.abs(u));
    let r = lerp(med[0], claro[0], 0.45 * (1 - Math.abs(u))) * forma;
    let g = lerp(med[1], claro[1], 0.45 * (1 - Math.abs(u))) * forma;
    let b = lerp(med[2], claro[2], 0.45 * (1 - Math.abs(u))) * forma;
    // achurado de grabado: trazos LARGOS a lo largo del eje del muslo
    // (coordenada transversal c, líneas cada ~3.2px con temblor de mano)
    const c = x * 0.894 - y * 0.447 + 0.9 * Math.sin(y * 0.13 + x * 0.05);
    const stripe = 0.5 + 0.5 * Math.sin(c * (Math.PI * 2 / 3.2));
    const ruido = ((x * 13 + y * 7) % 11) / 11;
    const hAlpha = ss(0.55, 0.95, stripe) * (0.1 + 0.17 * ss(0.25, 1, Math.abs(u))) * (0.7 + 0.3 * ruido);
    r = lerp(r, oscuro[0], hAlpha); g = lerp(g, oscuro[1], hAlpha); b = lerp(b, oscuro[2], hAlpha);
    // punteado de grabado (la canilla real es toda stipple): puntitos dispersos
    const semilla = (x * 73856093 ^ y * 19349663) >>> 0;
    const dot = (semilla % 997) / 997;
    if (dot < 0.16) {
      const dk = 0.28 + 0.3 * ((semilla >> 8) % 100) / 100;
      r = lerp(r, oscuro[0], dk); g = lerp(g, oscuro[1], dk); b = lerp(b, oscuro[2], dk);
    }
    buf[i] = clamp(r, 0, 255); buf[i + 1] = clamp(g, 0, 255); buf[i + 2] = clamp(b, 0, 255);
    buf[i + 3] = 255 * mv;
  }
  // un par de manchas tenues (rosetas rotas pálidas) sobre el muslo
  for (const [mx, my, mr] of [[521, 244, 5], [543, 272, 4.5], [530, 258, 3]]) {
    for (let y = my - mr - 2; y <= my + mr + 2; y++) for (let x = mx - mr - 2; x <= mx + mr + 2; x++) {
      const i = idx(W, x | 0, y | 0);
      if (!buf[i + 3]) continue;
      const d = Math.hypot(x - mx, (y - my) * 1.3);
      const cov = (1 - ss(mr * 0.55, mr, d)) * ss(mr * 0.2, mr * 0.55, d); // anillo roto
      const gap = ((x * 5 + y * 3) % 7) < 2 ? 0 : 1;                       // roto, no anillo pleno
      const k = 1 - 0.72 * cov * gap;
      buf[i] *= k; buf[i + 1] *= k; buf[i + 2] *= k;
    }
  }
  // contornos de tinta de la cápsula
  for (let y = 218; y <= 300; y += 0.5) {
    tinta(buf, W, H, xcCap(y) - wCap(y), y, 1.15, TINTA_OSCURA, 0.7 * ss(222, 238, y));
    tinta(buf, W, H, xcCap(y) + wCap(y), y, 1.0, TINTA_OSCURA, 0.55 * ss(222, 238, y));
  }
  // encima, los píxeles visibles reales
  for (let y = 200; y < H; y++) for (let x = 480; x < 610; x++) {
    const mv = mVisB[y * W + x];
    if (mv <= 0.004) continue;
    const i = idx(W, x, y);
    const aN = (sd[i + 3] / 255) * mv;
    if (aN <= 0.004) continue;
    const aO = buf[i + 3] / 255;
    const na = aN + aO * (1 - aN);
    for (let c = 0; c < 3; c++) buf[i + c] = (sd[i + c] * aN + buf[i + c] * aO * (1 - aN)) / na;
    buf[i + 3] = na * 255;
  }
  gradear(buf, W, H, 0.88, 0.93);
  await guardarPNG(buf, W, H, `${OUT}/pata-tras-lejana.png`);
  await debugCrop(buf, W, H, [480, 195, 130, 199], 3, `${OUT}/_build/crops/dbg-tras-lejana.png`);
}
