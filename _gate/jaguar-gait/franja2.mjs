import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const tiras = [];
for (const f of ['6000', '6400']) {
  tiras.push(await sharp(`_gate/jaguar-gait/plant-${f}.png`).extract({ left: 400, top: 590, width: 760, height: 170 }).toBuffer());
  tiras.push(await sharp(`_gate/jaguar-gait/plant-${f}.png`).extract({ left: 0, top: 24, width: 1280, height: 44 }).resize({ width: 760 }).toBuffer());
}
await sharp({ create: { width: 760, height: (170 + 44 + 4) * 2, channels: 4, background: '#222' } })
  .composite([
    { input: tiras[0], left: 0, top: 0 }, { input: tiras[1], left: 0, top: 172 },
    { input: tiras[2], left: 0, top: 218 }, { input: tiras[3], left: 0, top: 390 },
  ]).png().toFile('_gate/jaguar-gait/plant-compara.png');
console.log('ok');
