// captura-gate.mjs — fotogramas del gate C4 (no versionado)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/kortux/Workspace/chagra/node_modules/playwright');
const OUT = new URL('.', import.meta.url).pathname;
const BASE = 'http://127.0.0.1:5391/luciernaga-solo.html';

const browser = await chromium.launch({ headless: true, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 420, height: 560 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

async function shot(nombre, params, esperas = [1600]) {
  await page.goto(`${BASE}?${params}`, { waitUntil: 'networkidle' });
  let n = 0;
  for (const ms of esperas) {
    await page.waitForTimeout(ms);
    const sufijo = esperas.length > 1 ? `-${n++}` : '';
    await page.screenshot({ path: `${OUT}/gate-${nombre}${sufijo}.png` });
  }
  console.log('->', nombre);
}

await shot('quieto', 'animated=0&size=480');
await shot('idle', 'size=480', [1600, 1900, 2100]);
await shot('listening', 'estado=listening&size=480');
await shot('speaking', 'estado=speaking&visema=V3&size=480');
await shot('thinking', 'estado=thinking&size=480');
await shot('caminando', 'estado=caminando&size=480', [1600, 280]);
await shot('eco-degradado', 'eco=degradado&size=480');
await browser.close();
console.log('capturas listas');
