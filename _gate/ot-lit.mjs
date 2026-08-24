// Cuenta píxeles ENCIDOS (canal máx > umbral) por celda en una caja.
// Para capturas en mix-blend-mode:difference sobre negro: negro=igualdad,
// encendido=aporte de la capa removida.
// Uso: node _gate/ot-lit.mjs img.png [x,y,w,h] [umbral] [celda]
import sharp from 'sharp';

const [img, boxArg, umArg, celdaArg] = process.argv.slice(2);
const UM = Number(umArg || 24);
const CELDA = Number(celdaArg || 20);
if (!img) { console.error('USO: ot-lit img.png [x,y,w,h] [umbral] [celda]'); process.exit(2); }
const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
let bx = 0, by = 0, bw = W, bh = H;
if (boxArg) { [bx, by, bw, bh] = boxArg.split(',').map(Number); }
console.log(`# ${img} ${W}x${H} caja=(${bx},${by},${bw},${bh}) canal>${UM} celda=${CELDA}`);
const nx = Math.ceil(bw / CELDA), ny = Math.ceil(bh / CELDA);
const celdas = new Uint32Array(nx * ny);
let total = 0, minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = by; y < Math.min(by + bh, H); y++) {
  for (let x = bx; x < Math.min(bx + bw, W); x++) {
    const p = (y * W + x) * 3;
    const m = Math.max(data[p], data[p + 1], data[p + 2]);
    if (m > UM) {
      celdas[((y - by) / CELDA | 0) * nx + ((x - bx) / CELDA | 0)]++; total++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
console.log(`# encendidos: ${total}`);
if (total) console.log(`# bbox caja-local: x ${minX}-${maxX}  y ${minY}-${maxY}`);
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    fila += v === 0 ? '   .' : String(v).padStart(4);
  }
  console.log(`y${String(by + cy * CELDA).padStart(4)} ${fila}`);
}
let enc = '# cols:';
for (let cx = 0; cx < nx; cx++) enc += ` x${bx + cx * CELDA}`;
console.log(enc);
