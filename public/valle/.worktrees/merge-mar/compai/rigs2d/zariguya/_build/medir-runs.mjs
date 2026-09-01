/**
 * medir-runs — runs de ALFA y de OSCURIDAD sobre zariguya.png para medir:
 *   A) filas y360..444: extensión en x de cada pie + el canal de fondo entre patas
 *   B) columnas x240..360: borde inferior del cuerpo/ingle (inicio de fondo)
 *   C) filas y315..400 en x325..420: transición pelo→piel de la cola (lum sube)
 *   D) columnas x100..240: raíz de la pata ocluida (dónde el fondo separa)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { data: sd, info } = await sharp('/home/kortux/demos/3d/compai/laminas/zariguya.png')
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const idx = (x, y) => (y * W + x) * 4;
const lum = (i) => 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2];

const runsFila = (y, test) => {
  const runs = [];
  let inR = false, r0 = 0;
  for (let x = 0; x < W; x++) {
    const ok = test(idx(x, y));
    if (ok && !inR) { inR = true; r0 = x; }
    if (!ok && inR) { inR = false; runs.push([r0, x - 1]); }
  }
  if (inR) runs.push([r0, W - 1]);
  return runs;
};
const runsCol = (x, y0, y1, test) => {
  const runs = [];
  let inR = false, r0 = 0;
  for (let y = y0; y < y1; y++) {
    const ok = test(idx(x, y));
    if (ok && !inR) { inR = true; r0 = y; }
    if (!ok && inR) { inR = false; runs.push([r0, y - 1]); }
  }
  if (inR) runs.push([r0, y1 - 1]);
  return runs;
};
const visible = (i) => sd[i + 3] > 128;

console.log('== A) filas y360..444: runs de alfa (x-spans de pies/piernas/cola) ==');
for (let y = 360; y <= 443; y += 4) console.log(y, JSON.stringify(runsFila(y, visible)));

console.log('== B) columnas x244..364: runs de alfa en y300..444 (ingle/canilla cercana) ==');
for (let x = 244; x <= 364; x += 4) console.log(x, JSON.stringify(runsCol(x, 300, 444, visible)));

console.log('== C) transición pelo→cola: filas y315..400, primer x≥325 con lum>150 (piel clara) ==');
for (let y = 315; y <= 400; y += 3) {
  let xClaro = -1;
  for (let x = 325; x < 430; x++) {
    const i = idx(x, y);
    if (sd[i + 3] > 200 && lum(i) > 150) { xClaro = x; break; }
  }
  console.log(y, 'primerClaro=', xClaro);
}

console.log('== D) columnas x100..240: runs de alfa y260..444 (raíz ocluida + pie izq) ==');
for (let x = 100; x <= 240; x += 5) console.log(x, JSON.stringify(runsCol(x, 260, 444, visible)));

console.log('== E) borde inferior del vientre crema: columnas x160..260, último y con lum>150 desde y250 ==');
for (let x = 160; x <= 260; x += 5) {
  let yFin = -1;
  for (let y = 250; y < 400; y++) {
    const i = idx(x, y);
    if (sd[i + 3] > 200 && lum(i) > 150) yFin = y;
  }
  console.log(x, 'ultimoClaro=', yFin);
}
