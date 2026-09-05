#!/usr/bin/env node
/**
 * marco-proxy.mjs — reproduce el marco de PRODUCCIÓN del mundo `el-tiempo`
 * (3d.guatoc.co) apuntando al dev server de la PWA, SIN escribir un byte en
 * ~/demos/3d: lee marco.js/marco.css/guias-arte.js/el-tiempo/index.html de
 * producción (solo lectura) y proxya todo lo demás (/app/, /src/, /@vite/…)
 * al vite del worktree. Así el iframe `/app/#/mockups/clima-atmosfera` del
 * marco real monta la pantalla nueva (CA-11) sin tocar producción.
 *
 * Uso: node marco-proxy.mjs --port 5211 --vite http://localhost:5210
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const PORT = Number(opt('--port', '5211'));
const VITE = new URL(opt('--vite', 'http://localhost:5210'));
const PROD = '/home/kortux/demos/3d';
const ESTATICOS = { '/marco.js': 'text/javascript', '/marco.css': 'text/css', '/assets/guias-arte.js': 'text/javascript', '/el-tiempo/': 'text/html', '/el-tiempo/index.html': 'text/html' };

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (ESTATICOS[p]) {
    const f = path.join(PROD, p.endsWith('/') ? `${p}index.html` : p);
    fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'content-type': `${ESTATICOS[p]}; charset=utf-8` }); res.end(data); });
    return;
  }
  // todo lo demás → vite (el /app/ de prod es la raíz del dev server: SPA fallback)
  const destino = p.startsWith('/app/') ? p.replace(/^\/app\//, '/') : p;
  const proxyReq = http.request({ hostname: VITE.hostname, port: VITE.port, path: destino + url.search, method: req.method, headers: { ...req.headers, host: VITE.host } }, (pr) => {
    res.writeHead(pr.statusCode || 502, pr.headers); pr.pipe(res);
  });
  proxyReq.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(proxyReq);
}).listen(PORT, () => console.log(`[marco-proxy] http://localhost:${PORT}/el-tiempo/ → marco de prod (solo lectura) + vite ${VITE.href}`));
