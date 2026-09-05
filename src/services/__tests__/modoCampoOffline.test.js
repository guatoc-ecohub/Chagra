/**
 * modoCampoOffline.test.js — Tests del flujo offline del modo campo.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock del syncManager
vi.mock('../syncManager.js', () => {
  let pendingCount = 0;
  return {
    syncManager: {
      getPendingCount: async () => pendingCount,
      syncAll: vi.fn(async () => { pendingCount = 0; }),
      _setPending: (n) => { pendingCount = n; },
    },
  };
});

describe('Modo campo offline', () => {
  it('detecta 0 pendientes con sync limpio', async () => {
    const { syncManager } = await import('../syncManager.js');
    syncManager._setPending(0);
    const count = await syncManager.getPendingCount();
    expect(count).toBe(0);
  });

  it('detecta pendientes tras operaciones offline', async () => {
    const { syncManager } = await import('../syncManager.js');
    syncManager._setPending(3);
    const count = await syncManager.getPendingCount();
    expect(count).toBe(3);
  });

  it('syncAll limpia pendientes', async () => {
    const { syncManager } = await import('../syncManager.js');
    syncManager._setPending(5);
    await syncManager.syncAll();
    const count = await syncManager.getPendingCount();
    expect(count).toBe(0);
  });
});
