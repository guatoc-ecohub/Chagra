#!/usr/bin/env node
/* Capturas del SueloDemo3D: varias vistas deterministas, de lejos y al ras. */
// Uso: npx vite --port 5237 & BASE=http://localhost:5237 node scripts/diag/shot-suelo-demo.mjs
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5237';
const OUT = process.env.OUT || '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

function chromiumPath() {
  try {
    const p = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch { /* nada */ }
  return undefined;
}

const VISTAS = ['aerea', 'sendero', 'cerca', 'ladera'];

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

for (const vista of VISTAS) {
  await page.goto(`${BASE}/?vista=${vista}#/mockups/suelo-demo-3d`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(7000); // que asiente el frame (swiftshader es lento)
  await page.screenshot({ path: `${OUT}/suelo-${vista}.png` });
  console.log(`ok ${vista}`);
}
// móvil (tier medio aprox por viewport chico no cambia tier, pero muestra encuadre)
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/?vista=sendero#/mockups/suelo-demo-3d`, { waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/suelo-movil.png` });
console.log('ok movil');

await browser.close();
