#!/usr/bin/env node
/* Captura mundos 3D por ruta hash (mockups sin auth). Uso:
   node shot-mundos.mjs <baseUrl> <outDir> <sufijo> */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const outDir = process.argv[3] || '.';
const sufijo = process.argv[4] || 'antes';
mkdirSync(outDir, { recursive: true });

const MUNDOS = [
  { id: 'cafetal', ruta: '#/mockups/cafetal-vivo-3d' },
  { id: 'cacao', ruta: '#/mockups/cacao-vivo-3d' },
  { id: 'papa', ruta: '#/mockups/papa-viva-3d' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/run/current-system/sw/bin/chromium',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
// Forzar reduced motion NO (queremos el mundo normal) pero congelar tiempo no hace falta:
// la cámara autoRotate es lenta (0.12) y el diff es de color, no de pose exacta.
for (const m of MUNDOS) {
  await page.goto(`${base}/${m.ruta}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(9000); // chunk three + primer render swiftshader
  await page.screenshot({ path: `${outDir}/${m.id}-${sufijo}.png` });
  console.log(`ok ${m.id}-${sufijo}.png`);
}
await browser.close();
