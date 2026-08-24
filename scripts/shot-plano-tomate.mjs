#!/usr/bin/env node
/*
 * shot-plano-tomate — captura CRUDA del harness 2D de la lámina del tomate.
 * Herramienta de iteración de arte, NO es el gate: el contrato `html` de
 * shot3d pide documento editorial (texto+elementos) y el harness es canvas
 * puro. El veredicto certificable lo da shot3d --headed sobre la escena 3D.
 * Uso: node scripts/shot-plano-tomate.mjs <url> <salida.png> [ancho alto]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';

const [url, salida, ancho = '1600', alto = '1400'] = process.argv.slice(2);
if (!url || !salida) {
  console.error('uso: shot-plano-tomate.mjs <url> <salida.png> [ancho alto]');
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: path.join(os.homedir(), '.local', 'bin', 'chromium'),
  headless: true,
});
const page = await browser.newPage({ viewport: { width: Number(ancho), height: Number(alto) } });
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.__laminaLista === true, { timeout: 15000 });
await page.screenshot({ path: salida, fullPage: true });
await browser.close();
if (errores.length) {
  console.error(`pageerrors=${errores.length}:\n${errores.join('\n')}`);
  process.exit(1);
}
console.log(`ok ${salida} pageerrors=0`);
