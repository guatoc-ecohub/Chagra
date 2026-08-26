import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const SRC = '/home/kortux/demos/3d/compai/laminas/jaguar-natural.png';

const { data: sd, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (x, y) => { const i = (y * W + x) * 4; return [sd[i], sd[i + 1], sd[i + 2], sd[i + 3]]; };
const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// A) zona trasera: runs de alfa por fila con color medio y clase
console.log('=== TRASERA: runs por fila (y: [x0-x1] L=lum S=sat clase) ===');
for (let y = 200; y < 394; y += 6) {
  const runs = [];
  let x0 = -1;
  for (let x = 380; x <= 660; x++) {
    const a = px(x, y)[3];
    if (a > 40 && x0 < 0) x0 = x;
    if ((a <= 40 || x === 660) && x0 >= 0) {
      const x1 = a > 40 ? x : x - 1;
      let r = 0, g = 0, b = 0, n = 0;
      for (let xx = x0; xx <= x1; xx++) { const p = px(xx, y); r += p[0]; g += p[1]; b += p[2]; n++; }
      const c = [r / n, g / n, b / n];
      const cls = sat(c) < 0.42 && lum(c) > 130 ? 'CREMA' : (lum(c) < 90 ? 'OSCURO' : 'naranja');
      runs.push(`[${x0}-${x1}] L${lum(c) | 0} S${(sat(c) * 100) | 0} ${cls}`);
      x0 = -1;
    }
  }
  if (runs.length) console.log(y, runs.join('  '));
}

// B) garras delanteras: frontera blanco->naranja por fila
console.log('=== GARRAS DEL: frontera clase por fila (x en 150..300) ===');
for (let y = 300; y < 394; y += 4) {
  let borde = [];
  let prev = null;
  for (let x = 150; x <= 300; x++) {
    const p = px(x, y); if (p[3] < 40) { prev = null; continue; }
    const cls = sat(p) < 0.40 && lum(p) > 120 ? 'B' : (lum(p) < 80 ? 'K' : 'N');
    if (prev && prev !== cls && ((prev === 'B' && cls === 'N') || (prev === 'N' && cls === 'B'))) borde.push(`${cls}@${x}`);
    prev = cls;
  }
  // alfa: extremos de la fila
  let ax0 = -1, ax1 = -1;
  for (let x = 130; x <= 320; x++) { if (px(x, y)[3] > 40) { if (ax0 < 0) ax0 = x; ax1 = x; } }
  console.log(y, `alfa[${ax0}-${ax1}]`, borde.slice(0, 6).join(' '));
}

// C) paleta: parches
console.log('=== PALETA ===');
const parches = {
  nariz_ink: [78, 118, 12, 8], menton_crema: [70, 168, 20, 12], frente_naranja: [85, 30, 15, 12],
  hocico_blanco: [55, 140, 12, 8], pata_del_lejana_blanca: [155, 300, 14, 12], pata_del_cerca_naranja: [230, 300, 16, 12],
  pata_tras_lejana_crema: [528, 300, 12, 12], pata_tras_cerca_naranja: [470, 270, 16, 12],
};
for (const [k, [x0, y0, w, h]] of Object.entries(parches)) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const p = px(x, y); if (p[3] > 200) { r += p[0]; g += p[1]; b += p[2]; n++; } }
  if (n) console.log(k, `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`, `n=${n}`);
}
