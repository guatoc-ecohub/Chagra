import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
// barrido amplio: por fila, extensión del alfa — para ver bigotes en cualquier borde
for (const name of ['pierna-cercana', 'pierna-ocluida']) {
  const { data, info } = await sharp(`../${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log('==', name);
  let prev = null;
  for (let y = 340; y < 600; y++) {
    let x0 = -1, x1 = -1, n = 0;
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 60) { if (x0 < 0) x0 = x; x1 = x; n++; }
    }
    if (x0 < 0) continue;
    const linea = `${x0}..${x1} n=${n}`;
    // imprime solo cambios bruscos de extensión (>18px de salto en un borde)
    if (!prev || Math.abs(prev[0] - x0) > 18 || Math.abs(prev[1] - x1) > 18) console.log(` y=${y} ${linea}`);
    prev = [x0, x1];
  }
}
