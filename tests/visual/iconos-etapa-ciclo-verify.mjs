/* global process, console -- script Node del gate visual, fuera del bundle */
/**
 * iconos-etapa-ciclo-verify.mjs — recortes por sección del gate de iconos.
 *
 * Complementa a `microapp-shot` (captura de la página entera): saca cada
 * sección del harness por su data-testid, a escala 1 (píxel REAL de card) y a
 * escala 4 (lupa vectorial), para mirar bordes duros y peso de línea.
 *
 * Requiere el vite del worktree sirviendo el harness:
 *   npx vite --config vite.config.gate.mjs --port 3017
 *   node tests/visual/iconos-etapa-ciclo-verify.mjs [base=http://127.0.0.1:3017] [out=/tmp/iconos-gate]
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3017';
const OUT = process.argv[3] || '/tmp/iconos-gate';
fs.mkdirSync(OUT, { recursive: true });

function chromiumPath() {
  try { return execSync('command -v chromium', { encoding: 'utf8' }).trim(); } catch { /* sigue */ }
  return '/run/current-system/sw/bin/chromium';
}

const URL = `${BASE}/tests/visual/iconos-etapa-ciclo-harness.html`;
const SECCIONES = ['sec-a', 'sec-b', 'sec-c', 'sec-d', 'sec-e', 'card-papa'];

const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox'] });
for (const escala of [1, 4]) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: escala, locale: 'es-CO' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('requestfailed', (r) => errores.push(`requestfailed ${r.url()}`));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('[data-testid="gate-listo"]', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(500);
  for (const id of SECCIONES) {
    const ruta = `${OUT}/${id}@${escala}x.png`;
    await page.locator(`[data-testid="${id}"]`).screenshot({ path: ruta });
    console.log(ruta);
  }
  console.log(`escala ${escala}x · pageerrors=${errores.length}`);
  errores.forEach((e) => console.log('  !', e));
  await ctx.close();
}
await browser.close();
