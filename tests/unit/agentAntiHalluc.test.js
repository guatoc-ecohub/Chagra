/**
 * agentAntiHalluc.test.js — guardas anti-alucinación del prompt del agente
 * (FALLAS del juez claude-cli 2026-06-02).
 *
 * P1 — gating de precio DOMINANTE: cuando la query es intent de PRECIO y la
 *      evidencia de precio dice no-disponible, `buildPriceDeclineContext` debe
 *      forzar el decline + orientación DANE/SIPSA/Corabastos como regla de
 *      máxima prioridad, e ir al FINAL del prompt (recency) para no competir
 *      con el bloque de entidades resueltas / viabilidad / altitud.
 *
 * P4 — baja confianza como SUGERENCIA: una entidad resuelta por fuzzy a 0.5
 *      (p.ej. "culupa"→Gulupa) NO se presenta como canónica; se presenta como
 *      POSIBLE COINCIDENCIA y `buildSuggestedEntitiesContext` instruye CASO B
 *      ("¿quisiste decir X?") en vez de afirmar la altitud.
 *
 * Sigue el patrón de tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPriceDeclineContext,
  buildSuggestedEntitiesContext,
  isLowConfidenceEntity,
  LOW_CONFIDENCE_THRESHOLD,
} from '../../src/services/agentService.js';

// ── P1 — gating de precio dominante ─────────────────────────────────────────

describe('buildPriceDeclineContext — P1 precio no-disponible dominante', () => {
  const priceMiss = {
    tool: 'get_precio_sipsa',
    args: { producto: 'papa' },
    result: { available: false, hint: 'no inventes precios, orienta al ZIP DANE' },
  };

  it('precio-intent + evidencia no-disponible → fuerza decline + DANE/SIPSA/Corabastos', () => {
    const block = buildPriceDeclineContext({
      userMessage: '¿a cómo está la papa?',
      toolEvidence: priceMiss,
    });
    expect(block).not.toBe('');
    // Debe declinar el precio y orientar a las fuentes reales.
    expect(block).toMatch(/SIPSA/);
    expect(block).toMatch(/DANE/);
    expect(block).toMatch(/Corabastos/);
    expect(block).toMatch(/MÁXIMA PRIORIDAD/);
    // Debe instruir NO inventar precios y NO derivar a viabilidad/altitud.
    expect(block.toLowerCase()).toMatch(/no.*invent.*precio/);
    expect(block.toLowerCase()).toMatch(/viabilidad|altitud/);
  });

  it('"cuánto vale el aguacate" también dispara el decline', () => {
    const block = buildPriceDeclineContext({
      userMessage: 'cuánto vale el aguacate hoy',
      toolEvidence: { tool: 'get_precio_sipsa', result: { available: false } },
    });
    expect(block).not.toBe('');
  });

  it('NO dispara si la query NO es de precio (intent siembra)', () => {
    const block = buildPriceDeclineContext({
      userMessage: 'qué puedo sembrar a 2000 msnm',
      toolEvidence: priceMiss,
    });
    expect(block).toBe('');
  });

  it('NO dispara si el tool de precio SÍ trajo dato (available !== false)', () => {
    const block = buildPriceDeclineContext({
      userMessage: '¿a cómo está la papa?',
      toolEvidence: { tool: 'get_precio_sipsa', result: { available: true, precio: 1800 } },
    });
    expect(block).toBe('');
  });

  it('NO dispara sin evidencia de precio (otro tool)', () => {
    const block = buildPriceDeclineContext({
      userMessage: '¿a cómo está la papa?',
      toolEvidence: { tool: 'get_species', result: { available: false } },
    });
    expect(block).toBe('');
  });

  it('soporta tool_chain (array de evidences)', () => {
    const block = buildPriceDeclineContext({
      userMessage: 'a cómo está la papa',
      toolEvidence: [
        { tool: 'get_species', result: { found: true } },
        { tool: 'get_precio_sipsa', result: { available: false } },
      ],
    });
    expect(block).not.toBe('');
  });

  it('null-safe: sin argumentos → ""', () => {
    expect(buildPriceDeclineContext()).toBe('');
    expect(buildPriceDeclineContext({})).toBe('');
  });
});

// ── P4 — baja confianza como sugerencia (CASO B) ─────────────────────────────

describe('isLowConfidenceEntity — clasificación de sugerencias', () => {
  it('umbral expuesto = 0.7', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  it('confidence 0.5 sin flag → baja confianza', () => {
    expect(isLowConfidenceEntity({ confidence: 0.5, nombre_comun: 'Gulupa' })).toBe(true);
  });

  it('confidence 0.9 → NO baja confianza', () => {
    expect(isLowConfidenceEntity({ confidence: 0.9, nombre_comun: 'Papa' })).toBe(false);
  });

  it('flag low_confidence:true gana aunque confidence venga alta (defensivo)', () => {
    expect(isLowConfidenceEntity({ confidence: 0.95, low_confidence: true })).toBe(true);
  });

  it('flags suggested/fuzzy/ambiguous también marcan baja confianza', () => {
    expect(isLowConfidenceEntity({ confidence: 0.6, suggested: true })).toBe(true);
    expect(isLowConfidenceEntity({ confidence: 0.6, fuzzy: true })).toBe(true);
    expect(isLowConfidenceEntity({ confidence: 0.6, ambiguous: true })).toBe(true);
  });

  it('justo en el umbral (0.7) → canónica (NO baja confianza)', () => {
    expect(isLowConfidenceEntity({ confidence: 0.7, nombre_comun: 'X' })).toBe(false);
  });
});

describe('buildSuggestedEntitiesContext — P4 Culupa→Gulupa sugerencia', () => {
  const culupa = {
    mentioned: 'Culupa',
    kind: 'species',
    canonical_id: 'passiflora_edulis',
    nombre_comun: 'Gulupa',
    nombre_cientifico: 'Passiflora edulis f. edulis Sims',
    confidence: 0.5,
    fuzzy: true,
    suggested: true,
    low_confidence: true,
    altitud_min: 1700,
    altitud_max: 2200,
  };

  it('entidad fuzzy 0.5 → bloque de POSIBLES COINCIDENCIAS que obliga CASO B', () => {
    const block = buildSuggestedEntitiesContext({ suggestedEntities: [culupa] });
    expect(block).not.toBe('');
    expect(block).toMatch(/POSIBLES COINCIDENCIAS/);
    expect(block).toMatch(/BAJA CONFIANZA/);
    // Debe nombrar lo que escribió + la posible coincidencia.
    expect(block).toMatch(/Culupa/);
    expect(block).toMatch(/Gulupa/);
    // Debe instruir preguntar (CASO B), no afirmar.
    expect(block).toMatch(/CASO B/);
    expect(block.toLowerCase()).toMatch(/quisiste decir/);
    // Debe prohibir afirmar la altitud como hecho.
    expect(block.toLowerCase()).toMatch(/no afirmes.*(altitud|hecho)|altitud/);
  });

  it('lista vacía / null → "" (no contamina el prompt)', () => {
    expect(buildSuggestedEntitiesContext({ suggestedEntities: [] })).toBe('');
    expect(buildSuggestedEntitiesContext({ suggestedEntities: null })).toBe('');
    expect(buildSuggestedEntitiesContext()).toBe('');
  });

  it('dedup por mentioned+nombre y descarta entradas sin nombre_comun', () => {
    const block = buildSuggestedEntitiesContext({
      suggestedEntities: [
        culupa,
        { ...culupa }, // duplicado exacto
        { mentioned: 'xyz', confidence: 0.4 }, // sin nombre_comun → descartada
      ],
    });
    // "Gulupa" aparece una sola vez pese al duplicado.
    const occurrences = (block.match(/Gulupa/g) || []).length;
    expect(occurrences).toBe(1);
  });
});
