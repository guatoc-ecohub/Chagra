// Tinta oscura por celda en una caja de un PNG: cuenta píxeles con luminancia
// < umbral. Sirve para pesar masa oscura sobre zona que debería ser página.
// Uso: node _gate/ot-tinta.mjs img.png [x,y,w,h] [umbralLum] [celda]
import sharp from 'sharp';

const [img, boxArg, umArg, celdaArg] = process.argv.slice(2);
const UM = Number(umArg || 200);
const CELDA = Number(celdaArg || 20);
if (!img) { console.error('USO: ot-tinta img.png [x,y,w,h] [umbralLum] [celda]'); process.exit(2); }

const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
let bx = 0, by = 0, bw = W, bh = H;
if (boxArg) { [bx, by, bw, bh] = boxArg.split(',').map(Number); }
console.log(`# ${img} ${W}x${H} caja=(${bx},${by},${bw},${bh}) lum<${UM} celda=${CELDA}px`);
const nx = Math.ceil(bw / CELDA), ny = Math.ceil(bh / CELDA);
const celdas = new Uint32Array(nx * ny);
let total = 0;
for (let y = by; y < Math.min(by + bh, H); y++) {
  for (let x = bx; x < Math.min(bx + bw, W); x++) {
    const p = (y * W + x) * 3;
    const lum = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    if (lum < UM) { celdas[((y - by) / CELDA | 0) * nx + ((x - bx) / CELDA | 0)]++; total++; }
  }
}
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    fila += v === 0 ? '    .' : String(v).padStart(4);
  }
  console.log(`y${String(by + cy * CELDA).padStart(4)} ${fila}`);
}
let encabezado = '# cols:';
for (let cx = 0; cx < nx; cx++) encabezado += ` x${bx + cx * CELDA}`;
console.log(encabezado);
console.log(`# tinta total en caja: ${total} de ${bw * bh}`);
