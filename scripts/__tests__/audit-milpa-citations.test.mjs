/**
 * scripts/__tests__/audit-milpa-citations.test.mjs
 *
 * Cobertura unitaria del auditor de citación de aristas de asociación/milpa.
 * NO toca la red ni postgres real: verifica las funciones puras (SQL builder,
 * parser de salida psql, extractor offline de dump/catálogo, clasificador de
 * prioridad y agregador de reporte) con datos mock.
 *
 * El bloque "live DB" al final hace skip limpio cuando no hay
 * CHAGRA_AGE_PSQL_COMMAND en el entorno (mismo patrón que
 * scripts/__tests__/age-etno-preflight.test.mjs).
 */
import { describe, it, expect } from 'vitest';

import {
  ASSOCIATION_RELATIONS,
  buildMilpaAuditSql,
  parseAuditRows,
  extractAssociationEdges,
  hasSource,
  classifyInsignia,
  buildAuditReport,
  formatReportText,
  buildPsqlInvocation,
  runPsql,
  parseArgs,
} from '../audit-milpa-citations.mjs';

describe('buildMilpaAuditSql', () => {
  it('incluye LOAD/SET y ambos tipos de relacion de asociacion', () => {
    const sql = buildMilpaAuditSql('chagra_kg');
    expect(sql).toContain("LOAD 'age'");
    expect(sql).toContain('SET search_path');
    expect(sql).toContain('COMPATIBLE_WITH');
    expect(sql).toContain('ASOCIA_CON');
    expect(sql).not.toContain('ANTAGONIST_OF');
  });

  it('trae las propiedades de citacion (fuente, doi, verificado_openalex)', () => {
    const sql = buildMilpaAuditSql();
    expect(sql).toContain('r.fuente');
    expect(sql).toContain('r.doi');
    expect(sql).toContain('r.verificado_openalex');
  });

  it('escapa comillas simples en el nombre del grafo', () => {
    const sql = buildMilpaAuditSql("chagra'kg");
    expect(sql).toContain("chagra''kg");
  });

  it('usa el grafo default chagra_kg si no se pasa argumento', () => {
    const sql = buildMilpaAuditSql();
    expect(sql).toContain("cypher('chagra_kg'");
  });
});

describe('parseAuditRows', () => {
  it('parsea filas tab-separated e ignora ruido LOAD/SET/(N rows)', () => {
    const stdout = [
      'LOAD',
      'SET',
      '"zea_mays"\t"Maiz"\t"cereales"\t"phaseolus_vulgaris"\t"Frijol"\t"granos_legumbres"\t"COMPATIBLE_WITH"\tnull\tnull\tnull',
      '"coffea_arabica"\t"Cafe"\t"frutales_perennes"\t"inga_edulis"\t"Guamo"\t"arboles_sombra"\t"ASOCIA_CON"\t"Zuluaga 2020"\tnull\ttrue',
      '(2 rows)',
    ].join('\n');

    const rows = parseAuditRows(stdout);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      origen: 'zea_mays',
      origenNombre: 'Maiz',
      destino: 'phaseolus_vulgaris',
      relacion: 'COMPATIBLE_WITH',
      fuente: null,
      doi: null,
      verificadoOpenalex: null,
    });
    expect(rows[1]).toMatchObject({
      origen: 'coffea_arabica',
      relacion: 'ASOCIA_CON',
      fuente: 'Zuluaga 2020',
      verificadoOpenalex: true,
    });
  });

  it('devuelve array vacio para stdout vacio o solo ruido', () => {
    expect(parseAuditRows('')).toEqual([]);
    expect(parseAuditRows('LOAD\nSET\n(0 rows)')).toEqual([]);
  });

  it('descarta filas incompletas sin origen/destino/relacion', () => {
    const rows = parseAuditRows('\tnull\tnull\t\tnull\tnull\t\tnull\tnull\tnull');
    expect(rows).toEqual([]);
  });
});

