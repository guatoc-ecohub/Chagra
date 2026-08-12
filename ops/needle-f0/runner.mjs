import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/demos/3d/_gate/herramientas/gate-pantalla.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const appRoot = here;
const weightsRoot = resolve(here, '../../_gate/needle-f0/weights');
const chromiumPath = process.env.CHROMIUM_PATH || '/home/kortux/.local/bin/chromium';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function chromiumCount() {
  try {
    return Number(execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim());
  } catch {
    return 0;
  }
}

async function serveFile(pathname, response) {
  const isWeight = pathname.startsWith('/weights/');
  const relative = decodeURIComponent(pathname.replace(/^\/(?:weights\/)?/, '')) || 'index.html';
  const base = isWeight ? weightsRoot : appRoot;
  const filePath = resolve(base, relative);
  if (!filePath.startsWith(`${base}/`) && filePath !== base) {
    response.writeHead(403);
    response.end('forbidden');
    return;
  }
  try {
    const info = await fs.stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
}

async function waitForServiceWorker(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  await page.reload({ waitUntil: 'networkidle' });
  return page.evaluate(() => Boolean(navigator.serviceWorker.controller));
}

async function run() {
  await exigirPantallaViva({ medirFps: false });
  const machineAlone = await esperarMaquinaSola({ maxEspera: 1000, umbral: 0 });
  const chromiumBefore = chromiumCount();
  const missing = [];
  for (const file of ['needle.safetensors', 'vocab.txt']) {
    try { await fs.access(join(weightsRoot, file)); } catch { missing.push(file); }
  }
  if (missing.length) throw new Error(`faltan pesos locales: ${missing.join(', ')}`);

  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    serveFile(normalize(url.pathname), response);
  });
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
    const load = await page.evaluate(() => new Promise((resolvePromise, reject) => {
      const started = performance.now();
      const timer = setInterval(() => {
        if (document.querySelector('#status')?.textContent.startsWith('Listo.')) {
          clearInterval(timer);
          resolvePromise({ browserWaitMs: performance.now() - started });
        }
        if (document.querySelector('#status')?.textContent.startsWith('ERROR')) {
          clearInterval(timer);
          reject(new Error(document.querySelector('#status').textContent));
        }
      }, 25);
    }));
    const controlled = await waitForServiceWorker(page);
    const queries = [
      { label: 'cosecha_es', query: 'registrá 3 kilos de tomate', toolSet: 'cosecha' },
      { label: 'plaga_es', query: 'qué biopreparado para la mosca blanca', toolSet: 'plaga' },
      { label: 'control_en', query: 'Book a flight from London to New York', toolSet: 'control' },
    ];
    const online = await page.evaluate(async (items) => {
      const values = [];
      for (const item of items) values.push(await window.needleF0.callWorker('run', item));
      const warm = [];
      for (let index = 0; index < 3; index++) {
        warm.push(await window.needleF0.callWorker('run', { query: items[0].query, toolSet: items[0].toolSet }));
      }
      return { values, warm };
    }, queries);

    await context.setOffline(true);
    const offlineReload = await page.reload({ waitUntil: 'load' }).then(() => true).catch(() => false);
    const offline = offlineReload ? await page.evaluate(async () => ({
      controlled: Boolean(navigator.serviceWorker.controller),
      value: await window.needleF0.callWorker('run', {
        query: 'qué biopreparado para la mosca blanca',
        toolSet: 'plaga',
      }),
    })).catch((error) => ({ error: error.message })) : { error: 'reload offline falló' };

    const result = {
      harness: 'needle-rs@0.1.0',
      browser: chromiumPath,
      browserWaitMs: load.browserWaitMs,
      machineAlone,
      chromiumBefore,
      serviceWorkerControlledAfterReload: controlled,
      online,
      offline,
      pageErrors,
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
