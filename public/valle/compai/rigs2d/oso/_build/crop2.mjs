import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const SRC = '/home/kortux/demos/3d/compai/laminas/oso.png';
const OUT = '/home/kortux/demos/3d/compai/rigs2d/oso/_build/crops';
const crops = [
  { name: 'zoom-garra-palo', left: 460, top: 470, width: 70, height: 60, scale: 7 },
  { name: 'zoom-muslo-der', left: 300, top: 370, width: 120, height: 100, scale: 5 },
  { name: 'zoom-jarra', left: 220, top: 195, width: 90, height: 90, scale: 5 },
];
function grillaSVG(c) {
  const W = c.width * c.scale, H = c.height * c.scale;
  let s = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = Math.ceil(c.left / 20) * 20; x < c.left + c.width; x += 20) {
    const px = (x - c.left) * c.scale;
    s += `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="${x % 100 === 0 ? '#e11' : '#3af'}" stroke-width="${x % 100 === 0 ? 1.4 : 0.6}" opacity="0.55"/>`;
    if (x % 40 === 0) s += `<text x="${px + 2}" y="12" font-size="11" fill="#e11" font-family="monospace">${x}</text>`;
  }
  for (let y = Math.ceil(c.top / 20) * 20; y < c.top + c.height; y += 20) {
    const py = (y - c.top) * c.scale;
    s += `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="${y % 100 === 0 ? '#e11' : '#3af'}" stroke-width="${y % 100 === 0 ? 1.4 : 0.6}" opacity="0.55"/>`;
    if (y % 40 === 0) s += `<text x="2" y="${py + 12}" font-size="11" fill="#e11" font-family="monospace">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
for (const c of crops) {
  const base = await sharp(SRC).extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize({ width: c.width * c.scale, kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: c.width * c.scale, height: c.height * c.scale, channels: 4, background: '#f2ede4' } })
    .composite([{ input: base }, { input: grillaSVG(c) }]).png().toFile(`${OUT}/${c.name}.png`);
  console.log(c.name, 'ok');
}
