import sharp from 'sharp';
const DIR = '/home/kortux/demos/3d/compai/rigs2d/jaguar/';
const LAMINA = 'public/compai/laminas/jaguar-natural.png';
const OUT = '_gate/jaguar-gait/';
const ZOOM = 3;
const zonas = [
  ['zoom-del-lejana', DIR + 'pata-del-lejana.png', [110, 200, 100, 194]],
  ['zoom-naranja-lamina', LAMINA, [150, 220, 150, 174]],
  ['zoom-tras-cercana', DIR + 'pata-tras-cercana.png', [340, 215, 140, 155]],
  ['zoom-tras-lejana', DIR + 'pata-tras-lejana.png', [485, 195, 105, 180]],
];
function gridSvg(w, h, ox, oy) {
  let s = `<svg width="${w * ZOOM}" height="${h * ZOOM}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = Math.ceil(ox / 10) * 10; x <= ox + w; x += 10) {
    const major = x % 50 === 0;
    s += `<line x1="${(x - ox) * ZOOM}" y1="0" x2="${(x - ox) * ZOOM}" y2="${h * ZOOM}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    if (major) s += `<text x="${(x - ox) * ZOOM + 2}" y="12" font-size="11" fill="#c33">${x}</text>`;
  }
  for (let y = Math.ceil(oy / 10) * 10; y <= oy + h; y += 10) {
    const major = y % 50 === 0;
    s += `<line x1="0" y1="${(y - oy) * ZOOM}" x2="${w * ZOOM}" y2="${(y - oy) * ZOOM}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    if (major) s += `<text x="2" y="${(y - oy) * ZOOM + 13}" font-size="11" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
for (const [nombre, src, [x, y, w, h]] of zonas) {
  const rec = await sharp(src).extract({ left: x, top: y, width: w, height: h })
    .resize({ width: w * ZOOM, kernel: 'nearest' }).png().toBuffer();
  await sharp({ create: { width: w * ZOOM, height: h * ZOOM, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: rec }, { input: gridSvg(w, h, x, y) }])
    .png().toFile(OUT + nombre + '.png');
  console.log('->', nombre);
}
