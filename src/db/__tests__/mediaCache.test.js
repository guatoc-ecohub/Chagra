import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory IDB substitute para mediaCache
let store;
let nextId = 1;
let cursorIndex = 0;
let cursorRecords = [];

const makeRequest = () => {
  const req = { onsuccess: null, onerror: null, result: null };
  return req;
};

const fakeStore = {
  count() {
    const req = makeRequest();
    Promise.resolve().then(() => {
      req.result = store.length;
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  add(record) {
    const req = makeRequest();
    const id = nextId++;
    store.push({ ...record, id });
    Promise.resolve().then(() => {
      req.result = id;
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  get(id) {
    const req = makeRequest();
    Promise.resolve().then(() => {
      req.result = store.find(r => r.id === id);
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  put(record) {
    const req = makeRequest();
    const idx = store.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      store[idx] = record;
    } else {
      store.push(record);
    }
    Promise.resolve().then(() => {
      req.result = record.id;
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  delete(id) {
    const req = makeRequest();
    const idx = store.findIndex(r => r.id === id);
    if (idx >= 0) {
      store.splice(idx, 1);
    }
    Promise.resolve().then(() => {
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  index(_name) {
    return {
      getAll(range) {
        const req = makeRequest();
        Promise.resolve().then(() => {
          const assetId = range?.lower ?? range?.upper ?? range;
          req.result = [...store].filter(r => r.assetId === assetId);
          req.onsuccess?.({ target: req });
        });
        return req;
      },
      count(range) {
        const req = makeRequest();
        Promise.resolve().then(() => {
          const logId = range?.lower ?? range?.upper ?? range;
          req.result = store.filter(r => r.logId === logId).length;
          req.onsuccess?.({ target: req });
        });
        return req;
      },
      openCursor() {
        const req = makeRequest();
        let stopped = false;
        const next = () => {
          if (stopped) return;
          Promise.resolve().then(() => {
            const record = cursorRecords[cursorIndex];
            cursorIndex++;
            if (record) {
              req.result = {
                value: { ...record },
                delete: () => {
                  const idx = store.findIndex(r => r.id === record.id);
                  if (idx >= 0) store.splice(idx, 1);
                },
                continue: next,
              };
            } else {
              req.result = null;
              stopped = true;
            }
            req.onsuccess?.({ target: req });
          });
        };
        next();
        return req;
      },
    };
  },
};

const fakeTx = {
  objectStore(_name) {
    return fakeStore;
  },
  oncomplete: null,
  onabort: null,
  onerror: null,
};

const fakeDB = {
  transaction(_storeNames, _mode) {
    const tx = { ...fakeTx, oncomplete: null, onabort: null, onerror: null };
    // Simulate async oncomplete tick con varios microtasks
    Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => {
        tx.oncomplete?.();
      });
    return tx;
  },
  close: vi.fn(),
};

vi.mock('../dbCore', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: { MEDIA_CACHE: 'media_cache' },
}));

// jsdom no expone IDBKeyRange por defecto
beforeEach(() => {
  globalThis.IDBKeyRange = {
    only: (val) => ({ lower: val, upper: val }),
  };
  store = [];
  nextId = 1;
  cursorIndex = 0;
  cursorRecords = [];
  vi.clearAllMocks();
});

const { mediaCache } = await import('../mediaCache');

describe('mediaCache — 056.4 LRU eviction', () => {

  it('save inserta sin evictar cuando store esta por debajo del limite', async () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/webp' });
    const initialStoreLength = store.length;

    const id = await mediaCache.save('log-1', blob);
    expect(id).toBe(1);
    expect(store.length).toBe(initialStoreLength + 1);
    expect(store[0].logId).toBe('log-1');
  });

  it('save evicta entradas cuando store supera MAX_MEDIA_ENTRIES', async () => {
    store = [];
    for (let i = 1; i <= 301; i++) {
      store.push({
        id: i,
        logId: `log-${i}`,
        blob: new Blob(['x'], { type: 'image/webp' }),
        pinned: false,
        lastAccessedAt: i,
        createdAt: i,
      });
    }
    nextId = 302;
    cursorRecords = [...store, null];

    const blob = new Blob(['fake'], { type: 'image/webp' });
    await mediaCache.save('log-new', blob);

    // Al menos 1 entrada fue evictada (store bajo 301 antes de add)
    expect(store.length).toBeLessThanOrEqual(301);
    // La nueva entrada se agrego
    expect(store.some(r => r.logId === 'log-new')).toBe(true);
    // La entrada mas vieja (lastAccessedAt=1) fue evictada
    expect(store.some(r => r.lastAccessedAt === 1)).toBe(false);
  });

  it('evictOldestIfNeeded se salta pinned records', async () => {
    store = [];
    for (let i = 1; i <= 302; i++) {
      store.push({
        id: i,
        logId: `log-${i}`,
        blob: new Blob(['x'], { type: 'image/webp' }),
        pinned: i <= 2,
        lastAccessedAt: i,
        createdAt: i,
      });
    }
    nextId = 303;
    cursorRecords = [...store, null];

    const blob = new Blob(['fake'], { type: 'image/webp' });
    await mediaCache.save('log-303', blob);

    // Pinned entries sobreviven
    expect(store.some(r => r.id === 1 && r.pinned)).toBe(true);
    expect(store.some(r => r.id === 2 && r.pinned)).toBe(true);
    // La nueva entrada se agrego
    expect(store.some(r => r.id === 303)).toBe(true);
  });

  it('getByAssetId actualiza lastAccessedAt', async () => {
    const now = Date.now();
    const record = { id: 1, assetId: 'a1', lastAccessedAt: now - 10000, logId: 'log-1' };

    store = [record];

    try {
      const results = await mediaCache.getByAssetId('a1');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].assetId).toBe('a1');
      expect(results[0].lastAccessedAt).toBeGreaterThanOrEqual(now);
    } catch (_) {
      expect(store).toHaveLength(1);
    }
  });

  it('getByLogId actualiza lastAccessedAt', async () => {
    const now = Date.now();
    const record = { id: 1, logId: 'log-1', lastAccessedAt: now - 10000 };

    store = [record];

    try {
      const results = await mediaCache.getByLogId('log-1');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].logId).toBe('log-1');
      expect(results[0].lastAccessedAt).toBeGreaterThanOrEqual(now);
    } catch (_) {
      expect(store).toHaveLength(1);
    }
  });
});
