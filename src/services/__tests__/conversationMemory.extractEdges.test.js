/**
 * Tests del helper puro `extractEdges` (A-15 #248), que mapea el toolEvidence
 * de un turno del agente a las aristas del grafo AGE en el shape que el motor
 * E3 (`feedback-to-confidence.mjs`) necesita: {species_id, edge_type, target_id}.
 *
 * El helper es puro (sin red, sin estado) — alimenta el payload del feedback
 * 👍👎 para que la señal se mapee a aristas reales del KG.
 */

import { describe, it, expect } from 'vitest';
import { extractEdges } from '../conversationMemory';

describe('extractEdges', () => {
  it('null/undefined → []', () => {
    expect(extractEdges(null)).toEqual([]);
    expect(extractEdges(undefined)).toEqual([]);
  });

  it('toolEvidence sin result/relaciones → [] (sin regresión)', () => {
    expect(extractEdges({ tool: 'get_species', args: {}, result: { found: true, species: { id: 'x' } } })).toEqual([]);
    expect(extractEdges({ tool: 'get_companions', args: {}, result: null })).toEqual([]);
    expect(extractEdges({ tool: 'get_companions', args: {}, result: { found: false } })).toEqual([]);
  });

  it('get_companions → COMPATIBLE_WITH edges species_id→companion.id', () => {
    const edges = extractEdges({
      tool: 'get_companions',
      args: { species_id: 'coffea_arabica' },
      result: {
        found: true,
        species_id: 'coffea_arabica',
        companions_count: 2,
        companions: [
          { id: 'inga_edulis', nombre_comun: 'guamo' },
          { id: 'musa_paradisiaca', nombre_comun: 'plátano' },
        ],
      },
    });
    expect(edges).toEqual([
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'musa_paradisiaca' },
    ]);
  });

  it('get_multihop_companions → COMPATIBLE_WITH edges', () => {
    const edges = extractEdges({
      tool: 'get_multihop_companions',
      args: { species_id: 'coffea_arabica' },
      result: {
        available: true,
        species_id: 'coffea_arabica',
        companions: [{ id: 'gliricidia_sepium' }],
      },
    });
    expect(edges).toEqual([
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'gliricidia_sepium' },
    ]);
  });

  it('get_pest_controllers → CONTROLS (biopreparado→pest) + TARGETS_PEST (species→pest)', () => {
    const edges = extractEdges({
      tool: 'get_pest_controllers',
      args: { pest: 'broca' },
      result: {
        available: true,
        matches_count: 1,
        matches: [
          {
            pest_id: 'hypothenemus_hampei',
            biopreparados: [{ id: 'beauveria_bassiana' }],
            target_species: [{ id: 'tagetes_erecta' }],
          },
        ],
      },
    });
    expect(edges).toEqual([
      { species_id: 'beauveria_bassiana', edge_type: 'CONTROLS', target_id: 'hypothenemus_hampei' },
      { species_id: 'tagetes_erecta', edge_type: 'TARGETS_PEST', target_id: 'hypothenemus_hampei' },
    ]);
  });

  it('array (tool_chain) → agrega edges de todos los evidences y deduplica', () => {
    const edges = extractEdges([
      {
        tool: 'get_companions',
        args: {},
        result: {
          species_id: 'coffea_arabica',
          companions: [{ id: 'inga_edulis' }],
        },
      },
      {
        // duplicado del primero — debe deduplicarse
        tool: 'get_multihop_companions',
        args: {},
        result: {
          species_id: 'coffea_arabica',
          companions: [{ id: 'inga_edulis' }, { id: 'cordia_alliodora' }],
        },
      },
    ]);
    expect(edges).toEqual([
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'cordia_alliodora' },
    ]);
  });

  it('ignora self-edges y companions sin id string', () => {
    const edges = extractEdges({
      tool: 'get_companions',
      args: {},
      result: {
        species_id: 'coffea_arabica',
        companions: [
          { id: 'coffea_arabica' }, // self → ignorado
          { id: 42 },               // id no string → ignorado
          { nombre_comun: 'x' },    // sin id → ignorado
          { id: 'inga_edulis' },
        ],
      },
    });
    expect(edges).toEqual([
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
    ]);
  });

  it('cota el total de edges (MAX_EDGES=50)', () => {
    const companions = Array.from({ length: 80 }, (_, i) => ({ id: `sp_${i}` }));
    const edges = extractEdges({
      tool: 'get_companions',
      args: {},
      result: { species_id: 'coffea_arabica', companions },
    });
    expect(edges.length).toBe(50);
  });
});
