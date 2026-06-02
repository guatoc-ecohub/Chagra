/**
 * tierService.test.js — TDD para el servicio de tier free|pro.
 *
 * Cobertura:
 *  - resolveTier: username en allowlist → 'pro'.
 *  - resolveTier: username fuera de allowlist → 'free' (default).
 *  - resolveTier: null / undefined / empty → 'free' (defensive).
 *  - resolveTier: matching case-insensitive (farmOS usernames pueden tener
 *    mezcla de mayúsculas según el cliente web de farmOS).
 *  - PRO_USERNAMES exporta un Set (editable por el operador).
 *  - ANA_USERNAME_PENDIENTE exporta el placeholder como señal de que la
 *    cuenta de Ana está lista para ser activada.
 *  - buildSidecarHeaders: incluye 'x-chagra-tier' con el tier del usuario actual.
 *  - buildSidecarHeaders: sin usuario logueado → 'free'.
 *  - buildSidecarHeaders: incluye X-Chagra-Token cuando se pasa token.
 *  - getCurrentTier: resuelve tier del tenantId activo en localStorage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let tierService;

const importFresh = async () => {
  vi.resetModules();
  return import('../tierService.js');
};

describe('tierService — resolveTier', () => {
  beforeEach(async () => {
    tierService = await importFresh();
  });

  it('devuelve "pro" para username en la allowlist', () => {
    // 'admin' es el usuario principal del operador, siempre pro
    expect(tierService.resolveTier('admin')).toBe('pro');
  });

  it('devuelve "free" para username fuera de la allowlist', () => {
    expect(tierService.resolveTier('campesino_juan')).toBe('free');
    expect(tierService.resolveTier('visitante')).toBe('free');
    expect(tierService.resolveTier('random_user_xyz')).toBe('free');
  });

  it('devuelve "free" para null/undefined/empty (defensive)', () => {
    expect(tierService.resolveTier(null)).toBe('free');
    expect(tierService.resolveTier(undefined)).toBe('free');
    expect(tierService.resolveTier('')).toBe('free');
  });

  it('matching es case-insensitive', () => {
    // farmOS usernames suelen ser lowercase, pero el matching debe ser robusto
    expect(tierService.resolveTier('Admin')).toBe('pro');
    expect(tierService.resolveTier('ADMIN')).toBe('pro');
  });

  it('PRO_USERNAMES exporta un Set (editable por el operador)', () => {
    expect(tierService.PRO_USERNAMES).toBeInstanceOf(Set);
    expect(tierService.PRO_USERNAMES.size).toBeGreaterThan(0);
  });

  it('ANA_USERNAME_PENDIENTE está exportado como placeholder', () => {
    // Señal de que la cuenta de Ana está "lista para activar" cuando
    // el operador provea el username real
    expect(typeof tierService.ANA_USERNAME_PENDIENTE).toBe('string');
    expect(tierService.ANA_USERNAME_PENDIENTE.length).toBeGreaterThan(0);
  });
});

describe('tierService — buildSidecarHeaders', () => {
  let store;

  beforeEach(async () => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    tierService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('incluye x-chagra-tier: "pro" cuando el usuario logueado es pro', () => {
    store['chagra:active_tenant_id'] = 'admin';
    const headers = tierService.buildSidecarHeaders('test-token');
    expect(headers['x-chagra-tier']).toBe('pro');
  });

  it('incluye x-chagra-tier: "free" cuando el usuario logueado no está en allowlist', () => {
    store['chagra:active_tenant_id'] = 'campesino_libre';
    const headers = tierService.buildSidecarHeaders('test-token');
    expect(headers['x-chagra-tier']).toBe('free');
  });

  it('incluye x-chagra-tier: "free" cuando no hay usuario logueado', () => {
    // store vacío → tenantId = null → tier free (safe default)
    const headers = tierService.buildSidecarHeaders('test-token');
    expect(headers['x-chagra-tier']).toBe('free');
  });

  it('incluye X-Chagra-Token cuando se pasa token no vacío', () => {
    store['chagra:active_tenant_id'] = 'admin';
    const headers = tierService.buildSidecarHeaders('my-secret-token');
    expect(headers['X-Chagra-Token']).toBe('my-secret-token');
  });

  it('no incluye X-Chagra-Token cuando el token es cadena vacía', () => {
    const headers = tierService.buildSidecarHeaders('');
    expect(headers['X-Chagra-Token']).toBeUndefined();
  });
});

describe('tierService — getCurrentTier', () => {
  let store;

  beforeEach(async () => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    tierService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve "pro" para usuario logueado en allowlist', () => {
    store['chagra:active_tenant_id'] = 'admin';
    expect(tierService.getCurrentTier()).toBe('pro');
  });

  it('devuelve "free" para usuario logueado fuera de allowlist', () => {
    store['chagra:active_tenant_id'] = 'usuario_free';
    expect(tierService.getCurrentTier()).toBe('free');
  });

  it('devuelve "free" cuando no hay sesión activa', () => {
    // Sin tenantId → default free
    expect(tierService.getCurrentTier()).toBe('free');
  });
});
