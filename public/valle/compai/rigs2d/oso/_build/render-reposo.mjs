import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
import { cargarLamina, capa, mascaraCorona, OUT } from './lib.mjs';
const { sd, W, H } = await cargarLamina();
const png = async (r) => (await sharp(r).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const capas = [
  await png(`${OUT}/roca.png`),
  await png(`${OUT}/cuerpo-inpaint.png`),
  await png(`${OUT}/pierna-ocluida.png`),
  await png(`${OUT}/pierna-cercana.png`),
  await png(`${OUT}/brazo-baston.png`),
];
{ // corona desde la lámina
  const c = capa(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4, m = mascaraCorona(x, y);
    if (!sd[i + 3] || m <= 0.004) continue;
    c[i] = sd[i]; c[i + 1] = sd[i + 1]; c[i + 2] = sd[i + 2];
    c[i + 3] = sd[i + 3] * m;
  }
  capas.push(c);
}
const comp = new Float32Array(W * H * 4);
for (const cb of capas) for (let p = 0; p < W * H; p++) {
  const i = p * 4, aS = cb[i + 3] / 255;
  if (aS <= 0) continue;
  const aD = comp[i + 3], na = aS + aD * (1 - aS);
  for (let c = 0; c < 3; c++) comp[i + c] = (cb[i + c] * aS + comp[i + c] * aD * (1 - aS)) / na;
  comp[i + 3] = na;
}
const out = capa(W, H);
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  out[i] = comp[i]; out[i + 1] = comp[i + 1]; out[i + 2] = comp[i + 2];
  out[i + 3] = comp[i + 3] * 255;
}
// sobre fondo crema (como la PWA) a tamaño completo y a escala avatar
const fondo = Buffer.alloc(W * H * 4);
for (let i = 0; i < fondo.length; i += 4) { fondo[i] = 244; fondo[i + 1] = 240; fondo[i + 2] = 232; fondo[i + 3] = 255; }
const plano = await sharp(fondo, { raw: { width: W, height: H, channels: 4 } })
  .composite([{ input: out, raw: { width: W, height: H, channels: 4 } }]).png().toBuffer();
await sharp(plano).toFile(`${OUT}/_build/crops/reposo-full.png`);
await sharp(plano).resize({ height: 300, kernel: 'lanczos3' }).toFile(`${OUT}/_build/crops/reposo-avatar.png`);
console.log('ok');
