#!/usr/bin/env node
/* capturar.mjs <etiqueta> [puerto] [vistas,...] — captura las vistas del arnés
   con Playwright (chromium del sistema, tiempo REAL: espera la red y un
   segundo de asentamiento; nada de virtual-time). Headed sobre el X vivo si
   DISPLAY está puesto, headless si no. Una vista por página, mismo encuadre. */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [et = 'x', port = '5178', lista] = process.argv.slice(2);
const DIR = dirname(fileURLToPath(import.meta.url));
const BASE = `http://127.0.0.1:${port}/tests/visual/zariguya-tinta-harness.html`;
const POSES = ['muerta', 'crias', 'verlupa', 'cute', 'escucha-02'];
const GIROS = ['giro-13', 'giro-10', 'giro-6', 'giro+3', 'giro+10', 'giro-12-ladeo+2', 'giro+10-ladeo-1.8'];
const VISTAS = lista === 'giros' ? GIROS : lista ? lista.split(',') : ['idle', 'card', 'camina', 'habla', 'husmea', ...POSES, 'idle-noche'];
const exe = execSync('readlink -f "$(which chromium)"', { encoding: 'utf8' }).trim();
const headed = Boolean(process.env.DISPLAY);
const browser = await chromium.launch({ executablePath: exe, headless: !headed, args: ['--no-sandbox', '--hide-scrollbars'] });
console.log(`chromium=${exe} headed=${headed}`);
const LIMITE_MS = 60000; // por vista: una captura que no sale en 60 s es un cuelgue, no una espera
for (const v of VISTAS) {
  const t0 = Date.now();
  const card = v === 'card';
  const lado = card ? 80 : 600;
  const page = await browser.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(LIMITE_MS);
  const errores = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errores.push(`requestfailed: ${r.url()}`));
  let vista = v === 'idle-noche' ? 'idle' : v;
  let extra = v === 'idle-noche' ? '&fondo=noche' : '';
  const mg = /^giro([+-][\d.]+)(?:-ladeo([+-][\d.]+))?$/.exec(v);
  if (mg) { vista = 'idle'; extra = `&giro=${mg[1]}${mg[2] ? `&ladeo=${mg[2]}` : ''}`; }
  const ma = /^actua-t([\d.]+)$/.exec(v);
  if (ma) { vista = 'actua'; extra = `&t=${ma[1]}`; }
  const url = `${BASE}?vista=${vista}${extra}${process.env.RIG ? '&rig=1' : ''}`;
  const trabajo = (async () => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('[data-creature="zariguya"] svg');
    if (POSES.includes(v)) {
      await page.waitForFunction((p) => document.querySelector('[data-creature="zariguya"]')?.getAttribute('data-pose') === p, v, { timeout: 20000 }).catch(() => errores.push(`pose ${v} no activó en 20 s`));
    }
    await page.waitForTimeout(2500);
    const out = join(DIR, `${et}-${v}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: lado, height: lado }, timeout: 20000 });
  })();
  const limite = new Promise((_, rej) => setTimeout(() => rej(new Error(`CUELGUE > ${LIMITE_MS / 1000} s`)), LIMITE_MS));
  try {
    await Promise.race([trabajo, limite]);
    console.log(`ok ${et}-${v} ${((Date.now() - t0) / 1000).toFixed(1)}s${errores.length ? ' · ' + errores.join(' | ') : ''}`);
  } catch (e) {
    console.log(`FALLO ${et}-${v} ${((Date.now() - t0) / 1000).toFixed(1)}s · ${e.message}${errores.length ? ' · ' + errores.join(' | ') : ''}`);
  }
  await page.close().catch(() => {});
}
await browser.close();
