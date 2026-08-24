import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
// franja del suelo (patas + regla) de cada captura de marcha, apiladas
const frames = ['3000', '3770', '4540', '5300'];
const tiras = [];
for (const f of frames) {
  const t = await sharp(`_gate/jaguar-gait/gate-anda-${f}.png`)
    .extract({ left: 450, top: 600, width: 700, height: 160 }).toBuffer();
  tiras.push(t);
}
const W = 700, H = 160, SEP = 4;
const lienzo = sharp({ create: { width: W, height: (H + SEP) * tiras.length, channels: 4, background: '#222' } });
await lienzo.composite(tiras.map((input, i) => ({ input, left: 0, top: i * (H + SEP) })))
  .png().toFile('_gate/jaguar-gait/franja-apilada.png');
console.log('-> franja-apilada.png (t=3.0s, 3.77s, 4.54s, 5.3s de arriba a abajo; mismo encuadre de página)');
