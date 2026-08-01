// @ts-nocheck
import { describe, it, expect, afterEach, vi } from 'vitest';
import { setOnline } from '../../test-utils/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

async function importFresh() {
  vi.resetModules();
  return import('../visionWarmService.js');
}

describe('visionWarmService offline-first', () => {
  it('warmVisionModel() returns false when offline (does not throw)', async () => {
    setOnline(false);
    // Resetea el estado interno para forzar que se intente el fetch
    await importFresh();
    const { warmVisionModel, __resetVisionWarmState } = await importFresh();
    __resetVisionWarmState();

    let result;
    let threw = false;
    try {
      result = await warmVisionModel();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBe(false);
  });

  it('warmVisionModel() returns false on fetch failure with navigator.onLine true (network down)', async () => {
    setOnline(true);
    // Simula red caída incluso con navigator.onLine = true
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await importFresh();
    const { warmVisionModel, __resetVisionWarmState } = await importFresh();
    __resetVisionWarmState();

    const result = await warmVisionModel();
    expect(result).toBe(false);
  });

  it('warmVisionModel() idempotency: returns true when already in-flight', async () => {
    setOnline(true);
    await importFresh();
    const { warmVisionModel, __resetVisionWarmState } = await importFresh();
    __resetVisionWarmState();

    // Force fetch to never resolve (simulate in-flight), but with a short timeout
    // so vitest doesn't hang. We use a deferred promise so both calls share the same module state.
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal('fetch', fetchMock);

    // Fire two calls in parallel - the first takes the lock, the second sees _warmInFlight
    const p1 = warmVisionModel();
    // Small tick to let _warmInFlight be set
    await new Promise((r) => setTimeout(r, 10));
    const r2 = await warmVisionModel();

    // Cleanup: resolve the fetch so p1 can complete
    resolveFetch?.(/** @type {any} */ ({ ok: true, status: 200 }));
    const r1 = await p1;

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    // Only one fetch call: the second call was blocked by _warmInFlight guard
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
