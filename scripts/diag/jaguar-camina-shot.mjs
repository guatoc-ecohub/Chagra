#!/usr/bin/env node
/*
 * jaguar-camina-shot — captura la SECUENCIA del ciclo de marcha del jaguar
 * lámina-viva desde el arnés jaguar-camina.html: 4 frames a cuartos de ciclo
 * (T se calcula con la MISMA fórmula del motor: periodoMarcha a size=560),
 * arrancando después de la rampa de entrada — un solo frame NO prueba que
 * camina; cuatro a T/4 prueban alternancia de patas y bob.
 * Requiere `npm run dev` corriendo. Chromium del sistema (NixOS) + playwright.
 *
 * Uso: node scripts/diag/jaguar-camina-shot.mjs <dirSalida> [prefijo] [baseUrl]
 */
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { periodoMarcha } from '../../src/visual/creatures/jaguarLamina/marcha.js';
import { ANCHO } from '../../src/visual/creatures/jaguarLamina/anatomia.js';

const [dir = './_gate-jaguar-camina', prefijo = 'marcha', base = 'http://127.0.0.1:5173'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });

function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try { return execSync('which chromium', { encoding: 'utf8' }).trim() || undefined; } catch { return undefined; }
}

const SIZE = 560; // el del arnés
const T = periodoMarcha(SIZE / ANCHO, 34);
console.log(`período del ciclo T=${T.toFixed(3)}s`);

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 1040 } });
// waitUntil 'load' (no 'networkidle': el websocket de HMR de vite nunca calla).
await page.goto(`${base}/scripts/diag/jaguar-camina.html`, { waitUntil: 'load' });
await page.waitForSelector('[data-agt-estado="caminando"]', { timeout: 30_000 });
// El motor arranca cuando la lámina cargó ('listo'): esperar la primera var.
await page.waitForFunction(() => {
  const el = document.querySelector('[data-agt-estado="caminando"]');
  return el && el.style.getPropertyValue('--jlv-anda-bob') !== '';
}, { timeout: 30_000 });

const t0 = Date.now();
const marcas = [0, 1, 2, 3].map((k) => 1.0 + (k * T) / 4); // 1s > rampa (0.4s)
for (let k = 0; k < marcas.length; k += 1) {
  const espera = t0 + marcas[k] * 1000 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  await page.screenshot({ path: `${dir}/${prefijo}-f${k}-c${(k / 4).toFixed(2)}.png`, fullPage: true });
  console.log(`shot fase≈${k}/4 (t=${marcas[k].toFixed(2)}s)`);
}
await browser.close();
console.log(`OK → ${dir}`);
