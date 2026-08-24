// mide.mjs — runs de alfa por fila: silueta min-x/max-x (bordes externos de alas)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const SRC = '/home/kortux/Workspace/chagra/public/valle/compai/laminas/luciernaga.png';
const { data: sd, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
for (let y = 150; y <= 460; y += 10) {
  let mn = -1, mx = -1;
  const runs = [];
  let en = false, ini = 0;
  for (let x = 0; x < W; x++) {
    const a = sd[(y * W + x) * 4 + 3];
    if (a > 128 && !en) { en = true; ini = x; if (mn < 0) mn = x; }
    if (a <= 128 && en) { en = false; runs.push([ini, x - 1]); mx = x - 1; }
  }
  if (en) { runs.push([ini, W - 1]); mx = W - 1; }
  console.log(`y=${y} min=${mn} max=${mx} runs=${runs.map(r => r.join('-')).join(' ')}`);
}
