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
