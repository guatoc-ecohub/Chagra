/** build-hoja — hoja de contacto (contact sheet) del set rigs2d/jaguar */
import { sharp, OUT, SRC } from './lib.mjs';

const CROPS = `${OUT}/_build/crops`;
const CELL_W = 360, CELL_H = 290, LABEL = 26, PAD = 10, COLS = 4;
const celdas = [
  [SRC, 'lámina original (referencia)'],
  [`${CROPS}/dbg-recomp.png`, 'recomposición en reposo (control)'],
  [`${CROPS}/dbg-cuerpo.png`, 'cuerpo-inpaint.png'],
  [`${CROPS}/dbg-tras-cercana.png`, 'pata-tras-cercana.png'],
  [`${CROPS}/dbg-del-lejana.png`, 'pata-del-lejana.png'],
  [`${CROPS}/dbg-tras-lejana.png`, 'pata-tras-lejana.png'],
  [null, 'mandibula-inferior.png (capa)', `${OUT}/mandibula-inferior.png`, [30, 130, 115, 85]],
  [null, 'boca-interior.png (capa nueva)', `${OUT}/boca-interior.png`, [40, 135, 90, 70]],
  [`${CROPS}/dbg-boca-cerrada.png`, 'visema: cerrada'],
  [`${CROPS}/dbg-boca-entreabierta.png`, 'visema: entreabierta'],
  [`${CROPS}/dbg-boca-abierta.png`, 'visema: abierta'],
  [`${CROPS}/dbg-boca-ancha.png`, 'visema: ancha'],
];

const filas = Math.ceil(celdas.length / COLS);
const W = COLS * (CELL_W + PAD) + PAD;
const H = 56 + filas * (CELL_H + LABEL + PAD);
const comps = [];
let k = 0;
for (const c of celdas) {
  const col = k % COLS, fila = (k / COLS) | 0;
  const x0 = PAD + col * (CELL_W + PAD);
  const y0 = 56 + fila * (CELL_H + LABEL + PAD);
  let img = sharp(c[0] ?? c[2]);
  if (!c[0]) {
    const [l, t, w, h] = c[3];
    img = img.extract({ left: l, top: t, width: w, height: h }).resize({ width: w * 3, kernel: 'lanczos3' });
  }
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const esc = Math.min(CELL_W / meta.width, CELL_H / meta.height, 1);
  const rw = Math.round(meta.width * esc), rh = Math.round(meta.height * esc);
  const fit = await sharp(buf).resize({ width: rw, height: rh, kernel: 'lanczos3' }).png().toBuffer();
  comps.push({ input: fit, left: x0 + ((CELL_W - rw) >> 1), top: y0 + ((CELL_H - rh) >> 1) });
  const svg = `<svg width="${CELL_W}" height="${LABEL}"><text x="${CELL_W / 2}" y="18" text-anchor="middle" font-family="monospace" font-size="15" fill="#f0e8d8">${c[1]}</text></svg>`;
  comps.push({ input: Buffer.from(svg), left: x0, top: y0 + CELL_H + 2 });
  k++;
}
const titulo = `<svg width="${W}" height="48"><text x="${W / 2}" y="32" text-anchor="middle" font-family="monospace" font-size="22" fill="#f0e8d8">compai/rigs2d/jaguar — capas para rig Rive 2.5D (fiel a jaguar-natural.png) — 2026-08-15</text></svg>`;
comps.push({ input: Buffer.from(titulo), left: 0, top: 4 });

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 74, g: 72, b: 68, alpha: 1 } } })
  .composite(comps).png().toFile(`${OUT}/hoja-contacto.png`);
console.log('-> hoja-contacto.png', W, 'x', H);
