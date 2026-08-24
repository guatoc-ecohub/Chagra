import sharp from 'sharp';
const SRC = 'public/compai/laminas/zariguya.png';
const OUT = '_gate/zariguya-lamina/';
function gridSvg(w, h, ox, oy, Z) {
  let s = `<svg width="${w * Z}" height="${h * Z}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = Math.ceil(ox / 10) * 10; x <= ox + w; x += 10) {
    const major = x % 50 === 0;
    s += `<line x1="${(x - ox) * Z}" y1="0" x2="${(x - ox) * Z}" y2="${h * Z}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    s += `<text x="${(x - ox) * Z + 1}" y="${major ? 12 : 9}" font-size="${major ? 11 : 7}" fill="${major ? '#c33' : '#88c'}">${x}</text>`;
  }
  for (let y = Math.ceil(oy / 10) * 10; y <= oy + h; y += 10) {
    const major = y % 50 === 0;
    s += `<line x1="0" y1="${(y - oy) * Z}" x2="${w * Z}" y2="${(y - oy) * Z}" stroke="${major ? '#c33' : '#8899cc'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.65"/>`;
    s += `<text x="1" y="${(y - oy) * Z + (major ? 13 : 9)}" font-size="${major ? 11 : 7}" fill="${major ? '#c33' : '#88c'}">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
const [nombre, [x, y, w, h], Z] = ['zoom-dos-ojos', [130, 30, 140, 85], 6];
const rec = await sharp(SRC).extract({ left: x, top: y, width: w, height: h })
  .resize({ width: w * Z, kernel: 'nearest' }).png().toBuffer();
await sharp({ create: { width: w * Z, height: h * Z, channels: 4, background: '#e9e4d6' } })
  .composite([{ input: rec }, { input: gridSvg(w, h, x, y, Z) }])
  .png().toFile(OUT + nombre + '.png');
console.log('->', nombre);
