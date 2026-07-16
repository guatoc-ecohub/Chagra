#!/usr/bin/env node
/*
 * shot3d — captura una ruta 3D del dev server con chromium del sistema + swiftshader.
 * Uso: node shot3d.mjs <ruta> <salida.png> [--wait ms] [--click selector] [--w px] [--h px]
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const ruta = args[0];
const out = args[1];
const getFlag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const wait = Number(getFlag('wait', 9000));
const click = getFlag('click', null);
const W = Number(getFlag('w', 1280));
const H = Number(getFlag('h', 900));
const base = getFlag('base', 'http://127.0.0.1:5173');

const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();

const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: Number(getFlag('dsf', 1)),
  locale: 'es-CO',
});
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errores.push(`[console] ${m.text()}`);
});

// Sesión falsa para pasar el gate de login (isAuthenticated lee localforage:
// farmos_access_token + expiry futuro bastan, no hay red de por medio).
// localforage usa IndexedDB: default 'localforage/keyvaluepairs' y la app
// clásica 'Chagra/syncQueue' — se siembra en ambas antes de cargar la app.
await page.addInitScript(() => {
  const sembrar = (db, store) =>
    new Promise((res) => {
      const req = indexedDB.open(db, 2);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(store); } catch { /* ya existe */ }
      };
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction(store, 'readwrite');
          const st = tx.objectStore(store);
          st.put('shot3d-token-diagnostico', 'farmos_access_token');
          st.put(Date.now() + 86400000, 'farmos_token_expiry');
          tx.oncomplete = () => res(undefined);
          tx.onerror = () => res(undefined);
        } catch { res(undefined); }
      };
      req.onerror = () => res(undefined);
    });
  // fire-and-forget: corre antes del primer script de la app
  sembrar('localforage', 'keyvaluepairs');
  sembrar('Chagra', 'syncQueue');
});

const shell = getFlag('shell', '/index-prod.html');
await page.goto(`${base}${shell}#${ruta}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(wait);

if (click) {
  try {
    await page.waitForSelector(click, { timeout: 30000, state: 'attached' });
    await page.evaluate((sel) => document.querySelector(sel)?.click(), click);
    await page.waitForTimeout(Number(getFlag('wait2', 5000)));
  } catch (e) {
    errores.push(`[click] no se pudo pulsar ${click}: ${e.message}`);
  }
}

// ¿hay un canvas y está pintando algo?
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { canvas: false };
  return { canvas: true, w: c.width, h: c.height };
});

const clipArg = getFlag('clip', null); // "x,y,w,h" en px del viewport
const clip = clipArg ? (() => { const [x, y, w, h] = clipArg.split(',').map(Number); return { x, y, width: w, height: h }; })() : undefined;
await page.screenshot({ path: out, timeout: 120000, animations: 'disabled', ...(clip ? { clip } : {}) });
console.log(`[shot3d] ruta=${ruta} out=${out} canvas=${JSON.stringify(info)}`);
if (errores.length) console.log(`[shot3d] ERRORES:\n${errores.slice(0, 12).join('\n')}`);
else console.log('[shot3d] sin errores de consola');

await ctx.close();
await browser.close();
