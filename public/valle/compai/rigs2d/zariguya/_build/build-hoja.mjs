/**
 * build-hoja — hoja de contacto para revisión del operador: las 13 capas del
 * set + recomposición en reposo + poses de prueba + visemas, etiquetadas.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const OUT = '/home/kortux/demos/3d/compai/rigs2d/zariguya';

const CELL_W = 320, CELL_H = 340, LABEL_H = 26;
const piezas = [
  ['cuerpo-inpaint', `${OUT}/cuerpo-inpaint.png`],
  ['cola (prensil)', `${OUT}/cola.png`],
  ['pata-ocluida', `${OUT}/pata-ocluida.png`],
  ['pata-cercana', `${OUT}/pata-cercana.png`],
  ['brazo-lapiz', `${OUT}/brazo-lapiz.png`],
  ['brazo-brujula', `${OUT}/brazo-brujula.png`],
  ['cara', `${OUT}/cara.png`],
  ['oreja-izq · oreja-der', null],
  ['mandibula-inferior', `${OUT}/mandibula-inferior.png`],
  ['boca-interior', `${OUT}/boca-interior.png`],
  ['REPOSO (= lámina)', `${OUT}/_build/crops/pose-reposo.png`],
  ['pose paso', `${OUT}/_build/crops/pose-paso.png`],
  ['cola enroscada −10°', `${OUT}/_build/crops/pose-cola-enrosca.png`],
  ['cola suelta +8°', `${OUT}/_build/crops/pose-cola-suelta.png`],
  ['gesto + visema V3', `${OUT}/_build/crops/pose-gesto.png`],
  ['idle (peso)', `${OUT}/_build/crops/pose-idle.png`],
  ['visema cerrada', `${OUT}/_build/crops/dbg-boca-cerrada.png`],
  ['visema entreabierta', `${OUT}/_build/crops/dbg-boca-entreabierta.png`],
  ['visema abierta', `${OUT}/_build/crops/dbg-boca-abierta.png`],
  ['visema ancha', `${OUT}/_build/crops/dbg-boca-ancha.png`],
];

const COLS = 4;
const ROWS = Math.ceil(piezas.length / COLS);
const HOJA_W = COLS * CELL_W, HOJA_H = ROWS * CELL_H;

const compuestas = [];
for (let k = 0; k < piezas.length; k++) {
  const [nombre, ruta] = piezas[k];
  const col = k % COLS, fila = (k / COLS) | 0;
  const x0 = col * CELL_W, y0 = fila * CELL_H;
  let thumb;
  if (nombre.startsWith('oreja')) {
    const a = await sharp(`${OUT}/oreja-izq.png`).trim().resize({ height: 130, kernel: 'lanczos3' }).png().toBuffer();
    const b = await sharp(`${OUT}/oreja-der.png`).trim().resize({ height: 130, kernel: 'lanczos3' }).png().toBuffer();
    const am = await sharp(a).metadata();
    thumb = await sharp({ create: { width: CELL_W - 20, height: CELL_H - LABEL_H - 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: a, left: 20, top: 60 }, { input: b, left: 40 + (am.width || 100), top: 60 }])
      .png().toBuffer();
  } else {
    thumb = await sharp(ruta)
      .resize({ width: CELL_W - 20, height: CELL_H - LABEL_H - 20, fit: 'inside', kernel: 'lanczos3' })
      .png().toBuffer();
  }
  const meta = await sharp(thumb).metadata();
  compuestas.push({ input: thumb, left: x0 + 10 + (((CELL_W - 20) - meta.width) >> 1), top: y0 + LABEL_H + 10 });
  const svg = `<svg width="${CELL_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="18" font-size="15" font-family="monospace" fill="#222">${nombre}</text></svg>`;
  compuestas.push({ input: Buffer.from(svg), left: x0, top: y0 });
}

await sharp({ create: { width: HOJA_W, height: HOJA_H, channels: 4, background: '#efe9dd' } })
  .composite(compuestas)
  .png().toFile(`${OUT}/hoja-contacto.png`);
console.log('-> hoja-contacto.png');
