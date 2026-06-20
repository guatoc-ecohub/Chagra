/**
 * sw-self-heal-version.test.js — Contrato RUNTIME del SW para el self-heal por
 * versión y la robustez de navegación (prod-down "failed to fetch" 2026-06-18).
 *
 * Verifica, cargando el sw.js REAL en sandbox vm:
 *   1. /version.json → NETWORK-ONLY: se pide con cache:'no-store' y NUNCA se
 *      cachea (si se cacheara, el cliente stale jamás detectaría el desfase).
 *   2. /version.json offline → 504 sintético (el self-heal lo trata como no-op).
 *   3. Navegación (request.mode==='navigate') online OK → sirve y cachea shell.
 *   4. Navegación con respuesta 5xx del origen → NO pinta pantalla rota: cae al
 *      shell cacheado.
 *   5. Navegación offline → cae al index.html cacheado (SPA arranca).
 *   6. Navegación offline SIN shell cacheado → 503 con mensaje, NUNCA "failed to
 *      fetch" sin respuesta.
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
      async delete(req) { return m.delete(pathOf(req)); },
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

function loadSW({ online = true, indexHtml = SAMPLE_INDEX, navStatus = 200, versionBody = '{"sha":"deadbee"}' } = {}) {
  const listeners = {};
  let fetchImpl;
  const fakeCaches = makeFakeCaches(() => fetchImpl);
  // Estado mutable durante el test (simular que el origen empieza a dar 5xx /
  // cae la red en la misma instancia de SW, reusando el cache ya sembrado).
  const state = { online, navStatus };

  fetchImpl = vi.fn(async (input) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    const url = new URL(urlStr, 'https://chagra.guatoc.co');
    const pathname = url.pathname;
    if (!state.online) throw new TypeError('Failed to fetch');
    if (pathname === '/version.json') {
      return { ok: true, status: 200, json: async () => JSON.parse(versionBody), text: async () => versionBody, clone() { return this; } };
    }
    if (pathname === '/index.html' || pathname === '/') {
      return {
        ok: state.navStatus >= 200 && state.navStatus < 300,
        status: state.navStatus,
        async text() { return indexHtml; },
        clone() { return this; },
      };
    }
    return { ok: true, status: 200, url: urlStr, clone() { return { ok: true, status: 200, url: urlStr }; } };
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
      constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || '';
        this.headers = init.headers || {};
        this.ok = this.status >= 200 && this.status < 300;
      }
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

  return { listeners, fakeCaches, fetchImpl, self, state };
}

function fireEvent(cb, request) {
  let responded = null;
  let waited = null;
  cb({ request, waitUntil: (p) => { waited = p; }, respondWith: (p) => { responded = p; } });
  return { responded, waited };
}

const SAMPLE_INDEX = '<!doctype html><html><head>' +
  '<script type="module" src="/assets/index-4wTCb2Bn.js"></script>' +
  '</head><body><div id="root"></div></body></html>';

describe('SW /version.json — network-only', () => {
  it('pide /version.json con cache:no-store', async () => {
    const { listeners, fetchImpl } = loadSW({ online: true });
    fetchImpl.mockClear();
    const req = { url: 'https://chagra.guatoc.co/version.json', method: 'GET' };
    const { responded } = fireEvent(listeners.fetch, req);
    await responded;
    const call = fetchImpl.mock.calls.find((c) => {
      const u = typeof c[0] === 'string' ? c[0] : c[0].url;
      return u.includes('/version.json');
    });
    expect(call).toBeTruthy();
    expect(call[1]).toMatchObject({ cache: 'no-store' });
  });

  it('NUNCA cachea /version.json (clave del self-heal)', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true });
    const req = { url: 'https://chagra.guatoc.co/version.json', method: 'GET' };
    await fireEvent(listeners.fetch, req).responded;
    const hit = await fakeCaches.match({ url: 'https://chagra.guatoc.co/version.json' });
    expect(hit).toBeUndefined();
  });

  it('offline → 504 sintético (self-heal no-op, no cuelga)', async () => {
    const { listeners } = loadSW({ online: false });
    const req = { url: 'https://chagra.guatoc.co/version.json', method: 'GET' };
    const res = await fireEvent(listeners.fetch, req).responded;
    expect(res.status).toBe(504);
  });
});

describe('SW lifecycle update reliability', () => {
  it('install llama skipWaiting para activar el SW nuevo sin esperar al cierre de pestañas', async () => {
    const { listeners, self } = loadSW({ online: true });
    await fireEvent(listeners.install, {}).waited;
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('activate purga caches de bundles viejos y conserva buckets offline durables', async () => {
    const { listeners, fakeCaches, self } = loadSW({ online: true });
    await (await fakeCaches.open('chagra-oldsha')).put('/old.js', { ok: true, status: 200 });
    await (await fakeCaches.open('random-old-cache')).put('/x', { ok: true, status: 200 });
    await (await fakeCaches.open('chagra-dev')).put('/index.html', { ok: true, status: 200 });
    await (await fakeCaches.open('chagra-rag-grounding-v1')).put('/rag-embeddings.json', { ok: true, status: 200 });
    await (await fakeCaches.open('chagra-map-tiles-v1')).put('/10/1/1.png', { ok: true, status: 200 });
    await (await fakeCaches.open('chagra-species-images-v1')).put('/species.jpg', { ok: true, status: 200 });

    await fireEvent(listeners.activate, {}).waited;

    const names = await fakeCaches.keys();
    expect(names).toContain('chagra-dev');
    expect(names).toContain('chagra-rag-grounding-v1');
    expect(names).toContain('chagra-map-tiles-v1');
    expect(names).toContain('chagra-species-images-v1');
    expect(names).not.toContain('chagra-oldsha');
    expect(names).not.toContain('random-old-cache');
    expect(self.clients.claim).toHaveBeenCalledTimes(1);
  });
});

describe('SW navegación — never "failed to fetch"', () => {
  it('navegación online OK → sirve y cachea el shell', async () => {
    const { listeners, fakeCaches } = loadSW({ online: true, navStatus: 200 });
    const req = { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' };
    const res = await fireEvent(listeners.fetch, req).responded;
    expect(res.ok).toBe(true);
    const shell = await fakeCaches.match({ url: 'https://chagra.guatoc.co/index.html' });
    expect(shell).toBeTruthy();
  });

  it('navegación con 502 del origen → cae al shell cacheado (no pantalla rota)', async () => {
    const { listeners, state } = loadSW({ online: true, navStatus: 200 });
    // 1) Sembrar el shell en cache con una navegación OK.
    const ok = await fireEvent(listeners.fetch, { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' }).responded;
    expect(ok.ok).toBe(true);
    // 2) El origen empieza a dar 502 (cloudflared/Drupal caído).
    state.navStatus = 502;
    const res = await fireEvent(listeners.fetch, { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' }).responded;
    // No debe propagar el 502: cae al shell cacheado (status 200).
    expect(res).toBeTruthy();
    expect(res.status).toBe(200);
  });

  it('navegación offline con shell cacheado → sirve el shell', async () => {
    const { listeners, state } = loadSW({ online: true, navStatus: 200 });
    // Sembrar shell online.
    await fireEvent(listeners.fetch, { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' }).responded;
    // Ahora la red cae: el index ya está cacheado → fallback lo sirve.
    state.online = false;
    const res = await fireEvent(listeners.fetch, { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' }).responded;
    expect(res).toBeTruthy();
    expect(res.ok).toBe(true);
  });

  it('navegación offline SIN shell → 503 con mensaje, nunca sin respuesta', async () => {
    const { listeners } = loadSW({ online: false });
    const req = { url: 'https://chagra.guatoc.co/', method: 'GET', mode: 'navigate' };
    const res = await fireEvent(listeners.fetch, req).responded;
    expect(res).toBeTruthy();
    expect(res.status).toBe(503);
  });
});
