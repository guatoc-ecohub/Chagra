#!/usr/bin/env node
/* Captura del PÁRAMO ESPECTACULAR: paneo de entrada (rostro → barrido → plano
   general), la lección del suelo (vitrina de capas bajo la queñua) y una órbita. */
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5311';
const OUT = process.env.OUT_DIR || '/tmp/shots-paramo';
const URL_PARAMO = `${BASE}/?ciclo=11#/mockups/mundo-paramo-3d`;
mkdirSync(OUT, { recursive: true });

function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* sigue */ }
  return undefined;
}

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

async function drag(page, x0, y0, x1, y1, pasos = 24) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= pasos; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / pasos, y0 + ((y1 - y0) * i) / pasos);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

async function shot({ nombre, esperar = 14000, vw = 1160, vh = 720, orbita = null, leccion = false }) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1.4 });
  page.on('pageerror', (e) => console.log(`[${nombre}] pageerror:`, e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${nombre}] console.error:`, m.text().slice(0, 220));
  });
  await page.goto(URL_PARAMO, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.waitForTimeout(esperar);
  if (leccion) {
    await page.getByRole('button', { name: 'La lección del suelo' }).click();
    await page.waitForTimeout(6500);
  }
  if (orbita) {
    await drag(page, vw / 2, vh / 2, vw / 2 + orbita[0], vh / 2 + orbita[1]);
    await page.waitForTimeout(1800);
  }
  await page.screenshot({ path: `${OUT}/paramo-espectacular-${nombre}.png`, timeout: 120000 });
  console.log('ok', nombre);
  await page.close();
}

/* El paneo dura 9 s desde que arranca el reloj del canvas. */
await shot({ nombre: '01-entrada-rostro', esperar: 2600 });
await shot({ nombre: '02-paneo-barrido', esperar: 6200 });
await shot({ nombre: '03-plano-general', esperar: 13500 });
await shot({ nombre: '04-leccion-suelo', esperar: 12500, leccion: true });
await shot({ nombre: '05-orbita', esperar: 13500, orbita: [-190, 40] });
await shot({ nombre: '06-movil', esperar: 13500, vw: 420, vh: 840 });

await browser.close();
console.log('listo →', OUT);
