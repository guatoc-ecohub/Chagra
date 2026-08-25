/* eslint-disable no-undef -- arnés de gate (node), no código de la app */
import sharp from 'sharp';
const HERO = 'public/compai/laminas/zariguya-gemini-hero.png';
const OUT = '/home/kortux/.claude/jobs/6b23183e/tmp';
const zonas = [
  ['cola', 330, 215, 151, 190, 4],
  ['pies', 150, 355, 210, 89, 4],
  ['boca', 120, 90, 150, 95, 6],
  ['lapiz-top', 30, 55, 140, 110, 5],
];
for (const [name, L, T, Wc, Hc, Z] of zonas) {
  let g = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wc*Z}" height="${Hc*Z}">`;
  for (let x = Math.ceil(L/10)*10; x <= L+Wc; x += 10) {
    const maj = x % 50 === 0;
    g += `<line x1="${(x-L)*Z}" y1="0" x2="${(x-L)*Z}" y2="${Hc*Z}" stroke="${maj?'#e11':'#16c'}" stroke-width="${maj?1.4:0.5}" opacity="0.5"/>`;
    if (maj) g += `<text x="${(x-L)*Z+2}" y="14" font-size="13" fill="#e11" font-family="monospace">${x}</text>`;
  }
  for (let y = Math.ceil(T/10)*10; y <= T+Hc; y += 10) {
    const maj = y % 50 === 0;
    g += `<line x1="0" y1="${(y-T)*Z}" x2="${Wc*Z}" y2="${(y-T)*Z}" stroke="${maj?'#e11':'#16c'}" stroke-width="${maj?1.4:0.5}" opacity="0.5"/>`;
    if (maj) g += `<text x="2" y="${(y-T)*Z+15}" font-size="13" fill="#e11" font-family="monospace">${y}</text>`;
  }
  g += `</svg>`;
  await sharp(HERO).extract({ left: L, top: T, width: Wc, height: Hc })
    .resize(Wc*Z, Hc*Z, { kernel: 'nearest' }).flatten({ background: '#f5f0e6' })
    .composite([{ input: Buffer.from(g) }]).png().toFile(`${OUT}/lupa-${name}.png`);
  console.log('lupa', name);
}
