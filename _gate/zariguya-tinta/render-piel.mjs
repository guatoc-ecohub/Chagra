/* eslint-disable no-undef -- arnés de gate (node), no código de la app */
// Rasteriza ZARIGUYA_TRAZADO_SVG (pose neutra, sin CSS) → PNG + lupas.
import sharp from 'sharp';
import { ZARIGUYA_TRAZADO_SVG } from '../../src/visual/creatures/zariguyaTrazado/pielTrazado.js';
const OUT = process.argv[2] || '/home/kortux/.claude/jobs/6b23183e/tmp/fix2';
const tag = process.argv[3] || 'fix2';
// viewBox -30 -25 545 500 → render 3x = 1635x1500
const svg = Buffer.from(ZARIGUYA_TRAZADO_SVG);
await sharp(svg, { density: 72 * 3 }).flatten({ background: '#f2ecdd' }).png().toFile(`${OUT}-full.png`);
// lupa cabeza: viewBox coords: cabeza x 85-300, y 0-170 → px offset (+30,+25) *3
const full = sharp(`${OUT}-full.png`);
const meta = await full.metadata();
console.log('full', meta.width, meta.height);
const crop = (name, vx, vy, vw, vh) => sharp(`${OUT}-full.png`).extract({ left: Math.round((vx + 30) * (meta.width / 545)), top: Math.round((vy + 25) * (meta.height / 500)), width: Math.round(vw * meta.width / 545), height: Math.round(vh * meta.height / 500) }).png().toFile(`${OUT}-lupa-${name}.png`);
await crop('cabeza', 80, -10, 230, 190);
await crop('bigotes', 30, 80, 340, 130);
console.log('OK', tag);
