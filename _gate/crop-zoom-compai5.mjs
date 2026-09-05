import sharp from 'sharp';

const DIR = '/home/kortux/Workspace/chagra/_gate';
const FILES = ['angelita', 'jaguar', 'zariguya', 'oso-baston', 'luciernaga'];

for (const slug of FILES) {
  await sharp(`${DIR}/avatar-tinta5-${slug}.png`)
    .extract({ left: 0, top: 0, width: 560, height: 348 })
    .png()
    .toFile(`${DIR}/zoom-tinta5-${slug}.png`);
  console.log(`zoom ${slug} ok`);
}
