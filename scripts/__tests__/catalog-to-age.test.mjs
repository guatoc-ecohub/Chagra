/**
 * scripts/__tests__/catalog-to-age.test.mjs
 *
 * Cobertura unitaria del importer Catalog → Apache AGE POC. NO toca la red
 * ni postgres real; verifica únicamente que la función pura `buildSqlScript`
 * y sus helpers producen SQL Cypher determinista y bien-formado a partir
 * de fixtures sintéticos + del seed real (parcial).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  cypherLiteral,
  truncText,
  normalizeOrigen,
  normalizePest,
  emitNode,
  emitRel,
  wrapCypher,
  buildSqlScript,
} from '../catalog-to-age.mjs';

describe('cypherLiteral', () => {
  it('mapea null/undefined a literal null', () => {
    expect(cypherLiteral(null)).toBe('null');
    expect(cypherLiteral(undefined)).toBe('null');
  });

  it('mapea booleanos a true/false', () => {
    expect(cypherLiteral(true)).toBe('true');
    expect(cypherLiteral(false)).toBe('false');
  });

  it('mapea números finitos directo', () => {
    expect(cypherLiteral(0)).toBe('0');
    expect(cypherLiteral(42)).toBe('42');
    expect(cypherLiteral(-3.14)).toBe('-3.14');
  });

  it('mapea NaN/Infinity a null para no romper Cypher', () => {
    expect(cypherLiteral(NaN)).toBe('null');
    expect(cypherLiteral(Infinity)).toBe('null');
  });

  it('escapa comillas simples doblándolas (regla SQL/Cypher)', () => {
    expect(cypherLiteral("d'agua")).toBe("'d''agua'");
    expect(cypherLiteral("Restrepo's bocashi")).toBe("'Restrepo''s bocashi'");
  });

  it('serializa arrays/objetos como string JSON saneado', () => {
    const out = cypherLiteral([1, 2, 3]);
    expect(out.startsWith("'") && out.endsWith("'")).toBe(true);
    expect(out).toContain('1,2,3');
  });
});

describe('truncText', () => {
  it('devuelve null para null/undefined', () => {
    expect(truncText(null)).toBeNull();
    expect(truncText(undefined)).toBeNull();
  });

  it('no toca strings dentro del límite', () => {
    expect(truncText('hola', 10)).toBe('hola');
  });

  it('trunca con elipsis textual fuera del límite', () => {
    const out = truncText('abcdefghij', 6);
    expect(out).toHaveLength(6);
    expect(out.endsWith('...')).toBe(true);
  });
});

describe('normalizeOrigen', () => {
  it('devuelve null para empty', () => {
    expect(normalizeOrigen('')).toBeNull();
    expect(normalizeOrigen(null)).toBeNull();
  });

  it('extrae las primeras 4 palabras slug-ified', () => {
    expect(normalizeOrigen('Sudeste de Australia (Tasmania)')).toBe('sudeste_de_australia_tasmania');
  });

  it('strip de acentos', () => {
    // "región andina central" → "region_andina_central"
    expect(normalizeOrigen('región andina central de Colombia'))
      .toBe('region_andina_central_de');
  });
});

describe('normalizePest', () => {
  it('slug-ifica nombres científicos', () => {
    expect(normalizePest('Hypothenemus hampei (broca)')).toBe('hypothenemus_hampei_broca');
  });

  it('devuelve null para empty', () => {
    expect(normalizePest('')).toBeNull();
  });
});

describe('emitNode', () => {
  it('genera MERGE con SET cuando hay propiedades', () => {
    const out = emitNode('Species', { id: 'zea_mays', nombre_comun: 'Maíz' });
    expect(out).toContain('MERGE (n:Species {id: \'zea_mays\'})');
    expect(out).toContain("nombre_comun: 'Maíz'");
  });

  it('omite SET si solo viene id', () => {
    const out = emitNode('PisoTermico', { id: 'templado' });
    expect(out).toBe("MERGE (n:PisoTermico {id: 'templado'})");
  });

  it('descarta null/undefined/empty en SET', () => {
    const out = emitNode('Species', { id: 'x', a: null, b: undefined, c: '', d: 'ok' });
    expect(out).toContain('d: \'ok\'');
    expect(out).not.toContain('a:');
    expect(out).not.toContain('b:');
    expect(out).not.toContain('c:');
  });

  it('explota si falta id', () => {
    expect(() => emitNode('Species', {})).toThrow(/missing id/);
  });
});

describe('emitRel', () => {
  it('genera MATCH+MATCH+MERGE sin props', () => {
    const out = emitRel(
      { label: 'Species', id: 'a' },
      'COMPATIBLE_WITH',
      { label: 'Species', id: 'b' },
    );
    expect(out).toContain("MATCH (a:Species {id: 'a'})");
    expect(out).toContain("MATCH (b:Species {id: 'b'})");
    expect(out).toContain('MERGE (a)-[r:COMPATIBLE_WITH]->(b)');
  });

  it('inyecta props inline en la arista', () => {
    const out = emitRel(
      { label: 'Species', id: 'a' },
      'USED_AS_BIOPREPARADO',
      { label: 'Biopreparado', id: 'bocashi' },
      { source: 'feeding_plan_template', etapa: 'establecimiento' },
    );
    expect(out).toContain("source: 'feeding_plan_template'");
    expect(out).toContain("etapa: 'establecimiento'");
  });
});

describe('wrapCypher', () => {
  it('envuelve en SELECT * FROM cypher(...) con RETURN sintético', () => {
    const out = wrapCypher('chagra_kg', "MERGE (n:Species {id: 'a'})");
    expect(out).toMatch(/^SELECT \* FROM cypher\('chagra_kg', \$\$/);
    expect(out).toContain('RETURN 0');
    expect(out).toContain('AS (v agtype);');
  });

  it('no agrega RETURN si el Cypher ya lo trae', () => {
    const out = wrapCypher('chagra_kg', 'MATCH (n) RETURN n LIMIT 1');
    // Solo el RETURN explícito del input — no se duplica.
    const matches = out.match(/return/gi) || [];
    expect(matches.length).toBe(1);
  });
});

describe('buildSqlScript — fixture sintético', () => {
  const fixture = {
    species: [
      {
        id: 'zea_mays',
        nombre_comun: 'Maíz',
        nombre_cientifico: 'Zea mays L.',
        familia_botanica: 'Poaceae',
        category: 'cereales',
        estrato: 'medio',
        origen: 'Mesoamérica (México central)',
        roles_in_guild: ['crop', 'nitrogen_fixer'],
        thermal_zones: ['templado', 'calido'],
        cultivable: true,
        altitud_msnm: { optimo_min: 0, optimo_max: 2400 },
        temperatura_c: { optimo_min: 15, optimo_max: 28 },
        companions: ['phaseolus_vulgaris', 'cucurbita_pepo'],
        antagonists: [],
        source_ids: ['ica-guia-fertilizantes-2019'],
        plagas_criticas: ['Spodoptera frugiperda'],
        feeding_plan_template: {
          primary_steps: [
            { biofertilizer_slug: 'bocashi' },
            { biofertilizer_slug: 'biol' },
            { biofertilizer_slug: 'bocashi' }, // duplicado intencional
          ],
        },
      },
      {
        id: 'phaseolus_vulgaris',
        nombre_comun: 'Frijol',
        familia_botanica: 'Fabaceae',
        thermal_zones: ['templado'],
        roles_in_guild: ['crop', 'nitrogen_fixer'],
        companions: ['zea_mays'],
        antagonists: ['foeniculum_vulgare'],
      },
    ],
    biopreparados: [
      { id: 'bocashi', nombre: 'Bocashi', source_ids: ['restrepo-1996-bocashi'] },
      { id: 'biol', nombre: 'Biol', source_ids: [] },
    ],
    sources: [
      { id: 'ica-guia-fertilizantes-2019', titulo: 'Guía ICA Fertilizantes 2019', tier: 'A' },
      { id: 'restrepo-1996-bocashi', titulo: 'Restrepo Bocashi 1996', tier: 'B' },
    ],
  };

  const statements = buildSqlScript(fixture);

  it('arranca con LOAD age + SET search_path + create_graph', () => {
    expect(statements[0]).toContain("LOAD 'age'");
    expect(statements[1]).toContain('search_path = ag_catalog');
    expect(statements.some((s) => s.includes("drop_graph('chagra_kg'"))).toBe(true);
    expect(statements.some((s) => s.includes("create_graph('chagra_kg'"))).toBe(true);
  });

  it('respeta --no-drop omitiendo drop_graph', () => {
    const stmts = buildSqlScript(fixture, { includeDrop: false });
    expect(stmts.some((s) => s.includes('drop_graph'))).toBe(false);
    expect(stmts.some((s) => s.includes('create_graph'))).toBe(true);
  });

  it('crea exactamente 1 nodo por taxón único (sin duplicados)', () => {
    // Filtramos por MERGE (n:Label — eso solo matchea nodos, no las relaciones
    // que contienen (a:Label) y (b:Label) en el MATCH.
    const familyNodes = statements.filter((s) => /MERGE \(n:Family /.test(s));
    // Poaceae + Fabaceae
    expect(familyNodes).toHaveLength(2);
    const tzNodes = statements.filter((s) => /MERGE \(n:PisoTermico /.test(s));
    // templado + calido (templado aparece 2× en species pero solo 1 nodo)
    expect(tzNodes).toHaveLength(2);
  });

  it('genera todas las COMPATIBLE_WITH desde companions[]', () => {
    const compatRels = statements.filter((s) => s.includes('COMPATIBLE_WITH'));
    // zea_mays → phaseolus_vulgaris, zea_mays → cucurbita_pepo, phaseolus_vulgaris → zea_mays
    expect(compatRels).toHaveLength(3);
  });

  it('genera ANTAGONIST_OF solo desde antagonists[]', () => {
    const antagRels = statements.filter((s) => s.includes('ANTAGONIST_OF'));
    // phaseolus_vulgaris → foeniculum_vulgare
    expect(antagRels).toHaveLength(1);
  });

  it('deduplica USED_AS_BIOPREPARADO por species+biopreparado', () => {
    const bpRels = statements.filter((s) => s.includes('USED_AS_BIOPREPARADO'));
    // zea_mays → bocashi (1×, no 2×), zea_mays → biol (1×) = 2 rels
    expect(bpRels).toHaveLength(2);
  });

  it('genera REFERENCED_BY tanto desde Species como desde Biopreparado', () => {
    const refRels = statements.filter((s) => s.includes('REFERENCED_BY'));
    // zea_mays → ica-guia, bocashi → restrepo-1996 = 2
    expect(refRels).toHaveLength(2);
  });

  it('crea nodo Pest normalizado para plagas_criticas', () => {
    const pestNodes = statements.filter((s) => /MERGE \(n:Pest /.test(s));
    expect(pestNodes).toHaveLength(1);
    expect(pestNodes[0]).toContain('spodoptera_frugiperda');
  });

  it('respeta limit slicing species[]', () => {
    const limited = buildSqlScript(fixture, { limit: 1 });
    const speciesNodes = limited.filter((s) => /MERGE \(n:Species /.test(s));
    expect(speciesNodes).toHaveLength(1);
  });
});

describe('buildSqlScript — fixture real (subset del seed v3.1)', () => {
  const seedPath = resolve('catalog/chagra-catalog-seed-v3.1.json');
  let seed;
  try {
    seed = JSON.parse(readFileSync(seedPath, 'utf-8'));
  } catch {
    // En CI sin acceso al seed (poco probable acá), skip suave.
    seed = null;
  }

  it.skipIf(!seed)('arroja >0 statements para limit=10', () => {
    const stmts = buildSqlScript(seed, { limit: 10 });
    expect(stmts.length).toBeGreaterThan(20); // headers + nodos taxonomicos + species + rels
  });

  it.skipIf(!seed)('cada statement (excepto LOAD/SET/drop/create) está envuelto en cypher() SELECT', () => {
    const stmts = buildSqlScript(seed, { limit: 5 });
    for (const s of stmts) {
      const isPreamble = s.startsWith('LOAD')
        || s.startsWith('SET search_path')
        || s.startsWith('SELECT drop_graph')
        || s.startsWith('SELECT create_graph');
      if (!isPreamble) {
        expect(s).toMatch(/^SELECT \* FROM cypher\('chagra_kg'/);
        expect(s).toContain('AS (v agtype);');
      }
    }
  });

  it.skipIf(!seed)('SQL output total para limit=10 < 200KB (sanity, no balloon)', () => {
    const stmts = buildSqlScript(seed, { limit: 10 });
    const total = stmts.join('\n').length;
    expect(total).toBeLessThan(200_000);
  });
});
