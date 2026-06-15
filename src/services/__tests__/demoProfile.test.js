/**
 * demoProfile.test.js — TDD del SWITCH DE DEMO POR PERFIL (solo OPERADOR).
 *
 * Contrato bajo prueba (el brief del operador):
 *   1. El override SOLO aplica si el usuario es OPERADOR (esOperadorActual).
 *      Para un usuario real, getDemoOverride() = null y applyDemoToSelector es
 *      passthrough — el switch es invisible y NO puede estrecharle la app.
 *   2. setDemoRole es NO-OP para no-operadores (no escribe, devuelve false).
 *   3. Con un operador, simular cada perfil produce el par (perfil sintético,
 *      opts con esOperador=false) correcto, de modo que los selectores
 *      re-derivan la vista de ESA persona (verificado contra homeModuleSelector:
 *      urbano sin Cerdos/Zonas, ganadero con Cerdos, etc.).
 *   4. Sin esOperador, el override sembrado a mano en sessionStorage se IGNORA.
 *
 * Stubs: localStorage (tenant activo → decide operador) + sessionStorage
 * (override). Patrón idéntico a glaciarAccess.test.js (vi.stubGlobal + store).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const OPERADOR = 'kortux'; // está en OPERADOR_WHITELIST de glaciarAccess.
const USUARIO_REAL = 'campesino_juan';

let demo;
let homeSel;
let localStore;
let sessionStore;

/** Importa los módulos frescos (resetModules) tras stubear el storage. */
const importFresh = async () => {
  vi.resetModules();
  demo = await import('../demoProfile.js');
  homeSel = await import('../homeModuleSelector.js');
};

/** Stubea localStorage + sessionStorage con stores en memoria. */
function stubStorage() {
  localStore = {};
  sessionStore = {};
  vi.stubGlobal('localStorage', {
    getItem: (k) => localStore[k] ?? null,
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
  });
  vi.stubGlobal('sessionStorage', {
    getItem: (k) => sessionStore[k] ?? null,
    setItem: (k, v) => { sessionStore[k] = String(v); },
    removeItem: (k) => { delete sessionStore[k]; },
  });
}

/** Marca al usuario logueado (tenant activo) — decide si es operador. */
function login(username) {
  localStore['chagra:active_tenant_id'] = username;
}

