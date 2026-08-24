import sharp from 'sharp';
const SRC = 'public/compai/laminas/oso.png';
const OUT = '_gate/oso-lamina-viva/';
async function zoom(nombre, x0, y0, w, h, factor) {
  const buf = await sharp(SRC).extract({ left: x0, top: y0, width: w, height: h })
    .resize(w * factor, h * factor, { kernel: 'nearest' }).png().toBuffer();
  let s = `<svg width="${w * factor}" height="${h * factor}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= w; x += 5) {
    const gx = x * factor, major = (x0 + x) % 25 === 0;
    s += `<line x1="${gx}" y1="0" x2="${gx}" y2="${h * factor}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1 : 0.4}" opacity="0.75"/>`;
    if (major) s += `<text x="${gx + 1}" y="12" font-size="11" fill="#c33">${x0 + x}</text>`;
  }
  for (let y = 0; y <= h; y += 5) {
    const gy = y * factor, major = (y0 + y) % 25 === 0;
    s += `<line x1="0" y1="${gy}" x2="${w * factor}" y2="${gy}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1 : 0.4}" opacity="0.75"/>`;
    if (major) s += `<text x="1" y="${gy + 12}" font-size="11" fill="#c33">${y0 + y}</text>`;
  }
  await sharp({ create: { width: w * factor, height: h * factor, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: buf }, { input: Buffer.from(s + '</svg>') }])
    .png().toFile(OUT + nombre + '.png');
}
await zoom('zoom-ojos', 240, 60, 120, 70, 4);
await zoom('zoom-boca', 280, 120, 140, 100, 3);
