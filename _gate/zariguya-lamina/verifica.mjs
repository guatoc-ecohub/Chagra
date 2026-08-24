/* verifica.mjs — recompone las capas de capas.js (misma matemática, import
   directo) contra la lámina original: % de huecos y % de color distinto,
   + dbg-dif.png + hoja de contacto de capas. */
import sharp from 'sharp';
import { mascaras, mascaraBrazoBrujula } from '../../src/visual/creatures/zariguyaLamina/capas.js';
import { INPAINT_PECHO, ANCHO, ALTO } from '../../src/visual/creatures/zariguyaLamina/anatomia.js';

const SRC = 'public/compai/laminas/zariguya.png';
const OUT = '_gate/zariguya-lamina/';
const { data: sd, info } = await sharp(SRC).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
if (W !== ANCHO || H !== ALTO) throw new Error(`dims ${W}x${H} != anatomia ${ANCHO}x${ALTO}`);

const m = mascaras();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// capas en orden Z del componente (de atrás a adelante)
const ORDEN = ['mCola', 'mCuerpo', 'mBrazoBrujula', 'mBrazoLapiz', 'mCabezaRender', 'mMandibula', 'mOrejaIzq', 'mOrejaDer'];
const capas = {};
for (const k of ORDEN) capas[k] = new Float32Array(W * H * 4);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const a = sd[i + 3] / 255;
  if (!a) continue;
  for (const k of ORDEN) {
    const al = a * m[k](x, y);
    if (al <= 0) continue;
    const c = capas[k];
    c[i] = sd[i]; c[i + 1] = sd[i + 1]; c[i + 2] = sd[i + 2]; c[i + 3] = al;
  }
}
// inpaint del pecho sobre mCuerpo (clon POR DEBAJO, igual que capas.js)
{
  const { x0, x1, y0, y1, dx, dy, umbral } = INPAINT_PECHO;
  const c = capas.mCuerpo;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const mb = mascaraBrazoBrujula(x, y);
    if (mb <= umbral) continue;
    const j = (clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)) * 4;
    const i = (y * W + x) * 4;
    const entra = ss(umbral, umbral + 0.25, mb);
    const cA = (sd[j + 3] / 255) * entra;
    if (!cA) continue;
    const eA = c[i + 3];
    const outA = eA + cA * (1 - eA);
    c[i] = (c[i] * eA + sd[j] * cA * (1 - eA)) / outA;
    c[i + 1] = (c[i + 1] * eA + sd[j + 1] * cA * (1 - eA)) / outA;
    c[i + 2] = (c[i + 2] * eA + sd[j + 2] * cA * (1 - eA)) / outA;
    c[i + 3] = outA;
  }
}
// composición over
const comp = new Float32Array(W * H * 4);
for (const k of ORDEN) {
  const c = capas[k];
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const sa = c[i + 3];
    if (!sa) continue;
    const da = comp[i + 3];
    const oa = sa + da * (1 - sa);
    if (!oa) continue;
    comp[i] = (c[i] * sa + comp[i] * da * (1 - sa)) / oa;
    comp[i + 1] = (c[i + 1] * sa + comp[i + 1] * da * (1 - sa)) / oa;
    comp[i + 2] = (c[i + 2] * sa + comp[i + 2] * da * (1 - sa)) / oa;
    comp[i + 3] = oa;
  }
}
// métricas + imagen de diferencias
let opacos = 0, huecos = 0, colorDif = 0;
const dif = Buffer.alloc(W * H * 4);
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  const aO = sd[i + 3] / 255;
  dif[i] = 233; dif[i + 1] = 228; dif[i + 2] = 214; dif[i + 3] = 255;
  if (aO < 0.06) continue;
  opacos++;
  const aR = comp[i + 3];
  if (aR < aO * 0.9) { huecos++; dif[i] = 255; dif[i + 1] = 0; dif[i + 2] = 0; continue; }
  const d = Math.abs(comp[i] - sd[i]) + Math.abs(comp[i + 1] - sd[i + 1]) + Math.abs(comp[i + 2] - sd[i + 2]);
  if (d > 30) { colorDif++; dif[i] = 255; dif[i + 1] = 140; dif[i + 2] = 0; }
  else { dif[i] = 180; dif[i + 1] = 200; dif[i + 2] = 180; }
}
console.log(`opacos ${opacos} · huecos ${huecos} (${(100 * huecos / opacos).toFixed(3)}%) · colorDif ${colorDif} (${(100 * colorDif / opacos).toFixed(3)}%)`);
await sharp(dif, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT + 'dbg-dif.png');
// hoja de contacto: cada capa sobre caqui
const tiles = [];
for (const k of ORDEN) {
  const buf = Buffer.alloc(W * H * 4);
  const c = capas[k];
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    buf[i] = c[i]; buf[i + 1] = c[i + 1]; buf[i + 2] = c[i + 2]; buf[i + 3] = Math.round(c[i + 3] * 255);
  }
  tiles.push(await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}
const cols = 4, tw = Math.round(W / 2), th = Math.round(H / 2);
const hoja = sharp({ create: { width: tw * cols, height: th * Math.ceil(ORDEN.length / cols), channels: 4, background: '#e9e4d6' } });
const comps = [];
for (let n = 0; n < tiles.length; n++) {
  comps.push({ input: await sharp(tiles[n]).resize(tw, th).png().toBuffer(), left: (n % cols) * tw, top: Math.floor(n / cols) * th });
  comps.push({ input: Buffer.from(`<svg width="${tw}" height="${th}"><text x="6" y="16" font-size="13" fill="#c33">${ORDEN[n]}</text></svg>`), left: (n % cols) * tw, top: Math.floor(n / cols) * th });
}
await hoja.composite(comps).png().toFile(OUT + 'hoja-capas.png');
console.log('-> dbg-dif.png + hoja-capas.png');
