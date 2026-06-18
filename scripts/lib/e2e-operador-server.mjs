/**
 * e2e-operador-server.mjs — servidor estático + proxy para la prueba E2E
 * FAITHFUL del operador.
 *
 * POR QUÉ EXISTE: la prueba debe correr el bundle de producción contra el
 * backend farmOS REAL, pero el nginx de producción solo permite CORS desde
 * `https://chagra.guatoc.co`. Si Playwright cargara el preview desde
 * `http://localhost:PORT`, cada fetch del navegador a farmOS quedaría
 * bloqueado por CORS. Solución (idéntica en espíritu al nginx de prod): servir
 * el `dist/` en localhost Y proxyear las rutas de backend (`/oauth`, `/api`,
 * `/csrf`, `/session`, `/sites`) a `https://chagra.guatoc.co`. Así TODO el
 * tráfico navegador↔backend es same-origin (localhost) → sin CORS, con datos
 * reales. El build se hace con `VITE_FARMOS_URL=""` y el `dist/
 * fincas-publicas.json` se parchea a `farmos_endpoint:""` para que las llamadas
 * a la API también salgan relativas (ver el script orquestador).
 *
 * Sin dependencias externas: solo `node:http`/`node:https`/`node:fs`. Arranca
 * en el puerto indicado y se cierra con SIGTERM/SIGINT.
 *
 * Uso:
 *   node scripts/lib/e2e-operador-server.mjs <distDir> <port> <upstreamOrigin>
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

import http from 'node:http';
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { URL } from 'node:url';

const DIST_DIR = process.argv[2];
const PORT = parseInt(process.argv[3] || '4188', 10);
const UPSTREAM = process.argv[4] || 'https://chagra.guatoc.co';

if (!DIST_DIR) {
  console.error('Uso: node e2e-operador-server.mjs <distDir> <port> <upstreamOrigin>');
  process.exit(2);
}

const upstreamUrl = new URL(UPSTREAM);

// Rutas que se proxyean al backend farmOS (todo lo demás es estático del dist).
const PROXY_PREFIXES = ['/oauth', '/api', '/csrf', '/session', '/sites', '/user', '/login', '/jsonapi'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.sqlite': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

function isProxied(pathname) {
  return PROXY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function proxyToUpstream(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    // Reescribir host/origin/referer al upstream para que el backend lo trate
    // como una petición legítima desde chagra.guatoc.co (mismo flujo que prod).
    headers.host = upstreamUrl.host;
    if (headers.origin) headers.origin = UPSTREAM;
    if (headers.referer) headers.referer = UPSTREAM + '/';
    delete headers['accept-encoding']; // evitar lidiar con gzip al reenviar

    const options = {
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || 443,
      path: req.url,
      method: req.method,
      headers,
    };

    const upReq = https.request(options, (upRes) => {
      // No reenviar CORS del upstream (el navegador habla con localhost, mismo
      // origen): lo dejamos pasar igual, es inocuo same-origin.
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    });
    upReq.on('error', (err) => {
      console.error('[proxy] error upstream:', err.message);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Bad gateway (upstream farmOS)');
    });
    if (body.length) upReq.write(body);
    upReq.end();
  });
}

async function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }

  // Normalizar y prevenir path traversal.
  let filePath = normalize(join(DIST_DIR, pathname));
  if (!filePath.startsWith(normalize(DIST_DIR))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    // SPA fallback: rutas hash (#login, #dashboard) sirven index.html.
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] || 'application/octet-stream';
    // El SW y el index NO se cachean (queremos siempre el build recién hecho).
    const noCache = /(\bsw\.js$|index\.html$)/.test(filePath);
    res.writeHead(200, {
      'content-type': mime,
      'cache-control': noCache ? 'no-store' : 'public, max-age=60',
    });
    res.end(data);
  } catch (err) {
    console.error('[static] error:', err.message);
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  const pathname = (() => {
    try {
      return new URL(req.url, `http://localhost:${PORT}`).pathname;
    } catch {
      return req.url;
    }
  })();

  if (isProxied(pathname)) {
    proxyToUpstream(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-server] dist=${DIST_DIR} en http://127.0.0.1:${PORT} (proxy → ${UPSTREAM})`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
