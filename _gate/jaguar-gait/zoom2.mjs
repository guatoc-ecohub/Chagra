import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
// zoom 2×: delanteras del frame B (carpo flexionado) + cadera/grupa del frame A
await sharp('_gate/jaguar-gait/plant-6400.png').extract({ left: 390, top: 380, width: 320, height: 360 })
  .resize({ width: 640, kernel: 'lanczos3' }).png().toFile('_gate/jaguar-gait/zoom-carpo-B.png');
await sharp('_gate/jaguar-gait/plant-6000.png').extract({ left: 680, top: 340, width: 420, height: 400 })
  .resize({ width: 640, kernel: 'lanczos3' }).png().toFile('_gate/jaguar-gait/zoom-cadera-A.png');
console.log('ok');
