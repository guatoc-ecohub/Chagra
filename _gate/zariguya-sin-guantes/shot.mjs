// Captura idle de ZariguyaLaminaViva con esperas REALES (rAF/CSS corren) +
// telemetría dura: pageerrors, console.error y requests fallidos.
// Uso: node shot.mjs <url> <salida.png> [esperaMs]
import { chromium } from 'playwright';

const [url, out, esperaMs = '1000'] = process.argv.slice(2);
if (!url || !out) { console.error('uso: node shot.mjs <url> <salida.png> [esperaMs]'); process.exit(2); }

const errores = { page: [], console: [], request: [] };
// NixOS: el chromium empaquetado de playwright no carga (libglib) — va el del sistema.
const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 760, height: 860 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => errores.page.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errores.console.push(m.text()); });
page.on('requestfailed', (r) => errores.request.push(`${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-creature="zariguya"]', { timeout: 15000 });
// capas horneadas = los hosts tienen canvas (cola, cuerpo, brazos, cabeza, mandíbula, orejas, 2 párpados)
await page.waitForFunction(() => document.querySelectorAll('canvas').length >= 8, { timeout: 15000 });
await page.waitForTimeout(Number(esperaMs));
await page.locator('[data-creature="zariguya"]').screenshot({ path: out });
await browser.close();

console.log('shot:', out);
console.log('pageerrors:', errores.page.length, '| console.error:', errores.console.length, '| requestfailed:', errores.request.length);
for (const [k, v] of Object.entries(errores)) v.forEach((e) => console.log(`  [${k}]`, e));
process.exit(errores.page.length || errores.request.length ? 1 : 0);
