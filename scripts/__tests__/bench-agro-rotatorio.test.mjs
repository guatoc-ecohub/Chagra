import { describe, expect, it } from 'vitest';
import {
  aggregateScores,
  auditGraphParity,
  buildQuestions,
  collectCatalogRelations,
  parseAgeRows,
  rotateSpeciesBySeed,
  scoreResponse,
  selectImportantSpecies,
} from '../lib/bench-agro-rotatorio.mjs';

const species = [
  {
    id: 'solanum_lycopersicum',
    nombre_comun: 'Tomate chonto',
    category: 'hortalizas_fruto',
    cultivable: true,
    roles_in_guild: ['crop'],
    plagas_criticas: [],
  },
  {
    id: 'solanum_lycopersicum_cherry',
    nombre_comun: 'Tomate cherry',
    category: 'hortalizas_fruto',
    cultivable: true,
    roles_in_guild: ['crop'],
    plagas_criticas: ['Tuta absoluta'],
    feeding_plan_template: {
      primary_steps: [{ biofertilizer_slug: 'caldo_bordeles' }],
    },
  },
  {
    id: 'solanum_tuberosum',
    nombre_comun: 'Papa',
    category: 'tuberculos_raices',
    cultivable: true,
    roles_in_guild: ['crop'],
    plagas_criticas: ['Phytophthora infestans'],
  },
  {
    id: 'phaseolus_vulgaris',
    nombre_comun: 'Frijol',
    category: 'leguminosas',
    cultivable: true,
    roles_in_guild: ['crop'],
  },
];

function relationMap(rows) {
  const map = new Map();
  for (const [id, rel, values] of rows) {
    if (!map.has(id)) {
      map.set(id, {
        TARGETS_PEST: new Set(),
        USED_AS_BIOPREPARADO: new Set(),
        SUSCEPTIBLE_TO: new Set(),
      });
    }
    for (const value of values) map.get(id)[rel].add(value);
  }
  return map;
}

describe('bench agro-rotatorio helpers', () => {
  it('rota de forma deterministica por fecha y cubre ventanas distintas en la semana', () => {
    const pool = Array.from({ length: 100 }, (_, i) => ({ id: `sp_${String(i).padStart(3, '0')}` }));
    const monday = rotateSpeciesBySeed(pool, '2026-06-15', 15).map((sp) => sp.id);
    const mondayAgain = rotateSpeciesBySeed(pool, '2026-06-15', 15).map((sp) => sp.id);
    const tuesday = rotateSpeciesBySeed(pool, '2026-06-16', 15).map((sp) => sp.id);

    expect(monday).toEqual(mondayAgain);
    expect(tuesday).not.toEqual(monday);

    const weekSeen = new Set();
    for (const day of ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21']) {
      for (const sp of rotateSpeciesBySeed(pool, day, 15)) weekSeen.add(sp.id);
    }
    expect(weekSeen.size).toBe(100);
  });

  it('parsea filas AGE TSV con agtype quoted', () => {
    const rows = [
      '"solanum_lycopersicum_cherry"\t"TARGETS_PEST"\t"tuta_absoluta"',
      '"solanum_lycopersicum_cherry"\t"USED_AS_BIOPREPARADO"\t"caldo_bordeles"',
      '"solanum_lycopersicum"\t"IGNORED"\t"x"',
    ].join('\n');

    const parsed = parseAgeRows(rows);

    expect(parsed.get('solanum_lycopersicum_cherry').TARGETS_PEST.has('tuta_absoluta')).toBe(true);
    expect(parsed.get('solanum_lycopersicum_cherry').USED_AS_BIOPREPARADO.has('caldo_bordeles')).toBe(true);
    expect(parsed.has('solanum_lycopersicum')).toBe(false);
  });

  it('detecta desconexion base-variedad como el hueco del tomate', () => {
    const relations = relationMap([
      ['solanum_lycopersicum_cherry', 'TARGETS_PEST', ['tuta_absoluta']],
      ['solanum_lycopersicum_cherry', 'USED_AS_BIOPREPARADO', ['caldo_bordeles']],
    ]);

    const audit = auditGraphParity(species, relations);

    expect(audit.disconnections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        group: 'base:solanum_lycopersicum',
        species_id: 'solanum_lycopersicum',
        relation: 'TARGETS_PEST',
        target: 'tuta_absoluta',
      }),
      expect.objectContaining({
        species_id: 'solanum_lycopersicum',
        relation: 'USED_AS_BIOPREPARADO',
        target: 'caldo_bordeles',
      }),
    ]));
    expect(audit.graphConsistencyPct).toBeLessThan(100);
  });

  it('extrae relaciones del catalogo para fallback documental', () => {
    const relations = collectCatalogRelations(species);

    expect(relations.get('solanum_lycopersicum_cherry').TARGETS_PEST.has('tuta_absoluta')).toBe(true);
    expect(relations.get('solanum_lycopersicum_cherry').USED_AS_BIOPREPARADO.has('caldo_bordeles')).toBe(true);
    expect(relations.get('solanum_tuberosum').TARGETS_PEST.has('phytophthora_infestans')).toBe(true);
  });

  it('prioriza especies cultivables con variedad, plagas y rol crop', () => {
    const selected = selectImportantSpecies(species, 2).map((sp) => sp.id);

    expect(selected[0]).toBe('solanum_lycopersicum_cherry');
    expect(selected).toContain('solanum_tuberosum');
  });

  it('construye preguntas con grounding y puntua grounded/subespecie', () => {
    const relations = relationMap([
      ['solanum_lycopersicum_cherry', 'TARGETS_PEST', ['tuta_absoluta']],
      ['solanum_lycopersicum_cherry', 'USED_AS_BIOPREPARADO', ['caldo_bordeles']],
    ]);
    const [question] = buildQuestions([species[1]], relations, 1);
    const score = scoreResponse({
      question,
      response: 'Para tomate cherry con tuta absoluta use caldo bordeles y monitoreo.',
      knownEntities: new Set(['solanum_lycopersicum_cherry', 'tuta_absoluta', 'caldo_bordeles']),
    });

    expect(question.prompt).toContain('Tomate cherry');
    expect(score.grounded).toBe(true);
    expect(score.speciesOk).toBe(true);
    expect(score.hallucinated).toEqual([]);
  });

  it('marca alucinacion dura cuando aparece entidad slug desconocida', () => {
    const relations = relationMap([
      ['solanum_lycopersicum_cherry', 'TARGETS_PEST', ['tuta_absoluta']],
    ]);
    const [question] = buildQuestions([species[1]], relations, 1);
    const score = scoreResponse({
      question,
      response: 'Use producto_milagroso_x para solanum_lycopersicum_cherry.',
      knownEntities: new Set(['solanum_lycopersicum_cherry', 'tuta_absoluta']),
    });

    expect(score.hallucinated).toEqual(['producto_milagroso_x']);
  });

  it('agrega metricas del historial en el shape esperado', () => {
    const graphAudit = {
      graphConsistencyPct: 75,
      disconnections: [{ id: 1 }, { id: 2 }],
    };
    const metrics = aggregateScores([
      { score: { grounded: true, speciesOk: true, hallucinated: [] } },
      { score: { grounded: false, speciesOk: true, hallucinated: ['x_y'] } },
    ], graphAudit);

    expect(metrics).toMatchObject({
      graph_consistency_pct: 75,
      grounded_pct: 50,
      hallucinations: 1,
      subspecies_disconnections: 2,
      subspecies_ok_pct: 100,
    });
    expect(metrics.score_global).toBeGreaterThan(0);
  });
});
