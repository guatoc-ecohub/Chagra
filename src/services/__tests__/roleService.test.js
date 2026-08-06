/**
 * roleService.test.js — TDD del PLANO 2 (rol de seguridad), sistema
 * multiusuario por roles de Chagra (pedido operador msg 108-111).
 *
 * Ver contratos en `Chagra-strategy/ops/DISENO-FEDERACION-USUARIOS.md` §2.
 *
 * Cobertura:
 *  - resolvePermisos: default por rol, techo (override no escala).
 *  - can: :own vs :any, resolución por ownership.
 *  - CASO DURO: `nina` nunca tiene ningún `*:delete:*`, ni con override.
 *  - canManage: dueno→todos, esposa→{trabajador,nina} solamente, resto→∅.
 *  - currentSecurityRole: lee roster de la finca activa; fallback legacy
 *    single-user (tenant logueado sin roster aún = dueno de su finca).
 *  - isNina: helper del caso duro.
 */
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';

let roleService;

const importFresh = async () => {
  vi.resetModules();
  return import('../roleService.js');
};

describe('roleService — resolvePermisos', () => {
  beforeEach(async () => {
    roleService = await importFresh();
  });

  it('dueno tiene TODOS los permisos por defecto', async () => {
    const { PERMISOS } = await import('../../config/roleCatalog.js');
    const perms = roleService.resolvePermisos({ rol: 'dueno' });
    for (const p of PERMISOS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it('nina NUNCA tiene asset:delete:own ni asset:delete:any por defecto', () => {
    const perms = roleService.resolvePermisos({ rol: 'nina' });
    expect(perms.has('asset:delete:own')).toBe(false);
    expect(perms.has('asset:delete:any')).toBe(false);
    expect(perms.has('log:delete:own')).toBe(false);
    expect(perms.has('log:delete:any')).toBe(false);
  });

  it('nina SÍ puede crear y leer (jugar y aprender, registrar lo suyo)', () => {
    const perms = roleService.resolvePermisos({ rol: 'nina' });
    expect(perms.has('asset:read')).toBe(true);
    expect(perms.has('asset:create')).toBe(true);
    expect(perms.has('log:create')).toBe(true);
    expect(perms.has('log:read:any')).toBe(true);
  });

  it('CASO DURO: override no puede escalar a nina un permiso de delete (techo ROLE_CEILING)', () => {
    const perms = roleService.resolvePermisos({
      rol: 'nina',
      permisos: ['asset:delete:any', 'log:delete:any', 'user:manage'],
    });
    expect(perms.has('asset:delete:any')).toBe(false);
    expect(perms.has('log:delete:any')).toBe(false);
    expect(perms.has('user:manage')).toBe(false);
  });

  it('trabajador puede borrar lo propio pero NO lo ajeno', () => {
    const perms = roleService.resolvePermisos({ rol: 'trabajador' });
    expect(perms.has('asset:delete:own')).toBe(true);
    expect(perms.has('asset:delete:any')).toBe(false);
    expect(perms.has('log:update:any')).toBe(false);
  });

  it('esposa tiene user:manage pero NO license:manage ni ucan:delegate', () => {
    const perms = roleService.resolvePermisos({ rol: 'esposa' });
    expect(perms.has('user:manage')).toBe(true);
    expect(perms.has('license:manage')).toBe(false);
    expect(perms.has('ucan:delegate')).toBe(false);
  });

  it('asesor solo lee y comenta, sin crear/editar/borrar assets', () => {
    const perms = roleService.resolvePermisos({ rol: 'asesor' });
    expect(perms.has('asset:read')).toBe(true);
    expect(perms.has('log:create')).toBe(true);
    expect(perms.has('asset:create')).toBe(false);
    expect(perms.has('asset:delete:own')).toBe(false);
  });

  it('subUser sin rol válido → Set vacío', () => {
    expect(roleService.resolvePermisos(null).size).toBe(0);
    expect(roleService.resolvePermisos({ rol: 'inventado' }).size).toBe(0);
  });
});

describe('roleService — can (:own vs :any)', () => {
  beforeEach(async () => {
    roleService = await importFresh();
  });

  it('trabajador puede borrar un asset que SÍ le pertenece (own)', () => {
    const actor = { id: 'u1', rol: 'trabajador' };
    expect(roleService.can(actor, 'asset:delete:own', 'u1')).toBe(true);
  });

  it('trabajador NO puede borrar un asset ajeno aunque pida :own', () => {
    const actor = { id: 'u1', rol: 'trabajador' };
    expect(roleService.can(actor, 'asset:delete:own', 'otro-usuario')).toBe(false);
  });

  it('CASO DURO: nina no puede borrar NADA, ni lo suyo ni lo ajeno', () => {
    const nina = { id: 'u-nina', rol: 'nina' };
    expect(roleService.can(nina, 'asset:delete:own', 'u-nina')).toBe(false);
    expect(roleService.can(nina, 'asset:delete:any', 'otro-trabajador')).toBe(false);
    expect(roleService.can(nina, 'log:delete:own', 'u-nina')).toBe(false);
  });

  it('dueno puede borrar cualquier asset (any) sin importar ownership', () => {
    const dueno = { id: 'owner', rol: 'dueno' };
    expect(roleService.can(dueno, 'asset:delete:any', 'cualquiera')).toBe(true);
  });

  it('permiso inválido/desconocido → false', () => {
    const dueno = { id: 'owner', rol: 'dueno' };
    expect(roleService.can(dueno, 'permiso:que:no:existe')).toBe(false);
  });

  it('actor null/undefined sin roster ni tenant → false', () => {
    expect(roleService.can(null, 'asset:read')).toBe(false);
  });
});

describe('roleService — canManage (gate de user:manage)', () => {
  beforeEach(async () => {
    roleService = await importFresh();
  });

  it('dueno puede gestionar cualquier rol', () => {
    expect(roleService.canManage('dueno', 'esposa')).toBe(true);
    expect(roleService.canManage('dueno', 'trabajador')).toBe(true);
    expect(roleService.canManage('dueno', 'nina')).toBe(true);
    expect(roleService.canManage('dueno', 'asesor')).toBe(true);
    expect(roleService.canManage('dueno', 'dueno')).toBe(true);
  });

  it('esposa SOLO puede gestionar trabajador y nina (degradado)', () => {
    expect(roleService.canManage('esposa', 'trabajador')).toBe(true);
    expect(roleService.canManage('esposa', 'nina')).toBe(true);
    expect(roleService.canManage('esposa', 'dueno')).toBe(false);
    expect(roleService.canManage('esposa', 'esposa')).toBe(false);
    expect(roleService.canManage('esposa', 'asesor')).toBe(false);
  });

  it('trabajador, nina y asesor no pueden gestionar a nadie', () => {
    for (const rol of ['trabajador', 'nina', 'asesor']) {
      for (const target of ['dueno', 'esposa', 'trabajador', 'nina', 'asesor']) {
        expect(roleService.canManage(rol, target)).toBe(false);
      }
    }
  });

  it('roles inválidos → false', () => {
    expect(roleService.canManage('inventado', 'dueno')).toBe(false);
    expect(roleService.canManage('dueno', 'inventado')).toBe(false);
  });
});

describe('roleService — currentSecurityRole (roster + fallback legacy)', () => {
  let store;

  beforeEach(async () => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    roleService = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin tenant logueado y sin roster → null', () => {
    expect(roleService.currentSecurityRole()).toBeNull();
  });

  it('fallback legacy: tenant logueado SIN roster → dueno (modo single-user MVP)', () => {
    store['chagra:active_tenant_id'] = 'david';
    expect(roleService.currentSecurityRole()).toBe('dueno');
  });

  it('roster explícito con el tenant como nina → nina (gana sobre el fallback)', () => {
    store['chagra:active_tenant_id'] = 'mariana';
    store['chagra:active-finca'] = JSON.stringify({ state: { activeFincaSlug: 'guatoc' } });
    store['chagra:finca_roster:guatoc'] = JSON.stringify({
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [
        { id: 'u1', nombre: 'Mariana', rol: 'nina', login: 'mariana', status: 'active' },
      ],
    });
    expect(roleService.currentSecurityRole()).toBe('nina');
  });

  it('roster con usuario revocado no cuenta como actor', () => {
    store['chagra:active_tenant_id'] = 'exempleado';
    store['chagra:active-finca'] = JSON.stringify({ state: { activeFincaSlug: 'guatoc' } });
    store['chagra:finca_roster:guatoc'] = JSON.stringify({
      fincaSlug: 'guatoc',
      tier: 'familiar',
      usuarios: [
        { id: 'u2', nombre: 'Ex', rol: 'trabajador', login: 'exempleado', status: 'revoked' },
      ],
    });
    // Único usuario del roster está revocado → no matchea por roster,
    // cae al fallback legacy (dueno) porque hay tenant logueado.
    expect(roleService.currentSecurityRole()).toBe('dueno');
  });
});

describe('roleService — isNina', () => {
  beforeEach(async () => {
    roleService = await importFresh();
  });

  it('true para subUser con rol nina', () => {
    expect(roleService.isNina({ rol: 'nina' })).toBe(true);
  });

  it('false para cualquier otro rol', () => {
    expect(roleService.isNina({ rol: 'dueno' })).toBe(false);
    expect(roleService.isNina({ rol: 'trabajador' })).toBe(false);
  });

  it('false para null/inválido', () => {
    expect(roleService.isNina(null)).toBe(false);
    expect(roleService.isNina({ rol: 'inventado' })).toBe(false);
  });
});
