/**
 * syncManager.offline.test.js — resilience de la cola offline del SyncManager.
 *
 * Verifica:
 *   1. saveTransaction encola en IndexedDB.
 *   2. Items encolados sobreviven page reload (nuevo SyncManager).
 *   3. syncAll skipea cuando isOnline es false.
 *   4. Fallo de red preserva items en cola con retry.
 *   5. classifyHttpError clasifica correctamente.
 *   6. startNetworkMonitoring reacciona a eventos online/offline.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOnline } from '../../test-utils/index.js';

const STORE_NAME = 'pending_transactions';

function makeFakeIdb() {
  const tables = {};

  function table(name) {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  const open_ = (_name, _version) => {
    const db = {
      transaction(names) {
        const n = Array.isArray(names) ? names[0] : names;
        const rows = table(n);
        const tx = {
          oncomplete: null,
          onerror: null,
          objectStore() {
            const fireComplete = () => setTimeout(() => tx.oncomplete?.(), 0);
            return {
              add(rec) {
                const item = { ...rec };
                if (!item.id) item.id = `auto-${rows.length + 1}`;
                rows.push(item);
                const r = { result: item.id };
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
              put(rec) {
                const idx = rows.findIndex((r) => r.id === rec.id);
                if (idx >= 0) rows[idx] = rec; else rows.push(rec);
                const r = {};
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
              get(id) {
                const found = rows.find((r) => r.id === id);
                const r = { result: found };
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
              getAll() {
                const r = { result: [...rows] };
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
              delete(id) {
                const idx = rows.findIndex((r) => r.id === id);
                if (idx >= 0) rows.splice(idx, 1);
                const r = {};
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
              count() {
                const r = { result: rows.length };
                queueMicrotask(() => { r.onsuccess?.({ target: r }); fireComplete(); });
                return r;
              },
            };
          },
        };
        return tx;
      },
      close() {},
    };
    const req = { result: db };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  };

  return { open: open_, _tables: tables };
}

function tick() {
  return new Promise((r) => setTimeout(r, 5));
}

// Each test gets a fresh SyncManager module (dbCore singleton reset).
async function freshMgr() {
  vi.resetModules();
  // Must be set before module import (SyncManager constructor reads navigator.onLine)
  const { SyncManager } = await import('../syncManager.js');
  return new SyncManager();
}

describe('SyncManager offline queue resilience', () => {
  let fdb;

  beforeEach(() => {
    setOnline(true);
    fdb = makeFakeIdb();
    vi.stubGlobal('indexedDB', { open: fdb.open });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveTransaction persiste una transaccion con synced:false', async () => {
    const mgr = await freshMgr();
    const tx = { type: 'seeding', payload: { data: { attributes: { name: 'Test' } } } };
    const saved = await mgr.saveTransaction(tx);
    await tick();
    expect(saved.synced).toBe(false);
    expect(saved.type).toBe('seeding');
  });

  it('getPendingTransactions devuelve transacciones no syncadas', async () => {
    const mgr = await freshMgr();
    await mgr.saveTransaction({ id: 'a1', type: 'seeding', payload: {}, synced: false });
    await mgr.saveTransaction({ id: 'a2', type: 'harvest', payload: {}, synced: false });
    await tick();

    const pending = await mgr.getPendingTransactions();
    expect(pending.filter((p) => !p.synced).length).toBe(2);
  });

  it('items encolados persisten entre page loads (nuevo SyncManager lee la misma IDB)', async () => {
    const mgr1 = await freshMgr();
    await mgr1.saveTransaction({ id: 'tx-persist', type: 'log--observation', payload: { data: {} }, synced: false });
    await tick();

    // Nuevo SyncManager (simula page reload) — debe leer los mismos datos de la IDB.
    const mgr2 = await freshMgr();
    await mgr2.initDB();
    await tick();

    const pending = await mgr2.getPendingTransactions();
    expect(pending.some((t) => t.id === 'tx-persist')).toBe(true);
  });

  it('syncAll SKIPEA cuando isOnline es false', async () => {
    const mgr = await freshMgr();
    mgr.isOnline = false;
    await mgr.saveTransaction({ id: 'off1', type: 'seeding', payload: {}, synced: false });
    await tick();

    await mgr.syncAll();
    const pending = await mgr.getPendingTransactions();
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it('syncAll SKIPEA cuando isSyncing es true (race condition guard)', async () => {
    const mgr = await freshMgr();
    mgr.isOnline = true;
    mgr.isSyncing = true;
    await mgr.saveTransaction({ id: 'lock1', type: 'seeding', payload: {}, synced: false });
    await tick();

    await mgr.syncAll();
    const pending = await mgr.getPendingTransactions();
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it('syncAll con fallo de red marca retry y preserva item en cola', async () => {
    vi.stubGlobal('dispatchEvent', vi.fn());
    const mgr = await freshMgr();
    mgr.isOnline = true;
    mgr.isSyncing = false;

    await mgr.saveTransaction({ id: 'netfail', type: 'seeding', payload: {}, synced: false, retries: 0 });
    await tick();

    // Mock syncTransaction to fail + mock markRetry to succeed without touching IDB tx.oncomplete
    mgr.syncTransaction = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    mgr.resolveLegacyEndpoint = vi.fn().mockReturnValue('/api/log/seeding');
    mgr.markRetry = vi.fn().mockResolvedValue(1);

    await mgr.syncAll();
    await tick();

    // markRetry should have been called
    expect(mgr.markRetry).toHaveBeenCalledWith('netfail', 'Failed to fetch');

    const pending = await mgr.getPendingTransactions();
    const tx = pending.find((t) => t.id === 'netfail');
    expect(tx).toBeTruthy();
  }, 10000);

  it('syncAll con HTTP 422 mueve a quarantine', async () => {
    vi.stubGlobal('dispatchEvent', vi.fn());
    const mgr = await freshMgr();
    mgr.isOnline = true;
    mgr.isSyncing = false;

    await mgr.saveTransaction({ id: 'bad422', type: 'seeding', payload: {}, synced: false, retries: 0 });
    await tick();

    mgr.syncTransaction = vi.fn().mockRejectedValue(
      Object.assign(new Error('Validation'), { status: 422 })
    );
    mgr.resolveLegacyEndpoint = vi.fn().mockReturnValue('/api/log/seeding');
    mgr.quarantineTransaction = vi.fn().mockResolvedValue(undefined);
    mgr.deleteTransaction = vi.fn().mockResolvedValue(undefined);

    await mgr.syncAll();
    await tick();

    // quarantineTransaction should have been called with the 422 error
    expect(mgr.quarantineTransaction).toHaveBeenCalled();
  }, 10000);

  it('MAX_RETRIES alcanzado → item movido a quarantine', async () => {
    vi.stubGlobal('dispatchEvent', vi.fn());
    const mgr = await freshMgr();
    mgr.isOnline = true;
    mgr.isSyncing = false;

    await mgr.saveTransaction({ id: 'maxed', type: 'seeding', payload: {}, synced: false, retries: 2 });
    await tick();

    mgr.syncTransaction = vi.fn().mockRejectedValue(new Error('Server down'));
    mgr.resolveLegacyEndpoint = vi.fn().mockReturnValue('/api/log/seeding');
    mgr.markRetry = vi.fn().mockResolvedValue(3); // retries = 3 >= MAX_RETRIES
    mgr.quarantineTransaction = vi.fn().mockResolvedValue(undefined);
    mgr.deleteTransaction = vi.fn().mockResolvedValue(undefined);

    await mgr.syncAll();
    await tick();

    // markRetry returned 3 which equals MAX_RETRIES → quarantine should have been called
    expect(mgr.markRetry).toHaveBeenCalled();
    // The syncAll code checks retries >= MAX_RETRIES and quarantines
    expect(mgr.quarantineTransaction).toHaveBeenCalled();
  }, 10000);

  describe('network monitoring', () => {
    it('startNetworkMonitoring dispara syncAll en evento online', async () => {
      const mgr = await freshMgr();
      mgr.isOnline = false;
      setOnline(false);

      const syncSpy = vi.spyOn(mgr, 'syncAll').mockResolvedValue(undefined);
      mgr.startNetworkMonitoring();

      // Dispatch online event on real window (NOT stubbed)
      window.dispatchEvent(new Event('online'));

      expect(mgr.isOnline).toBe(true);
      expect(syncSpy).toHaveBeenCalled();
    });

    it('startNetworkMonitoring pone isOnline=false en evento offline', async () => {
      const mgr = await freshMgr();
      mgr.isOnline = true;

      mgr.startNetworkMonitoring();

      window.dispatchEvent(new Event('offline'));

      expect(mgr.isOnline).toBe(false);
    });
  });

  describe('classifyHttpError', () => {
    it('clasifica errores HTTP correctamente', async () => {
      const mgr = await freshMgr();
      expect(mgr.classifyHttpError(401)).toBe('auth_expired');
      expect(mgr.classifyHttpError(403)).toBe('forbidden');
      expect(mgr.classifyHttpError(404)).toBe('not_found');
      expect(mgr.classifyHttpError(409)).toBe('conflict');
      expect(mgr.classifyHttpError(422)).toBe('validation');
      expect(mgr.classifyHttpError(429)).toBe('rate_limit');
      expect(mgr.classifyHttpError(500)).toBe('server');
      expect(mgr.classifyHttpError(503)).toBe('server');
      expect(mgr.classifyHttpError(418)).toBe('client_other');
      expect(mgr.classifyHttpError(0)).toBe('unknown');
    });
  });
});
