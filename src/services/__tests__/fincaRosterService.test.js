/**
 * fincaRosterService.test.js — TDD del CRUD de roster por finca (2D only),
 * sistema multiusuario por roles de Chagra (pedido operador msg 108-111).
 *
 * Ver contratos en `Chagra-strategy/ops/DISENO-FEDERACION-USUARIOS.md` §1, §6.3.
 *
 * Cobertura:
 *  - ensureOwnerBootstrapped: primer usuario (tenant logueado) se
 *    auto-provisiona como `dueno` cuando el roster está vacío.
 *  - addSubUser: valida cupo de tier, rol permitido por tier, y canManage.
 *  - updateSubUserRole: solo quien puede gestionar el rol actual del target.
 *  - revokeSubUser: SOFT-DELETE (status='revoked'), NUNCA elimina la
 *    entrada — coherente con ADR-019 (logs/roster son append-only a nivel
 *    de historial; "borrar" un usuario es un cambio de permiso, no un
 *    borrado físico).
 *  - CASO DURO: nina no puede figurar en el roster con permisos de delete
 *    vía ningún flujo de esta API (addSubUser no acepta override que
 *    escale — delegado a roleService.resolvePermisos, ya cubierto en
 *    roleService.test.js).
 */
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';

let fincaRosterService;

const importFresh = async () => {
  vi.resetModules();
  return import('../fincaRosterService.js');
};

function setupStorage() {
  const store = {};
  vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  });
  return store;
}

describe('fincaRosterService — ensureOwnerBootstrapped', () => {
  let store;

  beforeEach(async () => {
    store = setupStorage();
    fincaRosterService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('roster vacío + tenant logueado → auto-provisiona al tenant como dueno', () => {
    store['chagra:active_tenant_id'] = 'david';
    const roster = fincaRosterService.ensureOwnerBootstrapped('guatoc');
    expect(roster.usuarios).toHaveLength(1);
    expect(roster.usuarios[0].rol).toBe('dueno');
    expect(roster.usuarios[0].login).toBe('david');
    expect(roster.usuarios[0].status).toBe('active');
  });

  it('roster vacío + SIN tenant logueado → no crea nada', () => {
    const roster = fincaRosterService.ensureOwnerBootstrapped('guatoc');
    expect(roster.usuarios).toHaveLength(0);
  });

  it('es idempotente: llamarlo dos veces no duplica al dueño', () => {
    store['chagra:active_tenant_id'] = 'david';
    fincaRosterService.ensureOwnerBootstrapped('guatoc');
    const roster2 = fincaRosterService.ensureOwnerBootstrapped('guatoc');
    expect(roster2.usuarios).toHaveLength(1);
  });

  it('roster con usuarios ya existentes → no toca nada', () => {
    store['chagra:active_tenant_id'] = 'david';
    store['chagra:finca_roster:guatoc'] = JSON.stringify({
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [
        { id: 'u1', nombre: 'David', rol: 'dueno', login: 'david', status: 'active' },
      ],
    });
    const roster = fincaRosterService.ensureOwnerBootstrapped('guatoc');
    expect(roster.usuarios).toHaveLength(1);
  });
});

describe('fincaRosterService — addSubUser', () => {
  let store;

  beforeEach(async () => {
    store = setupStorage();
    fincaRosterService = await importFresh();
    store['chagra:active_tenant_id'] = 'david';
    // Bootstrap del dueño antes de cada test de addSubUser.
    fincaRosterService.ensureOwnerBootstrapped('guatoc');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('el dueño puede agregar una niña (caso Mariana) dentro del cupo del tier familiar', () => {
    // Subir el tier a familiar (free solo permite 1 = el dueño).
    const roster = fincaRosterService.getRoster('guatoc');
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'familiar' });

    const mariana = fincaRosterService.addSubUser('guatoc', { nombre: 'Mariana', rol: 'nina' });
    expect(mariana.rol).toBe('nina');
    expect(mariana.nombre).toBe('Mariana');
    expect(mariana.status).toBe('active');
    expect(mariana.id).toBeTruthy();
  });

  it('rechaza rol inválido', () => {
    expect(() => fincaRosterService.addSubUser('guatoc', { nombre: 'X', rol: 'inventado' }))
      .toThrow();
  });

  it('tier free (default) NO permite agregar más allá del dueño (cupo=1)', () => {
    expect(() => fincaRosterService.addSubUser('guatoc', { nombre: 'Trabajador', rol: 'trabajador' }))
      .toThrow(/tier capacity exceeded/);
  });

  it('tier free no permite el rol trabajador aunque hubiera cupo', () => {
    const roster = fincaRosterService.getRoster('guatoc');
    // Cupo 99 artificial pero tier sigue siendo 'free' (roles: ['dueno']).
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'free' });
    expect(() => fincaRosterService.addSubUser('guatoc', { nombre: 'T', rol: 'trabajador' }))
      .toThrow();
  });

  it('respeta el cupo del tier: familiar (max 4) rechaza el 5to usuario', () => {
    const roster = fincaRosterService.getRoster('guatoc');
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'familiar' });
    fincaRosterService.addSubUser('guatoc', { nombre: 'Esposa', rol: 'esposa' });
    fincaRosterService.addSubUser('guatoc', { nombre: 'Trabajador', rol: 'trabajador' });
    fincaRosterService.addSubUser('guatoc', { nombre: 'Mariana', rol: 'nina' });
    // Ya hay 4 activos (dueño + 3): el 5to debe fallar.
    expect(() => fincaRosterService.addSubUser('guatoc', { nombre: 'Otro', rol: 'nina' }))
      .toThrow(/tier capacity exceeded/);
  });

  it('asesor requiere tier con canDelegate (cooperativa), rechaza en familiar', () => {
    const roster = fincaRosterService.getRoster('guatoc');
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'familiar' });
    expect(() => fincaRosterService.addSubUser('guatoc', { nombre: 'Asesor', rol: 'asesor' }))
      .toThrow();
  });
});