describe('extractAssociationEdges — modo catalogo (offline)', () => {
  it('lee companions[] como aristas COMPATIBLE_WITH sin fuente (el catalogo no la tiene)', () => {
    const catalog = {
      species: [
        { id: 'zea_mays', nombre_comun: 'Maiz', category: 'cereales', companions: ['phaseolus_vulgaris'] },
        { id: 'phaseolus_vulgaris', nombre_comun: 'Frijol', category: 'granos_legumbres', companions: [] },
      ],
    };
    const rows = extractAssociationEdges(catalog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      origen: 'zea_mays',
      destino: 'phaseolus_vulgaris',
      relacion: 'COMPATIBLE_WITH',
      fuente: null,
      doi: null,
      verificadoOpenalex: null,
    });
  });

  it('auto-detecta modo catalogo por presencia de data.species', () => {
    const catalog = { species: [{ id: 'a', companions: ['b'] }, { id: 'b', companions: [] }] };
    const rows = extractAssociationEdges(catalog);
    expect(rows).toHaveLength(1);
  });
});

describe('extractAssociationEdges — modo dump {nodes, edges}', () => {
  function mkNode(id, props) {
    return { id, labels: ['Species'], properties: props || {} };
  }
  function mkEdge(source, target, label, properties) {
    return { source, target, label, properties: properties || {} };
  }

  it('extrae solo aristas de asociacion (ignora ANTAGONIST_OF y otras)', () => {
    const dump = {
      nodes: [mkNode('a', { nombre_comun: 'A', categoria: 'cereales' }), mkNode('b', { nombre_comun: 'B' })],
      edges: [
        mkEdge('a', 'b', 'COMPATIBLE_WITH'),
        mkEdge('a', 'b', 'ANTAGONIST_OF'),
        mkEdge('a', 'b', 'TARGETS_PEST'),
      ],
    };
    const rows = extractAssociationEdges(dump, { catalogMode: false });
    expect(rows).toHaveLength(1);
    expect(rows[0].relacion).toBe('COMPATIBLE_WITH');
    expect(rows[0].origenNombre).toBe('A');
  });

  it('lee las propiedades de citacion de la arista cuando existen', () => {
    const dump = {
      nodes: [mkNode('a'), mkNode('b')],
      edges: [mkEdge('a', 'b', 'ASOCIA_CON', { fuente: 'Altieri 1999', doi: '10.1234/x' })],
    };
    const rows = extractAssociationEdges(dump, { catalogMode: false });
    expect(rows[0].fuente).toBe('Altieri 1999');
    expect(rows[0].doi).toBe('10.1234/x');
  });

  it('respeta ASSOCIATION_RELATIONS exportado (contrato con el SQL builder)', () => {
    expect(ASSOCIATION_RELATIONS).toEqual(['COMPATIBLE_WITH', 'ASOCIA_CON']);
  });
});

describe('hasSource', () => {
  it('true cuando fuente tiene texto', () => {
    expect(hasSource({ fuente: 'Altieri 1999', doi: null, verificadoOpenalex: null })).toBe(true);
  });
  it('true cuando doi tiene texto', () => {
    expect(hasSource({ fuente: null, doi: '10.1234/x', verificadoOpenalex: null })).toBe(true);
  });
  it('true cuando verificadoOpenalex es boolean true', () => {
    expect(hasSource({ fuente: null, doi: null, verificadoOpenalex: true })).toBe(true);
  });
  it('false cuando verificadoOpenalex es boolean false', () => {
    expect(hasSource({ fuente: null, doi: null, verificadoOpenalex: false })).toBe(false);
  });
  it('false cuando verificadoOpenalex es el string "false"', () => {
    expect(hasSource({ fuente: null, doi: null, verificadoOpenalex: 'false' })).toBe(false);
  });
  it('false cuando todos los campos son null/vacios', () => {
    expect(hasSource({ fuente: null, doi: '', verificadoOpenalex: null })).toBe(false);
  });
});

