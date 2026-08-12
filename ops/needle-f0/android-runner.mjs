import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/demos/3d/_gate/herramientas/gate-pantalla.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const weightsRoot = resolve(here, '../../_gate/needle-f0/weights');
const port = 4178;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };

function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function serve(pathname, response) {
  const isWeight = pathname.startsWith('/weights/');
  const relative = decodeURIComponent(pathname.replace(/^\/(?:weights\/)?/, '')) || 'index.html';
  const base = isWeight ? weightsRoot : here;
  const filePath = resolve(base, relative);
  if (!filePath.startsWith(`${base}/`)) { response.writeHead(403); response.end(); return; }
  try {
    const info = await fs.stat(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(response);
  } catch { response.writeHead(404); response.end('not found'); }
}

async function waitForCdp() {
  const endpoint = 'http://127.0.0.1:9222/json/version';
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  return null;
}

async function run() {
  await exigirPantallaViva({ medirFps: false });
  const machineAlone = await esperarMaquinaSola({ maxEspera: 1000, umbral: 0 });
  const server = createServer((request, response) => serve(new URL(request.url, 'http://127.0.0.1').pathname, response));
  await new Promise((resolvePromise) => server.listen(port, '127.0.0.1', resolvePromise));
  let browser;
  try {
    adb('reverse', `tcp:${port}`, `tcp:${port}`);
    adb('forward', 'tcp:9222', 'localabstract:chrome_devtools_remote');
    adb('shell', 'am', 'start', '-n', 'com.android.chrome/com.google.android.apps.chrome.Main', '-a', 'android.intent.action.VIEW', '-d', `http://127.0.0.1:${port}/index.html`);
    const cdpVersion = await waitForCdp();
    if (!cdpVersion) {
      console.log(JSON.stringify({ measurable: false, reason: 'Chrome Android no expuso CDP por adb en 20 s', machineAlone, device: adb('shell', 'getprop', 'ro.product.model') }, null, 2));
      return;
    }
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const deadline = Date.now() + 20000;
    let page;
    while (!page && Date.now() < deadline) {
      page = context.pages().find((candidate) => candidate.url().includes(`127.0.0.1:${port}`));
      if (!page) await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
    if (!page) throw new Error('La pestaña Android no apareció en CDP');
    await page.waitForFunction(() => window.needleReady && document.querySelector('#status')?.textContent.startsWith('Listo.'), null, { timeout: 30000 });
    const result = await page.evaluate(async () => {
      const load = await window.needleReady;
      const queries = [
        { label: 'cosecha_es', query: 'registrá 3 kilos de tomate', toolSet: 'cosecha' },
        { label: 'plaga_es', query: 'qué biopreparado para la mosca blanca', toolSet: 'plaga' },
      ];
      const calls = [];
      for (const item of queries) {
        const started = performance.now();
        const response = await window.needleF0.callWorker('run', item);
        calls.push({ ...item, ...response, firstResponseMs: performance.now() - started });
      }
      const warm = [];
      for (let index = 0; index < 3; index++) warm.push(await window.needleF0.callWorker('run', queries[1]));
      return { load, calls, warm, controlled: Boolean(navigator.serviceWorker.controller), userAgent: navigator.userAgent };
    });
    console.log(JSON.stringify({ measurable: true, machineAlone, cdpVersion, result }, null, 2));
  } finally {
    if (browser?._connection?.close) browser._connection.close();
    server.closeAllConnections?.();
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

run().catch((error) => { console.error(error.stack || error.message || String(error)); process.exitCode = 1; });
