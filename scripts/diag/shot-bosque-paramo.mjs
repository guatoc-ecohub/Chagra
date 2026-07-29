#!/usr/bin/env node
/* Captura del BOSQUE PÁRAMO (toma A final): 4 franjas + 2 órbitas + vertical. */
import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5311';
const OUT = process.env.OUT_DIR || '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad/shots-paramo';
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

async function shot({ nombre, ciclo, vw = 1160, vh = 720, orbita = null, esperar = 14000 }) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1.4 });
  page.on('pageerror', (e) => console.log(`[${nombre}] pageerror:`, e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${nombre}] console.error:`, m.text().slice(0, 220));
  });
  await page.goto(`${BASE}/?ciclo=${ciclo}#/mockups/bosque-vivo-3d`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.waitForTimeout(esperar);
  if (orbita) {
    await drag(page, vw / 2, vh / 2, vw / 2 + orbita[0], vh / 2 + orbita[1]);
    await page.waitForTimeout(1800);
  }
  await page.screenshot({ path: `${OUT}/${nombre}.png`, timeout: 120000 });
  console.log('ok', nombre);
  await page.close();
}

await shot({ nombre: '01-manana-reposo', ciclo: 9 });
await shot({ nombre: '02-amanecer-bruma', ciclo: 6.2 });
await shot({ nombre: '03-atardecer', ciclo: 17.8 });
await shot({ nombre: '04-noche-arroyo', ciclo: 22 });
await shot({ nombre: '05-orbita-izq', ciclo: 10, orbita: [360, 30] });
await shot({ nombre: '06-orbita-der-relieve', ciclo: 10, orbita: [-400, -50] });
await shot({ nombre: '07-vertical-telefono', ciclo: 9, vw: 390, vh: 844 });
await browser.close();
console.log('LISTO', OUT);
