#!/usr/bin/env node
/* global process, window, Response, URL, indexedDB, console, document */
/*
 * shot3d — captura una ruta 3D del dev server con chromium del sistema + swiftshader.
 * Uso: node shot3d.mjs <ruta> <salida.png> [--headed] [--wait ms] [--click selector] [--w px] [--h px]
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
const headed = args.includes('--headed');
const authRetry = args.includes('--auth');
const offline = args.includes('--offline');
const mockApi = args.includes('--mock-api');

const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();

const browser = await chromium.launch({
  headless: !headed,
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
if (offline) await ctx.setOffline(true);
const page = await ctx.newPage();
if (mockApi) {
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/') || url.includes('/oauth/')) {
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return realFetch(input, init);
    };
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (['xhr', 'fetch'].includes(route.request().resourceType()) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/oauth/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });
}
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
  // Playwright espera esta promesa antes del primer script de la app. Sin
  // esperar las escrituras, el guard de auth podía leer null y mandar la
  // captura a login aunque el token de diagnóstico ya estuviera en vuelo.
  return Promise.all([
    sembrar('localforage', 'keyvaluepairs'),
    sembrar('Chagra', 'syncQueue'),
  ]);
});

const shell = getFlag('shell', '/index-prod.html');
await page.goto(`${base}${shell}#${ruta}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(wait);

// Fallback para apps que arrancan su guard de sesión antes de que un init
// script termine la transacción IndexedDB. Es opt-in para no alterar capturas
// públicas: escribe únicamente un token sintético en el contexto temporal.
if (authRetry) {
  await page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open('Chagra');
    request.onsuccess = () => {
      const db = request.result;
      const storeName = db.objectStoreNames.contains('syncQueue') ? 'syncQueue' : 'keyvaluepairs';
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put('shot3d-token-diagnostico', 'farmos_access_token');
      store.put(Date.now() + 86400000, 'farmos_token_expiry');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    };
    request.onerror = () => resolve();
  }));
  const authCheck = await page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open('Chagra');
    request.onsuccess = () => {
      const db = request.result;
      const storeName = db.objectStoreNames.contains('syncQueue') ? 'syncQueue' : 'keyvaluepairs';
      const tx = db.transaction(storeName);
      const requestToken = tx.objectStore(storeName).get('farmos_access_token');
      tx.oncomplete = () => { db.close(); resolve(requestToken.result || null); };
      tx.onerror = () => { db.close(); resolve(null); };
    };
    request.onerror = () => resolve(null);
  }));
  console.log(`[shot3d] auth retry token=${authCheck ? 'presente' : 'ausente'}`);
  await page.goto(`${base}${shell}#${ruta}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(wait);
}

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
// --serie "0,12000,30000": esperas ADICIONALES acumulativas tras `wait`, una
// captura por parada EN LA MISMA SESIÓN (out-1.png, out-2.png…) — para probar
// movimiento real: fauna que entra y sale, gestos que cambian con el tiempo.
const serieArg = getFlag('serie', null);
if (serieArg) {
  const paradas = serieArg.split(',').map(Number);
  for (let i = 0; i < paradas.length; i++) {
    if (i > 0) await page.waitForTimeout(paradas[i] - paradas[i - 1]);
    const f = out.replace(/\.png$/, `-${i + 1}.png`);
    await page.screenshot({ path: f, timeout: 120000, animations: 'disabled', ...(clip ? { clip } : {}) });
    console.log(`[shot3d] serie ${i + 1}/${paradas.length} t=+${paradas[i]}ms → ${f}`);
  }
} else {
  await page.screenshot({ path: out, timeout: 120000, animations: 'disabled', ...(clip ? { clip } : {}) });
}
console.log(`[shot3d] ruta=${ruta} out=${out} canvas=${JSON.stringify(info)}`);
if (errores.length) console.log(`[shot3d] ERRORES:\n${errores.slice(0, 12).join('\n')}`);
else console.log('[shot3d] sin errores de consola');

await ctx.close();
await browser.close();
