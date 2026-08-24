// hornear-verifica.mjs — medidor offline del corte C4 (no versionado).
// Importa las MISMAS fórmulas de capas.js (mascaras/pielDeTarsos/
// extenderRespaldo), hornea con sharp y mide:
//   1) recomposición en REPOSO vs lámina-tarsos: huecos / déficit / exceso
//      fuera de silueta / color distinto.
//   2) GIRO ±2.5° de cada ala: huecos nuevos dentro de la silueta original
//      (el crack que el respaldo de viaje debe impedir) + PNG de diff.
//   3) PNGs por capa sobre gris para revisión a ojo.
import { createRequire } from 'module';
import { mascaras, pielDeTarsos, extenderRespaldo } from '../../src/visual/creatures/luciernagaLamina/capas.js';
import { ALA_IZQ, ALA_DER } from '../../src/visual/creatures/luciernagaLamina/anatomia.js';

const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

const SRC = new URL('../../public/compai/laminas/luciernaga.png', import.meta.url).pathname;
const OUT = new URL('.', import.meta.url).pathname;

const { data: sd, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const sdTarsos = pielDeTarsos(sd, W, H);
const m = mascaras();

const pintarBuf = (mascara) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = sdTarsos[i + 3];
    if (!a) continue;
    const ma = a * mascara(x, y);
    if (ma < 0.5) continue;
    d[i] = sdTarsos[i]; d[i + 1] = sdTarsos[i + 1]; d[i + 2] = sdTarsos[i + 2];
    d[i + 3] = ma;
  }
  return d;
};

const capas = {
  alaIzq: pintarBuf(m.mAlaIzq),
  alaDer: pintarBuf(m.mAlaDer),
  cuerpo: pintarBuf(m.mCuerpo),
  linterna: pintarBuf(m.mLinterna),
  manoLapiz: pintarBuf(m.mManoLapiz),
  antenaIzq: pintarBuf(m.mAntenaIzq),
  antenaDer: pintarBuf(m.mAntenaDer),
  mandibula: pintarBuf(m.mMandibula),
};
extenderRespaldo(capas.alaIzq, sd, W, H);
extenderRespaldo(capas.alaDer, sd, W, H);

