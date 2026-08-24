// Mide MASA de diferencia entre dos PNG (mismo tamaño) por celdas.
// Uso: node _gate/ot-mide.mjs A.png B.png [umbral] [celda] [x,y,w,h]
// Salida: total píxeles movidos, bbox, tabla densidad por celda (filas=y).
import sharp from 'sharp';

const [a, b, umbralArg, celdaArg, boxArg] = process.argv.slice(2);
const UM = Number(umbralArg || 12);
const CELDA = Number(celdaArg || 40);
if (!a || !b) { console.error('USO: ot-mide A.png B.png [umbral] [celda] [x,y,w,h]'); process.exit(2); }

const ra = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rb = await sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = ra.info;
if (rb.info.width !== W || rb.info.height !== H) { console.error('TAMAÑOS DISTINTOS', W, H, rb.info.width, rb.info.height); process.exit(2); }
let bx = 0, by = 0, bw = W, bh = H;
if (boxArg) { [bx, by, bw, bh] = boxArg.split(',').map(Number); }

const mascara = new Uint8Array(W * H);
let total = 0;
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = by; y < Math.min(by + bh, H); y++) {
  for (let x = bx; x < Math.min(bx + bw, W); x++) {
    const i = y * W + x, p = i * 3;
    const d = Math.max(Math.abs(ra.data[p] - rb.data[p]), Math.abs(ra.data[p + 1] - rb.data[p + 1]), Math.abs(ra.data[p + 2] - rb.data[p + 2]));
    if (d > UM) { mascara[i] = 1; total++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
}
console.log(`# ${a} vs ${b}  umbral=${UM}  ${W}x${H}`);
console.log(`# pixeles en mascara: ${total} (${((100 * total) / (W * H)).toFixed(2)}%)`);
if (maxX < 0) { console.log('# mascara VACIA'); process.exit(0); }
console.log(`# bbox: x ${minX}-${maxX} (ancho ${maxX - minX + 1})  y ${minY}-${maxY} (alto ${maxY - minY + 1})`);
const nx = Math.ceil(bw / CELDA), ny = Math.ceil(bh / CELDA);
const celdas = new Uint32Array(nx * ny);
for (let y = by; y < Math.min(by + bh, H); y++) {
  for (let x = bx; x < Math.min(bx + bw, W); x++) {
    if (mascara[y * W + x]) celdas[((y - by) / CELDA | 0) * nx + ((x - bx) / CELDA | 0)]++;
  }
}
console.log(`# tabla densidad ${CELDA}px (fila=y, caja x${bx} y${by}). '.'=0`);
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    fila += v === 0 ? '    .' : String(v).padStart(4);
  }
  console.log(`y${String(cy * CELDA).padStart(4)} ${fila}`);
}
console.log(`# cols: x0=${Array.from({ length: nx }, (_, i) => bx + i * CELDA).join(' ')}`);
