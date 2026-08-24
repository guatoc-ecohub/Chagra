/* hornear-verifica.mjs — prototipo Node/sharp con las MISMAS fórmulas de
   capas.js: recompone las capas y mide píxeles perdidos (huecos). También
   exporta cada capa a PNG para revisión a ojo. NO versionado (_gate). */
import sharp from 'sharp';
import anat from '../../src/visual/creatures/chivitoLamina/anatomia.js';

const { CABEZA, MANDIBULA, MANO_LAPIZ } = anat;
const SRC = 'public/compai/laminas/chivito-punk.png';
const OUT = '_gate/chivito-punk-lamina/';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fxCaja = (x, { x0, x1, xFade }) => ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
const mCabezaFull = (x, y) => fxCaja(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
const mMandibula = (x, y) => fxCaja(x, MANDIBULA.box) * ss(MANDIBULA.labio.y0, MANDIBULA.labio.y1, y)
  * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y)) * mCabezaFull(x, y);
const mCabezaRender = (x, y) => mCabezaFull(x, y) * (1 - mMandibula(x, y));
const mMano = (x, y) => {
  const { box, techo, muneca } = MANO_LAPIZ;
  const xN = clamp(x, 0, box.x1) / box.x1;
  const borde = muneca.y0 + muneca.caidaIzq * (1 - xN);
  return fxCaja(x, box) * ss(techo.y0, techo.y1, y)
    * (1 - ss(borde, borde + muneca.alto, y)) * (1 - mCabezaFull(x, y));
};
const hard = (m) => 1 - ss(0.93, 1.0, m);
const mCuerpo = (x, y) => hard(mCabezaFull(x, y)) * hard(mMano(x, y));

const { data, info } = await sharp(SRC).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const capas = {
  cuerpo: mCuerpo, cabeza: mCabezaRender, mandibula: mMandibula, manoLapiz: mMano,
};
const buffers = {};
for (const [nombre, m] of Object.entries(capas)) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = data[i + 3];
    buf[i] = data[i]; buf[i + 1] = data[i + 1]; buf[i + 2] = data[i + 2];
    buf[i + 3] = Math.round(a * m(x, y));
  }
  buffers[nombre] = buf;
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .flatten({ background: '#e9e4d6' }).png().toFile(OUT + 'capa-' + nombre + '.png');
}
// (1) ADITIVO — conservación de propiedad: cada píxel del original queda
//     repartido ENTERO entre las capas (la garantía "0% perdidos").
// (2) PINTOR — compuesto real del browser: en las bandas de crossfade el
//     apilado a+b<1 deja una costura semi-translúcida (inherente a la
//     técnica aprobada; se reporta honesto, no se esconde).
let perdidosAdd = 0, perdidosPintor = 0, opacos = 0, peorAdd = 0, peorPintor = 0;
for (let p = 0; p < W * H; p++) {
  const aOrig = data[p * 4 + 3] / 255;
  if (aOrig < 0.02) continue;
  opacos++;
  let suma = 0, resto = 1;
  for (const nombre of Object.keys(capas)) {
    const a = buffers[nombre][p * 4 + 3] / 255;
    suma += a; resto *= 1 - a;
  }
  const faltaAdd = aOrig - Math.min(1, suma);
  if (faltaAdd > 0.02) { perdidosAdd++; if (faltaAdd > peorAdd) peorAdd = faltaAdd; }
  const faltaPintor = aOrig - (1 - resto);
  if (faltaPintor > 0.04) { perdidosPintor++; if (faltaPintor > peorPintor) peorPintor = faltaPintor; }
}
console.log(`aditivo (huecos reales): ${perdidosAdd} px de ${opacos} = ${(100 * perdidosAdd / opacos).toFixed(3)}%  (peor: ${peorAdd.toFixed(3)})`);
console.log(`pintor (costura translúcida en crossfade): ${perdidosPintor} px de ${opacos} = ${(100 * perdidosPintor / opacos).toFixed(3)}%  (peor dip: ${peorPintor.toFixed(3)})`);
