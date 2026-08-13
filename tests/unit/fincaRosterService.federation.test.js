import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  const service = await import('../../src/services/fincaRosterService.js');
  const store = await import('../../src/services/fincaActiveStore.js');
  return { service, store: store.default };
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
  storage.store['chagra:finca_roster:guatoc'] = JSON.stringify(roster);
}

describe('fincaRosterService', () => {
  let storage;
  let service;
  let fincaStore;

  beforeEach(async () => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage.api);
    ({ service, store: fincaStore } = await importFresh());
    fincaStore.setState({ activeFincaSlug: 'guatoc' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a normalized empty roster when nothing is stored', () => {
    expect(service.getRoster('guatoc')).toMatchObject({
      fincaSlug: 'guatoc',
      tier: 'free',
      usuarios: [],
      schemaVersion: 2,
    });
  });

  it('currentSubUser resolves the active tenant against the roster', () => {
    seedRoster(storage, {
      fincaSlug: 'guatoc',
      tier: 'familiar',
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

    expect(service.currentSubUser()).toMatchObject({
      id: 'owner-1',
      rol: 'dueno',
      login: 'owner-login',
    });
  });

  it('addSubUser stores a new user when the actor can manage the target role', () => {
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

    const created = service.addSubUser('guatoc', {
      nombre: 'Worker One',
      rol: 'trabajador',
      login: 'worker-login',
    });

    expect(created.rol).toBe('trabajador');
    expect(created.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(service.getRoster('guatoc').usuarios).toHaveLength(2);
  });

  it('rejects new users when the tier is full', () => {
    seedRoster(storage, {
      fincaSlug: 'guatoc',
      tier: 'free',
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

    expect(() => service.addSubUser('guatoc', {
      nombre: 'Worker One',
      rol: 'trabajador',
      login: 'worker-login',
    })).toThrow('tier capacity exceeded');
  });

  it('updates and revokes subusers without losing the roster shape', () => {
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
        {
          id: 'worker-1',
          nombre: 'Worker',
          rol: 'trabajador',
          login: 'worker-login',
          status: 'active',
        },
      ],
      schemaVersion: 2,
    });
    storage.store['chagra:active_tenant_id'] = 'owner-login';

    const updated = service.updateSubUserRole('guatoc', 'worker-1', 'nina');
    expect(updated.rol).toBe('nina');

    service.revokeSubUser('guatoc', 'worker-1');
    const roster = service.getRoster('guatoc');
    expect(roster.usuarios.find((u) => u.id === 'worker-1')).toMatchObject({
      status: 'revoked',
      rol: 'nina',
    });
  });

  it('prevents a spouse from managing the owner', () => {
    seedRoster(storage, {
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [
        {
          id: 'owner-1',
          nombre: 'Owner',
          rol: 'dueno',
          login: 'owner-login',
          status: 'active',
        },
        {
          id: 'spouse-1',
          nombre: 'Spouse',
          rol: 'esposa',
          login: 'spouse-login',
          status: 'active',
        },
      ],
      schemaVersion: 2,
    });
    storage.store['chagra:active_tenant_id'] = 'spouse-login';

    expect(() => service.revokeSubUser('guatoc', 'owner-1')).toThrow('actor cannot manage this role');
  });
});

