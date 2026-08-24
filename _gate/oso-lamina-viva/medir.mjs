// medir.mjs — grillas + centroides de ojos sobre oso.png (615×630).
// Mismo método honesto que _gate/jaguar-gait/crops.mjs: grilla cada 20px,
// etiquetas cada 40, lectura A OJO sobre los recortes; ojos por centroide.
import sharp from 'sharp';
const SRC = 'public/compai/laminas/oso.png';
const OUT = '_gate/oso-lamina-viva/';
const { width: W, height: H } = await sharp(SRC).metadata();
console.log(`lamina ${W}x${H}`);
function gridSvg(w, h, step = 20) {
  let s = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= w; x += step) {
    const major = x % 100 === 0;
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (x % 40 === 0) s += `<text x="${x + 1}" y="10" font-size="9" fill="#c33">${x}</text>`;
  }
  for (let y = 0; y <= h; y += step) {
    const major = y % 100 === 0;
    s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (y % 40 === 0) s += `<text x="1" y="${y + 10}" font-size="9" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
// lámina completa con grilla
await sharp({ create: { width: W, height: H, channels: 4, background: '#e9e4d6' } })
  .composite([{ input: SRC }, { input: gridSvg(W, H) }])
  .png().toFile(OUT + 'grid-lamina.png');
// zoom cabeza (área superior) ×2 con grilla fina en coords ORIGINALES
async function zoom(nombre, x0, y0, w, h, factor = 2) {
  const buf = await sharp(SRC).extract({ left: x0, top: y0, width: w, height: h })
    .resize(w * factor, h * factor, { kernel: 'nearest' }).png().toBuffer();
  let s = `<svg width="${w * factor}" height="${h * factor}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= w; x += 10) {
    const gx = x * factor, major = (x0 + x) % 50 === 0;
    s += `<line x1="${gx}" y1="0" x2="${gx}" y2="${h * factor}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1 : 0.4}" opacity="0.75"/>`;
    if (major) s += `<text x="${gx + 1}" y="12" font-size="11" fill="#c33">${x0 + x}</text>`;
  }
  for (let y = 0; y <= h; y += 10) {
    const gy = y * factor, major = (y0 + y) % 50 === 0;
    s += `<line x1="0" y1="${gy}" x2="${w * factor}" y2="${gy}" stroke="${major ? '#c33' : '#9ab'}" stroke-width="${major ? 1 : 0.4}" opacity="0.75"/>`;
    if (major) s += `<text x="1" y="${gy + 12}" font-size="11" fill="#c33">${y0 + y}</text>`;
  }
  await sharp({ create: { width: w * factor, height: h * factor, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: buf }, { input: Buffer.from(s + '</svg>') }])
    .png().toFile(OUT + nombre + '.png');
}
await zoom('zoom-cabeza', 180, 0, 260, 220, 2);
await zoom('zoom-baston', 420, 60, 195, 460, 1);
await zoom('zoom-pie', 0, 380, 615, 250, 1);
// ojos por centroide de brillo (esclera blanca + iris): buscar píxeles muy claros en la zona de la cara
const { data, info } = await sharp(SRC).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const px = (x, y) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
// dos ventanas de búsqueda amplias (mitad izq/der de la cara superior); la cara vive ~x200..330, y40..160
for (const [nombre, X0, X1] of [['ojoIzq', 200, 268], ['ojoDer', 268, 336]]) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 40; y < 150; y++) for (let x = X0; x < X1; x++) {
    const [r, g, b, a] = px(x, y);
    if (a > 200 && r > 200 && g > 200 && b > 190) { sx += x; sy += y; n++; }
  }
  console.log(`${nombre}: centroide blancos (${(sx / n).toFixed(1)}, ${(sy / n).toFixed(1)}) n=${n}`);
}
