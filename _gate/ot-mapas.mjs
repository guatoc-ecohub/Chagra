// Mapa ASCII página/tinta por celdas de varias imágenes alineadas.
// Uso: node _gate/ot-mapas.mjs caja=x,y,w,h celda img1 img2 ...
// '.', 'o', '#' según lum media de la celda (>222, 200-222, <200).
import sharp from 'sharp';

const cajaArg = process.argv[2];
const CELDA = Number(process.argv[3]);
const imgs = process.argv.slice(4);
if (!cajaArg || imgs.length === 0) {
  console.error('USO: ot-mapas caja=x,y,w,h celda img...');
  process.exit(2);
}
const [bx, by, bw, bh] = cajaArg.split(',').map(Number);
const nx = Math.ceil(bw / CELDA), ny = Math.ceil(bh / CELDA);

for (const f of imgs) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  console.log(`# ${f}`);
  for (let cy = 0; cy < ny; cy++) {
    let fila = '';
    for (let cx = 0; cx < nx; cx++) {
      let sum = 0, n = 0;
      for (let y = by + cy * CELDA; y < Math.min(by + (cy + 1) * CELDA, by + bh); y++) {
        for (let x = bx + cx * CELDA; x < Math.min(bx + (cx + 1) * CELDA, bx + bw); x++) {
          const p = (y * W + x) * 3;
          sum += 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
          n++;
        }
      }
      const m = sum / Math.max(n, 1);
      fila += m > 222 ? ' .' : m < 200 ? ' #' : ' o';
    }
    console.log(`y${String(by + cy * CELDA).padStart(4)} ${fila}`);
  }
  const cols = [];
  for (let cx = 0; cx < nx; cx++) cols.push(bx + cx * CELDA);
  console.log(`# cols x: ${cols.join(' ')}`);
}
