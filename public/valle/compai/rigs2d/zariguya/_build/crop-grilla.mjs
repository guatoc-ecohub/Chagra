/**
 * crop-grilla — recortes de zariguya.png (481×444, la lámina DESGUANTADA v2,
 * sha 7b490aeb…) con grilla de coordenadas de LÁMINA superpuesta (líneas cada
 * 20px, etiquetas cada 40px) para medir cortes a ojo. Mismo método oso/jaguar.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

const SRC = '/home/kortux/demos/3d/compai/laminas/zariguya.png';
const OUT = '/home/kortux/demos/3d/compai/rigs2d/zariguya/_build/crops';

const crops = [
  { name: 'entera',      left: 0,   top: 0,   width: 481, height: 444, scale: 1 },
  { name: 'patas',       left: 80,  top: 290, width: 300, height: 154, scale: 2 },
  { name: 'pata-izq',    left: 90,  top: 310, width: 130, height: 134, scale: 3 },
  { name: 'pata-der',    left: 220, top: 310, width: 140, height: 134, scale: 3 },
  { name: 'cola',        left: 300, top: 200, width: 181, height: 244, scale: 2 },
  { name: 'base-cola',   left: 320, top: 300, width: 100, height: 120, scale: 3 },
  { name: 'vientre',     left: 120, top: 240, width: 220, height: 160, scale: 2 },
  { name: 'boca',        left: 110, top: 80,  width: 160, height: 110, scale: 3 },
];

function grillaSVG(c) {
  const W = c.width * c.scale, H = c.height * c.scale;
  let s = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  const x0 = Math.ceil(c.left / 20) * 20;
  const y0 = Math.ceil(c.top / 20) * 20;
  for (let x = x0; x < c.left + c.width; x += 20) {
    const px = (x - c.left) * c.scale;
    const grueso = x % 100 === 0;
    s += `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="${grueso ? '#e11' : '#3af'}" stroke-width="${grueso ? 1.4 : 0.6}" opacity="0.55"/>`;
    if (x % 40 === 0) s += `<text x="${px + 2}" y="12" font-size="11" fill="#e11" font-family="monospace">${x}</text>`;
  }
  for (let y = y0; y < c.top + c.height; y += 20) {
    const py = (y - c.top) * c.scale;
    const grueso = y % 100 === 0;
    s += `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="${grueso ? '#e11' : '#3af'}" stroke-width="${grueso ? 1.4 : 0.6}" opacity="0.55"/>`;
    if (y % 40 === 0) s += `<text x="2" y="${py + 12}" font-size="11" fill="#e11" font-family="monospace">${y}</text>`;
  }
  s += '</svg>';
  return Buffer.from(s);
}

for (const c of crops) {
  const base = await sharp(SRC)
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize({ width: c.width * c.scale, kernel: 'lanczos3' })
    .png().toBuffer();
  await sharp({ create: { width: c.width * c.scale, height: c.height * c.scale, channels: 4, background: '#f2ede4' } })
    .composite([{ input: base }, { input: grillaSVG(c) }])
    .png().toFile(`${OUT}/${c.name}.png`);
  console.log(c.name, 'ok');
}