describe('classifyInsignia', () => {
  it('tier 1 milpa_clasica cuando origen es maiz', () => {
    const r = classifyInsignia({ origen: 'zea_mays', origenCategoria: null, destino: 'inga_edulis', destinoCategoria: null });
    expect(r).toEqual({ tier: 1, label: 'milpa_clasica' });
  });
  it('tier 1 milpa_clasica cuando destino es frijol', () => {
    const r = classifyInsignia({ origen: 'inga_edulis', origenCategoria: null, destino: 'phaseolus_vulgaris', destinoCategoria: null });
    expect(r.label).toBe('milpa_clasica');
  });
  it('tier 1 milpa_clasica para variantes de calabaza (cucurbita_*)', () => {
    const r = classifyInsignia({ origen: 'cucurbita_moschata', origenCategoria: null, destino: 'x', destinoCategoria: null });
    expect(r.label).toBe('milpa_clasica');
  });
  it('tier 2 cafe cuando alguno es coffea_arabica', () => {
    const r = classifyInsignia({ origen: 'coffea_arabica', origenCategoria: null, destino: 'inga_edulis', destinoCategoria: 'arboles_sombra' });
    expect(r.label).toBe('cafe');
  });
  it('tier 3 hortalizas por categoria cuando no hay match de id', () => {
    const r = classifyInsignia({ origen: 'solanum_lycopersicum', origenCategoria: 'hortalizas_fruto_flor', destino: 'x', destinoCategoria: null });
    expect(r.label).toBe('hortalizas');
  });
  it('tier 4 otros cuando nada matchea', () => {
    const r = classifyInsignia({ origen: 'alnus_acuminata', origenCategoria: 'arboles_sombra', destino: 'lupinus_mutabilis', destinoCategoria: 'granos_legumbres' });
    expect(r).toEqual({ tier: 4, label: 'otros' });
  });
  it('toma la prioridad mas alta (tier menor) entre origen y destino', () => {
    const r = classifyInsignia({ origen: 'alnus_acuminata', origenCategoria: 'arboles_sombra', destino: 'zea_mays', destinoCategoria: null });
    expect(r).toEqual({ tier: 1, label: 'milpa_clasica' });
  });
});

describe('buildAuditReport', () => {
  function row(overrides) {
    return {
      origen: 'a', origenNombre: 'A', origenCategoria: null,
      destino: 'b', destinoNombre: 'B', destinoCategoria: null,
      relacion: 'COMPATIBLE_WITH', fuente: null, doi: null, verificadoOpenalex: null,
      ...overrides,
    };
  }

  it('calcula totales y porcentaje con fuente', () => {
    const rows = [
      row({ fuente: 'X' }),
      row({ doi: 'Y' }),
      row({}),
      row({}),
    ];
    const report = buildAuditReport(rows, { graph: 'chagra_kg' });
    expect(report.totalAssociationEdges).toBe(4);
    expect(report.withSource).toBe(2);
    expect(report.withoutSource).toBe(2);
    expect(report.pctWithSource).toBe(50);
  });

  it('desglosa por tipo de relacion', () => {
    const rows = [
      row({ relacion: 'COMPATIBLE_WITH', fuente: 'X' }),
      row({ relacion: 'COMPATIBLE_WITH' }),
      row({ relacion: 'ASOCIA_CON' }),
    ];
    const report = buildAuditReport(rows);
    expect(report.byRelation.COMPATIBLE_WITH).toEqual({ total: 2, withSource: 1, pctWithSource: 50 });
    expect(report.byRelation.ASOCIA_CON).toEqual({ total: 1, withSource: 0, pctWithSource: 0 });
  });

  it('ordena la lista de faltantes por prioridad (tier asc) y luego por id', () => {
    const rows = [
      row({ origen: 'alnus_acuminata', destino: 'lupinus_mutabilis' }), // otros
      row({ origen: 'coffea_arabica', destino: 'inga_edulis' }), // cafe
      row({ origen: 'zea_mays', destino: 'phaseolus_vulgaris' }), // milpa_clasica
    ];
    const report = buildAuditReport(rows);
    expect(report.missing.map((m) => m.prioridad)).toEqual(['milpa_clasica', 'cafe', 'otros']);
  });

  it('cuenta missingByTier correctamente', () => {
    const rows = [
      row({ origen: 'zea_mays' }),
      row({ origen: 'phaseolus_vulgaris' }),
      row({ origen: 'coffea_arabica' }),
    ];
    const report = buildAuditReport(rows);
    expect(report.missingByTier.milpa_clasica).toBe(2);
    expect(report.missingByTier.cafe).toBe(1);
  });

  it('no incluye en missing las filas que si tienen fuente', () => {
    const rows = [row({ fuente: 'X' })];
    const report = buildAuditReport(rows);
    expect(report.missing).toEqual([]);
    expect(report.withoutSource).toBe(0);
  });

  it('respeta --limit y marca missingTruncated', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row({ origen: `sp_${i}`, destino: `sp_${i}_b` }));
    const report = buildAuditReport(rows, { limit: 2 });
    expect(report.missing).toHaveLength(2);
    expect(report.missingTruncated).toBe(true);
    expect(report.withoutSource).toBe(5);
  });

  it('reporte vacio no rompe (0 aristas)', () => {
    const report = buildAuditReport([]);
    expect(report.totalAssociationEdges).toBe(0);
    expect(report.pctWithSource).toBe(0);
    expect(report.missing).toEqual([]);
  });
});

