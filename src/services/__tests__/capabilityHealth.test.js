import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/dbCore', () => ({ openDB: () => Promise.resolve({}) }));

import { checkCapabilityHealth, hasCriticalFailure, getDegradedCapabilities } from '../capabilityHealth';

describe('checkCapabilityHealth', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('retorna array de capacidades', async () => {
    const results = await checkCapabilityHealth();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.name).toBeDefined();
      expect(['ok', 'degraded', 'down']).toContain(r.status);
    });
  });
});

describe('hasCriticalFailure', () => {
  it('detecta fallo crítico', () => {
    expect(hasCriticalFailure([{ status: 'ok' }, { status: 'down' }])).toBe(true);
    expect(hasCriticalFailure([{ status: 'ok' }])).toBe(false);
  });
});

describe('getDegradedCapabilities', () => {
  it('filtra solo no-ok', () => {
    const r = getDegradedCapabilities([{ status: 'ok' }, { status: 'down' }, { status: 'degraded' }]);
    expect(r).toHaveLength(2);
  });
});
