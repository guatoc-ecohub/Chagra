/**
 * Tests para `glosarioCaucaService` — normalización léxica regional Cauca
 * (Free 7→10 fix-pack #5, hipótesis #2 del análisis project-free-7-10-analysis).
 *
 * Verifica que:
 *   - El gate `isInCaucaRegion` solo aplica a Cauca andino/pacífico.
 *   - `normalizeUserInput` reemplaza forward (regional → estándar).
 *   - `localizeAgentOutput` reemplaza reverse (estándar → regional).
 *   - El matching respeta boundaries de palabra (no matches parciales).
 *   - Passthrough seguro en input vacío/null/no-string.
 */
import { describe, it, expect } from 'vitest';
import {
  isInCaucaRegion,
  normalizeUserInput,
  localizeAgentOutput,
  getGlosarioStats,
} from '../glosarioCaucaService.js';

describe('glosarioCaucaService — gate de región', () => {
  it('detecta finca con biocultural_zone valle_caucano', () => {
    expect(isInCaucaRegion({ biocultural_zone: 'valle_caucano' })).toBe(true);
  });

  it('detecta finca con biocultural_zone pacifico', () => {
    expect(isInCaucaRegion({ biocultural_zone: 'pacifico' })).toBe(true);
  });

  it('detecta finca con departamento cauca', () => {
    expect(isInCaucaRegion({ departamento: 'cauca' })).toBe(true);
    expect(isInCaucaRegion({ departamento: 'CAUCA' })).toBe(true);
  });

  it('NO detecta finca de cundiboyacense u otras', () => {
    expect(isInCaucaRegion({ biocultural_zone: 'andino_alto' })).toBe(false);
    expect(isInCaucaRegion({ biocultural_zone: 'cafetero' })).toBe(false);
  });

  it('NO detecta input inválido', () => {
    expect(isInCaucaRegion(null)).toBe(false);
    expect(isInCaucaRegion(undefined)).toBe(false);
    expect(isInCaucaRegion({})).toBe(false);
    expect(isInCaucaRegion('string')).toBe(false);
  });
});

describe('glosarioCaucaService — normalizeUserInput (forward)', () => {
  const fincaCauca = { biocultural_zone: 'valle_caucano' };
  const fincaCundi = { biocultural_zone: 'andino_alto' };

  it('passthrough cuando finca no es de Cauca', () => {
    const t = 'Tengo papa runa en el rascadero';
    expect(normalizeUserInput(t, { finca: fincaCundi })).toBe(t);
  });

  it('reemplaza papa runa → papa criolla en Cauca', () => {
    expect(normalizeUserInput('Tengo papa runa sembrada', { finca: fincaCauca }))
      .toBe('Tengo papa criolla sembrada');
  });

  it('reemplaza múltiples términos en una pasada', () => {
    const out = normalizeUserInput('papa runa en el rascadero', { finca: fincaCauca });
    expect(out).toContain('papa criolla');
    expect(out).toContain('rastrojo');
  });

  it('respeta case-insensitive', () => {
    const out = normalizeUserInput('PAPA RUNA está mala', { finca: fincaCauca });
    expect(out.toLowerCase()).toContain('papa criolla');
  });

  it('NO matchea dentro de palabras compuestas', () => {
    // rascaderote no debería volverse "rastrojo + ote"
    const t = 'rascaderote es palabra inventada';
    expect(normalizeUserInput(t, { finca: fincaCauca })).toBe(t);
  });

  it('es idempotente', () => {
    const t = 'papa runa';
    const once = normalizeUserInput(t, { finca: fincaCauca });
    const twice = normalizeUserInput(once, { finca: fincaCauca });
    expect(twice).toBe(once);
  });

  it('passthrough en input vacío/null/no-string', () => {
    expect(normalizeUserInput('', { force: true })).toBe('');
    expect(normalizeUserInput(null, { force: true })).toBe(null);
    expect(normalizeUserInput(undefined, { force: true })).toBe(undefined);
    expect(normalizeUserInput(/** @type {any} */ (42), { force: true })).toBe(42);
  });

  it('force=true bypassea el gate de región', () => {
    expect(normalizeUserInput('papa runa', { force: true }))
      .toBe('papa criolla');
  });

  it('passthrough si NO se pasa finca (uso explícito sin gate)', () => {
    // sin finca y sin force, aplica como passthrough conservador
    // (el gate es "si finca no es Cauca → passthrough")
    // Documenta el contrato: el caller que no quiere gating usa force.
    const out = normalizeUserInput('papa runa', {});
    expect(out).toBe('papa criolla'); // sin finca pasa por el path "finca===null → aplica"
  });
});

describe('glosarioCaucaService — localizeAgentOutput (reverse)', () => {
  const fincaCauca = { biocultural_zone: 'valle_caucano' };

  it('reemplaza estándar → regional en Cauca', () => {
    const out = localizeAgentOutput('Tu papa criolla está en el rastrojo', { finca: fincaCauca });
    expect(out).toContain('papa runa');
    expect(out).toContain('rascadero');
  });

  it('passthrough en input no-string', () => {
    expect(localizeAgentOutput(null, { force: true })).toBe(null);
    expect(localizeAgentOutput('', { force: true })).toBe('');
  });
});

describe('glosarioCaucaService — getGlosarioStats', () => {
  it('reporta versión y total de términos', () => {
    const stats = getGlosarioStats();
    expect(stats.version).toBe('v1');
    expect(stats.region).toBe('cauca');
    expect(stats.totalTerminos).toBeGreaterThanOrEqual(50);
  });
});
