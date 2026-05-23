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
import { computeSourceMetadata } from '../conversationMemory';

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
});