describe('formatReportText', () => {
  it('incluye totales, porcentaje y la lista priorizada', () => {
    const report = buildAuditReport(
      [
        { origen: 'zea_mays', origenNombre: 'Maiz', origenCategoria: null, destino: 'phaseolus_vulgaris', destinoNombre: 'Frijol', destinoCategoria: null, relacion: 'COMPATIBLE_WITH', fuente: null, doi: null, verificadoOpenalex: null },
      ],
      { graph: 'chagra_kg' },
    );
    const text = formatReportText(report);
    expect(text).toContain('grafo chagra_kg');
    expect(text).toContain('Total aristas de asociacion: 1');
    expect(text).toContain('milpa_clasica');
    expect(text).toContain('zea_mays (Maiz) -> phaseolus_vulgaris (Frijol)');
  });
});

describe('buildPsqlInvocation', () => {
  it('usa sudo podman exec por defecto cuando no hay override', () => {
    const prev = process.env.CHAGRA_AGE_PSQL_COMMAND;
    delete process.env.CHAGRA_AGE_PSQL_COMMAND;
    const inv = buildPsqlInvocation();
    if (prev !== undefined) process.env.CHAGRA_AGE_PSQL_COMMAND = prev;
    expect(inv.kind).toBe('podman');
    expect(inv.file).toBe('sudo');
    expect(inv.args).toContain('postgres-farm');
    expect(inv.args).toContain('chagra_kg');
  });

  it('respeta CHAGRA_AGE_PSQL_COMMAND cuando esta definido', () => {
    const prev = process.env.CHAGRA_AGE_PSQL_COMMAND;
    process.env.CHAGRA_AGE_PSQL_COMMAND = 'psql -h 127.0.0.1 -U farmos -d chagra_kg';
    const inv = buildPsqlInvocation();
    if (prev !== undefined) process.env.CHAGRA_AGE_PSQL_COMMAND = prev;
    else delete process.env.CHAGRA_AGE_PSQL_COMMAND;
    expect(inv.kind).toBe('shell');
    expect(inv.command).toContain('psql -h 127.0.0.1');
  });
});

describe('parseArgs', () => {
  it('parsea flags basicos', () => {
    const opts = parseArgs(['--graph', 'otro_grafo', '--json', '--limit', '10']);
    expect(opts.graph).toBe('otro_grafo');
    expect(opts.json).toBe(true);
    expect(opts.limit).toBe(10);
  });

  it('parsea --from-dump y --catalog-mode', () => {
    const opts = parseArgs(['--from-dump', '/tmp/x.json', '--catalog-mode']);
    expect(opts.fromDump).toBe('/tmp/x.json');
    expect(opts.catalogMode).toBe(true);
  });

  it('parsea --print-sql', () => {
    const opts = parseArgs(['--print-sql']);
    expect(opts.printSql).toBe(true);
  });

  it('defaults razonables sin argumentos', () => {
    const opts = parseArgs([]);
    expect(opts.graph).toBe('chagra_kg');
    expect(opts.json).toBe(false);
    expect(opts.limit).toBe(200);
    expect(opts.fromDump).toBeNull();
  });
});

// =============================================================================
// Live DB (opcional) — skip limpio en CI sin CHAGRA_AGE_PSQL_COMMAND, mismo
// patron que scripts/__tests__/age-etno-preflight.test.mjs.
// =============================================================================
const hasLivePsql = Boolean(process.env.CHAGRA_AGE_PSQL_COMMAND);

describe.skipIf(!hasLivePsql)('audit-milpa-citations (live DB)', () => {
  it('ejecuta contra el grafo real y arma un reporte coherente', () => {
    const sql = buildMilpaAuditSql('chagra_kg');
    const result = runPsql(sql);
    expect(result.status).toBe(0);
    const rows = parseAuditRows(result.stdout);
    const report = buildAuditReport(rows, { graph: 'chagra_kg' });
    expect(report.totalAssociationEdges).toBeGreaterThanOrEqual(0);
    expect(report.withSource + report.withoutSource).toBe(report.totalAssociationEdges);
  });
});
