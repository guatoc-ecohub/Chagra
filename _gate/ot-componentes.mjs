// Componentes conexas de tinta oscura (lum<UM). Lista bbox+tamaño de los
// componentes pequeños (no el cuerpo principal) para detectar fragmentos
// desprendidos ("astillas").
// Uso: node _gate/ot-componentes.mjs img.png [umbralLum] [tamanioMax] [yMax]
import sharp from 'sharp';

const [img, umArg, maxArg, ymaxArg] = process.argv.slice(2);
const UM = Number(umArg || 200);
const TAMAX = Number(maxArg || 1500);
const YMAX = Number(ymaxArg || 400);
if (!img) { console.error('USO: ot-componentes img.png [umbral] [tamMax] [yMax]'); process.exit(2); }
const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (i) => 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
const etiqueta = new Int32Array(W * H).fill(-1);
const comps = [];
const pila = [];
for (let i0 = 0; i0 < W * H; i0++) {
  if (etiqueta[i0] >= 0 || lum(i0) >= UM) continue;
  const id = comps.length;
  let n = 0, minX = W, minY = H, maxX = -1, maxY = -1;
  pila.length = 0; pila.push(i0); etiqueta[i0] = id;
  while (pila.length) {
    const i = pila.pop(); n++;
    const x = i % W, y = (i / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    for (const d of [-1, 1, -W, W]) {
      const j = i + d;
      if (j < 0 || j >= W * H) continue;
      if (d === -1 && x === 0) continue;
      if (d === 1 && x === W - 1) continue;
      if (etiqueta[j] < 0 && lum(j) < UM) { etiqueta[j] = id; pila.push(j); }
    }
  }
  comps.push({ n, minX, minY, maxX, maxY });
}
comps.sort((a, b) => b.n - a.n);
console.log(`# ${img}: ${comps.length} componentes oscuros (lum<${UM})`);
console.log('# principales:');
for (const c of comps.slice(0, 3)) console.log(`  n=${c.n} bbox x${c.minX}-${c.maxX} y${c.minY}-${c.maxY}`);
console.log(`# fragmentos chicos (n<=${TAMAX}, bbox dentro de y<${YMAX}):`);
let vistos = 0;
for (const c of comps.slice(3)) {
  if (c.n > TAMAX || c.maxY > YMAX) continue;
  vistos++;
  const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
  console.log(`  n=${String(c.n).padStart(5)} bbox x${String(c.minX).padStart(3)}-${String(c.maxX).padStart(3)} (w${String(w).padStart(3)}) y${String(c.minY).padStart(3)}-${String(c.maxY).padStart(3)} (h${String(h).padStart(3)}) forma=${(c.n / (w * h)).toFixed(2)}`);
}
if (!vistos) console.log('  (ninguno)');
