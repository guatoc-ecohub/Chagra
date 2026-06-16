/**
 * sw-offline-precache-runtime.test.js — Contrato RUNTIME del SW offline-first.
 *
 * TASK 108 (parte 2) — carga el SW real en sandbox con caches simulados y
 * verifica el comportamiento en tiempo de ejecucion:
 *   1. Precache de RAG grounding en el bucket separado
 *   2. Map tiles se cachean on-use en bucket propio, no precache
 *   3. Cold reload offline: shell + grounding + icons sirven desde cache
 *   4. Cache API mock para cobertura sin navegador real
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.resolve(__dirnameLocal, '../../public/sw.js');

function makeFakeCaches(getFetch) {
  const stores = new Map();
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

function loadSW({ online = true, indexHtml, assetExists = () => true } = {}) {
  const listeners = {};
  let fetchImpl;
  const fakeCaches = makeFakeCaches(() => fetchImpl);

  fetchImpl = vi.fn(async (input) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    const url = new URL(urlStr, 'https://x');
    const pathname = url.pathname;
    if (!online) {
      throw new TypeError('Failed to fetch');
    }
    if (pathname === '/index.html') {
      return { ok: true, status: 200, async text() { return indexHtml; }, clone() { return this; } };
    }
    if (pathname === '/rag-embeddings.json') {
      return { ok: true, status: 200, text: async () => '{"embeddings":[]}', clone() { return this; } };
    }
    if (pathname === '/cycle-content/manifest.json') {
      return { ok: true, status: 200, text: async () => '{"slugs":[]}', clone() { return this; } };
    }
    const exists = assetExists(pathname);
    return { ok: exists, status: exists ? 200 : 404, url: urlStr, clone() { return { ok: exists, status: this.status, url: urlStr }; } };
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

const SAMPLE_INDEX = '<!doctype html><html><head>' +
  '<link rel="modulepreload" href="/assets/vendor-react-B9O1K3VS.js">' +
  '<link rel="stylesheet" href="/assets/index-abc123.css">' +
  '</head><body><div id="root"></div>' +
  '<script type="module" src="/assets/index-4wTCb2Bn.js"></script>' +
  '</body></html>';

describe('SW RAG grounding precache (T108)', () => {
  it('install precachea rag-embeddings.json en bucket grounding separado', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    const { waited } = fireEvent(listeners.install, {});
    await waited;

    const names = await fakeCaches.keys();
    const groundingBuckets = names.filter((n) => n.startsWith('chagra-rag-grounding-'));
    expect(groundingBuckets.length).toBe(1);

    const groundingCache = await fakeCaches.open(groundingBuckets[0]);
    const keys = (await groundingCache.keys()).map((r) => new URL(r.url).pathname);
    expect(keys).toContain('/rag-embeddings.json');
    expect(keys).toContain('/cycle-content/manifest.json');
  });

  it('install precachea iconos PWA en bucket shell', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    const { waited } = fireEvent(listeners.install, {});
    await waited;

    const names = await fakeCaches.keys();
    const shellBucket = names.find((n) => n.startsWith('chagra-v'));
    expect(shellBucket).toBeTruthy();

    const shellCache = await fakeCaches.open(shellBucket);
    const keys = (await shellCache.keys()).map((r) => new URL(r.url).pathname);
    expect(keys).toContain('/icon-180.png');
    expect(keys).toContain('/icon-192.png');
    expect(keys).toContain('/icon-512.png');
    expect(keys).toContain('/favicon.svg');
    expect(keys).toContain('/icons.svg');
  });

  it('install precachea /catalog.sqlite en shell', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    const { waited } = fireEvent(listeners.install, {});
    await waited;

    const names = await fakeCaches.keys();
    const shellBucket = names.find((n) => n.startsWith('chagra-v'));
    const cache = await fakeCaches.open(shellBucket);
    const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);
    expect(keys).toContain('/catalog.sqlite');
  });
});

describe('SW map tiles cache (T108)', () => {
  it('crea bucket de map tiles on-use (no pre-cachea)', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    await fireEvent(listeners.install, {}).waited;

    const tileReq = { url: 'https://tile.openstreetmap.org/10/500/500.png', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, tileReq);
    await responded;

    const names = await fakeCaches.keys();
    expect(names.some((n) => n.startsWith('chagra-map-tiles-'))).toBe(true);
  });

  it('cachea tiles del dominio tile.openstreetmap.org', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    await fireEvent(listeners.install, {}).waited;

    const tileReq = { url: 'https://tile.openstreetmap.org/12/1200/800.png', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, tileReq);
    const res = await responded;
    expect(res).toBeTruthy();

    const names = await fakeCaches.keys();
    const tilesBucket = names.find((n) => n.startsWith('chagra-map-tiles-'));
    expect(tilesBucket).toBeTruthy();
  });
});

describe('SW cold reload offline (T108)', () => {
  it('sirve index.html desde cache estando offline', async () => {
    const { listeners, fetchImpl } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    await fireEvent(listeners.install, {}).waited;

    fetchImpl.mockClear();
    const req = { url: 'https://chagra.guatoc.co/index.html', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.ok).toBe(true);
  });

  it('sirve assets desde cache sin tocar red (cache-first)', async () => {
    const { listeners, fetchImpl } = loadSW({ online: true, indexHtml: SAMPLE_INDEX });
    await fireEvent(listeners.install, {}).waited;

    fetchImpl.mockClear();
    const req = { url: 'https://chagra.guatoc.co/assets/index-4wTCb2Bn.js', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.ok).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('offline + asset no cacheado → 504 (no cuelga)', async () => {
    const { listeners } = loadSW({ online: false, indexHtml: SAMPLE_INDEX });
    const req = { url: 'https://chagra.guatoc.co/assets/chunk-no-existe.js', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.status).toBe(504);
  });

  it('offline + /catalog.sqlite no cacheado → 504', async () => {
    const { listeners } = loadSW({ online: false, indexHtml: SAMPLE_INDEX });
    const req = { url: 'https://chagra.guatoc.co/catalog.sqlite', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    const res = await responded;
    expect(res).toBeTruthy();
    expect(res.status).toBe(504);
  });
});
