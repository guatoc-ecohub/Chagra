/**
 * sw-offline-precache.test.js — contrato OFFLINE-FIRST del Service Worker.
 *
 * Regresión del bug offline-first 2026-06-13: el SW hacía PASSTHROUGH puro de
 * `/assets/*` (return; sin cachear). Resultado: una recarga OFFLINE en frío no
 * podía bootear React porque los chunks `/assets/index-*.js` daban
 * ERR_INTERNET_DISCONNECTED → pantalla en blanco. La PWA no era offline-first.
 *
 * Este test carga el código real de `public/sw.js` en un entorno con
 * `self`/`caches`/`fetch` simulados, dispara los eventos `install` y `fetch`, y
 * verifica el CONTRATO:
 *   1. install precachea el shell + parsea index.html y precachea el bundle de
 *      arranque (`/assets/*.js`).
 *   2. `/assets/*` se sirve CACHE-FIRST (desde cache, sin tocar red, offline).
 *   3. estando offline y SIN cache, un `/assets/*` devuelve 504 explícito (no
 *      cuelga el browser con ERR_INTERNET_DISCONNECTED silencioso).
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.resolve(__dirnameLocal, '../../public/sw.js');

// --- Fake Cache / CacheStorage ---------------------------------------------
// `fetchImpl` se inyecta para que cache.add() use la MISMA red simulada que el
// SW (no la fetch real de jsdom).
function makeFakeCaches(getFetch) {
  const stores = new Map(); // name -> Map<pathname, Response-like>
  const keyOf = (req) => (typeof req === 'string' ? req : req.url);
  const pathOf = (req) => new URL(keyOf(req), 'https://chagra.guatoc.co').pathname;
  const cacheApi = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      async add(req) {
        const url = keyOf(req);
        const res = await getFetch()(url);
        if (res && res.ok) m.set(pathOf(url), { ok: true, status: 200, url, clone() { return this; } });
      },
      async addAll(reqs) { for (const r of reqs) await this.add(r); },
      async put(req, res) { m.set(pathOf(req), res || { ok: true, status: 200, clone() { return this; } }); },
      async match(req) { return m.get(pathOf(req)) || undefined; },
      async keys() { return Array.from(m.keys()).map((p) => ({ url: 'https://chagra.guatoc.co' + p })); },
    };
  };
  return {
    _stores: stores,
    async open(name) { return cacheApi(name); },
    async keys() { return Array.from(stores.keys()); },
    async delete(name) { return stores.delete(name); },
    async match(req) {
      for (const name of stores.keys()) {
        const hit = await cacheApi(name).match(req);
        if (hit) return hit;
      }
      return undefined;
    },
  };
}

// Carga sw.js dentro de un sandbox con globals controlados.
function loadSW({ online = true, indexHtml, assetExists = () => true } = {}) {
  const listeners = {};
  let fetchImpl; // declarado antes para que makeFakeCaches lo use por closure.
  const fakeCaches = makeFakeCaches(() => fetchImpl);

  fetchImpl = vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    const pathname = new URL(url, 'https://x').pathname;
    if (!online) {
      // offline: la red falla, salvo lo que ya esté en cache (lo maneja el SW).
      throw new TypeError('Failed to fetch');
    }
    if (pathname === '/index.html') {
      return { ok: true, status: 200, async text() { return indexHtml; }, clone() { return this; } };
    }
    const exists = assetExists(pathname);
    return { ok: exists, status: exists ? 200 : 404, url, clone() { return { ok: exists, status: this.status, url }; } };
  });

  const self = {
    location: { origin: 'https://chagra.guatoc.co' },
    addEventListener: (type, cb) => { listeners[type] = cb; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}), matchAll: vi.fn(async () => []) },
    registration: {},
  };

  const sandbox = {
    self,
    caches: fakeCaches,
    fetch: fetchImpl,
    Response: class FakeResponse {
      constructor(body, init = {}) { this.body = body; this.status = init.status || 200; this.statusText = init.statusText || ''; this.ok = this.status >= 200 && this.status < 300; }
    },
    URL,
    indexedDB: { open: () => ({}) },
    Promise,
    setTimeout,
    Date,
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(SW_PATH, 'utf8');
  vm.runInContext(code, sandbox);

  return { listeners, fakeCaches, fetchImpl, self };
}

// Helper para disparar un evento con waitUntil/respondWith capturados.
function fireEvent(cb, request) {
  let waited = null;
  let responded = null;
  const event = {
    request,
    waitUntil: (p) => { waited = p; },
    respondWith: (p) => { responded = p; },
  };
  cb(event);
  return { waited, responded };
}

const SAMPLE_INDEX = `<!doctype html><html><head>
  <link rel="modulepreload" href="/assets/vendor-react-B9O1K3VS.js">
  <link rel="stylesheet" href="/assets/index-abc123.css">
</head><body><div id="root"></div>
  <script type="module" src="/assets/index-4wTCb2Bn.js"></script>
</body></html>`;

describe('SW offline-first precache (regresión 2026-06-13)', () => {
  it('install precachea el shell Y el bundle de arranque (/assets/*) parseando index.html', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    expect(typeof listeners.install).toBe('function');
    const { waited } = fireEvent(listeners.install, {});
    await waited;

    // Hubo algún cache poblado.
    const names = await fakeCaches.keys();
    expect(names.length).toBeGreaterThan(0);
    const cache = await fakeCaches.open(names[0]);
    const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);

    // Shell.
    expect(keys).toContain('/index.html');
    // Bundle de arranque descubierto en index.html.
    expect(keys).toContain('/assets/index-4wTCb2Bn.js');
    expect(keys).toContain('/assets/vendor-react-B9O1K3VS.js');
    expect(keys).toContain('/assets/index-abc123.css');
  });

  it('/assets/* se sirve CACHE-FIRST (desde cache, sin red) cuando ya está cacheado', async () => {
    const { listeners, fetchImpl } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    await fireEvent(listeners.install, {}).waited;

    fetchImpl.mockClear();
    const req = { url: 'https://chagra.guatoc.co/assets/index-4wTCb2Bn.js', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.ok).toBe(true);
    // No debió ir a la red: el chunk estaba en cache.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('offline + /assets/* NO cacheado → 504 explícito (no cuelga, no ERR silencioso)', async () => {
    // Cargamos el SW offline y sin haber precacheado nada.
    const { listeners } = loadSW({ online: false, indexHtml: SAMPLE_INDEX });
    const req = { url: 'https://chagra.guatoc.co/assets/chunk-no-existe.js', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.status).toBe(504);
  });
});
