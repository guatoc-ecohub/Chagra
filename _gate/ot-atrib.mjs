// ATRIBUCIÓN de astilla: píxeles que en pose son oscuros (<UT) sobre lo que en
// reposo era página (>UP) Y que están encendidos (>UL) en una captura-dif
// (aporte de la capa). Tabla por celdas.
// Uso: node _gate/ot-atrib.mjs pose.png reposo.png capa-dif.png [UT UP UL celda]
import sharp from 'sharp';

const [pose, reposo, capa, utArg, upArg, ulArg, celdaArg] = process.argv.slice(2);
const UT = Number(utArg || 200), UP = Number(upArg || 220), UL = Number(ulArg || 20), CELDA = Number(celdaArg || 20);
if (!pose || !reposo || !capa) { console.error('USO: ot-atrib pose reposo capadif [UT UP UL celda]'); process.exit(2); }
const [ap, rp, cp] = await Promise.all([pose, reposo, capa].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
const W = ap.info.width, H = ap.info.height;
const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
const chanMax = (d, i) => Math.max(d[i], d[i + 1], d[i + 2]);
const nx = Math.ceil(W / CELDA), ny = Math.ceil(H / CELDA);
const celdas = new Uint32Array(nx * ny);
let total = 0, minX = W, minY = H, maxX = -1, maxY = -1;
for (let i = 0, p = 0; i < W * H; i++, p += 3) {
  if (lum(ap.data, p) < UT && lum(rp.data, p) > UP && chanMax(cp.data, p) > UL) {
    total++;
    const x = i % W, y = (i / W) | 0;
    celdas[((y / CELDA) | 0) * nx + ((x / CELDA) | 0)]++;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
console.log(`# astilla atribuible a ${capa}: ${total} px`);
if (!total) { console.log('# NADA'); process.exit(0); }
console.log(`# bbox panel: x ${minX}-${maxX} y ${minY}-${maxY}`);
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    fila += v === 0 ? '   .' : String(v).padStart(4);
  }
  if (celdas.subarray(cy * nx, cy * nx + nx).some(Boolean)) console.log(`y${String(cy * CELDA).padStart(4)} ${fila}`);
}
console.log('# (solo filas con masa)');
