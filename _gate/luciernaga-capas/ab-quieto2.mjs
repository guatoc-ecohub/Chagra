import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { chromium } = require('/home/kortux/Workspace/chagra/node_modules/playwright');
const OUT = new URL('.', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 367, height: 507 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5391/luciernaga-solo.html?animated=0&size=507', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/ab-navegador2.png` });  // página completa = stage exacto
await browser.close();

const lam = await sharp('public/compai/laminas/luciernaga.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W0 = lam.info.width, H0 = lam.info.height;
const nav = await sharp(`${OUT}/ab-navegador2.png`).raw().toBuffer({ resolveWithObject: true });
if (nav.info.width !== W0 || nav.info.height !== H0) throw new Error(`dims ${nav.info.width}x${nav.info.height} != ${W0}x${H0}`);
const ref = await sharp(`${OUT}/capa-recomp.png`).raw().toBuffer({ resolveWithObject: true });
let vis = 0, dif20 = 0, dif40 = 0;
const mapa = Buffer.alloc(W0 * H0 * 4);
for (let p = 0; p < W0 * H0; p++) {
  if (lam.data[p * 4 + 3] < 250) continue;
  vis++;
  let dmax = 0;
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(nav.data[p * 4 + c] - ref.data[p * 4 + c]);
    if (d > dmax) dmax = d;
  }
  if (dmax > 20) { dif20++; mapa[p * 4] = 255; mapa[p * 4 + 3] = 255; }
  if (dmax > 40) dif40++;
}
console.log(`A/B quieto 1:1: solidos=${vis} dif>20=${dif20} (${(100 * dif20 / vis).toFixed(3)}%) dif>40=${dif40}`);
await sharp(mapa, { raw: { width: W0, height: H0, channels: 4 } }).png().toFile(`${OUT}/ab-dif2.png`);
