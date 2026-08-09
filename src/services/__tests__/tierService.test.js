/**
 * tierService.test.js — TDD para el servicio de tier free|pro + cupo de sub-usuarios.
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
 *  - canAddSubUser: verifica cupo disponible por tier.
 *  - canAddSubUser: 'asesor' NO cuenta contra el cupo.
 *  - canAddSubUser: solo cuenta usuarios con status 'active'.
 *  - canAddSubUser: defensive para input inválido.
 *  - tierAllowsRole: verifica roles permitidos por tier.
 *  - tierAllowsDelegation: verifica si tier permite delegación cross-finca.
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

describe('tierService — canAddSubUser (cupo de sub-usuarios)', () => {
  beforeEach(async () => {
    tierService = await importFresh();
  });

  it('permite agregar usuario en tier free cuando hay 0 usuarios (cupo=1)', () => {
    const roster = {
      tier: 'free',
      usuarios: [],
    };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('NO permite agregar usuario en tier free cuando hay 1 usuario (cupo=1 lleno)', () => {
    const roster = {
      tier: 'free',
      usuarios: [
        { id: 'u1', rol: 'dueno', status: 'active' },
      ],
    };
    expect(tierService.canAddSubUser(roster)).toBe(false);
  });

  it('permite agregar hasta 4 usuarios en tier familiar (cupo=4)', () => {
    const roster = {
      tier: 'familiar',
      usuarios: [
        { id: 'u1', rol: 'dueno', status: 'active' },
        { id: 'u2', rol: 'esposa', status: 'active' },
        { id: 'u3', rol: 'trabajador', status: 'active' },
      ],
    };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('NO permite agregar 5to usuario en tier familiar (cupo=4 lleno)', () => {
    const roster = {
      tier: 'familiar',
      usuarios: [
        { id: 'u1', rol: 'dueno', status: 'active' },
        { id: 'u2', rol: 'esposa', status: 'active' },
        { id: 'u3', rol: 'trabajador', status: 'active' },
        { id: 'u4', rol: 'nina', status: 'active' },
      ],
    };
    expect(tierService.canAddSubUser(roster)).toBe(false);
  });

  it('permite agregar hasta 12 usuarios en tier cuadrilla (cupo=12)', () => {
    const usuarios = Array.from({ length: 11 }, (_, i) => ({
      id: `u${i}`,
      rol: i === 0 ? 'dueno' : 'trabajador',
      status: 'active',
    }));
    const roster = { tier: 'cuadrilla', usuarios };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('NO permite agregar 13avo usuario en tier cuadrilla (cupo=12 lleno)', () => {
    const usuarios = Array.from({ length: 12 }, (_, i) => ({
      id: `u${i}`,
      rol: i === 0 ? 'dueno' : 'trabajador',
      status: 'active',
    }));
    const roster = { tier: 'cuadrilla', usuarios };
    expect(tierService.canAddSubUser(roster)).toBe(false);
  });

  it('permite agregar hasta 50 usuarios en tier cooperativa (cupo=50)', () => {
    const usuarios = Array.from({ length: 49 }, (_, i) => ({
      id: `u${i}`,
      rol: i === 0 ? 'dueno' : 'trabajador',
      status: 'active',
    }));
    const roster = { tier: 'cooperativa', usuarios };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('asesor NO cuenta contra el cupo del tier', () => {
    const roster = {
      tier: 'familiar',
      usuarios: [
        { id: 'u1', rol: 'dueno', status: 'active' },
        { id: 'u2', rol: 'esposa', status: 'active' },
        { id: 'u3', rol: 'trabajador', status: 'active' },
        { id: 'u4', rol: 'asesor', status: 'active' },
      ],
    };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('usuarios con status distinto de "active" NO cuentan contra el cupo', () => {
    const roster = {
      tier: 'familiar',
      usuarios: [
        { id: 'u1', rol: 'dueno', status: 'active' },
        { id: 'u2', rol: 'esposa', status: 'revoked' },
        { id: 'u3', rol: 'trabajador', status: 'suspended' },
      ],
    };
    expect(tierService.canAddSubUser(roster)).toBe(true);
  });

  it('devuelve false para roster inválido (null/undefined)', () => {
    expect(tierService.canAddSubUser(null)).toBe(false);
    expect(tierService.canAddSubUser(undefined)).toBe(false);
  });

  it('devuelve false para roster sin tier o usuarios', () => {
    expect(tierService.canAddSubUser({})).toBe(false);
    expect(tierService.canAddSubUser({ tier: 'free' })).toBe(false);
    expect(tierService.canAddSubUser({ usuarios: [] })).toBe(false);
  });

  it('devuelve false para tier desconocido', () => {
    const roster = {
      tier: 'tier_inexistente',
      usuarios: [],
    };
    expect(tierService.canAddSubUser(roster)).toBe(false);
  });
});

describe('tierService — tierAllowsRole', () => {
  beforeEach(async () => {
    tierService = await importFresh();
  });

  it('free solo permite rol dueno', () => {
    expect(tierService.tierAllowsRole('free', 'dueno')).toBe(true);
    expect(tierService.tierAllowsRole('free', 'esposa')).toBe(false);
    expect(tierService.tierAllowsRole('free', 'trabajador')).toBe(false);
    expect(tierService.tierAllowsRole('free', 'nina')).toBe(false);
    expect(tierService.tierAllowsRole('free', 'asesor')).toBe(false);
  });

  it('familiar permite dueno, esposa, trabajador, nina', () => {
    expect(tierService.tierAllowsRole('familiar', 'dueno')).toBe(true);
    expect(tierService.tierAllowsRole('familiar', 'esposa')).toBe(true);
    expect(tierService.tierAllowsRole('familiar', 'trabajador')).toBe(true);
    expect(tierService.tierAllowsRole('familiar', 'nina')).toBe(true);
    expect(tierService.tierAllowsRole('familiar', 'asesor')).toBe(false);
  });

  it('cuadrilla permite dueno, esposa, trabajador, nina', () => {
    expect(tierService.tierAllowsRole('cuadrilla', 'dueno')).toBe(true);
    expect(tierService.tierAllowsRole('cuadrilla', 'esposa')).toBe(true);
    expect(tierService.tierAllowsRole('cuadrilla', 'trabajador')).toBe(true);
    expect(tierService.tierAllowsRole('cuadrilla', 'nina')).toBe(true);
    expect(tierService.tierAllowsRole('cuadrilla', 'asesor')).toBe(false);
  });

  it('cooperativa permite todos los roles incluyendo asesor', () => {
    expect(tierService.tierAllowsRole('cooperativa', 'dueno')).toBe(true);
    expect(tierService.tierAllowsRole('cooperativa', 'esposa')).toBe(true);
    expect(tierService.tierAllowsRole('cooperativa', 'trabajador')).toBe(true);
    expect(tierService.tierAllowsRole('cooperativa', 'nina')).toBe(true);
    expect(tierService.tierAllowsRole('cooperativa', 'asesor')).toBe(true);
  });

  it('devuelve false para tier desconocido', () => {
    expect(tierService.tierAllowsRole('tier_inexistente', 'dueno')).toBe(false);
  });

  it('devuelve false para rol desconocido', () => {
    expect(tierService.tierAllowsRole('familiar', 'rol_inexistente')).toBe(false);
  });
});

describe('tierService — tierAllowsDelegation', () => {
  beforeEach(async () => {
    tierService = await importFresh();
  });

  it('free NO permite delegación', () => {
    expect(tierService.tierAllowsDelegation('free')).toBe(false);
  });

  it('familiar NO permite delegación', () => {
    expect(tierService.tierAllowsDelegation('familiar')).toBe(false);
  });

  it('cuadrilla SÍ permite delegación', () => {
    expect(tierService.tierAllowsDelegation('cuadrilla')).toBe(true);
  });

  it('cooperativa SÍ permite delegación', () => {
    expect(tierService.tierAllowsDelegation('cooperativa')).toBe(true);
  });

  it('devuelve false para tier desconocido', () => {
    expect(tierService.tierAllowsDelegation('tier_inexistente')).toBe(false);
  });
});
