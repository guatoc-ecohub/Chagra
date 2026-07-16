#!/usr/bin/env node
/* Captura del valle con franja fija (?ciclo=N) — teléfono y desktop. */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:5173';
const CICLO = process.env.SHOT_CICLO || '22';
const OUTDIR = process.env.SHOT_OUTDIR || join(tmpdir(), 'chagra-shots');
const TAG = process.env.SHOT_TAG || 'base';
const RUTA = process.env.SHOT_RUTA || '/#/mockups/entrada-3d';
const ESPERA = Number(process.env.SHOT_ESPERA || 9000);

function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* noop */ }
  return undefined;
}

mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch({
  ...(chromiumPath() ? { executablePath: chromiumPath() } : {}),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    ...(process.env.SHOT_GL ? process.env.SHOT_GL.split(' ') : []),
  ],
});

const vistas = [
  { nombre: 'tel', viewport: { width: 390, height: 844 }, mobile: true },
  { nombre: 'desk', viewport: { width: 1366, height: 768 }, mobile: false },
];

for (const v of vistas) {
  const ctx = await browser.newContext({
    viewport: v.viewport,
    isMobile: v.mobile,
    hasTouch: v.mobile,
    deviceScaleFactor: v.mobile ? 2 : 1,
    locale: 'es-CO',
    ...(process.env.SHOT_CALMA ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  const url = `${BASE}${RUTA}?ciclo=${CICLO}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(ESPERA);
  const out = `${OUTDIR}/valle-${TAG}-c${CICLO}-${v.nombre}.png`;
  await page.screenshot({ path: out });
  const cam = await page.evaluate(() => JSON.stringify(window.__valleCam || null));
  console.log(`[shot] ${out} cam=${cam} ${errores.length ? 'ERRORES: ' + errores.slice(0, 3).join(' | ') : 'ok'}`);
  await ctx.close();
}
await browser.close();