// ── PNGs por capa sobre gris (revisión a ojo) ──
const ORDEN_Z = ['alaIzq', 'alaDer', 'cuerpo', 'linterna', 'manoLapiz', 'antenaIzq', 'antenaDer', 'mandibula'];
async function guarda(buf, nombre, gris = true) {
  let out = buf;
  if (gris) {
    out = Buffer.alloc(W * H * 4);
    for (let i = 0; i < out.length; i += 4) {
      const a = buf[i + 3] / 255;
      out[i] = buf[i] * a + 118 * (1 - a);
      out[i + 1] = buf[i + 1] * a + 118 * (1 - a);
      out[i + 2] = buf[i + 2] * a + 118 * (1 - a);
      out[i + 3] = 255;
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/capa-${nombre}.png`);
}
for (const n of ORDEN_Z) await guarda(capas[n], n);

// ── compuesto pintor (orden Z real) ──
function componer(juego) {
  const comp = new Uint8ClampedArray(W * H * 4);
  for (const n of ORDEN_Z) {
    const c = juego[n];
    for (let i = 0; i < comp.length; i += 4) {
      const aS = c[i + 3] / 255, aD = comp[i + 3] / 255;
      const na = aS + aD * (1 - aS);
      if (na <= 0) continue;
      for (let k = 0; k < 3; k++) comp[i + k] = (c[i + k] * aS + comp[i + k] * aD * (1 - aS)) / na;
      comp[i + 3] = na * 255;
    }
  }
  return comp;
}

const comp = componer(capas);
await guarda(comp, 'recomp');

// ── métricas de reposo vs lámina-tarsos ──
let nVis = 0, nHueco = 0, nDeficit = 0, nExceso = 0, nColor = 0, maxDef = 0;
const dif = Buffer.alloc(W * H * 4);
for (let i = 0; i < sd.length; i += 4) {
  const a = sdTarsos[i + 3];
  if (a > 0) {
    nVis++;
    const d255 = a - comp[i + 3];
    if (comp[i + 3] === 0) { nHueco++; dif[i] = 255; dif[i + 3] = 255; }
    if (d255 > 0.5) { nDeficit++; if (d255 > maxDef) maxDef = d255; if (!dif[i + 3]) { dif[i + 2] = 255; dif[i + 3] = 255; } }
    if (a >= 128 && comp[i + 3] >= 128) {
      const dc = Math.abs(comp[i] - sdTarsos[i]) + Math.abs(comp[i + 1] - sdTarsos[i + 1]) + Math.abs(comp[i + 2] - sdTarsos[i + 2]);
      if (dc > 90) { nColor++; dif[i + 1] = 255; dif[i + 3] = 255; }
    }
  } else if (comp[i + 3] > 0.5) {
    nExceso++; dif[i] = 255; dif[i + 1] = 160; dif[i + 3] = 255;
  }
}
console.log(`REPOSO: visibles=${nVis} huecos=${nHueco} deficit=${nDeficit} (max ${maxDef.toFixed(2)}/255) exceso=${nExceso} colorDist=${nColor}`);
await sharp(dif, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/dif-reposo.png`);

// ── prueba de GIRO: rota cada ala ±2.5° desde su raíz y busca cracks ──
function rotar(buf, piv, grados) {
  const out = new Uint8ClampedArray(W * H * 4);
  const th = (grados * Math.PI) / 180;
  const c = Math.cos(th), s = Math.sin(th);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - piv[0], dy = y - piv[1];
    const sx = Math.round(piv[0] + dx * c + dy * s);
    const sy = Math.round(piv[1] - dx * s + dy * c);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
    const i = (y * W + x) * 4, j = (sy * W + sx) * 4;
    out[i] = buf[j]; out[i + 1] = buf[j + 1]; out[i + 2] = buf[j + 2]; out[i + 3] = buf[j + 3];
  }
  return out;
}

// "cerca del borde libre" = a ≤12px del fondo transparente: el barrido
// natural del ala al girar vive ahí y NO es crack. Crack real = hueco en el
// interior profundo de la silueta (flanco contra torso/armadura/cuaderno).
const libre = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) if (sd[p * 4 + 3] < 10) libre[p] = 1;
for (let k = 0; k < 12; k++) {
  const prev = Uint8Array.from(libre);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (!prev[p] && (prev[p - 1] || prev[p + 1] || prev[p - W] || prev[p + W])) libre[p] = 1;
  }
}

for (const [nombre, capa, piv] of [['alaIzq', 'alaIzq', ALA_IZQ.pivote], ['alaDer', 'alaDer', ALA_DER.pivote]]) {
  for (const g of [-2.5, 2.5]) {
    const juego = { ...capas, [capa]: rotar(capas[capa], piv, g) };
    const cg = componer(juego);
    let cracks = 0; let barrido = 0;
    const difG = Buffer.alloc(W * H * 4);
    for (let i = 0; i < sd.length; i += 4) {
      const p = i / 4;
      if (sd[i + 3] >= 250 && cg[i + 3] < 128) {
        if (libre[p]) { barrido++; difG[i + 2] = 255; difG[i + 3] = 255; }
        else { cracks++; difG[i] = 255; difG[i + 3] = 255; }
      } else if (cg[i + 3] >= 128) { difG[i] = cg[i] * 0.35; difG[i + 1] = cg[i + 1] * 0.35; difG[i + 2] = cg[i + 2] * 0.35; difG[i + 3] = 255; }
    }
    console.log(`GIRO ${nombre} ${g > 0 ? '+' : ''}${g}°: cracks=${cracks} (barrido natural excluido=${barrido})`);
    await sharp(difG, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/giro-${nombre}${g > 0 ? '+' : '-'}.png`);
  }
}
