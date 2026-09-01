import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { data: sd, info } = await sharp('/home/kortux/demos/3d/compai/laminas/oso.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const lum = (i) => 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2];
// por columna: runs oscuros (lum<115, alfa>128) en la banda y440..530
for (let x = 10; x <= 610; x += 6) {
  const runs = [];
  let inRun = false, r0 = 0;
  for (let y = 435; y < 535; y++) {
    const i = (y * W + x) * 4;
    const oscuro = sd[i + 3] > 128 && lum(i) < 115;
    if (oscuro && !inRun) { inRun = true; r0 = y; }
    if (!oscuro && inRun) { inRun = false; runs.push([r0, y - 1]); }
  }
  if (inRun) runs.push([r0, 534]);
  // solo columnas FUERA de piernas y palo (ahí la banda es todo oscuro)
  const enPierna = (x >= 145 && x <= 262) || (x >= 295 && x <= 485);
  if (!enPierna) console.log(x, JSON.stringify(runs));
}
