/**
 * logCache.tenant.test.js — ADR-036 MVP multi-finca scoping del log cache.
 *
 * Replica el patrón de assetCache.tenant.test.js: mock pequeño de IDB con
 * un Map en memoria que verifica:
 *   - put/bulkPut stampan `_tenant_id` del tenant activo.
 *   - get* filtra por tenant activo.
 *   - bulkPut GC respeta el tenant boundary.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _resetForTests,
  setActiveTenantId,
  clearActiveTenantId,
} from '../../services/tenantContext';

// In-memory IDB substitute. Keyed por id de log.
let store;

const makeIndexGetAll = (predicate) => {
  const req = { onsuccess: null, onerror: null };
  Promise.resolve().then(() => {
    req.result = [...store.values()].filter(predicate);
    req.onsuccess?.({ target: req });
  });
  return req;
};

const fakeStore = {
  indexNames: { contains: () => false }, // forzar fallback sin asset_id_timestamp
  put(log) {
    store.set(log.id, log);
  },
  get(id) {
    const req = { onsuccess: null, onerror: null };
    Promise.resolve().then(() => {
      req.result = store.get(id) || null;
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  getAll() {
    const req = { onsuccess: null, onerror: null };
    Promise.resolve().then(() => {
      req.result = [...store.values()];
      req.onsuccess?.({ target: req });
    });
    return req;
  },
  delete(id) {
    store.delete(id);
  },
  index(name) {
    return {
      getAll(range) {
        // range = IDBKeyRange.only(val)
        const target = range?.lower ?? range?.upper ?? range;
        const predicate = name === 'type'
          ? (l) => l.type === target
          : name === 'asset_id'
            ? (l) => l.asset_id === target
            : () => false;
        return makeIndexGetAll(predicate);
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
    // Demorar oncomplete varios microtasks para que cualquier `req.onsuccess`
    // adentro alcance a correr primero (mismo patrón que assetCache test).
    Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => {
        tx.oncomplete?.();
      });
    return tx;
  },
};

vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: {
    LOGS: 'logs',
  },
}));

beforeEach(() => {
  globalThis.IDBKeyRange = /** @type {any} */ ({
    only: (val) => ({ lower: val, upper: val }),
    bound: (lower, upper) => ({ lower, upper }),
  });
  store = new Map();
  _resetForTests();
});

const { logCache } = await import('../logCache');

