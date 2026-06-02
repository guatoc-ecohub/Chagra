/**
 * outputGuards.taxonomy.test.js — GUARD ASYNC: auto-validación taxonómica (A24).
 *
 * `applyTaxonomyGuard` extrae binomios Linneanos de la respuesta del LLM,
 * los valida contra el catálogo vía `validate_taxonomy` (sidecar), y, si el
 * tool confirma que un binomio NO existe en el catálogo, ANEXA una corrección
 * honesta al final del texto.
 *
 * Casos cubiertos:
 *  1. Binomio inválido detectado → corrección anexada.
 *  2. Binomio válido → no se toca nada.
 *  3. Tool caído (callTool devuelve null) → no-op (no rompe respuestas).
 *  4. Binomio ya grounded en resolvedEntities → no se valida (evita dups con guards 5/5b).
 *  5. Sin binomios en el texto → no-op.
 *  6. Texto vacío / no-string → no-op.
 *  7. Múltiples binomios: invalida solo los confirmados inválidos.
 *  8. Idempotencia: si la corrección ya está aplicada, no re-dispara.
 *
 * Mock: callTool inyectado por argumento (no red real, no sidecar).
 */

import { describe, it, expect, vi } from 'vitest';
import { applyTaxonomyGuard } from '../outputGuards.js';

// ── helpers de mock ──────────────────────────────────────────────────────────

/** Mock de callTool que marca los binomios dados como inválidos en el catálogo. */
function mockCallToolInvalid(invalidBinomials) {
  return vi.fn(async (toolName, args) => {
    if (toolName !== 'validate_taxonomy') return null;
    const sci = (args.species_scientific || '').toLowerCase();
    const isInvalid = invalidBinomials.some((b) => sci.includes(b.toLowerCase()));
    return {
      valid: !isInvalid,
      canonical_id: isInvalid ? null : 'some_id',
      canonical_name: isInvalid ? null : args.species_scientific,
    };
  });
}

/** Mock de callTool que marca todos como válidos. */
function mockCallToolAllValid() {
  return vi.fn(async () => ({
    valid: true,
    canonical_id: 'some_id',
    canonical_name: 'Something validum',
  }));
}

/** Mock de callTool que siempre falla (tool caído). */
function mockCallToolDown() {
  return vi.fn(async () => null);
}

