// verificar.mjs — recomposición de las capas del oso contra el original.
// MISMAS fórmulas que src/visual/creatures/osoLamina/capas.js (duplicadas a
// mano porque capas.js necesita DOM/canvas; si cambian allá, cambian acá).
// Garantía dura del precedente jaguar: 0% de píxeles perdidos (huecos).
import sharp from 'sharp';
import {
  CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, CORONA,
} from '../../src/visual/creatures/osoLamina/anatomia.js';
import { interpolarY } from '../../src/visual/creatures/osoLamina/capas.js';

const SRC = 'public/compai/laminas/oso.png';
const OUT = '_gate/oso-lamina-viva/';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fxBox = (x, { x0, x1, xFade }) => ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));

function mascaraCabeza(x, y, subir = 0) {
  const yCorte = interpolarY(CABEZA.cuello.puntos, x) - subir;
  const f = CABEZA.cuello.fade;
  return fxBox(x, CABEZA.box) * (1 - ss(yCorte - f, yCorte + f, y));
}
const mascaraOreja = (x, y, { box, base }) => fxBox(x, box) * (1 - ss(base.y0, base.y1, y));
const mascaraOrejaSub = (x, y, { box, baseSub }) => fxBox(x, box) * (1 - ss(baseSub.y0, baseSub.y1, y));
function mascaraMandibula(x, y) {
  const yLabio = interpolarY(MANDIBULA.labio.puntos, x);
  const f = MANDIBULA.labio.fade;
  return fxBox(x, MANDIBULA.box) * ss(yLabio - f, yLabio + f, y)
    * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y));
}
const mascaraCorona = (x, y) => fxBox(x, CORONA.box) * (1 - ss(CORONA.base.y0, CORONA.base.y1, y));
const mascaraCoronaSub = (x, y) => fxBox(x, CORONA.box) * (1 - ss(CORONA.baseSub.y0, CORONA.baseSub.y1, y));
const hard = (m) => 1 - ss(0.93, 1.0, m);

const { data, info } = await sharp(SRC).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

const mCabeza = (x, y) => mascaraCabeza(x, y);
const piezas = {
  cuerpo: (x, y) => hard(mascaraCabeza(x, y, CABEZA.cuelloSub)) * hard(mascaraCoronaSub(x, y)),
  corona: (x, y) => mascaraCorona(x, y) * (1 - mCabeza(x, y)),
  cabeza: (x, y) => mCabeza(x, y)
    * (1 - mascaraOrejaSub(x, y, OREJA_IZQ)) * (1 - mascaraOrejaSub(x, y, OREJA_DER))
    * (1 - mascaraMandibula(x, y) * mCabeza(x, y)),
  mandibula: (x, y) => mascaraMandibula(x, y) * mCabeza(x, y),
  orejaIzq: (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabeza(x, y),
  orejaDer: (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabeza(x, y),
};

// composición over (mismo orden de apilado del componente, de abajo a arriba):
// cuerpo → corona → cabeza → mandíbula → orejas.
const orden = ['cuerpo', 'corona', 'cabeza', 'mandibula', 'orejaIzq', 'orejaDer'];
let perdidos = 0, casiPerdidos = 0, total = 0, peorDiff = 0;
const perdidosMapa = Buffer.alloc(W * H * 4);
const capasPng = {};
for (const nombre of orden) capasPng[nombre] = Buffer.alloc(W * H * 4);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = data[i + 3] / 255;
    // hornear cada capa (alfa = a × máscara) y componer over
    let compA = 0;
    for (const nombre of orden) {
      const m = piezas[nombre](x, y);
      const capaA = a * m;
      const b = capasPng[nombre];
      b[i] = data[i]; b[i + 1] = data[i + 1]; b[i + 2] = data[i + 2];
      b[i + 3] = Math.round(capaA * 255);
      compA = capaA + compA * (1 - capaA);
    }
    if (a > 16 / 255) {
      total++;
      const diff = a - compA;
      if (diff > peorDiff) peorDiff = diff;
      if (compA < a * 0.5) { perdidos++; perdidosMapa[i] = 255; perdidosMapa[i + 3] = 255; }
      else if (compA < a * 0.9) { casiPerdidos++; perdidosMapa[i] = 255; perdidosMapa[i + 1] = 165; perdidosMapa[i + 3] = 255; }
    }
  }
}
console.log(`píxeles con alfa: ${total}`);
console.log(`PERDIDOS (<50% del alfa original): ${perdidos} (${(100 * perdidos / total).toFixed(3)}%)`);
console.log(`degradados (<90%): ${casiPerdidos} (${(100 * casiPerdidos / total).toFixed(3)}%)`);
console.log(`peor déficit de alfa: ${(peorDiff * 100).toFixed(1)}%`);

// PNGs de inspección: composición + mapa de perdidos + cada capa sobre caqui
const overlays = [];
for (const nombre of orden) {
  await sharp(capasPng[nombre], { raw: { width: W, height: H, channels: 4 } })
    .png().toFile(OUT + 'capa-' + nombre + '.png');
  overlays.push({ input: OUT + 'capa-' + nombre + '.png' });
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#e9e4d6' } })
  .composite(overlays).png().toFile(OUT + 'recomposicion.png');
await sharp(perdidosMapa, { raw: { width: W, height: H, channels: 4 } })
  .png().toFile(OUT + 'mapa-perdidos.png');
console.log('PNGs de inspección en ' + OUT);
