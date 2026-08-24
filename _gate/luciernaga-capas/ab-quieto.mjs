// A/B: fotograma quieto (animated=0) del navegador vs recomposición offline
// (lámina + tarsos) — canal a canal, d>20 visible (magick AE subestima).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
const { chromium } = require('/home/kortux/Workspace/chagra/node_modules/playwright');
const OUT = new URL('.', import.meta.url).pathname;

// 1) captura SOLO el elemento
const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5391/luciernaga-solo.html?animated=0&size=507', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const el = page.locator('[data-creature="luciernaga"] div').first(); // stage exacto
await el.screenshot({ path: `${OUT}/ab-navegador.png` });
await browser.close();

// 2) referencia: recomposición offline (ya con tarsos) sobre el mismo fondo
const meta = await sharp(`${OUT}/ab-navegador.png`).metadata();
const ref = await sharp(`${OUT}/capa-recomp.png`).metadata(); // gris 118 de fondo — rehacer sobre e9e4d6
// capa-recomp se guardó aplanada sobre gris; reconstruimos desde la lámina + tarsos via el verificador ya corrido:
// más simple: componer lámina PNG sobre e9e4d6 NO sirve (sin tarsos). Usamos capa-recomp y toleramos
// el fondo distinto contando solo píxeles donde la lámina tiene alfa.
const lam = await sharp('public/compai/laminas/luciernaga.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const recompGris = await sharp(`${OUT}/capa-recomp.png`).raw().toBuffer({ resolveWithObject: true });
const W0 = lam.info.width, H0 = lam.info.height;

// navegador: reescala a tamaño lámina para comparar 1:1
const nav = await sharp(`${OUT}/ab-navegador.png`).resize(W0, H0, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
let vis = 0, dif20 = 0, dif40 = 0;
const mapa = Buffer.alloc(W0 * H0 * 4);
for (let p = 0; p < W0 * H0; p++) {
  const a = lam.data[p * 4 + 3];
  if (a < 250) continue; // solo interior sólido (el AA del reescalado ensucia bordes)
  vis++;
  let dmax = 0;
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(nav.data[p * 4 + c] - recompGris.data[p * 4 + c]);
    if (d > dmax) dmax = d;
  }
  if (dmax > 20) { dif20++; mapa[p * 4] = 255; mapa[p * 4 + 3] = 255; }
  if (dmax > 40) dif40++;
}
console.log(`A/B quieto: solidos=${vis} dif>20=${dif20} (${(100 * dif20 / vis).toFixed(2)}%) dif>40=${dif40} (${(100 * dif40 / vis).toFixed(2)}%)`);
await sharp(mapa, { raw: { width: W0, height: H0, channels: 4 } }).png().toFile(`${OUT}/ab-dif.png`);