/** Entidad resuelta de grounding con binomio dado. */
function groundedEntity(nombreCientifico, nombreComun = 'especie') {
  return {
    kind: 'species',
    nombre_comun: nombreComun,
    nombre_cientifico: nombreCientifico,
    mentioned: nombreComun,
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('applyTaxonomyGuard', () => {
  // ── CASO 1: binomio inválido → corrección ──────────────────────────────────
  it('binomio inválido confirmado por el tool → anexa corrección honesta', async () => {
    const text =
      'El tomate de árbol (Inventus fakeus) se siembra entre 1500 y 2500 msnm.';
    const callTool = mockCallToolInvalid(['inventus fakeus']);

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(true);
    expect(result.reason).toMatch(/taxonom/i);
    // La corrección honesta menciona el binomio cuestionado
    expect(result.text).toContain('Inventus fakeus');
    // Y explica que no está en el catálogo
    expect(result.text).toMatch(/catálogo|no se encontró/i);
    // El texto original se preserva (la corrección se ANEXA al final)
    expect(result.text).toContain('tomate de árbol');
    expect(result.text).toContain('1500 y 2500 msnm');
  });

  // ── CASO 2: binomio válido → no se toca ───────────────────────────────────
  it('binomio válido confirmado por el tool → no-op', async () => {
    const text =
      'El tomate de árbol (Solanum betaceum) crece bien a 2000 msnm.';
    const callTool = mockCallToolAllValid();

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
    expect(result.reason).toBeNull();
  });

  // ── CASO 3: tool caído → no-op ─────────────────────────────────────────────
  it('tool caído (callTool devuelve null) → no-op conservador', async () => {
    const text =
      'El lulo (Inventus inventus) se siembra en clima frío.';
    const callTool = mockCallToolDown();

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
  });

  // ── CASO 4: binomio ya grounded → no se re-valida ─────────────────────────
  it('binomio que ya viene en resolvedEntities (grounded) → no se llama callTool', async () => {
    const text =
      'El café (Coffea arabica) es ideal para piso cafetero.';
    const callTool = mockCallToolInvalid(['coffea arabica']);
    const resolvedEntities = [
      groundedEntity('Coffea arabica Linn.', 'café'),
    ];

    const result = await applyTaxonomyGuard(text, { callTool, resolvedEntities });

    // Coffea arabica está en el grounding → no se valida → no se modifica
    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
    // callTool no debe haber sido llamado para este binomio
    expect(callTool).not.toHaveBeenCalled();
  });

  // ── CASO 5: sin binomios en el texto → no-op ──────────────────────────────
  it('texto sin binomios científicos → no-op, callTool no llamado', async () => {
    const text = 'El tomate se siembra después de la lluvia. Abónalo bien.';
    const callTool = vi.fn();

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
    expect(callTool).not.toHaveBeenCalled();
  });

  // ── CASO 6: texto vacío / no-string → no-op ───────────────────────────────
  it('texto vacío → no-op, devuelve { text: "", modified: false, reason: null }', async () => {
    const callTool = vi.fn();
    const r1 = await applyTaxonomyGuard('', { callTool });
    expect(r1.modified).toBe(false);
    expect(r1.text).toBe('');
    expect(r1.reason).toBeNull();
    expect(callTool).not.toHaveBeenCalled();
  });

  it('text no-string → no-op graceful', async () => {
    const callTool = vi.fn();
    const r = await applyTaxonomyGuard(null, { callTool });
    expect(r.modified).toBe(false);
    expect(r.text).toBe('');
    expect(callTool).not.toHaveBeenCalled();
  });

  // ── CASO 7: múltiples binomios, solo invalida los confirmados ─────────────
  it('múltiples binomios: valida solo los no-grounded, corrige solo los inválidos', async () => {
    // Texto con 3 binomios:
    //   - Coffea arabica: grounded (en resolvedEntities) → no se valida
    //   - Solanum betaceum: válido en catálogo (callTool devuelve valid:true)
    //   - Inventus fakeus: INVÁLIDO
    const text =
      'El café (Coffea arabica) y el tomate de árbol (Solanum betaceum) son buenos cultivos. ' +
      'También mencionó Inventus fakeus para las plagas.';
    const callTool = mockCallToolInvalid(['inventus fakeus']);
    const resolvedEntities = [groundedEntity('Coffea arabica Linn.', 'café')];

    const result = await applyTaxonomyGuard(text, { callTool, resolvedEntities });

    expect(result.modified).toBe(true);
    // Coffea arabica no debe disparar callTool (grounded)
    const calls = callTool.mock.calls;
    expect(calls.every((c) => !(c[1]?.species_scientific || '').toLowerCase().includes('coffea'))).toBe(true);
    // La corrección menciona el inválido
    expect(result.text).toContain('Inventus fakeus');
    // El texto original se preserva intacto
    expect(result.text).toContain('Solanum betaceum');
    expect(result.text).toContain('tomate de árbol');
  });

  // ── CASO 8: idempotencia ──────────────────────────────────────────────────
  it('idempotencia: si la corrección ya está aplicada, no re-dispara', async () => {
    const text =
      'El tomate de árbol (Inventus fakeus) se siembra a 2000 msnm.\n\n' +
      'Nota taxonómica: el binomio "Inventus fakeus" no se encontró en el catálogo Chagra.';
    const callTool = mockCallToolInvalid(['inventus fakeus']);

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
  });

  // ── coordinación con guards 5/5b: no duplicar binomios de companions ──────
  it('binomio companion de una entidad resuelta también se salta (grounding completo)', async () => {
    // Companion trae su propio nombre_cientifico → debe contarse como grounded
    const text =
      'El maíz (Zea mays) va bien con el fríjol (Phaseolus vulgaris).';
    const callTool = mockCallToolInvalid(['phaseolus vulgaris']);
    const resolvedEntities = [
      {
        kind: 'species',
        nombre_comun: 'maíz',
        nombre_cientifico: 'Zea mays L.',
        mentioned: 'maíz',
        companions: [
          {
            nombre_comun: 'fríjol',
            nombre_cientifico: 'Phaseolus vulgaris L.',
          },
        ],
      },
    ];

    const result = await applyTaxonomyGuard(text, { callTool, resolvedEntities });

    expect(result.modified).toBe(false);
    // Phaseolus vulgaris está en el grounding de companion → no se llama el tool
    expect(callTool).not.toHaveBeenCalled();
  });

  // ── callTool no inyectado → no-op graceful ────────────────────────────────
  it('sin callTool inyectado (undefined) → no-op graceful', async () => {
    const text = 'Inventus fakeus es la especie recomendada.';
    const result = await applyTaxonomyGuard(text, {});
    expect(result.modified).toBe(false);
    expect(result.text).toBe(text);
  });

  // ── pares prosa española (falsos positivos) → no se validan ───────────────
  it('prosa española capitalizada no se trata como binomio', async () => {
    // "Sin embargo", "La papa", "Estos cultivos" no son binomios.
    const text = 'Sin embargo, la papa es viable. Estos cultivos no tienen problema.';
    const callTool = vi.fn();

    const result = await applyTaxonomyGuard(text, { callTool });

    expect(result.modified).toBe(false);
    expect(callTool).not.toHaveBeenCalled();
  });

  // ── telemetría: bump cuando modifica ─────────────────────────────────────
  it('dispara telemetría cuando corrige', async () => {
    const text = 'El tomate de árbol es Inventus fakeus.';
    const callTool = mockCallToolInvalid(['inventus fakeus']);

    const { getOutputGuardTelemetry, resetOutputGuardTelemetry } = await import('../outputGuards.js');
    resetOutputGuardTelemetry();

    await applyTaxonomyGuard(text, { callTool });

    const telemetry = getOutputGuardTelemetry();
    expect(telemetry['auto_taxonomy']).toBeGreaterThan(0);
  });
});
