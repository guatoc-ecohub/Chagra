// ASTILLÓMETRO: píxeles que eran PÁGINA clara en el reposo (lum>umPagina)
// y quedaron OSCUROS en la pose (lum<umTinta) → masa oscura flotante.
// Uso: node _gate/ot-astilla.mjs pose.png reposo.png [umTinta] [umPagina] [celda]
import sharp from 'sharp';

const [pose, reposo, utArg, upArg, celdaArg] = process.argv.slice(2);
const UT = Number(utArg || 200);
const UP = Number(upArg || 220);
const CELDA = Number(celdaArg || 20);
if (!pose || !reposo) { console.error('USO: ot-astilla pose.png reposo.png [umTinta] [umPagina] [celda]'); process.exit(2); }

const ap = await sharp(pose).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const ar = await sharp(reposo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = ap.info.width, H = ap.info.height;
if (ar.info.width !== W || ar.info.height !== H) { console.error('TAMAÑOS DISTINTOS'); process.exit(2); }
const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

const nx = Math.ceil(W / CELDA), ny = Math.ceil(H / CELDA);
const celdas = new Uint32Array(nx * ny);
let total = 0;
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let i = 0, p = 0; i < W * H; i++, p += 3) {
  const lp = lum(ap.data, p), lr = lum(ar.data, p);
  if (lp < UT && lr > UP) {
    total++;
    const x = i % W, y = (i / W) | 0;
    celdas[((y / CELDA) | 0) * nx + ((x / CELDA) | 0)]++;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
console.log(`# ${pose} vs ${reposo}: oscuro<${UT} sobre pagina>${UP}`);
console.log(`# astilla total: ${total} px (${((100 * total) / (W * H)).toFixed(3)}%)`);
if (!total) { console.log('# SIN ASTILLA'); process.exit(0); }
console.log(`# bbox: x ${minX}-${maxX}  y ${minY}-${maxY}  (panel 480px; lamina: lx=px/0.69565-20, ly=py/0.69565-30)`);
for (let cy = 0; cy < ny; cy++) {
  let fila = '';
  for (let cx = 0; cx < nx; cx++) {
    const v = celdas[cy * nx + cx];
    fila += v === 0 ? '   .' : String(v).padStart(4);
  }
  console.log(`y${String(cy * CELDA).padStart(4)} ${fila}`);
}
let enc = '# cols:';
for (let cx = 0; cx < nx; cx++) enc += ` x${cx * CELDA}`;
console.log(enc);
