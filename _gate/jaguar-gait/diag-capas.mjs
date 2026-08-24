/* Diagnóstico: congela la marcha en un instante dado (mata rAF) y captura la
 * zona de la grupa con capas aisladas, para ver qué pieza abre la cuña beige.
 *   node diag-capas.mjs <dirSalida> <tCongelaSeg> [url]
 */
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const D = process.argv[2];
const T_CONGELA = Number(process.argv[3] || 7.1);
const URL = process.argv[4] || 'http://localhost:5199/jaguar-lamina-solo.html?estado=caminando&mueve=0';
let exe = '';
try { exe = execSync("ls -d /nix/store/*chromium*/bin/chromium 2>/dev/null | head -1").toString().trim(); } catch {}

const browser = await chromium.launch({
  executablePath: exe || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('[data-creature="jaguar"] canvas'));
await page.waitForTimeout(T_CONGELA * 1000);
// congelar: el próximo rAF nunca se agenda — las vars CSS quedan clavadas
await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
await page.waitForTimeout(120);

const lectura = await page.evaluate(() => {
  const raiz = document.querySelector('[data-creature="jaguar"]');
  const v = (n) => raiz.style.getPropertyValue(n) || '0';
  return ['delLejana', 'delCercana', 'trasCercana', 'trasLejana']
    .map((c) => `${c}: cad=${v(`--jlv-anda-${c}-cadera`)} rod=${v(`--jlv-anda-${c}-rodilla`)}`)
    .join('  ') + `  bob=${v('--jlv-anda-bob')}`;
});
console.log('POSE CONGELADA:', lectura);

// caja de la grupa en pantalla: del stage, zona x 380..620 de lámina
const caja = await page.evaluate(() => {
  const stage = document.querySelector('[data-creature="jaguar"]').firstElementChild;
  const r = stage.getBoundingClientRect();
  const esc = r.width / 705;
  return { x: r.x + 360 * esc, y: r.y + 150 * esc, width: 260 * esc, height: 244 * esc };
});

const capas = {
  todo: null,
  'sin-cola': '.jlv-colaPivote',
  'sin-cuerpo': '.jlv-cuerpoPivote',
  'sin-trasLejana': '[data-pata="trasLejana"]',
  'sin-trasCercana': '[data-pata="trasCercana"]',
};
for (const [nombre, sel] of Object.entries(capas)) {
  if (sel) await page.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  await page.screenshot({ path: `${D}/diag-${nombre}.png`, clip: caja });
  if (sel) await page.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
}
await browser.close();
console.log('listo →', D);
