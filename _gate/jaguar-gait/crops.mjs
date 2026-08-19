import sharp from 'sharp';
const DIR = '/home/kortux/demos/3d/compai/rigs2d/jaguar/';
const OUT = '_gate/jaguar-gait/';
const capas = ['pata-del-lejana', 'pata-tras-cercana', 'pata-tras-lejana', 'cuerpo-inpaint'];
// grilla cada 20px, etiquetas cada 40 — sobre fondo caqui para ver el alfa
function gridSvg(w, h) {
  let s = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= w; x += 20) {
    const major = x % 100 === 0;
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (x % 40 === 0) s += `<text x="${x + 1}" y="10" font-size="9" fill="#c33">${x}</text>`;
  }
  for (let y = 0; y <= h; y += 20) {
    const major = y % 100 === 0;
    s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${major ? '#c33' : '#99a'}" stroke-width="${major ? 1 : 0.4}" opacity="0.7"/>`;
    if (y % 40 === 0) s += `<text x="1" y="${y + 10}" font-size="9" fill="#c33">${y}</text>`;
  }
  return Buffer.from(s + '</svg>');
}
for (const nombre of capas) {
  const img = sharp(DIR + nombre + '.png');
  const { width: w, height: h } = await img.metadata();
  // bbox de alfa
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 16) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  console.log(`${nombre}: bbox alfa x ${x0}..${x1}  y ${y0}..${y1}`);
  await sharp({ create: { width: w, height: h, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: DIR + nombre + '.png' }, { input: gridSvg(w, h) }])
    .png().toFile(OUT + 'grid-' + nombre + '.png');
}
// lámina completa con grilla, para la pata naranja (que se corta de la lámina)
{
  const SRC = 'public/compai/laminas/jaguar-natural.png';
  const { width: w, height: h } = await sharp(SRC).metadata();
  await sharp({ create: { width: w, height: h, channels: 4, background: '#e9e4d6' } })
    .composite([{ input: SRC }, { input: gridSvg(w, h) }])
    .png().toFile(OUT + 'grid-lamina.png');
  console.log(`lamina: ${w}x${h}`);
}
