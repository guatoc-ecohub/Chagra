// Sanity check de escritorio del harness F0.5 (WASM oficial v2) antes de ir al Pixel.
// Sirve ops/needle-f05/browser/ (repo aparte, fuera de chagra/) por HTTP y corre
// Chromium headless para confirmar que carga y responde antes de gastar ciclos de ADB.
import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = '/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/browser';
const weightsRoot = '/home/kortux/Workspace/chagra-needle-f05/ops/needle-f05/models';
const port = 4179;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.cact': 'application/octet-stream' };

async function serve(pathname, response) {
  const isWeight = pathname.startsWith('/weights/');
  const relative = decodeURIComponent(pathname.replace(/^\/(?:weights\/)?/, '')) || 'index.html';
  const base = isWeight ? weightsRoot : root;
  const filePath = resolve(base, relative);
  if (!filePath.startsWith(`${base}/`) && filePath !== base) { response.writeHead(403); response.end(); return; }
  try {
    const info = await fs.stat(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
}

async function run() {
  const server = createServer((request, response) => serve(new URL(request.url, 'http://127.0.0.1').pathname, response));
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/home/kortux/.local/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', (msg) => console.error('[console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));
    const cactQuery = process.env.NEEDLE_CACT || 'needle2.cact';
    await page.goto(`http://127.0.0.1:${port}/index.html?cact=${cactQuery}`);
    await page.waitForFunction(() => window.needleReady, null, { timeout: 30000 });
    const result = await page.evaluate(async () => {
      const load = await window.needleReady;
      const queries = [
        { label: 'cosecha_es', query: 'registrá 3 kilos de tomate' },
        { label: 'plaga_es', query: 'qué biopreparado para la mosca blanca' },
      ];
      const calls = [];
      for (const item of queries) {
        const response = await window.needleF0_5.callWorker('run', { query: item.query });
        calls.push({ label: item.label, query: item.query, resp: response.resp, callMs: response.callMs });
      }
      return { load, calls };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}

run().catch((error) => { console.error(error.stack || error.message || String(error)); process.exitCode = 1; });
