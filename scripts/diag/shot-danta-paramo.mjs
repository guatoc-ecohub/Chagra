#!/usr/bin/env node
/* Captura de LA DANTA DE PÁRAMO en su casa (#/mockups/mundo-paramo-3d):
   toma ancha, órbita al costado de la danta y vertical de teléfono. */
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5322';
const OUT = process.env.OUT_DIR || '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';
mkdirSync(OUT, { recursive: true });

function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* sigue */ }
  return undefined;
}

/* Browser FRESCO por toma: chromium+swiftshader se cae de a ratos en tomas
   largas; aislar cada toma en su browser evita que una caída tumbe la tanda. */
function lanzar() {
  return chromium.launch({
    executablePath: chromiumPath(),
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
}

async function drag(page, x0, y0, x1, y1, pasos = 24) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= pasos; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / pasos, y0 + ((y1 - y0) * i) / pasos);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

async function shot({ nombre, vw = 1160, vh = 720, orbita = null, esperar = 12000 }) {
  const browser = await lanzar();
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1.4 });
  page.on('pageerror', (e) => console.log(`[${nombre}] pageerror:`, e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${nombre}] console.error:`, m.text().slice(0, 220));
  });
  await page.goto(`${BASE}/?ciclo=11#/mockups/mundo-paramo-3d`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.waitForTimeout(esperar);
  if (orbita) {
    await drag(page, vw / 2, vh / 2, vw / 2 + orbita[0], vh / 2 + orbita[1]);
    await page.waitForTimeout(1800);
  }
  await page.screenshot({ path: `${OUT}/${nombre}.png`, timeout: 120000 });
  console.log('ok', nombre);
  await browser.close();
}

async function conReintento(cfg) {
  try {
    await shot(cfg);
  } catch (e) {
    console.log(`[${cfg.nombre}] cayó (${String(e.message).slice(0, 80)}), reintento…`);
    await shot(cfg);
  }
}

await conReintento({ nombre: 'danta-01-ancha' });
await conReintento({ nombre: 'danta-02-orbita-der', orbita: [-260, 20] });
await conReintento({ nombre: 'danta-03-vertical', vw: 390, vh: 844 });
console.log('LISTO', OUT);
