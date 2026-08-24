// Needle Fase 0.5, objetivo 2: motor OFICIAL Needle 2 (WASM v2, no needle-rs v1) en un
// Web Worker, en el Pixel 6 Pro real por ADB. Sirve ops/needle-f05/browser/ (repo aparte
// chagra-needle-f05/, fuera de chagra/) y mide carga, latencia fría/caliente y offline SW.
import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/demos/3d/_gate/herramientas/gate-pantalla.mjs';

const root = '/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/browser';
const weightsRoot = '/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/models';
const port = 4180;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.cact': 'application/octet-stream' };

function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function serve(pathname, response) {
  const isWeight = pathname.startsWith('/weights/');
  const relative = decodeURIComponent(pathname.replace(/^\/(?:weights\/)?/, '')) || 'index.html';
  const base = isWeight ? weightsRoot : root;
  const filePath = resolve(base, relative);
  if (!filePath.startsWith(`${base}/`)) { response.writeHead(403); response.end(); return; }
  try {
    const info = await fs.stat(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(response);
  } catch { response.writeHead(404); response.end('not found'); }
}

async function waitForCdp() {
  const endpoint = 'http://127.0.0.1:9223/json/version';
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function findPage(context, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  let page;
  while (!page && Date.now() < deadline) {
    page = context.pages().find((candidate) => candidate.url().includes(`127.0.0.1:${port}`));
    if (!page) await new Promise((r) => setTimeout(r, 500));
  }
  return page;
}

async function run() {
  await exigirPantallaViva({ medirFps: false });
  const machineAlone = await esperarMaquinaSola({ maxEspera: 1000, umbral: 0 });
  const server = createServer((request, response) => serve(new URL(request.url, 'http://127.0.0.1').pathname, response));
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  let browser;
  try {
    adb('reverse', `tcp:${port}`, `tcp:${port}`);
    adb('forward', 'tcp:9223', 'localabstract:chrome_devtools_remote');
    // Chrome del Pixel puede haber quedado abierto de una corrida previa (F0). Forzar
    // navegación limpia a la URL v2, cache-busted, para no medir la pestaña vieja de v1.
    adb('shell', 'am', 'start', '-n', 'com.android.chrome/com.google.android.apps.chrome.Main', '-a', 'android.intent.action.VIEW', '-d', `http://127.0.0.1:${port}/index.html?run=${Date.now()}`);
    const cdpVersion = await waitForCdp();
    if (!cdpVersion) {
      console.log(JSON.stringify({ measurable: false, reason: 'Chrome Android no expuso CDP por adb en 20 s', machineAlone, device: adb('shell', 'getprop', 'ro.product.model') }, null, 2));
      return;
    }
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
    const context = browser.contexts()[0];
    const page = await findPage(context, 20000);
    if (!page) throw new Error('La pestaña Android no apareció en CDP');
    page.on('console', (msg) => console.error('[android console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[android pageerror]', err.message));
    page.on('requestfinished', async (req) => {
      if (!req.url().includes('.cact') && !req.url().includes('.wasm')) return;
      const resp = await req.response().catch(() => null);
      console.error('[android net]', req.url(), '->', resp?.status(), resp ? await resp.headerValue('content-length').catch(() => null) : null);
    });
    const pollDeadline = Date.now() + 180000;
    let ok = false;
    while (Date.now() < pollDeadline) {
      const status = await page.evaluate(() => document.querySelector('#status')?.textContent || '(sin #status)').catch((e) => `(evaluate error: ${e.message})`);
      console.error('[android poll]', new Date().toISOString(), status);
      if (status.startsWith('Listo.')) { ok = true; break; }
      if (status.startsWith('ERROR')) break;
      await new Promise((r) => setTimeout(r, 4000));
    }
    if (!ok) {
      const finalStatus = await page.evaluate(() => document.querySelector('#status')?.textContent || '(sin #status)').catch(() => '(no leíble)');
      throw new Error(`no llegó a Listo. en 180s, estado final: ${finalStatus}`);
    }

    const result = await page.evaluate(async () => {
      const load = await window.needleReady;
      const queries = [
        { label: 'cosecha_es', query: 'registrá 3 kilos de tomate' },
        { label: 'plaga_es', query: 'qué biopreparado para la mosca blanca' },
      ];
      const calls = [];
      for (const item of queries) {
        const started = performance.now();
        const response = await window.needleF0_5.callWorker('run', item);
        calls.push({ ...item, resp: response.resp, callMs: response.callMs, firstResponseMs: performance.now() - started });
      }
      const warm = [];
      for (let index = 0; index < 3; index++) warm.push(await window.needleF0_5.callWorker('run', queries[1]));
      return {
        load,
        calls,
        warm: warm.map((w) => ({ callMs: w.callMs, confidence: w.resp?.confidence })),
        controlledBeforeReload: Boolean(navigator.serviceWorker.controller),
        userAgent: navigator.userAgent,
      };
    });

    console.error('[android result-online]', JSON.stringify(result, null, 2));

    // Offline real: cortar el túnel ADB (no context.setOffline() de CDP — deja la ruta
    // de red intacta para el SW) y recargar. Causa raíz de los 3 intentos previos que
    // fallaron: el SW cacheaba './index.html' sin query string pero la navegación real
    // trae '?run=<timestamp>' (cache-busting para no reusar pestaña vieja) — caches.match
    // sin ignoreSearch no hacía match y caía a fetch(), que fallaba sin red. Arreglado en
    // sw-v2.js (ignoreSearch: true). No era un bypass de CDP/Chromium al Service Worker.
    let offlineResult = { error: 'no medido' };
    try {
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 }).catch(() => {});
      adb('reverse', '--remove', `tcp:${port}`);
      await page.reload().catch((e) => console.error('[android reload]', e.message));
      const pollDeadline2 = Date.now() + 90000;
      let ok2 = false;
      while (Date.now() < pollDeadline2) {
        const status = await page.evaluate(() => document.querySelector('#status')?.textContent || '(sin #status)').catch((e) => `(evaluate error: ${e.message})`);
        console.error('[android poll offline]', new Date().toISOString(), status);
        if (status.startsWith('Listo.')) { ok2 = true; break; }
        if (status.startsWith('ERROR')) break;
        await new Promise((r) => setTimeout(r, 4000));
      }
      if (!ok2) throw new Error('no llegó a Listo. offline en 90s (SW no sirvió los assets sin red)');
      offlineResult = await page.evaluate(async () => {
        const load = await window.needleReady;
        const started = performance.now();
        const response = await window.needleF0_5.callWorker('run', { label: 'plaga_es_offline', query: 'qué biopreparado para la mosca blanca' });
        return {
          load,
          resp: response.resp,
          callMs: response.callMs,
          firstResponseMs: performance.now() - started,
          controlled: Boolean(navigator.serviceWorker.controller),
        };
      });
      adb('reverse', `tcp:${port}`, `tcp:${port}`);
    } catch (offlineError) {
      try { adb('reverse', `tcp:${port}`, `tcp:${port}`); } catch {}
      offlineResult = { error: offlineError.message || String(offlineError) };
    }

    console.log(JSON.stringify({ measurable: true, machineAlone, cdpVersion, result, offlineResult }, null, 2));
  } finally {
    if (browser?._connection?.close) browser._connection.close();
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    try { adb('forward', '--remove', 'tcp:9223'); } catch {}
    try { adb('reverse', '--remove', `tcp:${port}`); } catch {}
  }
}

run().catch((error) => { console.error(error.stack || error.message || String(error)); process.exitCode = 1; });
