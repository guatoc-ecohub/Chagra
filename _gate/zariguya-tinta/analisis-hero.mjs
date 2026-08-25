/* eslint-disable no-undef -- arnés de gate (node), no código de la app */
// Análisis del hero 481×444: silueta alfa (marching squares + RDP), grilla, colores.
import sharp from 'sharp';
import fs from 'node:fs';

const HERO = '/home/kortux/Workspace/chagra/.worktrees/zariguya-tinta/public/compai/laminas/zariguya-gemini-hero.png';
const OUT = '/home/kortux/.claude/jobs/6b23183e/tmp';

const { data, info } = await sharp(HERO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
console.log('dims', W, H);

const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : data[(y * W + x) * 4 + 3];
const RGB = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const solid = (x, y) => A(x, y) > 40;

// ---- contorno: border-following (Moore) del blob más grande ----
function trace() {
  // find topmost-leftmost solid pixel
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y)) { sx = x; sy = y; break outer; }
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  let cx = sx, cy = sy, dir = 6; // came from below-ish
  const pts = [[sx, sy]];
  for (let step = 0; step < 200000; step++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8; // start from backtrack+1 (Moore)
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
      if (solid(nx, ny)) { cx = nx; cy = ny; dir = d; pts.push([cx, cy]); found = true; break; }
    }
    if (!found) break;
    if (cx === sx && cy === sy && pts.length > 10) break;
  }
  return pts;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const dmax = { d: 0, i: 0 };
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
    if (d > dmax.d) { dmax.d = d; dmax.i = i; }
  }
  if (dmax.d > eps) {
    const l = rdp(pts.slice(0, dmax.i + 1), eps), r = rdp(pts.slice(dmax.i), eps);
    return l.slice(0, -1).concat(r);
  }
  return [pts[0], pts[pts.length - 1]];
}

const raw = trace();
console.log('contorno bruto pts:', raw.length);
for (const eps of [1.0, 2.0]) {
  const half = Math.floor(raw.length / 2);
  const a = rdp(raw.slice(0, half + 1), eps), b = rdp(raw.slice(half), eps);
  const s = a.slice(0, -1).concat(b);
  fs.writeFileSync(`${OUT}/silueta-eps${eps}.json`, JSON.stringify(s));
  console.log(`eps=${eps}: ${s.length} pts`);
}

// ---- grilla etiquetada 2x ----
const Z = 2;
let gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W*Z}" height="${H*Z}">`;
for (let x = 0; x <= W; x += 20) {
  const major = x % 100 === 0;
  gridSvg += `<line x1="${x*Z}" y1="0" x2="${x*Z}" y2="${H*Z}" stroke="${major?'#e11':'#1a6ee1'}" stroke-width="${major?1.2:0.5}" opacity="0.55"/>`;
  if (x % 40 === 0) gridSvg += `<text x="${x*Z+2}" y="12" font-size="11" fill="#e11" font-family="monospace">${x}</text>`;
}
for (let y = 0; y <= H; y += 20) {
  const major = y % 100 === 0;
  gridSvg += `<line x1="0" y1="${y*Z}" x2="${W*Z}" y2="${y*Z}" stroke="${major?'#e11':'#1a6ee1'}" stroke-width="${major?1.2:0.5}" opacity="0.55"/>`;
  if (y % 40 === 0) gridSvg += `<text x="2" y="${y*Z+12}" font-size="11" fill="#e11" font-family="monospace">${y}</text>`;
}
gridSvg += `</svg>`;
await sharp(HERO).resize(W*Z, H*Z, { kernel: 'nearest' })
  .flatten({ background: '#f5f0e6' })
  .composite([{ input: Buffer.from(gridSvg) }])
  .png().toFile(`${OUT}/hero-grid-2x.png`);

// ---- muestreo de colores en parches clave (promedio 5x5) ----
const patch = (name, x, y) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (A(x + dx, y + dy) > 200) { const c = RGB(x + dx, y + dy); r += c[0]; g += c[1]; b += c[2]; n++; }
  }
  if (!n) return console.log(name, x, y, 'TRANSPARENTE');
  const hx = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  console.log(name.padEnd(18), `(${x},${y})`, `#${hx(r)}${hx(g)}${hx(b)}`, `n=${n}`);
};
patch('coronilla', 190, 45);
patch('frente', 195, 70);
patch('antifaz-ojo-izq', 160, 78);
patch('mejilla-crema', 170, 100);
patch('hocico', 230, 100);
patch('nariz', 252, 96);
patch('oreja-int-izq', 122, 32);
patch('oreja-borde', 108, 22);
patch('pecho-crema', 210, 220);
patch('panza', 250, 300);
patch('lomo-oscuro', 330, 200);
patch('grupa', 340, 300);
patch('muslo', 300, 340);
patch('pata-pie', 300, 420);
patch('cola-base', 380, 340);
patch('cola-media', 450, 300);
patch('cola-punta', 420, 240);
patch('mano-lapiz', 60, 170);
patch('lapiz-madera', 75, 145);
patch('brujula', 140, 265);
patch('brazo-alzado', 120, 200);
console.log('OK');
