/* Capturas de fases REALES del ciclo (rAF de verdad — el virtual-time de
 * microapp-shot NO avanza el motor: probado 2026-08-18, 5 budgets → mismo
 * t_pagina≈0.33s; este script es el instrumento verificado del gate).
 *   node capturas-fases.mjs <dirSalida> <t1,t2,...segundos> [url]
 */
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const D = process.argv[2];
const TS = (process.argv[3] || '5.14,5.78,6.42,6.85,7.06').split(',').map(Number);
const URL = process.argv[4] || 'http://localhost:5199/jaguar-lamina-solo.html?estado=caminando';
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
const t0 = Date.now();
for (const t of TS) {
  const espera = t * 1000 - (Date.now() - t0);
  if (espera > 0) await page.waitForTimeout(espera);
  await page.screenshot({ path: `${D}/fase-${String(Math.round(t * 100)).padStart(4, '0')}.png` });
  const lectura = await page.evaluate(() => {
    const raiz = document.querySelector('[data-creature="jaguar"]');
    const v = (n) => raiz.style.getPropertyValue(n) || '0';
    return ['delLejana', 'delCercana', 'trasCercana', 'trasLejana']
      .map((c) => `${c}: cad=${v(`--jlv-anda-${c}-cadera`)} rod=${v(`--jlv-anda-${c}-rodilla`)}`).join('  ');
  });
  console.log(`t=${t}s → ${lectura}`);
}
await browser.close();
console.log('listo →', D);
