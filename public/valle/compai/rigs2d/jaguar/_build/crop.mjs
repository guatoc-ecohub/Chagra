import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

const SRC = '/home/kortux/demos/3d/compai/laminas/jaguar-natural.png';
const OUT = '/home/kortux/demos/3d/compai/rigs2d/jaguar/_build/crops';

const crops = [
  { name: 'patas-del', left: 125, top: 195, width: 190, height: 199, scale: 3 },
  { name: 'patas-tras', left: 425, top: 185, width: 215, height: 209, scale: 3 },
  { name: 'cabeza', left: 15, top: 5, width: 175, height: 235, scale: 3 },
  { name: 'hocico', left: 35, top: 115, width: 105, height: 95, scale: 5 },
];

for (const c of crops) {
  await sharp(SRC)
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize({ width: c.width * c.scale, kernel: 'lanczos3' })
    .png()
    .toFile(`${OUT}/${c.name}.png`);
  console.log(c.name, 'ok');
}
