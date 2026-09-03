#!/usr/bin/env node
/*
 * captura-bichos-shot — toma la SECUENCIA de capturas de movimiento del arnés
 * captura-bichos.html (diagnóstico de la vida de los 9 rubber-hose).
 * Requiere `npm run dev` corriendo. Chromium del sistema (NixOS) + playwright.
 *
 * Uso: node scripts/diag/captura-bichos-shot.mjs <dirSalida> [prefijo] [baseUrl]
 * Saca: <prefijo>-t02s.png, -t12s.png, -t22s.png, -t32s.png (página completa).
 */
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const [dir = './capturas-bichos', prefijo = 'bichos', base = 'http://127.0.0.1:5173'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });

function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try { return execSync('which chromium', { encoding: 'utf8' }).trim() || undefined; } catch { return undefined; }
}

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
// waitUntil 'load' (no 'networkidle': el websocket de HMR de vite nunca calla).
await page.goto(`${base}/scripts/diag/captura-bichos.html?gesto=1`, { waitUntil: 'load' });
await page.waitForSelector('svg[data-creature]', { timeout: 30_000 });

const t0 = Date.now();
for (const marca of [2, 12, 22, 32]) {
  const espera = t0 + marca * 1000 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  await page.screenshot({ path: `${dir}/${prefijo}-t${String(marca).padStart(2, '0')}s.png`, fullPage: true });
  console.log(`shot t=${marca}s`);
}
await browser.close();
console.log(`OK → ${dir}`);
