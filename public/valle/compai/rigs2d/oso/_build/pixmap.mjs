import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
async function mapa(png, x0, x1, y0, y1) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  console.log('==', png, `x${x0}-${x1} y${y0}-${y1}`);
  for (let y = y0; y < y1; y++) {
    let fila = '';
    for (let x = x0; x < x1; x++) {
      const a = data[(y * W + x) * 4 + 3];
      fila += a > 150 ? '#' : a > 60 ? '+' : a > 10 ? '.' : ' ';
    }
    console.log(String(y).padStart(3), fila);
  }
}
await mapa('../pierna-cercana.png', 138, 200, 464, 496);
await mapa('../pierna-ocluida.png', 290, 350, 455, 480);
