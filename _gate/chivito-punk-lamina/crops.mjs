/* crops.mjs — grilla de coordenadas + zooms para MEDIR la anatomía de
   chivito-punk.png a ojo (mismo método que _gate/luciernaga-lamina/crops.mjs,
   no versionado). */
import sharp from 'sharp';
const SRC = 'public/compai/laminas/chivito-punk.png';
const OUT = '_gate/chivito-punk-lamina/';
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
await zoom('cresta', 60, 0, 280, 170, 3);        // la cresta punk completa
await zoom('cabeza', 60, 110, 280, 200, 3);      // testa + ojos + arranque del pico
await zoom('pico-boca', 70, 200, 220, 140, 4);   // pico + comisura + barba alta
await zoom('mano-lapiz', 0, 220, 170, 180, 3);   // mano alzada + lápiz + muñeca
await zoom('cuello', 60, 260, 300, 150, 3);      // transición cabeza/cuerpo + pañoleta
await zoom('barba-pecho', 100, 250, 200, 180, 3);// la barba verde sobre el pecho
await zoom('libreta', 190, 340, 200, 180, 3);    // el ala/brazo con la libreta
await zoom('cola', 240, 360, 157, 240, 3);       // la cola de plumas
await zoom('patas', 60, 480, 300, 174, 3);       // las dos patas + garras
