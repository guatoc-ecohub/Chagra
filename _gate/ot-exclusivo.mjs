// Astilla TRAZADO-específica: píxeles en máscara-trazado que NO están en la
// máscara-viva dilatada radio R. Tabla densidad + bbox.
// Uso: node _gate/ot-exclusivo.mjs maskTrazado.png maskViva.png [radio] [celda]
import sharp from 'sharp';

const [ft, fv, radArg, celdaArg] = process.argv.slice(2);
const R = Number(radArg || 2);
const CELDA = Number(celdaArg || 20);
if (!ft || !fv) { console.error('USO: ot-exclusivo maskTrazado maskViva [radio] [celda]'); process.exit(2); }
const [at, av] = await Promise.all([ft, fv].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
const W = at.info.width, H = at.info.height;
const enc = (d, i) => d[i * 3] > 128;
// dilatación de la viva (chebyshev radio R)
const vdil = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (enc(av.data, y * W + x)) {
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) vdil[yy * W + xx] = 1;
    }
  }
}
const nx = Math.ceil(W / CELDA), ny = Math.ceil(H / CELDA);
const celdas = new Uint32Array(nx * ny);
let total = 0, minX = W, minY = H, maxX = -1, maxY = -1;
for (let i = 0; i < W * H; i++) {
  if (enc(at.data, i) && !vdil[i]) {
    total++;
    const x = i % W, y = (i / W) | 0;
    celdas[((y / CELDA) | 0) * nx + ((x / CELDA) | 0)]++;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
console.log(`# exclusivo de trazado (${ft}): ${total} px`);
if (!total) { console.log('# NADA EXCLUSIVO'); process.exit(0); }
console.log(`# bbox lámina: x ${minX}-${maxX} y ${minY}-${maxY}`);
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  let alguna = false;
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    if (v) alguna = true;
    fila += v === 0 ? '   .' : String(v).padStart(4);
  }
  if (alguna) console.log(`y${String(cy * CELDA).padStart(4)} ${fila}`);
}
