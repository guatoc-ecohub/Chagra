// Clasifica píxeles pose-vs-reposo en dos masas:
//   seFue       = tinta en reposo (lum<UT) que en pose quedó página (lum>UP)
//   nuevoOscuro = página en reposo que en pose quedó tinta
// Uso: node _gate/ot-clasifica.mjs pose.png reposo.png [UT UP celda x,y,w,h]
// Salida: totales globales + tablas F/O por celdas de la caja + lum media pose.
import sharp from 'sharp';

const [poseP, reposoP] = process.argv.slice(2);
const UT = Number(process.argv[4] || 200);
const UP = Number(process.argv[5] || 222);
const CELDA = Number(process.argv[6] || 10);
const boxArg = process.argv[7];
if (!poseP || !reposoP) {
  console.error('USO: ot-clasifica pose.png reposo.png [UT UP celda x,y,w,h]');
  process.exit(2);
}
const ap = await sharp(poseP).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rp = await sharp(reposoP).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = ap.info.width, H = ap.info.height;
if (rp.info.width !== W || rp.info.height !== H) { console.error('TAMAÑOS DISTINTOS'); process.exit(2); }
let bx = 0, by = 0, bw = W, bh = H;
if (boxArg) { [bx, by, bw, bh] = boxArg.split(',').map(Number); }

const lumA = new Float32Array(W * H);
const lumR = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const p = i * 3;
  lumA[i] = 0.2126 * ap.data[p] + 0.7152 * ap.data[p + 1] + 0.0722 * ap.data[p + 2];
  lumR[i] = 0.2126 * rp.data[p] + 0.7152 * rp.data[p + 1] + 0.0722 * rp.data[p + 2];
}

let seFueT = 0, oscuroT = 0;
const nx = Math.ceil(bw / CELDA), ny = Math.ceil(bh / CELDA);
const celFue = new Uint32Array(nx * ny);
const celOsc = new Uint32Array(nx * ny);
const celLum = new Float32Array(nx * ny);
const celN = new Uint32Array(nx * ny);

for (let y = by; y < Math.min(by + bh, H); y++) {
  for (let x = bx; x < Math.min(bx + bw, W); x++) {
    const i = y * W + x;
    const c = ((y - by) / CELDA | 0) * nx + ((x - bx) / CELDA | 0);
    celLum[c] += lumA[i]; celN[c]++;
    if (lumR[i] < UT && lumA[i] > UP) { seFueT++; celFue[c]++; }
    else if (lumR[i] > UP && lumA[i] < UT) { oscuroT++; celOsc[c]++; }
  }
}
console.log(`# ${poseP} vs ${reposoP} | UT=${UT} UP=${UP} | ${W}x${H}`);
console.log(`# GLOBAL  seFue=${seFueT}  nuevoOscuro=${oscuroT}`);
console.log(`# CAJA (${bx},${by},${bw},${bh}) celda=${CELDA} — F=seFue O=nuevoOscuro por celda`);
for (let cy = 0; cy < ny; cy++) {
  let f = '', o = '';
  for (let cx = 0; cx < nx; cx++) {
    const c = cy * nx + cx;
    f += String(celFue[c]).padStart(4);
    o += String(celOsc[c]).padStart(4);
  }
  console.log(`y${String(by + cy * CELDA).padStart(4)}  F:${f}`);
  console.log(`y${String(by + cy * CELDA).padStart(4)}  O:${o}`);
}
console.log(`# cols: x0=${Array.from({ length: nx }, (_, i) => bx + i * CELDA).join(' ')}`);
console.log(`# lumMedia pose por celda:`);
for (let cy = 0; cy < ny; cy++) {
  let l = '';
  for (let cx = 0; cx < nx; cx++) l += String(Math.round(celLum[cy * nx + cx] / Math.max(celN[cy * nx + cx], 1))).padStart(5);
  console.log(`y${String(by + cy * CELDA).padStart(4)}  L:${l}`);
}
