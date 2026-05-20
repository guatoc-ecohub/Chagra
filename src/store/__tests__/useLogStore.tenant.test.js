/**
 * useLogStore.tenant.test.js — ADR-036 MVP multi-finca scoping del log store.
 *
 * Verifica el listener `tenantChanged` que flushea el state in-memory de
 * useLogStore para no exponer logs del tenant anterior tras un re-login.
 *
 * El scoping a nivel IDB se prueba en src/db/__tests__/logCache.tenant.test.js;
 * acá solo el comportamiento del store reactivo.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub logCache antes del import del store — el listener `syncCompleted` lo
// importa pero no lo dispara en estos tests; igual evitamos `openDB` real.
vi.mock('../../db/logCache', () => ({
  logCache: {
    getLogsByAsset: vi.fn(async () => []),
    bulkPut: vi.fn(async () => {}),
    getByType: vi.fn(async () => []),
    getLog: vi.fn(async () => null),
    put: vi.fn(async () => {}),
  },
}));

const { useLogStore } = await import('../useLogStore');

const seedStateWithStaleLogs = () => {
  useLogStore.setState({
    logsByAsset: {
      'plant-a': [{ id: 'log-1', type: 'log--harvest' }],
      'plant-b': [{ id: 'log-2', type: 'log--input' }],
    },
    isSyncing: true,
    lastPullAt: Date.now(),
  });
};

describe('useLogStore tenant scoping (ADR-036 MVP)', () => {
  beforeEach(() => {
    useLogStore.setState({ logsByAsset: {}, isSyncing: false, lastPullAt: null });
  });

  it('tenantChanged listener clears in-memory state', () => {
    seedStateWithStaleLogs();
    window.dispatchEvent(
      new CustomEvent('tenantChanged', { detail: { previous: 'alice', current: 'bob' } })
    );
    const s = useLogStore.getState();
    expect(s.logsByAsset).toEqual({});
    expect(s.isSyncing).toBe(false);
    expect(s.lastPullAt).toBeNull();
  });

  it('tenantChanged is idempotent (multiple events do not error)', () => {
    seedStateWithStaleLogs();
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: {} }));
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: {} }));
    expect(useLogStore.getState().logsByAsset).toEqual({});
  });
});
