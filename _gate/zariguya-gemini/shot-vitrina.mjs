/* eslint-disable no-undef -- arnés de gate (node + playwright), no código de la app */
/* _gate-shot-vitrina — captura la vitrina de la zarigüeya Gemini con
 * chromium headless (DOM 2D, dsf=2). Versionado para re-correr el gate.
 * Uso: node _gate/zariguya-gemini/shot-vitrina.mjs [baseURL] [outPrefix] */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = process.argv[3] || '/tmp/vitrina-zari';

const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch { /* sigue */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 }).trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 2290, height: 700 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const consola = [];
  page.on('console', (m) => consola.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}/_gate/zariguya-gemini/vitrina.html`, { waitUntil: 'networkidle' });
  await sleep(3800); // horneado + carga de poses + primer ciclo de escucha
  await page.screenshot({ path: `${OUT}-t0.png`, fullPage: true });
  await sleep(900); // otro fotograma del ciclo de escucha
  await page.screenshot({ path: `${OUT}-t1.png`, fullPage: true });
  // Diagnóstico crudo: estado de cada raíz.
  const estados = await page.evaluate(() => Array.from(document.querySelectorAll('[data-creature="zariguya"]'))
    .map((n) => ({ estado: n.dataset.agtEstado, modo: n.dataset.modo, pose: n.dataset.pose || null, vida: n.dataset.vida || null })));
  console.log(JSON.stringify({ estados: estados.slice(0, 9), consola: consola.slice(0, 20) }, null, 1));
  await browser.close();
})();