describe('logCache tenant scoping (ADR-036 MVP)', () => {
  it('put stamps _tenant_id from the active tenant', async () => {
    setActiveTenantId('alice');
    await logCache.put({
      id: 'log-1',
      type: 'log--harvest',
      asset_id: 'p1',
      timestamp: 1000,
      name: 'Cosecha tomate',
      _pending: false,
    });
    expect(store.get('log-1')._tenant_id).toBe('alice');
  });

  it('put preserves _tenant_id already present on the log', async () => {
    setActiveTenantId('alice');
    await logCache.put({
      id: 'log-2',
      type: 'log--harvest',
      asset_id: 'p2',
      _tenant_id: 'bob',
    });
    expect(store.get('log-2')._tenant_id).toBe('bob');
  });

  it('getLog returns null if the log belongs to another tenant', async () => {
    setActiveTenantId('alice');
    await logCache.put({ id: 'log-a', type: 'log--harvest', asset_id: 'p1' });
    setActiveTenantId('bob');
    await logCache.put({ id: 'log-b', type: 'log--harvest', asset_id: 'p2' });

    setActiveTenantId('alice');
    const ownLog = await logCache.getLog('log-a');
    expect(ownLog).not.toBeNull();
    expect(ownLog.id).toBe('log-a');

    const foreignLog = await logCache.getLog('log-b');
    expect(foreignLog).toBeNull();
  });

  it('getLog returns legacy logs (no _tenant_id) to the active tenant', async () => {
    store.set('legacy', {
      id: 'legacy',
      type: 'log--harvest',
      asset_id: 'p1',
      _tenant_id: null,
    });
    setActiveTenantId('alice');
    const legacy = await logCache.getLog('legacy');
    expect(legacy).not.toBeNull();
    expect(legacy.id).toBe('legacy');
  });

  it('getByType returns only logs of the active tenant', async () => {
    setActiveTenantId('alice');
    await logCache.put({ id: 'log-a', type: 'log--harvest', asset_id: 'p1' });
    setActiveTenantId('bob');
    await logCache.put({ id: 'log-b', type: 'log--harvest', asset_id: 'p2' });

    setActiveTenantId('alice');
    const aliceLogs = await logCache.getByType('log--harvest');
    expect(aliceLogs.map((l) => l.id)).toEqual(['log-a']);

    setActiveTenantId('bob');
    const bobLogs = await logCache.getByType('log--harvest');
    expect(bobLogs.map((l) => l.id)).toEqual(['log-b']);
  });

  it('getLogsByAsset filters by active tenant', async () => {
    setActiveTenantId('alice');
    await logCache.put({ id: 'log-a', type: 'log--harvest', asset_id: 'shared-p', timestamp: 100 });
    setActiveTenantId('bob');
    await logCache.put({ id: 'log-b', type: 'log--harvest', asset_id: 'shared-p', timestamp: 200 });

    // Aún si el asset_id colisiona (asset compartido por error en device
    // multi-usuario), cada tenant solo ve su log.
    setActiveTenantId('alice');
    const aliceForP = await logCache.getLogsByAsset('shared-p');
    expect(aliceForP.map((l) => l.id)).toEqual(['log-a']);

    setActiveTenantId('bob');
    const bobForP = await logCache.getLogsByAsset('shared-p');
    expect(bobForP.map((l) => l.id)).toEqual(['log-b']);
  });

  it('getAll / getRecent24h apply tenant filter', async () => {
    setActiveTenantId('alice');
    await logCache.put({
      id: 'log-a',
      type: 'log--harvest',
      asset_id: 'p1',
      timestamp: Math.floor(Date.now() / 1000),
    });
    setActiveTenantId('bob');
    await logCache.put({
      id: 'log-b',
      type: 'log--harvest',
      asset_id: 'p2',
      timestamp: Math.floor(Date.now() / 1000),
    });

    setActiveTenantId('alice');
    const all = await logCache.getAll();
    expect(all.map((l) => l.id)).toEqual(['log-a']);

    const recent = await logCache.getRecent24h();
    expect(recent.map((l) => l.id)).toEqual(['log-a']);
  });

  it('without an active tenant, all logs are visible (single-tenant fallback)', async () => {
    setActiveTenantId('alice');
    await logCache.put({ id: 'log-a', type: 'log--harvest', asset_id: 'p1' });
    setActiveTenantId('bob');
    await logCache.put({ id: 'log-b', type: 'log--harvest', asset_id: 'p2' });

    clearActiveTenantId();
    const list = await logCache.getByType('log--harvest');
    expect(list.map((l) => l.id).sort()).toEqual(['log-a', 'log-b']);
  });

  it('bulkPut GC only sweeps logs belonging to the active tenant', async () => {
    // Seedeo manual (sin pasar por put) para tener control fino del _tenant_id.
    store.set('log-a-1', {
      id: 'log-a-1',
      type: 'log--harvest',
      asset_id: 'p1',
      _tenant_id: 'alice',
      _pending: false,
    });
    store.set('log-a-2', {
      id: 'log-a-2',
      type: 'log--harvest',
      asset_id: 'p2',
      _tenant_id: 'alice',
      _pending: false,
    });
    store.set('log-b-1', {
      id: 'log-b-1',
      type: 'log--harvest',
      asset_id: 'p3',
      _tenant_id: 'bob',
      _pending: false,
    });

    // Alice sincroniza con su backend, universo remoto solo contiene log-a-1.
    setActiveTenantId('alice');
    await logCache.bulkPut(
      'log--harvest',
      [
        {
          id: 'log-a-1',
          type: 'log--harvest',
          attributes: { name: 'Cosecha 1', timestamp: 1000, status: 'done' },
          relationships: { asset: { data: [{ id: 'p1' }] } },
        },
      ],
      []
    );

    // log-a-2 (alice, no en remoto) → purgado.
    expect(store.has('log-a-2')).toBe(false);
    // log-b-1 (bob) → sobrevive aunque alice no lo tenga en remoto.
    expect(store.has('log-b-1')).toBe(true);
    // log-a-1 (alice, en remoto) → preservado.
    expect(store.has('log-a-1')).toBe(true);
  });
});
