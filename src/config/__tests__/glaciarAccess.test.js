/**
 * glaciarAccess.test.js — TDD del gate de acceso al módulo glaciar (La Cordada).
 *
 * Cobertura:
 *  - tieneAccesoGlaciar: username en whitelist → true.
 *  - tieneAccesoGlaciar: username fuera de whitelist → false.
 *  - tieneAccesoGlaciar: null / undefined / vacío / solo espacios → false.
 *  - tieneAccesoGlaciar: matching case-insensitive y tolerante a espacios (trim).
 *  - CORDADA_WHITELIST exporta un Set no vacío (editable por el operador).
 *  - tieneAccesoGlaciarActual: lee el tenantId activo de localStorage (offline).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let glaciarAccess;

const importFresh = async () => {
  vi.resetModules();
  return import('../glaciarAccess.js');
};

describe('glaciarAccess — tieneAccesoGlaciar (función pura)', () => {
  beforeEach(async () => {
    glaciarAccess = await importFresh();
  });

  it('devuelve true para usernames de La Cordada', () => {
    expect(glaciarAccess.tieneAccesoGlaciar('alex')).toBe(true);
    expect(glaciarAccess.tieneAccesoGlaciar('mario')).toBe(true);
    expect(glaciarAccess.tieneAccesoGlaciar('camilo')).toBe(true);
  });

  it('devuelve false para usernames fuera de la whitelist', () => {
    expect(glaciarAccess.tieneAccesoGlaciar('admin')).toBe(false);
    expect(glaciarAccess.tieneAccesoGlaciar('campesino_juan')).toBe(false);
    expect(glaciarAccess.tieneAccesoGlaciar('random_user_xyz')).toBe(false);
  });

  it('devuelve false para null/undefined/vacío/solo-espacios (defensive)', () => {
    expect(glaciarAccess.tieneAccesoGlaciar(null)).toBe(false);
    expect(glaciarAccess.tieneAccesoGlaciar(undefined)).toBe(false);
    expect(glaciarAccess.tieneAccesoGlaciar('')).toBe(false);
    expect(glaciarAccess.tieneAccesoGlaciar('   ')).toBe(false);
  });

  it('hace match case-insensitive y tolerante a espacios (trim)', () => {
    expect(glaciarAccess.tieneAccesoGlaciar('Alex')).toBe(true);
    expect(glaciarAccess.tieneAccesoGlaciar('MARIO')).toBe(true);
    expect(glaciarAccess.tieneAccesoGlaciar('  camilo  ')).toBe(true);
    expect(glaciarAccess.tieneAccesoGlaciar(' CaMiLo ')).toBe(true);
  });

  it('CORDADA_WHITELIST es un Set no vacío (editable por el operador)', () => {
    expect(glaciarAccess.CORDADA_WHITELIST).toBeInstanceOf(Set);
    expect(glaciarAccess.CORDADA_WHITELIST.size).toBeGreaterThan(0);
  });
});

describe('glaciarAccess — tieneAccesoGlaciarActual (usuario logueado, offline)', () => {
  let store;

  beforeEach(async () => {
    store = {};
    // Stub de localStorage: simula el username persistido en login SIN red.
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    glaciarAccess = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve true cuando el usuario logueado está en La Cordada', () => {
    store['chagra:active_tenant_id'] = 'mario';
    expect(glaciarAccess.tieneAccesoGlaciarActual()).toBe(true);
  });

  it('devuelve false cuando el usuario logueado NO está en la whitelist', () => {
    store['chagra:active_tenant_id'] = 'usuario_normal';
    expect(glaciarAccess.tieneAccesoGlaciarActual()).toBe(false);
  });

  it('devuelve false cuando no hay sesión activa', () => {
    // store vacío → tenantId = null → sin acceso (default seguro).
    expect(glaciarAccess.tieneAccesoGlaciarActual()).toBe(false);
  });

  it('resuelve offline: solo lee localStorage, sin tocar la red', () => {
    // No mockeamos fetch a propósito: si la función intentara red, fallaría.
    store['chagra:active_tenant_id'] = 'ALEX';
    expect(glaciarAccess.tieneAccesoGlaciarActual()).toBe(true);
  });
});

describe('glaciarAccess — esOperador (bypass de visión total, función pura)', () => {
  beforeEach(async () => {
    // El operador se inyecta por env (anti-leak: no se hardcodea el username real).
    vi.stubEnv('VITE_OPERATOR_USERNAME', 'op-test');
    glaciarAccess = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve true para el operador (segun VITE_OPERATOR_USERNAME)', () => {
    expect(glaciarAccess.esOperador('op-test')).toBe(true);
  });

  it('hace match case-insensitive y tolerante a espacios (trim)', () => {
    expect(glaciarAccess.esOperador('OP-TEST')).toBe(true);
    expect(glaciarAccess.esOperador('  Op-Test  ')).toBe(true);
  });

  it('INVARIANTE: un guía glaciar REAL de la Cordada NO es operador', () => {
    // alex/mario/camilo ven el tile glaciar (Cordada) pero NO tienen visión
    // total: su home sigue estrecho. esOperador debe ser false para ellos.
    expect(glaciarAccess.esOperador('alex')).toBe(false);
    expect(glaciarAccess.esOperador('mario')).toBe(false);
    expect(glaciarAccess.esOperador('camilo')).toBe(false);
  });

  it('devuelve false para usuarios random y para null/undefined/vacío', () => {
    expect(glaciarAccess.esOperador('usuario_normal')).toBe(false);
    expect(glaciarAccess.esOperador(null)).toBe(false);
    expect(glaciarAccess.esOperador(undefined)).toBe(false);
    expect(glaciarAccess.esOperador('')).toBe(false);
    expect(glaciarAccess.esOperador('   ')).toBe(false);
  });

  it('getOperadorWhitelist() es un Set no vacío e independiente de CORDADA', () => {
    const operadores = glaciarAccess.getOperadorWhitelist();
    expect(operadores).toBeInstanceOf(Set);
    expect(operadores.size).toBeGreaterThan(0);
    // Son conceptos distintos: la Cordada (acceso al tile) NO es la whitelist
    // de operador (visión total). alex está en Cordada pero NO es operador.
    expect(glaciarAccess.CORDADA_WHITELIST.has('alex')).toBe(true);
    expect(operadores.has('alex')).toBe(false);
  });
});

describe('glaciarAccess — esOperadorActual (usuario logueado, offline)', () => {
  let store;

  beforeEach(async () => {
    store = {};
    vi.stubEnv('VITE_OPERATOR_USERNAME', 'op-test');
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    glaciarAccess = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('devuelve true cuando el usuario logueado es el operador', () => {
    store['chagra:active_tenant_id'] = 'op-test';
    expect(glaciarAccess.esOperadorActual()).toBe(true);
  });

  it('devuelve false para un guía glaciar real logueado (NO operador)', () => {
    store['chagra:active_tenant_id'] = 'mario';
    expect(glaciarAccess.esOperadorActual()).toBe(false);
  });

  it('devuelve false cuando no hay sesión activa', () => {
    expect(glaciarAccess.esOperadorActual()).toBe(false);
  });
});

describe('glaciarAccess — override local de operador (visión total sin env)', () => {
  let store;

  beforeEach(async () => {
    store = {};
    // SIN VITE_OPERATOR_USERNAME a propósito: simula el build de demo/dev donde
    // la whitelist por env queda vacía (anti-leak). El override local debe ser
    // suficiente para que el operador vea TODO.
    vi.stubEnv('VITE_OPERATOR_USERNAME', '');
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    glaciarAccess = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sin override y sin env: esOperador es false (fallback seguro)', () => {
    expect(glaciarAccess.operatorOverrideActivo()).toBe(false);
    expect(glaciarAccess.esOperador('cualquiera')).toBe(false);
    expect(glaciarAccess.esOperadorActual()).toBe(false);
  });

  it('setOperatorOverride(true) hace esOperador true sin importar el username', () => {
    glaciarAccess.setOperatorOverride(true);
    expect(glaciarAccess.operatorOverrideActivo()).toBe(true);
    // Visión total aunque el username NO esté en ninguna whitelist y aunque
    // no haya sesión (tenantId null) — es justo el caso del demo.
    expect(glaciarAccess.esOperador('usuario_normal')).toBe(true);
    expect(glaciarAccess.esOperador(null)).toBe(true);
    expect(glaciarAccess.esOperadorActual()).toBe(true);
  });

  it('setOperatorOverride(false) revierte a fallback seguro', () => {
    glaciarAccess.setOperatorOverride(true);
    glaciarAccess.setOperatorOverride(false);
    expect(glaciarAccess.operatorOverrideActivo()).toBe(false);
    expect(glaciarAccess.esOperador('usuario_normal')).toBe(false);
  });

  it('el override también abre el tile glaciar (tieneAccesoGlaciar)', () => {
    glaciarAccess.setOperatorOverride(true);
    expect(glaciarAccess.tieneAccesoGlaciar('usuario_normal')).toBe(true);
  });
});
