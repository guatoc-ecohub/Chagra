import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
// filas con alfa fuera del cogollo de la pierna: imprime runs por fila
for (const [name, boxes] of [
  ['pierna-cercana', [[100, 170, 440, 500]]],           // izquierda del tobillo
  ['pierna-ocluida', [[280, 335, 430, 500], [400, 495, 440, 500]]], // ambos lados
]) {
  const { data, info } = await sharp(`../${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  console.log('==', name);
  for (const [x0, x1, y0, y1] of boxes) {
    for (let y = y0; y < y1; y++) {
      let run = [];
      for (let x = x0; x < x1; x++) {
        if (data[(y * W + x) * 4 + 3] > 60) run.push(x);
      }
      if (run.length > 2) console.log(` y=${y} x:${run[0]}..${run[run.length - 1]} n=${run.length}`);
    }
  }
}
