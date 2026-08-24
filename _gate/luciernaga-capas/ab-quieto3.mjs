// A/B en el MISMO navegador (mismo decodificador de PNG — el cHRM del PNG
// hace inválida la comparación cross-decoder): capas quietas vs <img> plano.
// Diff esperado = SOLO la cirugía de tarsos (aprobada). Cualquier otra zona
// = defecto del corte.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { chromium } = require('/home/kortux/Workspace/chagra/node_modules/playwright');
const OUT = new URL('.', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 367, height: 507 }, deviceScaleFactor: 1 });
for (const [n, extra] of [['capas', 'animated=0'], ['plano', 'plano=1']]) {
  await page.goto(`http://127.0.0.1:5391/luciernaga-solo.html?size=507&${extra}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/ab3-${n}.png` });
}
await browser.close();

const a = await sharp(`${OUT}/ab3-capas.png`).raw().toBuffer({ resolveWithObject: true });
const b = await sharp(`${OUT}/ab3-plano.png`).raw().toBuffer({ resolveWithObject: true });
const lam = await sharp('public/compai/laminas/luciernaga.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W0 = lam.info.width, H0 = lam.info.height;
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
console.log(`A/B mismo-navegador: solidos=${vis} difTarsos(esperada)=${difTarso} difFUERA(defecto)=${difFuera} (${(100 * difFuera / vis).toFixed(3)}%)`);
await sharp(mapa, { raw: { width: W0, height: H0, channels: 4 } }).png().toFile(`${OUT}/ab3-dif.png`);
