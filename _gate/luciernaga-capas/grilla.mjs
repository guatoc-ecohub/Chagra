// grilla.mjs — recortes con grilla de coordenadas para medir las alas a ojo.
// Análisis no versionado (mismo método que _gate/luciernaga-lamina/crops.mjs).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

const SRC = '/home/kortux/Workspace/chagra/public/valle/compai/laminas/luciernaga.png';
const OUT = '/home/kortux/Workspace/chagra/.worktrees/luciernaga-capas-c4/_gate/luciernaga-capas';

const { data: sd, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
console.log('lamina', W, 'x', H);

// compone la lámina sobre gris + grilla cada 10px (fina) / 50px (gruesa)
const buf = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const a = sd[i + 3] / 255;
  const g50 = (x % 50 === 0) || (y % 50 === 0);
  const g10 = (x % 10 === 0) || (y % 10 === 0);
  let r = 128, gg = 128, b = 128;
  if (g10) { r = 165; gg = 165; b = 185; }
  if (g50) { r = 220; gg = 60; b = 60; }
  buf[i]     = sd[i] * a + r * (1 - a);
  buf[i + 1] = sd[i + 1] * a + gg * (1 - a);
  buf[i + 2] = sd[i + 2] * a + b * (1 - a);
  // grilla también SOBRE la pieza, tenue, para leer coordenadas internas
  if (g50 && a > 0) { buf[i] = buf[i] * 0.55 + 220 * 0.45; buf[i+1] = buf[i+1] * 0.55 + 60 * 0.45; buf[i+2] = buf[i+2] * 0.55 + 60 * 0.45; }
  buf[i + 3] = 255;
}
const base = sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png();
await base.clone().toFile(`${OUT}/grilla-full.png`);
// zooms: ala izquierda, ala derecha, zona mano/ala
const crops = [
  ['ala-izq', 30, 180, 160, 280],
  ['ala-der', 230, 200, 137, 260],
  ['mano-ala', 10, 160, 160, 160],
  ['torso-flancos', 90, 200, 200, 240],
];
for (const [n, left, top, w, h] of crops) {
  await base.clone().extract({ left, top, width: Math.min(w, W - left), height: Math.min(h, H - top) })
    .resize({ width: Math.min(w, W - left) * 3, kernel: 'nearest' }).toFile(`${OUT}/z-${n}.png`);
  console.log('->', n);
}
