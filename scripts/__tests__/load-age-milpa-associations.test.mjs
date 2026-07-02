/**
 * scripts/__tests__/load-age-milpa-associations.test.mjs
 *
 * Cobertura del loader de milpa: parser de tablas markdown, curacion
 * anti-alucinacion, upsert de relaciones con citacion y reporte before/after.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  classifyMilpaHeader,
  extractMilpaRawEdgesFromText,
  curateMilpaEdges,
  buildCypherStatements,
  buildCoverageReport,
  processDrFile,
  parseArgs,
  resolveFileList,
  drIdFromPath,
} from '../load-age-milpa-associations.mjs';

describe('classifyMilpaHeader', () => {
  it('reconoce el header canonico con columnas de cita opcionales', () => {
    const cols = classifyMilpaHeader([
      'origen_id',
      'TIPO',
      'destino_id',
      'fuente',
      'doi',
      'openalex',
      'confianza',
    ]);
    expect(cols).toEqual({
      origenIdx: 0,
      tipoIdx: 1,
      destinoIdx: 2,
      fuenteIdx: 3,
      doiIdx: 4,
      openalexIdx: 5,
      confianzaIdx: 6,
    });
  });

  it('reconoce la variante NodoA / Relacion / NodoB', () => {
    const cols = classifyMilpaHeader(['NodoA', 'Relacion', 'NodoB', 'Source']);
    expect(cols).not.toBeNull();
    expect(cols.origenIdx).toBe(0);
    expect(cols.tipoIdx).toBe(1);
    expect(cols.destinoIdx).toBe(2);
  });

  it('rechaza tablas que no son de aristas', () => {
    expect(classifyMilpaHeader(['Origen_ID', 'Fuente', 'Confianza'])).toBeNull();
  });
});

describe('extractMilpaRawEdgesFromText', () => {
  it('extrae filas y conserva DOI / OpenAlex cuando existen', () => {
    const text = [
      '# DR milpa-colombia',
      '',
      '| origen_id | TIPO | destino_id | fuente | doi | openalex | confianza |',
      '|:--|:--|:--|:--|:--|:--|:--|',
      '| maiz | ASOCIA_CON | frijol | Agrosavia | 10.1234/abc | https://openalex.org/W1 | alta |',
      '| frijol | COMPATIBLE_WITH | ahuyama | Review milpa | | | media |',
    ].join('\n');
    const out = extractMilpaRawEdgesFromText(text);
    expect(out.tablesFound).toBe(1);
    expect(out.edgeTablesFound).toBe(1);
    expect(out.rawEdges).toHaveLength(2);
    expect(out.rawEdges[0]).toMatchObject({
      origen: 'maiz',
      tipo: 'ASOCIA_CON',
      destino: 'frijol',
      fuente: 'Agrosavia',
      doi: '10.1234/abc',
      openalex: 'https://openalex.org/W1',
      confianza: 'alta',
    });
  });

  it('cuenta filas malformadas sin origen / tipo / destino', () => {
    const text = [
      '| origen_id | TIPO | destino_id | fuente |',
      '|:--|:--|:--|:--|',
      '| maiz | ASOCIA_CON | frijol | Agrosavia |',
      '| maiz | ASOCIA_CON |  | Agrosavia |',
    ].join('\n');
    const out = extractMilpaRawEdgesFromText(text);
    expect(out.rawEdges).toHaveLength(1);
    expect(out.malformedRowCount).toBe(1);
  });
});

describe('curateMilpaEdges', () => {
  const raw = [
    { origen: 'Maiz', tipo: 'ASOCIA_CON', destino: 'Frijol', fuente: 'Agrosavia', doi: '', openalex: '', confianza: 'alta' },
    { origen: 'Maiz', tipo: 'ASOCIA_CON', destino: 'Frijol', fuente: 'Agrosavia', doi: '', openalex: '', confianza: 'alta' },
    { origen: 'Frijol', tipo: 'COMPATIBLE_WITH', destino: 'Ahuyama', fuente: '', doi: '10.3389/fagro.2023.1115490', openalex: '', confianza: 'media' },
    { origen: 'Frijol', tipo: 'ANTAGONIST_OF', destino: 'Hinojo', fuente: 'Agrosavia', doi: '', openalex: '', confianza: 'alta' },
  ];

  it('acepta solo relaciones milpa con cita real y deduplica exactos', () => {
    const out = curateMilpaEdges(raw, { drScoped: true, drId: 'milpa-test' });
    expect(out.accepted).toHaveLength(2);
    expect(out.rejectedByReason.duplicado).toBe(1);
    expect(out.rejectedByReason.relacion_no_milpa).toBe(1);
    expect(out.accepted[0]).toMatchObject({
      origen: 'maiz',
      tipo: 'ASOCIA_CON',
      destino: 'frijol',
      fuente: 'Agrosavia',
      drId: 'milpa-test',
    });
    expect(out.accepted[1]).toMatchObject({
      origen: 'frijol',
      tipo: 'COMPATIBLE_WITH',
      destino: 'ahuyama',
      doi: '10.3389/fagro.2023.1115490',
    });
  });

  it('descarta todo si el DR no declara scope Colombia', () => {
    const out = curateMilpaEdges(raw, { drScoped: false, drId: 'milpa-test' });
    expect(out.accepted).toHaveLength(0);
    expect(out.rejectedByReason.dr_no_co_scoped).toBe(raw.length);
  });
});

describe('buildCypherStatements', () => {
  it('usa upsert de relacion, no MERGE con props en el patron', () => {
    const { statements, relCount } = buildCypherStatements([
      {
        origen: 'maiz',
        tipo: 'ASOCIA_CON',
        destino: 'frijol',
        fuente: 'Agrosavia',
        doi: '10.1234/abc',
        verificado_openalex: true,
        confianza: 'alta',
        drId: 'milpa-test',
      },
    ], { graph: 'chagra_kg', dateStr: '2026-07-02' });

    expect(relCount).toBe(1);
    const sql = statements[0];
    expect(sql).toContain("MATCH (a:Species {id: 'maiz'})");
    expect(sql).toContain("MATCH (b:Species {id: 'frijol'})");
    expect(sql).toContain('MERGE (a)-[r:ASOCIA_CON]->(b)');
    expect(sql).toContain("SET r += {fuente: 'Agrosavia'");
    expect(sql).toContain("doi: '10.1234/abc'");
    expect(sql).toContain('verificado_openalex: true');
    expect(sql).toContain("dr: 'deepresearch:milpa-test'");
  });
});

describe('buildCoverageReport', () => {
  const perDr = [
    {
      drId: 'milpa-a',
      drScoped: true,
      tablesFound: 1,
      edgeTablesFound: 1,
      rawEdgeCount: 2,
      malformedRowCount: 0,
      acceptedCount: 2,
      rejectedCount: 0,
      rejectedByReason: {},
      relationTypeCounts: { ASOCIA_CON: 1, COMPATIBLE_WITH: 1 },
      accepted: [
        { origen: 'maiz', tipo: 'ASOCIA_CON', destino: 'frijol', fuente: 'Agrosavia', doi: null, verificado_openalex: false, confianza: 'alta', drId: 'milpa-a' },
        { origen: 'frijol', tipo: 'COMPATIBLE_WITH', destino: 'ahuyama', fuente: null, doi: '10.3389/fagro.2023.1115490', verificado_openalex: false, confianza: 'media', drId: 'milpa-a' },
      ],
      rejected: [],
    },
  ];

  it('calcula before/after cuando recibe baseline', () => {
    const baseline = {
      totalAssociationEdges: 100,
      withSource: 19,
      withoutSource: 81,
      pctWithSource: 19,
    };
    const report = buildCoverageReport(perDr, { graph: 'chagra_kg', baseline });
    expect(report.before.pctWithSource).toBe(19);
    expect(report.after.pctWithSource).toBe(20.6);
    expect(report.totals.citationKinds.fuente).toBe(1);
    expect(report.totals.citationKinds.doi).toBe(1);
  });

  it('produce reporte coherente sin baseline', () => {
    const report = buildCoverageReport(perDr, { graph: 'chagra_kg' });
    expect(report.before).toBeNull();
    expect(report.after).toBeNull();
    expect(report.totals.accepted).toBe(2);
    expect(report.totals.withSource).toBe(2);
  });
});

describe('processDrFile', () => {
  it('procesa un markdown de punta a punta', () => {
    const dir = mkdtempSync(join(tmpdir(), 'milpa-load-'));
    const filePath = join(dir, 'milpa-demo.md');
    writeFileSync(filePath, [
      '# DR milpa demo Colombia',
      '',
      'Texto de contexto sobre Colombia y la milpa.',
      '',
      '| origen_id | TIPO | destino_id | fuente | doi | confianza |',
      '|:--|:--|:--|:--|:--|:--|',
      '| maiz | ASOCIA_CON | frijol | Agrosavia | | alta |',
      '| frijol | COMPATIBLE_WITH | ahuyama | Frontiers in Agronomy | 10.3389/fagro.2023.1115490 | alta |',
    ].join('\n'), 'utf8');

    try {
      const out = processDrFile(filePath);
      expect(out.drId).toBe('milpa-demo');
      expect(out.drScoped).toBe(true);
      expect(out.acceptedCount).toBe(2);
      expect(out.relationTypeCounts.ASOCIA_CON).toBe(1);
      expect(out.relationTypeCounts.COMPATIBLE_WITH).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('parseArgs / resolveFileList / drIdFromPath', () => {
  it('parsea flags basicos y baseline json', () => {
    const opts = parseArgs(['--dr-dir', '/x', '--glob', 'milpa-*.md', '--file', 'a.md', '--baseline-json', '/tmp/base.json', '--graph', 'otro', '--json']);
    expect(opts.drDir).toBe('/x');
    expect(opts.globs).toEqual(['milpa-*.md']);
    expect(opts.files).toEqual(['a.md']);
    expect(opts.baselineJson).toBe('/tmp/base.json');
    expect(opts.graph).toBe('otro');
    expect(opts.json).toBe(true);
  });

  it('resuelve archivos desde glob y file sin duplicar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'milpa-load-files-'));
    writeFileSync(join(dir, 'milpa-a.md'), '# a', 'utf8');
    writeFileSync(join(dir, 'milpa-b.md'), '# b', 'utf8');
    try {
      const files = resolveFileList({ drDir: dir, globs: ['milpa-*.md'], files: ['milpa-b.md'] });
      expect(files.map((file) => file.endsWith('.md'))).toEqual([true, true]);
      expect(files).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('deriva el drId del nombre de archivo', () => {
    expect(drIdFromPath('/tmp/milpa-demo.md')).toBe('milpa-demo');
  });
});
