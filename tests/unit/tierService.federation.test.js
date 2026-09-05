import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../../src/services/tierService.js');
};

describe('tierService federation helpers', () => {
  let store;
  let tierService;

  beforeEach(async () => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
    });
    tierService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes the expected tier matrix', () => {
    expect(tierService.TIERS.free.maxSubUsers).toBe(1);
    expect(tierService.TIERS.familiar.roles).toEqual(
      expect.arrayContaining(['dueno', 'esposa', 'trabajador', 'nina']),
    );
    expect(tierService.TIERS.cuadrilla.canDelegate).toBe(true);
    expect(tierService.TIERS.cooperativa.roles).toContain('asesor');
  });

  it('allows or blocks roles according to the tier', () => {
    expect(tierService.tierAllowsRole('familiar', 'nina')).toBe(true);
    expect(tierService.tierAllowsRole('familiar', 'asesor')).toBe(false);
    expect(tierService.tierAllowsRole('cooperativa', 'asesor')).toBe(true);
  });

  it('reports delegation only on tiers that support it', () => {
    expect(tierService.tierAllowsDelegation('free')).toBe(false);
    expect(tierService.tierAllowsDelegation('cuadrilla')).toBe(true);
    expect(tierService.tierAllowsDelegation('cooperativa')).toBe(true);
  });

  it('counts only active users for capacity', () => {
    expect(tierService.canAddSubUser({
      tier: 'free',
      usuarios: [{ status: 'revoked' }],
    })).toBe(true);

    expect(tierService.canAddSubUser({
      tier: 'free',
      usuarios: [{ status: 'active' }],
    })).toBe(false);
  });

  it('keeps the sidecar header contract intact', () => {
    store['chagra:active_tenant_id'] = 'admin';
    const headers = tierService.buildSidecarHeaders('token-1');

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-chagra-tier']).toBe('pro');
    expect(headers['X-Chagra-Token']).toBe('token-1');
  });
});

