import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const SRC = '/home/kortux/demos/3d/compai/laminas/jaguar-natural.png';
const OUT = '/home/kortux/demos/3d/compai/rigs2d/jaguar/_build/crops';
const crops = [
  { name: 'tras-ancho', left: 400, top: 180, width: 305, height: 214, scale: 3 },
  { name: 'garras-del', left: 130, top: 320, width: 185, height: 74, scale: 5 },
];
for (const c of crops) {
  await sharp(SRC).extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize({ width: c.width * c.scale, kernel: 'lanczos3' }).png().toFile(`${OUT}/${c.name}.png`);
  console.log(c.name, 'ok');
}
