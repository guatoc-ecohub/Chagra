import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const SRC = 'public/compai/laminas/luciernaga.png';
const { data: sd, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const buf = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4; const a = sd[i + 3] / 255;
  const g10 = (x % 10 === 0) || (y % 10 === 0);
  let r = 128, g = 128, b = 140;
  buf[i] = sd[i] * a + r * (1 - a); buf[i+1] = sd[i+1] * a + g * (1 - a); buf[i+2] = sd[i+2] * a + b * (1 - a);
  if (g10) { buf[i] = buf[i]*0.7 + 255*0.3; buf[i+1] = buf[i+1]*0.7; buf[i+2] = buf[i+2]*0.7; }
  buf[i+3] = 255;
}
const base = sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png();
await base.clone().extract({ left: 95, top: 180, width: 80, height: 90 }).resize({ width: 480, kernel: 'nearest' }).toFile('_gate/luciernaga-capas/z2-raiz-izq.png');
await base.clone().extract({ left: 225, top: 180, width: 100, height: 140 }).resize({ width: 500, kernel: 'nearest' }).toFile('_gate/luciernaga-capas/z2-raiz-der.png');
console.log('ok');
