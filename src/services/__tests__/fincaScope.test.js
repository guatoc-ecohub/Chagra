/**
 * fincaScope.test.js — TDD de la capa de scope por finca (ADR-036 MF-1, #378).
 *
 * Foco: garantizar que con el feature flag VITE_MULTI_FINCA APAGADO (default)
 * la capa es un NO-OP total —comportamiento single-finca idéntico al de hoy,
 * sin riesgo de data-loss— y que con la flag ENCENDIDA el scoping es aditivo,
 * idempotente y conservador (los registros legacy nunca se esconden).
 *
 * El resolutor del slug activo se INYECTA en cada call para mantener las
 * funciones puras (sin depender de zustand/fincaActiveStore en los tests).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importFresh = async () => {
  vi.resetModules();
  return import('../fincaScope.js');
};

const resolver = (slug) => () => slug;

describe('fincaScope — flag OFF (default single-finca, NO-OP)', () => {
  let mod;

  beforeEach(async () => {
    // Sin stub: el flag queda undefined → OFF (default seguro).
    mod = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isMultiFincaEnabled() es false por defecto', () => {
    expect(mod.isMultiFincaEnabled()).toBe(false);
  });

  it('getActiveFincaScope() devuelve null (sentinela single-finca)', () => {
    expect(mod.getActiveFincaScope(resolver('mi-finca'))).toBeNull();
  });

  it('isFincaScopeActive() es false', () => {
    expect(mod.isFincaScopeActive(resolver('mi-finca'))).toBe(false);
  });

  it('stampScope() devuelve el MISMO objeto sin tocarlo (no-op, no muta)', () => {
    const record = { id: 'p1', attributes: { name: 'Tomate' } };
    const out = mod.stampScope(record, resolver('mi-finca'));
    expect(out).toBe(record); // misma referencia
    expect(out).not.toHaveProperty('_finca_id');
  });

  it('scopeMatches() siempre true (todo visible)', () => {
    expect(mod.scopeMatches({ id: 'p1' }, resolver('mi-finca'))).toBe(true);
    expect(mod.scopeMatches({ id: 'p2', _finca_id: 'otra' }, resolver('mi-finca'))).toBe(true);
  });

  it('filterByActiveFinca() devuelve la MISMA lista por referencia', () => {
    const list = [{ id: 'a' }, { id: 'b', _finca_id: 'x' }];
    const out = mod.filterByActiveFinca(list, resolver('mi-finca'));
    expect(out).toBe(list);
  });
});

describe('fincaScope — flag ON (multi-finca activo)', () => {
  let mod;

  beforeEach(async () => {
    vi.stubEnv('VITE_MULTI_FINCA', 'true');
    mod = await importFresh();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isMultiFincaEnabled() es true', () => {
    expect(mod.isMultiFincaEnabled()).toBe(true);
  });

  it('acepta los strings "true" y "1" (case-insensitive, con espacios)', async () => {
    for (const v of ['true', 'TRUE', '  True ', '1']) {
      vi.stubEnv('VITE_MULTI_FINCA', v);
      const m = await importFresh();
      expect(m.isMultiFincaEnabled()).toBe(true);
    }
    for (const v of ['false', '0', 'sí', 'yes', '']) {
      vi.stubEnv('VITE_MULTI_FINCA', v);
      const m = await importFresh();
      expect(m.isMultiFincaEnabled()).toBe(false);
    }
  });

  it('getActiveFincaScope() devuelve el slug activo normalizado (trim)', () => {
    expect(mod.getActiveFincaScope(resolver('  finca-norte  '))).toBe('finca-norte');
  });

  it('getActiveFincaScope() devuelve null si el slug es vacío/solo-espacios/no-string', () => {
    expect(mod.getActiveFincaScope(resolver(''))).toBeNull();
    expect(mod.getActiveFincaScope(resolver('   '))).toBeNull();
    expect(mod.getActiveFincaScope(resolver(null))).toBeNull();
    expect(mod.getActiveFincaScope(resolver(undefined))).toBeNull();
    expect(mod.getActiveFincaScope(resolver(42))).toBeNull();
  });

  it('getActiveFincaScope() degrada a null si el resolver lanza (degradación segura)', () => {
    const throwing = () => { throw new Error('boom'); };
    expect(mod.getActiveFincaScope(throwing)).toBeNull();
  });

  it('isFincaScopeActive() es true cuando hay finca resuelta', () => {
    expect(mod.isFincaScopeActive(resolver('finca-norte'))).toBe(true);
    expect(mod.isFincaScopeActive(resolver(''))).toBe(false);
  });

  it('stampScope() estampa _finca_id en una COPIA sin mutar el original', () => {
    const record = { id: 'p1', attributes: { name: 'Tomate' } };
    const out = mod.stampScope(record, resolver('finca-norte'));
    expect(out).not.toBe(record); // copia, no mutación
    expect(out._finca_id).toBe('finca-norte');
    expect(record).not.toHaveProperty('_finca_id'); // original intacto
  });

  it('stampScope() es idempotente: preserva un _finca_id ya presente', () => {
    const record = { id: 'p2', _finca_id: 'finca-sur' };
    const out = mod.stampScope(record, resolver('finca-norte'));
    expect(out._finca_id).toBe('finca-sur'); // no se pisa
  });

  it('stampScope() no rompe con no-objetos', () => {
    expect(mod.stampScope(null, resolver('finca-norte'))).toBeNull();
    expect(mod.stampScope('x', resolver('finca-norte'))).toBe('x');
  });

  it('scopeMatches() true para registros de la finca activa', () => {
    expect(mod.scopeMatches({ id: 'p1', _finca_id: 'finca-norte' }, resolver('finca-norte'))).toBe(true);
  });

  it('scopeMatches() false para registros de OTRA finca', () => {
    expect(mod.scopeMatches({ id: 'p1', _finca_id: 'finca-sur' }, resolver('finca-norte'))).toBe(false);
  });

  it('scopeMatches() true para registros LEGACY sin _finca_id (nunca esconde datos)', () => {
    expect(mod.scopeMatches({ id: 'legacy' }, resolver('finca-norte'))).toBe(true);
    expect(mod.scopeMatches({ id: 'legacy2', _finca_id: null }, resolver('finca-norte'))).toBe(true);
  });

  it('filterByActiveFinca() deja pasar finca activa + legacy, oculta otras fincas', () => {
    const list = [
      { id: 'own', _finca_id: 'finca-norte' },
      { id: 'legacy' },
      { id: 'foreign', _finca_id: 'finca-sur' },
    ];
    const out = mod.filterByActiveFinca(list, resolver('finca-norte'));
    expect(out.map((r) => r.id)).toEqual(['own', 'legacy']);
  });

  it('NO cross-contamination: cada finca solo ve lo suyo + legacy', () => {
    const universo = [
      { id: 'a1', _finca_id: 'finca-a' },
      { id: 'a2', _finca_id: 'finca-a' },
      { id: 'b1', _finca_id: 'finca-b' },
      { id: 'shared-legacy' },
    ];
    const vistaA = mod.filterByActiveFinca(universo, resolver('finca-a'));
    const vistaB = mod.filterByActiveFinca(universo, resolver('finca-b'));
    expect(vistaA.map((r) => r.id).sort()).toEqual(['a1', 'a2', 'shared-legacy']);
    expect(vistaB.map((r) => r.id).sort()).toEqual(['b1', 'shared-legacy']);
  });

  it('si el scope queda en null (finca vacía), todo vuelve a ser visible (degradación segura)', () => {
    const list = [{ id: 'x', _finca_id: 'finca-a' }, { id: 'y', _finca_id: 'finca-b' }];
    // resolver vacío con flag ON → getActiveFincaScope null → no filtra.
    const out = mod.filterByActiveFinca(list, resolver(''));
    expect(out).toBe(list);
  });
});
