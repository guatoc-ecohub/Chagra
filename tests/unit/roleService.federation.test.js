import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../../src/services/roleService.js');
};

function makeStorage() {
  const store = {};
  return {
    store,
    api: {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
    },
  };
}

function seedRoster(storage, roster) {
  storage.store['chagra:active-finca'] = JSON.stringify({
    state: { activeFincaSlug: 'guatoc' },
  });
  storage.store['chagra:finca_roster:guatoc'] = JSON.stringify(roster);
}

describe('roleService', () => {
  let storage;
  let roleService;

  beforeEach(async () => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage.api);
    roleService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolvePermisos applies the ceiling and blocks escalation', () => {
    const resolved = roleService.resolvePermisos({
      rol: 'trabajador',
      permisos: ['asset:update:own', 'user:manage', 'license:manage'],
    });

    expect(resolved.has('asset:update:own')).toBe(true);
    expect(resolved.has('user:manage')).toBe(false);
    expect(resolved.has('license:manage')).toBe(false);
  });

  it('can blocks nina delete and update:any even on own resources', () => {
    const nina = { id: 'nina-1', did: 'did:key:nina', rol: 'nina' };

    expect(roleService.can(nina, 'asset:update:own', 'did:key:nina')).toBe(true);
    expect(roleService.can(nina, 'asset:update:any', 'did:key:nina')).toBe(false);
    expect(roleService.can(nina, 'asset:delete:own', 'did:key:nina')).toBe(false);
    expect(roleService.can(nina, 'log:delete:own', 'did:key:nina')).toBe(false);
  });

  it('can respects own versus any ownership checks', () => {
    const owner = { id: 'owner-1', did: 'did:key:owner', rol: 'dueno' };

    expect(roleService.can(owner, 'asset:update:own', 'did:key:owner')).toBe(true);
    expect(roleService.can(owner, 'asset:update:own', 'did:key:other')).toBe(true);
    expect(roleService.can(owner, 'asset:update:any', 'did:key:other')).toBe(true);
  });

  it('canManage only allows owner and spouse targets', () => {
    expect(roleService.canManage('dueno', 'asesor')).toBe(true);
    expect(roleService.canManage('esposa', 'trabajador')).toBe(true);
    expect(roleService.canManage('esposa', 'nina')).toBe(true);
    expect(roleService.canManage('esposa', 'dueno')).toBe(false);
    expect(roleService.canManage('trabajador', 'nina')).toBe(false);
  });

  it('currentSecurityRole reads the roster first and then the fallback key', () => {
    seedRoster(storage, {
      fincaSlug: 'guatoc',
      tier: 'familiar',
      ownerDid: 'did:key:owner',
      usuarios: [
        {
          id: 'owner-1',
          nombre: 'Owner',
          rol: 'dueno',
          login: 'owner-login',
          status: 'active',
        },
      ],
      schemaVersion: 2,
    });
    storage.store['chagra:active_tenant_id'] = 'owner-login';

    expect(roleService.currentSecurityRole()).toBe('dueno');

    storage.store['chagra:finca_roster:guatoc'] = JSON.stringify({
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [],
      schemaVersion: 2,
    });
    storage.store['chagra:security:role'] = 'trabajador';

    expect(roleService.currentSecurityRole()).toBe('trabajador');
  });

  it('isNina detects the role from the given subuser or the roster', () => {
    expect(roleService.isNina({ rol: 'nina' })).toBe(true);
    expect(roleService.isNina({ rol: 'trabajador' })).toBe(false);

    seedRoster(storage, {
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [
        {
          id: 'child-1',
          nombre: 'Ajuste',
          rol: 'nina',
          login: 'child-login',
          status: 'active',
        },
      ],
      schemaVersion: 2,
    });
    storage.store['chagra:active_tenant_id'] = 'child-login';

    expect(roleService.isNina()).toBe(true);
  });
});
