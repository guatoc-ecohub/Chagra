// A/B mismo-navegador, encuadre por ELEMENTO (la raíz size×size desborda un
// viewport angosto y el grid la clava en x=0 — se captura el stage exacto).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { chromium } = require('/home/kortux/Workspace/chagra/node_modules/playwright');
const OUT = new URL('.', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 507, height: 507 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5391/luciernaga-solo.html?size=507&animated=0', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await page.locator('[data-creature="luciernaga"] > div').first().screenshot({ path: `${OUT}/ab4-capas.png` });
await page.goto('http://127.0.0.1:5391/luciernaga-solo.html?size=507&plano=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('img').first().screenshot({ path: `${OUT}/ab4-plano.png` });
await browser.close();

const a = await sharp(`${OUT}/ab4-capas.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const b = await sharp(`${OUT}/ab4-plano.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error(`dims ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}`);
const lam = await sharp('public/compai/laminas/luciernaga.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W0 = lam.info.width, H0 = lam.info.height;
if (a.info.width !== W0 || a.info.height !== H0) throw new Error(`no es 1:1 con la lamina: ${a.info.width}x${a.info.height}`);
const enTarso = (x, y) => (Math.hypot((x - 44) / 43, (y - 230) / 40) <= 1.12 || Math.hypot((x - 280) / 40, (y - 355) / 34) <= 1.12);
let vis = 0, difTarso = 0, difFuera = 0;
const mapa = Buffer.alloc(W0 * H0 * 4);
for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
  const p = y * W0 + x;
  if (lam.data[p * 4 + 3] < 250) continue;
  vis++;
  let dmax = 0;
  for (let c = 0; c < 3; c++) dmax = Math.max(dmax, Math.abs(a.data[p * 4 + c] - b.data[p * 4 + c]));
  if (dmax > 20) {
    if (enTarso(x, y)) { difTarso++; mapa[p * 4 + 1] = 255; }
    else { difFuera++; mapa[p * 4] = 255; }
    mapa[p * 4 + 3] = 255;
  }
}
console.log(`A/B v4: solidos=${vis} difTarsos(esperada)=${difTarso} difFUERA(defecto)=${difFuera} (${(100 * difFuera / vis).toFixed(3)}%)`);
await sharp(mapa, { raw: { width: W0, height: H0, channels: 4 } }).png().toFile(`${OUT}/ab4-dif.png`);