describe('demoProfile — GATE de operador (seguridad)', () => {
  beforeEach(async () => {
    stubStorage();
    await importFresh();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('setDemoRole es NO-OP para un usuario NO operador (no escribe, false)', () => {
    login(USUARIO_REAL);
    expect(demo.setDemoRole('urbano')).toBe(false);
    // No tocó sessionStorage.
    expect(sessionStore[demo.DEMO_OVERRIDE_KEY]).toBeUndefined();
    expect(demo.getDemoOverride()).toBeNull();
    expect(demo.isDemoActive()).toBe(false);
  });

  it('un override sembrado a mano se IGNORA para un usuario no operador', () => {
    login(USUARIO_REAL);
    // Simula manipulación directa de sessionStorage por un usuario técnico.
    sessionStore[demo.DEMO_OVERRIDE_KEY] = 'urbano';
    // El gate duro lo ignora: getDemoOverride sigue null.
    expect(demo.getDemoOverride()).toBeNull();
    expect(demo.getActiveDemoRoleMeta()).toBeNull();
  });

  it('applyDemoToSelector es PASSTHROUGH exacto para un usuario no operador', () => {
    login(USUARIO_REAL);
    sessionStore[demo.DEMO_OVERRIDE_KEY] = 'urbano'; // sembrado malicioso, ignorado.
    const realProfile = { rol: 'campesino', vocacion: 'campesino' };
    const opts = { esOperador: false, esGuiaGlaciar: false, moduleVisibility: { x: true } };
    const out = demo.applyDemoToSelector(realProfile, opts);
    // Mismo perfil y opts: el demo no alteró NADA.
    expect(out.profile).toBe(realProfile);
    expect(out.opts).toBe(opts);
  });

  it('setDemoRole SÍ activa para un OPERADOR y getDemoOverride lo devuelve', () => {
    login(OPERADOR);
    expect(demo.setDemoRole('urbano')).toBe(true);
    expect(demo.getDemoOverride()).toBe('urbano');
    expect(demo.isDemoActive()).toBe(true);
    expect(sessionStore[demo.DEMO_OVERRIDE_KEY]).toBe('urbano');
  });

  it('setDemoRole rechaza un rol inválido aun siendo operador', () => {
    login(OPERADOR);
    expect(demo.setDemoRole('rey_del_universo')).toBe(false);
    expect(demo.getDemoOverride()).toBeNull();
  });

  it('clearDemo borra el override del operador', () => {
    login(OPERADOR);
    demo.setDemoRole('ganadero');
    expect(demo.isDemoActive()).toBe(true);
    demo.clearDemo();
    expect(demo.getDemoOverride()).toBeNull();
    expect(sessionStore[demo.DEMO_OVERRIDE_KEY]).toBeUndefined();
  });
});

describe('demoProfile — applyDemoToSelector (operador simulando cada perfil)', () => {
  beforeEach(async () => {
    stubStorage();
    await importFresh();
    login(OPERADOR);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('al simular un perfil, fuerza esOperador=false (vista de la persona, no bypass)', () => {
    demo.setDemoRole('campesino');
    const out = demo.applyDemoToSelector({ rol: 'whatever' }, { esOperador: true, foo: 1 });
    expect(out.opts.esOperador).toBe(false);
    // Conserva el resto de opts del call-site.
    expect(out.opts.foo).toBe(1);
  });

  it('simular URBANO produce la vista mínima del home (SIN Cerdos/Zonas/Insumos)', () => {
    demo.setDemoRole('urbano');
    // El perfil real del operador da igual: el demo lo sustituye.
    const { profile, opts } = demo.applyDemoToSelector({ rol: 'tecnico' }, { esOperador: true });
    const { visibles, seguimiento } = homeSel.selectHomeModules(profile, opts);
    // Vista urbana: plantas/plagas/bitacora/clima/hoyfinca, nada de zonas/insumos.
    expect(visibles).toContain('plantas');
    expect(visibles).toContain('clima');
    expect(visibles).not.toContain('zonas');
    expect(visibles).not.toContain('insumos');
    // Un urbano NO ve NINGUNA tarjeta de seguimiento (ni Cerdos).
    expect(seguimiento).toEqual([]);
  });

  it('simular GANADERO incluye la tarjeta de Cerdos + silvopastoreo', () => {
    demo.setDemoRole('ganadero');
    const { profile, opts } = demo.applyDemoToSelector({}, {});
    const { seguimiento } = homeSel.selectHomeModules(profile, opts);
    expect(seguimiento).toContain('silvopastoreo');
    expect(seguimiento).toContain('cerdos');
  });

  it('simular RESTAURADOR muestra biodiversidad + reforestación/páramo', () => {
    demo.setDemoRole('restaurador');
    const { profile, opts } = demo.applyDemoToSelector({}, {});
    const { visibles, seguimiento } = homeSel.selectHomeModules(profile, opts);
    expect(visibles).toContain('biodiversidad');
    expect(seguimiento).toContain('reforestacion');
    expect(seguimiento).toContain('paramo');
    // Restaurador no es pecuario: sin Cerdos.
    expect(seguimiento).not.toContain('cerdos');
  });

  it('simular GUÍA DE GLACIAR activa esGuiaGlaciar y da la vista de alta montaña', () => {
    demo.setDemoRole('guia_glaciar');
    const { profile, opts } = demo.applyDemoToSelector({}, {});
    expect(opts.esGuiaGlaciar).toBe(true);
    const { visibles } = homeSel.selectHomeModules(profile, opts);
    // Guía: clima + hoyfinca + biodiversidad (set estrecho de páramo).
    expect(visibles).toContain('clima');
    expect(visibles).toContain('biodiversidad');
    expect(visibles).not.toContain('insumos');
  });

  it('simular TÉCNICO muestra TODO (set amplio), distinto de la vista urbana', () => {
    demo.setDemoRole('tecnico');
    const { profile, opts } = demo.applyDemoToSelector({}, {});
    expect(opts.esGuiaGlaciar).toBe(false);
    const { visibles, seguimiento } = homeSel.selectHomeModules(profile, opts);
    expect(visibles).toContain('insumos');
    expect(visibles).toContain('zonas');
    // El técnico ve las 4 tarjetas de seguimiento.
    expect(seguimiento).toContain('cerdos');
    expect(seguimiento).toContain('silvopastoreo');
    expect(seguimiento).toContain('reforestacion');
    expect(seguimiento).toContain('paramo');
  });

  it('cada perfil simulado da un SET DISTINTO (el switch realmente cambia la vista)', () => {
    const setsFor = (role) => {
      demo.setDemoRole(role);
      const { profile, opts } = demo.applyDemoToSelector({}, {});
      const r = homeSel.selectHomeModules(profile, opts);
      return JSON.stringify([r.visibles, r.seguimiento]);
    };
    const urbano = setsFor('urbano');
    const ganadero = setsFor('ganadero');
    const tecnico = setsFor('tecnico');
    expect(urbano).not.toBe(ganadero);
    expect(ganadero).not.toBe(tecnico);
    expect(urbano).not.toBe(tecnico);
  });

  it('DEMO_ROLES expone los 7 perfiles del brief con metadatos', () => {
    const ids = demo.DEMO_ROLES.map((r) => r.id);
    expect(ids).toEqual([
      'campesino', 'urbano', 'ganadero', 'restaurador', 'guia_glaciar', 'socio', 'tecnico',
    ]);
    for (const r of demo.DEMO_ROLES) {
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(0);
      expect(typeof r.emoji).toBe('string');
    }
  });
});
