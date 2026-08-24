import sharp from 'sharp';
const SRC = 'public/compai/laminas/zariguya.png';
const OUT = '_gate/zariguya-lamina/';
const img = sharp(SRC);
const { width: w, height: h } = await img.metadata();
const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
let x0 = w, x1 = 0, y0 = h, y1 = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 16) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
console.log(`lamina ${w}x${h} · bbox alfa x ${x0}..${x1}  y ${y0}..${y1}`);
function gridSvg(W, H) {
  let s = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= W; x += 20) {
    const major = x % 100 === 0;
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (x % 40 === 0) s += `<text x="${x + 1}" y="10" font-size="9" fill="#c33">${x}</text>`;
  }
  for (let y = 0; y <= H; y += 20) {
    const major = y % 100 === 0;
    s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (y % 40 === 0) s += `<text x="1" y="${y + 10}" font-size="9" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
await sharp({ create: { width: w * 2, height: h * 2, channels: 4, background: '#e9e4d6' } })
  .composite([
    { input: await sharp(SRC).resize({ width: w * 2, kernel: 'nearest' }).png().toBuffer() },
    { input: Buffer.from(gridSvg(w * 2, h * 2).toString().replace(/xmlns/, 'xmlns')) },
  ]).png().toFile(OUT + 'grid-lamina-2x.png');
// grilla a 2x pero con etiquetas en coords ORIGINALES (cada 20px reales = 40px de imagen)
function gridSvg2x(W, H) {
  let s = `<svg width="${W * 2}" height="${H * 2}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= W; x += 20) {
    const major = x % 100 === 0;
    s += `<line x1="${x * 2}" y1="0" x2="${x * 2}" y2="${H * 2}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1.4 : 0.5}" opacity="0.7"/>`;
    if (x % 40 === 0) s += `<text x="${x * 2 + 2}" y="12" font-size="11" fill="#c33">${x}</text>`;
  }
  for (let y = 0; y <= H; y += 20) {
    const major = y % 100 === 0;
    s += `<line x1="0" y1="${y * 2}" x2="${W * 2}" y2="${y * 2}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1.4 : 0.5}" opacity="0.7"/>`;
    if (y % 40 === 0) s += `<text x="2" y="${y * 2 + 13}" font-size="11" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
await sharp({ create: { width: w * 2, height: h * 2, channels: 4, background: '#e9e4d6' } })
  .composite([
    { input: await sharp(SRC).resize({ width: w * 2, kernel: 'nearest' }).png().toBuffer() },
    { input: gridSvg2x(w, h) },
  ]).png().toFile(OUT + 'grid-lamina.png');
console.log('-> grid-lamina.png (2x, coords originales)');
