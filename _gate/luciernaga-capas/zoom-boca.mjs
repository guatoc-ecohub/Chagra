import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const OUT = new URL('.', import.meta.url).pathname;
// gate-speaking.png es 420x560; el bicho centrado ~x60-360. Boca ≈ y 210-260.
await sharp(`${OUT}/gate-speaking.png`).extract({ left: 120, top: 150, width: 180, height: 130 })
  .resize({ width: 720, kernel: 'nearest' }).toFile(`${OUT}/zz-speaking-boca.png`);
await sharp(`${OUT}/gate-quieto.png`).extract({ left: 120, top: 150, width: 180, height: 130 })
  .resize({ width: 720, kernel: 'nearest' }).toFile(`${OUT}/zz-quieto-boca.png`);
console.log('ok');
