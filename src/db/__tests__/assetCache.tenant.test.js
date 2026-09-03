/**
 * assetCache.tenant.test.js — ADR-036 MVP multi-finca scoping en IDB.
 *
 * Mock pequeño de IDB usando un Map en memoria para verificar:
 *   - put/bulkPut stampan `_tenant_id` del tenant activo.
 *   - getByType filtra por tenant activo.
 *   - purgeAbsent solo barre assets del tenant activo.
 *
 * No usa fake-indexeddb — replica el mínimo subset que assetCache toca.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _resetForTests, setActiveTenantId, clearActiveTenantId } from '../../services/tenantContext';

// In-memory IDB substitute. Keyed by asset id.
let store;

const makeIndexGetAll = (assetType) => {
  const req = { onsuccess: null, onerror: null };
  Promise.resolve().then(() => {
    req.result = [...store.values()].filter((a) => a.asset_type === assetType);
    req.onsuccess?.({ target: req });
  });
  return req;
};

const fakeStore = {
  put(asset) {
    store.set(asset.id, asset);
  },
  delete(id) {
    store.delete(id);
  },
  index(_name) {
    return {
      getAll(range) {
        // range = IDBKeyRange.only(assetType)
        const assetType = range?.lower ?? range?.upper ?? range;
        return makeIndexGetAll(assetType);
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
    // Simulate async oncomplete tick. Encolar con varios microtasks de delay
    // para que cualquier `req.onsuccess` adentro alcance a correr primero
    // (assetCache.purgeAbsent espera por getAll y LUEGO marca deletes; el
    // tx.oncomplete debe llegar al final).
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
    ASSETS: 'assets',
    PENDING_TX: 'pending_transactions',
  },
}));

// jsdom no expone IDBKeyRange por defecto; este shim alcanza para el test.
beforeEach(() => {
  globalThis.IDBKeyRange = /** @type {any} */ ({
    only: (val) => ({ lower: val, upper: val }),
  });
  store = new Map();
  _resetForTests();
});

const { assetCache } = await import('../assetCache');

describe('assetCache tenant scoping (ADR-036 MVP)', () => {
  it('put stamps _tenant_id from the active tenant', async () => {
    setActiveTenantId('alice');
    await assetCache.put('plant', {
      id: 'p1',
      type: 'asset--plant',
      attributes: { name: 'Tomate' },
    });
    expect(store.get('p1')._tenant_id).toBe('alice');
  });

  it('put preserves _tenant_id already present on the asset', async () => {
    setActiveTenantId('alice');
    await assetCache.put('plant', {
      id: 'p2',
      type: 'asset--plant',
      attributes: {},
      _tenant_id: 'bob', // ya viene marcado
    });
    expect(store.get('p2')._tenant_id).toBe('bob');
  });

  it('getByType returns only assets of the active tenant', async () => {
    setActiveTenantId('alice');
    await assetCache.put('plant', { id: 'p1', attributes: {} });
    setActiveTenantId('bob');
    await assetCache.put('plant', { id: 'p2', attributes: {} });

    setActiveTenantId('alice');
    const aliceList = await assetCache.getByType('plant');
    expect(aliceList.map((a) => a.id)).toEqual(['p1']);

    setActiveTenantId('bob');
    const bobList = await assetCache.getByType('plant');
    expect(bobList.map((a) => a.id)).toEqual(['p2']);
  });

  it('getByType treats legacy assets (no _tenant_id) as visible to active tenant', async () => {
    // Insertar a mano un asset legacy sin _tenant_id.
    store.set('legacy', {
      id: 'legacy',
      asset_type: 'plant',
      attributes: {},
      _tenant_id: null,
    });

    setActiveTenantId('alice');
    const list = await assetCache.getByType('plant');
    expect(list.map((a) => a.id)).toContain('legacy');
  });

  it('getByType returns all assets when no tenant is active (single-tenant fallback)', async () => {
    setActiveTenantId('alice');
    await assetCache.put('plant', { id: 'p1', attributes: {} });
    setActiveTenantId('bob');
    await assetCache.put('plant', { id: 'p2', attributes: {} });

    clearActiveTenantId();
    const list = await assetCache.getByType('plant');
    expect(list.map((a) => a.id).sort()).toEqual(['p1', 'p2']);
  });

  it('purgeAbsent only sweeps within the active tenant', async () => {
    setActiveTenantId('alice');
    await assetCache.put('plant', { id: 'p-alice-1', attributes: {} });
    await assetCache.put('plant', { id: 'p-alice-2', attributes: {} });
    setActiveTenantId('bob');
    await assetCache.put('plant', { id: 'p-bob-1', attributes: {} });

    // Alice sincroniza con su backend; el universo remoto solo contiene p-alice-1.
    setActiveTenantId('alice');
    const remote = new Set(['p-alice-1']);
    const purged = await assetCache.purgeAbsent('plant', remote);
    expect(purged).toBe(1); // p-alice-2 desaparece, p-bob-1 sobrevive.
    expect(store.has('p-bob-1')).toBe(true);
    expect(store.has('p-alice-2')).toBe(false);
  });
});
