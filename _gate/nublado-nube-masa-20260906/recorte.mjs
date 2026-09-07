// recorte.mjs — recorta la banda del cielo (y 150-600 px CSS) de una captura 390x844@2x y la
// amplía 1.5x para mirar la nube con lupa. Uso: node recorte.mjs <in.png> <out.png> [y0 y1]
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/home/kortux/Workspace/chagra/node_modules/sharp/dist/index.cjs');
const [, , inp, out, y0 = '150', y1 = '600'] = process.argv;
const top = Number(y0) * 2, height = (Number(y1) - Number(y0)) * 2;
await sharp(inp).extract({ left: 0, top, width: 780, height }).resize({ width: 1170 }).toFile(out);
console.log('recorte', out);
