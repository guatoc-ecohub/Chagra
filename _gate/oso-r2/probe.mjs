import { chromium } from '/home/kortux/Workspace/chagra/node_modules/playwright/index.mjs';
import sharp from '/home/kortux/Workspace/chagra/node_modules/sharp/dist/index.mjs';
import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/Workspace/chagra/_gate/herramientas/gate-pantalla.mjs';

await exigirPantallaViva({ medirFps: false });
const maquinaSola = await esperarMaquinaSola({ maxEspera: 1000, umbral: 0 });
const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1240, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(process.env.OSO_URL || 'http://127.0.0.1:8965/oso-baston-gate.html?animated=0', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const styles = await page.evaluate(() => {
  const svg = document.querySelector('svg[data-creature="oso-baston"]');
  const body = svg.querySelector('.crt-body');
  const arm = svg.querySelector('.crt-brazo-l');
  const armPath = arm.querySelector('path');
  const rightArm = svg.querySelector('.crt-brazo-r');
  const read = (node) => {
    const s = getComputedStyle(node);
    return {
      opacity: s.opacity,
      fillOpacity: s.fillOpacity,
      strokeOpacity: s.strokeOpacity,
      mixBlendMode: s.mixBlendMode,
      filter: s.filter,
      isolation: s.isolation,
      fill: s.fill,
      stroke: s.stroke,
      transform: s.transform,
    };
  };
  return {
    root: read(svg),
    body: read(body),
    leftArm: read(arm),
    leftArmPath: read(armPath),
    rightArm: read(rightArm),
    leftArmAttr: {
      class: arm.getAttribute('class'),
      style: arm.getAttribute('style'),
      filter: arm.getAttribute('filter'),
      pathFill: armPath.getAttribute('fill'),
      pathStroke: armPath.getAttribute('stroke'),
      pathD: armPath.getAttribute('d'),
    },
    svgRect: svg.getBoundingClientRect().toJSON(),
  };
});

const makeSolidTest = async (color) => {
  await page.evaluate((background) => {
    const svg = document.querySelector('svg[data-creature="oso-baston"]');
    const body = svg.querySelector('.crt-body');
    for (const child of body.children) child.style.visibility = 'hidden';
    const arm = body.querySelector('.crt-brazo-l');
    arm.style.visibility = 'visible';
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '-17');
    bg.setAttribute('y', '-22');
    bg.setAttribute('width', '34');
    bg.setAttribute('height', '42');
    bg.setAttribute('fill', background);
    svg.insertBefore(bg, body);
  }, color);
  return page.screenshot({ type: 'png' });
};

const normal = await page.screenshot({ type: 'png' });
const red = await makeSolidTest('#e60000');
const blue = await page.evaluate(() => {
  const bg = document.querySelector('svg[data-creature="oso-baston"] > rect');
  bg.setAttribute('fill', '#004cff');
  return true;
}).then(() => page.screenshot({ type: 'png' }));

const rect = styles.svgRect;
const point = { x: Math.round(rect.x + (-9.0 + 17) * rect.width / 34), y: Math.round(rect.y + (-4.0 + 22) * rect.height / 42) };
const sample = async (buffer) => {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const i = (point.y * info.width + point.x) * info.channels;
  return [...data.subarray(i, i + info.channels)];
};

console.log(JSON.stringify({
  maquinaSola,
  styles,
  samplePoint: point,
  pixels: { normal: await sample(normal), solidRed: await sample(red), solidBlue: await sample(blue) },
}, null, 2));
await browser.close();
