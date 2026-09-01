/**
 * build-hoja — hoja de contacto para revisión del operador: lámina original,
 * cada capa del set, la recomposición en reposo y las poses de prueba.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const OUT = '/home/kortux/demos/3d/compai/rigs2d/oso';
const SRC = '/home/kortux/demos/3d/compai/laminas/oso.png';

const CW = 308, CH = 315, PAD = 6, LBL = 20;
const celdas = [
  [SRC, 'lámina original'],
  [`${OUT}/_build/crops/reposo-full.png`, 'RECOMPOSICIÓN reposo (candado abajo)'],
  [`${OUT}/roca.png`, 'roca (inpaint tras pies/palo)'],
  [`${OUT}/cuerpo-inpaint.png`, 'cuerpo-inpaint (cabeza/cuello intactos)'],
  [`${OUT}/pierna-cercana.png`, 'pierna-cercana (limpia)'],
  [`${OUT}/pierna-ocluida.png`, 'pierna-ocluida (raíz respaldada)'],
  [`${OUT}/brazo-baston.png`, 'brazo+bastón (corona aparte)'],
  [`${OUT}/cara.png`, 'cara (corte aprobado) '],
  [`${OUT}/corona.png`, 'corona (hija del brazo en el rig)'],
  [`${OUT}/_build/crops/pose-idle.png`, 'PRUEBA idle ±6° con roca'],
  [`${OUT}/_build/crops/pose-zancada.png`, 'PRUEBA zancada ±14-16° sin roca'],
  [`${OUT}/_build/crops/pose-gesto.png`, 'PRUEBA gesto bastón +9°'],
];
const visemas = ['boca-cerrada', 'boca-entreabierta', 'boca-abierta', 'boca-ancha'];

const COLS = 4;
const filas = Math.ceil(celdas.length / COLS);
const W = COLS * (CW + PAD) + PAD;
const H = filas * (CH + LBL + PAD) + PAD + 240 + LBL + PAD + 30;

const comps = [];
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
svg += `<text x="${PAD}" y="${H - 10}" font-size="13" fill="#333" font-family="monospace">rigs2d/oso · lámina Humboldt real en capas de rig · 2026-08-19 · cero redibujo (boca-interior y tintas documentadas) · candado reposo: déficit 373px (transiciones, máx 39/255 puntual) · exceso 3px · color 1393px (anillos AA bajo pies)</text>`;
for (let k = 0; k < celdas.length; k++) {
  const col = k % COLS, fila = (k / COLS) | 0;
  const x = PAD + col * (CW + PAD);
  const y = PAD + fila * (CH + LBL + PAD);
  const buf = await sharp(celdas[k][0]).resize({ width: CW, height: CH, fit: 'contain', background: { r: 235, g: 231, b: 222, alpha: 1 } }).png().toBuffer();
  comps.push({ input: buf, left: x, top: y + LBL });
  svg += `<text x="${x + 2}" y="${y + 14}" font-size="12" fill="#222" font-family="monospace">${celdas[k][1]}</text>`;
}
// tira de visemas (crops de debug ya compuestos sobre la cabeza)
const yV = PAD + filas * (CH + LBL + PAD) + LBL;
svg += `<text x="${PAD + 2}" y="${yV - 5}" font-size="12" fill="#222" font-family="monospace">visemas (interior = elipse BOCA aprobada + mandíbula charnela [296,152]): cerrada · entreabierta · abierta · ancha</text>`;
for (let k = 0; k < visemas.length; k++) {
  const buf = await sharp(`${OUT}/_build/crops/dbg-${visemas[k]}.png`).resize({ height: 240 }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  comps.push({ input: buf, left: PAD + k * (meta.width + PAD), top: yV });
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#f2ede4' } })
  .composite([...comps, { input: Buffer.from(svg + '</svg>'), left: 0, top: 0 }])
  .png().toFile(`${OUT}/hoja-contacto.png`);
console.log('-> hoja-contacto.png');
