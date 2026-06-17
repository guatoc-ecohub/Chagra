import { describe, it, expect, afterEach, vi } from 'vitest';
import { setOnline } from '../../test-utils/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

async function importFresh() {
  vi.resetModules();
  return import('../gpuTelemetryService.js');
}

describe('gpuTelemetryService offline-first', () => {
  it('getGpuSnapshot() degrades gracefully when navigator.onLine is false (returns error snapshot, no throw)', async () => {
    setOnline(false);
    const { getGpuSnapshot, clearGpuCache } = await importFresh();
    clearGpuCache();

    const snapshot = await getGpuSnapshot({ force: true });
    expect(snapshot).toBeDefined();
    expect(snapshot.available).toBe(false);
    expect(snapshot.models).toEqual([]);
    expect(snapshot.totalVramMB).toBe(0);
    expect(typeof snapshot.error).toBe('string');
  });

  it('getGpuSnapshot() never throws regardless of navigator.onLine', async () => {
    setOnline(false);
    const { getGpuSnapshot, clearGpuCache } = await importFresh();
    clearGpuCache();

    let snapshot;
    let threw = false;
    try {
      snapshot = await getGpuSnapshot({ force: true });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(snapshot).toBeDefined();
  });

  it('listAvailableModels() degrades gracefully when offline (returns empty, no throw)', async () => {
    setOnline(false);
    const { listAvailableModels } = await importFresh();

    const result = await listAvailableModels();
    expect(result).toBeDefined();
    expect(result.available).toBe(false);
    expect(result.models).toEqual([]);
  });

  it('listAvailableModels() never throws when offline', async () => {
    setOnline(false);
    const { listAvailableModels } = await importFresh();

    let threw = false;
    try {
      await listAvailableModels();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
