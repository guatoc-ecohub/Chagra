// Extremos de tinta oscura en una caja: topmost/leftmost/rightmost con coords.
import sharp from 'sharp';
const [img, boxArg] = process.argv.slice(2);
const [x0, y0, x1, y1] = boxArg.split(',').map(Number);
const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
let top = null, izq = null, der = null;
for (let y = y0; y < y1 && !top; y++) for (let x = x0; x < x1; x++) {
  const i = (y * W + x) * 3;
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (l < 200) { top = { x, y }; break; }
}
for (let x = x0; x < x1 && !izq; x++) for (let y = y0; y < y1; y++) {
  const i = (y * W + x) * 3;
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (l < 200) { izq = { x, y }; break; }
}
for (let x = x1 - 1; x >= x0 && !der; x--) for (let y = y0; y < y1; y++) {
  const i = (y * W + x) * 3;
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (l < 200) { der = { x, y }; break; }
}
console.log(`top=${JSON.stringify(top)} izq=${JSON.stringify(izq)} der=${JSON.stringify(der)}`);