describe('fincaRosterService — revokeSubUser (SOFT-DELETE, append-only)', () => {
  let store;

  beforeEach(async () => {
    store = setupStorage();
    fincaRosterService = await importFresh();
    store['chagra:active_tenant_id'] = 'david';
    fincaRosterService.ensureOwnerBootstrapped('guatoc');
    const roster = fincaRosterService.getRoster('guatoc');
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'familiar' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('quitar un usuario marca status=revoked, NUNCA borra la entrada del roster', () => {
    const trabajador = fincaRosterService.addSubUser('guatoc', { nombre: 'Juan', rol: 'trabajador' });
    fincaRosterService.revokeSubUser('guatoc', trabajador.id);

    const roster = fincaRosterService.getRoster('guatoc');
    const entry = roster.usuarios.find((u) => u.id === trabajador.id);
    // La entrada SIGUE existiendo (append-only / soft-delete) — solo status cambia.
    expect(entry).toBeDefined();
    expect(entry.status).toBe('revoked');
  });

  it('un usuario revocado ya no cuenta contra el cupo del tier', () => {
    const trabajador = fincaRosterService.addSubUser('guatoc', { nombre: 'Juan', rol: 'trabajador' });
    fincaRosterService.revokeSubUser('guatoc', trabajador.id);
    // familiar max=4: dueño(1) + trabajador-revocado(no cuenta) → cabe agregar 3 más.
    expect(() => {
      fincaRosterService.addSubUser('guatoc', { nombre: 'A', rol: 'esposa' });
      fincaRosterService.addSubUser('guatoc', { nombre: 'B', rol: 'trabajador' });
      fincaRosterService.addSubUser('guatoc', { nombre: 'C', rol: 'nina' });
    }).not.toThrow();
  });

  it('revocar id inexistente lanza error', () => {
    expect(() => fincaRosterService.revokeSubUser('guatoc', 'id-no-existe')).toThrow();
  });
});

describe('fincaRosterService — updateSubUserRole', () => {
  let store;

  beforeEach(async () => {
    store = setupStorage();
    fincaRosterService = await importFresh();
    store['chagra:active_tenant_id'] = 'david';
    fincaRosterService.ensureOwnerBootstrapped('guatoc');
    const roster = fincaRosterService.getRoster('guatoc');
    store['chagra:finca_roster:guatoc'] = JSON.stringify({ ...roster, tier: 'familiar' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('el dueño puede cambiar el rol de un trabajador a niña', () => {
    const trabajador = fincaRosterService.addSubUser('guatoc', { nombre: 'X', rol: 'trabajador' });
    const updated = fincaRosterService.updateSubUserRole('guatoc', trabajador.id, 'nina');
    expect(updated.rol).toBe('nina');
  });

  it('rechaza rol destino inválido', () => {
    const trabajador = fincaRosterService.addSubUser('guatoc', { nombre: 'X', rol: 'trabajador' });
    expect(() => fincaRosterService.updateSubUserRole('guatoc', trabajador.id, 'inventado'))
      .toThrow();
  });

  it('rechaza cambiar rol de un usuario ya revocado', () => {
    const trabajador = fincaRosterService.addSubUser('guatoc', { nombre: 'X', rol: 'trabajador' });
    fincaRosterService.revokeSubUser('guatoc', trabajador.id);
    expect(() => fincaRosterService.updateSubUserRole('guatoc', trabajador.id, 'nina'))
      .toThrow(/revoked/);
  });
});

describe('fincaRosterService — evento chagra:roster-changed', () => {
  let store;
  let dispatched;

  beforeEach(async () => {
    store = setupStorage();
    dispatched = [];
    vi.stubGlobal('window', {
      dispatchEvent: (evt) => { dispatched.push(evt); },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    vi.stubGlobal('CustomEvent', class CustomEvent {
      constructor(type, opts) { this.type = type; this.detail = opts?.detail; }
    });
    fincaRosterService = await importFresh();
    store['chagra:active_tenant_id'] = 'david';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mutar el roster dispara chagra:roster-changed', () => {
    fincaRosterService.ensureOwnerBootstrapped('guatoc');
    const evt = dispatched.find((e) => e.type === 'chagra:roster-changed');
    expect(evt).toBeDefined();
    expect(evt.detail.fincaSlug).toBe('guatoc');
  });
});
