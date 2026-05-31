/**
 * conversationMemory.sourceMetadata.test.js
 *
 * Tests del helper puro `computeSourceMetadata`, que determina si un
 * turno del assistant debe quedar persistido como:
 *   - tool_used + grounded=true  (catálogo verificado)
 *   - tool_used + grounded=false (tool corrió pero no hubo match)
 *   - tool_used=null             (LLM puro, sin tool MCP)
 *
 * El ChatBubble renderiza el badge a partir de este metadata.
 */
import { describe, test, expect } from 'vitest';
import { computeSourceMetadata, mergePostValidateMetadata } from '../conversationMemory';

describe('computeSourceMetadata', () => {
  test('null / undefined toolEvidence → no tool, no grounded', () => {
    expect(computeSourceMetadata(null)).toEqual({ tool_used: null, grounded: false });
    expect(computeSourceMetadata(undefined)).toEqual({ tool_used: null, grounded: false });
  });

  test('toolEvidence sin tool field → no tool, no grounded', () => {
    expect(computeSourceMetadata({ tool: null, args: {}, result: {} })).toEqual({
      tool_used: null,
      grounded: false,
    });
  });

  test('found:true → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: { name: 'aguacate' },
      result: { found: true, species: { name: 'Persea americana' } },
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: true });
  });

  test('found:false → tool_used pero no grounded (catálogo no tiene la especie)', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: { name: 'mareñongoño' },
      result: { found: false, hint: 'no en catálogo' },
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  test('available:true → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_biopreparados',
      args: { species: 'tomate' },
      result: { available: true, biopreparados: [{ name: 'caldo bordelés' }] },
    });
    expect(md.grounded).toBe(true);
  });

  test('available:false → no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_biopreparados',
      args: { species: 'X inexistente' },
      result: { available: false },
    });
    expect(md.grounded).toBe(false);
  });

  test('matches_count > 0 → grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_multihop_companions',
      args: { species: 'maíz' },
      result: { matches_count: 5, matches: [{ name: 'frijol' }] },
    });
    expect(md.grounded).toBe(true);
  });

  test('matches_count === 0 → no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_multihop_companions',
      args: { species: 'X' },
      result: { matches_count: 0, matches: [] },
    });
    expect(md.grounded).toBe(false);
  });

  test('result con array no vacío y sin flags explícitos → grounded (heurística)', () => {
    const md = computeSourceMetadata({
      tool: 'get_companions',
      args: { species: 'maíz' },
      result: { companions: [{ name: 'frijol' }, { name: 'auyama' }] },
    });
    expect(md).toEqual({ tool_used: 'get_companions', grounded: true });
  });

  test('result no-object (string) → tool_used pero no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: {},
      result: 'string raro',
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  test('result null → tool_used pero no grounded', () => {
    const md = computeSourceMetadata({
      tool: 'get_species',
      args: {},
      result: null,
    });
    expect(md).toEqual({ tool_used: 'get_species', grounded: false });
  });

  describe('chain #246: array de evidences', () => {
    test('array vacío → no tool, no grounded', () => {
      expect(computeSourceMetadata([])).toEqual({ tool_used: null, grounded: false });
    });

    test('array con todos null → no tool, no grounded', () => {
      expect(computeSourceMetadata([null, null, null])).toEqual({
        tool_used: null,
        grounded: false,
      });
    });

    test('array con mix de null y evidences válidas → ignora nulls, grounded si alguno útil', () => {
      const md = computeSourceMetadata([
        null,
        {
          tool: 'get_species',
          args: { name: 'aguacate' },
          result: { found: true, species: { name: 'Persea americana' } },
        },
        undefined,
      ]);
      expect(md).toEqual({ tool_used: 'get_species', grounded: true });
    });

    test('array con múltiples tools → tool_used concatenados con +', () => {
      const md = computeSourceMetadata([
        {
          tool: 'get_species',
          args: { name: 'maíz' },
          result: { found: true, species: { name: 'Zea mays' } },
        },
        {
          tool: 'get_companions',
          args: { species: 'maíz' },
          result: { companions: [{ name: 'frijol' }] },
        },
      ]);
      expect(md).toEqual({
        tool_used: 'get_species+get_companions',
        grounded: true,
      });
    });

    test('array chain: grounded=true si CUALQUIERA tool devuelve payload útil', () => {
      const md = computeSourceMetadata([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_companions',
          args: { species: 'maíz' },
          result: { companions: [{ name: 'frijol' }] },
        },
      ]);
      expect(md.grounded).toBe(true);
      expect(md.tool_used).toBe('get_species+get_companions');
    });

    test('array chain: grounded=false si NINGUNO tool devuelve payload útil', () => {
      const md = computeSourceMetadata([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_companions',
          args: { species: 'inexistente' },
          result: { matches_count: 0 },
        },
      ]);
      expect(md.grounded).toBe(false);
      expect(md.tool_used).toBe('get_species+get_companions');
    });

    test('array chain: un tool con matches_count >0 hace grounded=true', () => {
      const md = computeSourceMetadata([
        {
          tool: 'get_species',
          args: { name: 'inexistente' },
          result: { found: false },
        },
        {
          tool: 'get_multihop_companions',
          args: { species: 'maíz' },
          result: { matches_count: 3, matches: [{ name: 'frijol' }] },
        },
      ]);
      expect(md.grounded).toBe(true);
    });

    test('array chain: un tool con available:true hace grounded=true', () => {
      const md = computeSourceMetadata([
        {
          tool: 'get_biopreparados',
          args: { species: 'inexistente' },
          result: { available: false },
        },
        {
          tool: 'get_species',
          args: { name: 'aguacate' },
          result: { available: true, species: { name: 'Persea americana' } },
        },
      ]);
      expect(md.grounded).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// FIX 2 (2026-05-31): mergePostValidateMetadata — surfacea suspect[] Y
// hallucinated[] del post-validate. El bug vivo: el PWA solo leía suspect, así
// que un binomio 100% inventado por el modelo se detectaba y se tiraba en
// silencio. Ahora ambos quedan en metadata para que el ChatBubble los muestre.
// ──────────────────────────────────────────────────────────────────────────
describe('mergePostValidateMetadata (FIX 2 — surfacea hallucinated)', () => {
  const base = { tool_used: 'get_pest_controllers', grounded: true };

  test('pv null → devuelve base sin tocar (no advierte si no se pudo verificar)', () => {
    expect(mergePostValidateMetadata(base, null)).toEqual(base);
    expect(mergePostValidateMetadata(base, undefined)).toEqual(base);
  });

  test('age_available !== true → no confía en el veredicto, devuelve base intacto', () => {
    const pv = { hallucinated: ['Neolepidopteron daquila'], suspect: [], age_available: false };
    expect(mergePostValidateMetadata(base, pv)).toEqual(base);
  });

  test('FUGA CERRADA: hallucinated[] con un binomio inventado → hallucinated_names en metadata', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila'],
      suspect: [],
      validated: [],
      age_available: true,
      detected_count: 1,
    };
    const md = mergePostValidateMetadata(base, pv);
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
    // No pierde el metadata de fuente original.
    expect(md.tool_used).toBe('get_pest_controllers');
    expect(md.grounded).toBe(true);
  });

  test('suspect[] sigue surfaceándose (no regresión del badge previo)', () => {
    const pv = { hallucinated: [], suspect: ['Solanum lycopersicum'], age_available: true };
    const md = mergePostValidateMetadata(base, pv);
    expect(md.suspect_names).toEqual(['Solanum lycopersicum']);
    expect(md.hallucinated_names).toBeUndefined();
  });

  test('hallucinated Y suspect a la vez → ambos campos presentes', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila'],
      suspect: ['Solanum lycopersicum'],
      age_available: true,
    };
    const md = mergePostValidateMetadata(base, pv);
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
    expect(md.suspect_names).toEqual(['Solanum lycopersicum']);
  });

  test('arrays vacíos → no añade campos (sin badge espurio)', () => {
    const pv = { hallucinated: [], suspect: [], age_available: true };
    const md = mergePostValidateMetadata(base, pv);
    expect(md.hallucinated_names).toBeUndefined();
    expect(md.suspect_names).toBeUndefined();
    expect(md).toEqual(base);
  });

  test('filtra entradas no-string / vacías del reporte del sidecar', () => {
    const pv = {
      hallucinated: ['Neolepidopteron daquila', '', '   ', null, 42],
      suspect: [],
      age_available: true,
    };
    const md = mergePostValidateMetadata(base, pv);
    expect(md.hallucinated_names).toEqual(['Neolepidopteron daquila']);
  });

  test('no muta el objeto base recibido (puro)', () => {
    const original = { tool_used: 'get_species', grounded: true };
    const snapshot = { ...original };
    mergePostValidateMetadata(original, {
      hallucinated: ['X inventado'],
      suspect: [],
      age_available: true,
    });
    expect(original).toEqual(snapshot);
  });
});
