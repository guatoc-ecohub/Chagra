import { describe, expect, it } from 'vitest';
import {
  HARD_CASE_GROUPS,
  buildHardCases,
  buildQueryExamples,
  buildReportMarkdown,
  buildSpeciesDocs,
  buildSpeciesText,
  evaluateModel,
  parseGraphRows,
  summarizeRanking,
} from '../bench-embedders.mjs';

describe('bench-embedders helpers', () => {
  it('parseGraphRows limpia lineas de psql y parsea mapas agtype', () => {
    const rows = parseGraphRows(`
LOAD
SET
{"species_id":"solanum_phureja","query":"papa criolla","source":"nombres_comunes"}
{"species_id":"carica_papaya","query":"papaya","source":"RegionalLabel"}
`);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      species_id: 'solanum_phureja',
      query: 'papa criolla',
      source: 'nombres_comunes',
    });
    expect(rows[1]).toEqual({
      species_id: 'carica_papaya',
      query: 'papaya',
      source: 'RegionalLabel',
    });
  });

  it('buildSpeciesText incorpora nombres y aliases sin duplicar ruido', () => {
    const text = buildSpeciesText({
      id: 'solanum_phureja',
      nombre_comun: 'Papa criolla',
      nombre_cientifico: 'Solanum phureja Juz. & Bukasov',
      familia_botanica: 'Solanaceae',
      category: 'tuberculos_raices',
      nombres_comunes: ['Papa criolla', 'Criolla'],
    });

    expect(text).toContain('solanum_phureja');
    expect(text).toContain('Papa criolla');
    expect(text).toContain('Solanum phureja Juz. & Bukasov');
    expect(text).toContain('Solanaceae');
  });

  it('buildSpeciesDocs deduplica especies por id', () => {
    const docs = buildSpeciesDocs([
      { species: { id: 'a', nombre_comun: 'Tomate', nombre_cientifico: 'Solanum lycopersicum' } },
      { species: { id: 'a', nombre_comun: 'Tomate', nombre_cientifico: 'Solanum lycopersicum' } },
      { species: { id: 'b', nombre_comun: 'Papa', nombre_cientifico: 'Solanum phureja' } },
    ]);

    expect(docs).toHaveLength(2);
    expect(docs.map((doc) => doc.id)).toEqual(['a', 'b']);
  });

  it('buildQueryExamples deduplica por fuente, query y expected', () => {
    const rows = buildQueryExamples([
      { species_id: 'a', query: 'Tomate', source: 'RegionalLabel' },
      { species_id: 'a', query: 'tomate', source: 'RegionalLabel' },
      { species_id: 'b', query: 'Papa criolla', source: 'nombres_comunes' },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({
      expected: 'a',
      source: 'RegionalLabel',
    }));
    expect(rows[1]).toEqual(expect.objectContaining({
      expected: 'b',
      source: 'nombres_comunes',
    }));
  });

  it('buildHardCases cubre los grupos confusables esperados', () => {
    const hardCases = buildHardCases();
    expect(HARD_CASE_GROUPS).toHaveLength(5);
    expect(hardCases.some((item) => item.expected === 'solanum_betaceum')).toBe(true);
    expect(hardCases.some((item) => item.expected === 'vasconcellea_pubescens')).toBe(true);
    expect(hardCases.some((item) => item.expected === 'brassica_oleracea_botrytis')).toBe(true);
  });

  it('evaluateModel calcula recall y cortes por fuente con un embedder fake', async () => {
    const docs = [
      { id: 'solanum_lycopersicum', text: 'solanum_lycopersicum tomate tomate de mesa' },
      { id: 'solanum_phureja', text: 'solanum_phureja papa criolla' },
      { id: 'carica_papaya', text: 'carica_papaya papaya' },
    ];
    const queries = [
      { query: 'tomate', expected: 'solanum_lycopersicum', source: 'RegionalLabel' },
      { query: 'papa criolla', expected: 'solanum_phureja', source: 'nombres_comunes' },
      { query: 'papaya', expected: 'carica_papaya', source: 'hard:papa-papaya-papayuela', groupId: 'papa-papaya-papayuela' },
    ];
    const embedFn = async (_model, text) => {
      if (/carica_papaya|papaya/.test(text)) return { vector: [0, 0, 1], latencyMs: 4 };
      if (/solanum_phureja|papa criolla|\bpapa\b/.test(text)) return { vector: [0, 1, 0], latencyMs: 4 };
      if (/solanum_lycopersicum|tomate/.test(text)) return { vector: [1, 0, 0], latencyMs: 4 };
      return { vector: [1, 0, 0], latencyMs: 4 };
    };

    const result = await evaluateModel({
      model: 'fake',
      docs,
      queries,
      embedFn,
      concurrency: 1,
    });

    expect(result.metrics.recall_at_1).toBe(100);
    expect(result.metrics.recall_at_5).toBe(100);
    expect(result.metrics.hard_case_recall_at_1).toBe(100);
    expect(result.bySource.RegionalLabel.recall_at_1).toBe(100);
    expect(result.bySource.nombres_comunes.recall_at_1).toBe(100);
    expect(result.bySource.hard.recall_at_1).toBe(100);
    expect(result.rows).toHaveLength(3);
  });

  it('buildReportMarkdown renderiza la tabla principal y los grupos', () => {
    const md = buildReportMarkdown({
      productionModel: 'snowflake-arctic-embed2',
      productionSource: 'fallback',
      installedModels: ['snowflake-arctic-embed2'],
      results: [
        {
          model: 'snowflake-arctic-embed2',
          metrics: {
            recall_at_1: 10,
            recall_at_5: 20,
            mrr: 0.3,
            hard_case_recall_at_1: 25,
            hard_case_recall_at_5: 50,
            hard_case_mrr: 0.4,
            doc_embed_avg_ms: 11.1,
            query_embed_avg_ms: 12.2,
          },
        },
      ],
      dataset: { docs: [{ id: 'a' }], queries: [{ query: 'x' }], hardCases: [{ query: 'y' }] },
      graphCounts: { RegionalLabel: 1, nombres_comunes: 1 },
      generatedAt: '2026-07-15T00:00:00.000Z',
    });

    expect(md).toContain('# Bench de embedders');
    expect(md).toContain('| Model | recall@1 | delta | recall@5 | delta | MRR | delta | hard@1 | hard@5 | hard MRR | doc embed ms | query embed ms |');
    expect(md).toContain('Baseline row: snowflake-arctic-embed2');
    expect(md).toContain('papa, papaya y papayuela');
    expect(md).toContain('solanum_lycopersicum');
  });
});
