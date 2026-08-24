import sharp from 'sharp';
const SRC = 'public/compai/laminas/luciernaga.png';
const OUT = '_gate/luciernaga-lamina/';
function gridSvg(w, h, paso = 20) {
  let s = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= w; x += paso) {
    const major = x % 100 === 0;
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (x % 40 === 0) s += `<text x="${x + 1}" y="10" font-size="9" fill="#c33">${x}</text>`;
  }
  for (let y = 0; y <= h; y += paso) {
    const major = y % 100 === 0;
    s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (y % 40 === 0) s += `<text x="1" y="${y + 10}" font-size="9" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
const { width: w, height: h } = await sharp(SRC).metadata();
console.log(`lamina: ${w}x${h}`);
// bbox de alfa
{
  const { data, info } = await sharp(SRC).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 16) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  console.log(`bbox alfa x ${x0}..${x1}  y ${y0}..${y1}`);
}
await sharp({ create: { width: w, height: h, channels: 4, background: '#e9e4d6' } })
  .composite([{ input: SRC }, { input: gridSvg(w, h) }]).png().toFile(OUT + 'grid-lamina.png');
// zooms 3x con grilla fina (10px en espacio original)
async function zoom(nombre, left, top, ancho, alto, k = 3) {
  const recorte = await sharp(SRC).extract({ left, top, width: ancho, height: alto })
    .resize(ancho * k, alto * k, { kernel: 'nearest' }).png().toBuffer();
  let s = `<svg width="${ancho * k}" height="${alto * k}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= ancho; x += 10) {
    const gx = x * k, real = left + x, major = real % 50 === 0;
    s += `<line x1="${gx}" y1="0" x2="${gx}" y2="${alto * k}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.8"/>`;
    if (major) s += `<text x="${gx + 2}" y="12" font-size="11" fill="#c33">${real}</text>`;
  }
  for (let y = 0; y <= alto; y += 10) {
    const gy = y * k, real = top + y, major = real % 50 === 0;
    s += `<line x1="0" y1="${gy}" x2="${ancho * k}" y2="${gy}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.8"/>`;
    if (major) s += `<text x="2" y="${gy + 12}" font-size="11" fill="#c33">${real}</text>`;
  }
  s += '</svg>';
  await sharp({ create: { width: ancho * k, height: alto * k, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: recorte }, { input: Buffer.from(s) }]).png().toFile(OUT + 'zoom-' + nombre + '.png');
  console.log('zoom-' + nombre + '.png');
}
await zoom('cabeza', 80, 60, 220, 180, 3);       // cabeza + ojos + boca + base antenas
await zoom('antenas', 60, 0, 240, 120, 3);       // las dos antenas completas
await zoom('brazo-lapiz', 0, 120, 160, 180, 3);  // brazo alzado con lápiz + guante
await zoom('cuaderno', 200, 260, 160, 160, 3);   // brazo del cuaderno
await zoom('linterna', 100, 320, 170, 140, 3);   // abdomen-glow
await zoom('piernas', 60, 380, 250, 127, 3);     // piernas + botas
// ronda 2 — costuras finas
await zoom('boca', 110, 150, 150, 80, 4);        // sonrisa + mentón (mandíbula)
await zoom('piernas-glow', 130, 300, 200, 170, 3); // unión caderas/glow/cuaderno
await zoom('mano-lapiz', 0, 180, 140, 160, 3);   // guante + lápiz + muñeca
