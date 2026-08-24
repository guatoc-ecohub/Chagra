// Centroide de tinta oscura en una caja (espacio lámina normalizado).
// Uso: node _gate/ot-centroid.mjs img.png x0,y0,x1,y1 [umbral]
import sharp from 'sharp';
const [img, boxArg, umArg] = process.argv.slice(2);
const UM = Number(umArg || 200);
const [x0, y0, x1, y1] = boxArg.split(',').map(Number);
const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
let sx = 0, sy = 0, n = 0;
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const i = (y * W + x) * 3;
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (l < UM) { sx += x; sy += y; n++; }
}
console.log(n ? `centroide=(${(sx / n).toFixed(1)},${(sy / n).toFixed(1)}) tinta=${n}` : 'sin tinta');
