import sharp from 'sharp';
const SRC = 'public/compai/laminas/zariguya.png';
const OUT = '_gate/zariguya-lamina/';
const zonas = [
  ['zoom-cabeza', [80, 0, 220, 190], 3],
  ['zoom-ojos', [140, 75, 130, 70], 5],
  ['zoom-boca', [90, 95, 170, 100], 4],
  ['zoom-brazo-lapiz', [0, 105, 200, 130], 3],
  ['zoom-brazo-brujula', [70, 215, 180, 110], 3],
  ['zoom-cola-base', [290, 180, 191, 170], 3],
  ['zoom-cuello', [80, 110, 260, 130], 3],
];
function gridSvg(w, h, ox, oy, Z) {
  let s = `<svg width="${w * Z}" height="${h * Z}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = Math.ceil(ox / 10) * 10; x <= ox + w; x += 10) {
    const major = x % 50 === 0;
    s += `<line x1="${(x - ox) * Z}" y1="0" x2="${(x - ox) * Z}" y2="${h * Z}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    if (major) s += `<text x="${(x - ox) * Z + 2}" y="12" font-size="11" fill="#c33">${x}</text>`;
  }
  for (let y = Math.ceil(oy / 10) * 10; y <= oy + h; y += 10) {
    const major = y % 50 === 0;
    s += `<line x1="0" y1="${(y - oy) * Z}" x2="${w * Z}" y2="${(y - oy) * Z}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    if (major) s += `<text x="2" y="${(y - oy) * Z + 13}" font-size="11" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
for (const [nombre, [x, y, w, h], Z] of zonas) {
  const rec = await sharp(SRC).extract({ left: x, top: y, width: w, height: h })
    .resize({ width: w * Z, kernel: 'nearest' }).png().toBuffer();
  await sharp({ create: { width: w * Z, height: h * Z, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: rec }, { input: gridSvg(w, h, x, y, Z) }])
    .png().toFile(OUT + nombre + '.png');
  console.log('->', nombre);
}
