/**
 * scripts/__tests__/load-age-graph-gaps.test.mjs
 *
 * Cobertura unitaria del loader/generador de Cypher para DRs "de huecos" y
 * "de aristas por especie". NO toca red ni postgres real — solo valida los
 * parsers de tabla markdown, la curación anti-alucinación/CO-strict y la
 * generación de Cypher determinista sobre fixtures sintéticos que imitan el
 * formato real observado en las DRs (incluyendo casos degenerados reales:
 * filas truncadas y tablas de índice de fuentes que NO son aristas).
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  splitTableRow,
  isSeparatorRow,
  findMarkdownTables,
  classifyEdgeHeader,
  extractRawEdgesFromText,
  slugifyId,
  sanitizeRelType,
  normalizeConfianza,
  isColombiaScopedText,
  curateRawEdges,
  buildCypherStatements,
  drIdFromPath,
  processDrFile,
  buildDryRunReport,
  formatReportText,
  parseArgs,
  KNOWN_RELATION_TYPES,
  NODE_LABEL,
} from '../load-age-graph-gaps.mjs';

describe('splitTableRow / isSeparatorRow', () => {
  it('divide una fila con pipes en celdas trimmeadas', () => {
    expect(splitTableRow('| a | b  | c|')).toEqual(['a', 'b', 'c']);
  });

  it('respeta pipes escapados (`\\|`) dentro de una celda — regresión real (aristas-grafo-annonasquamosa)', () => {
    // Fila real observada: un pipe escapado dentro de "fuente" desplazaba la
    // columna "confianza" al valor equivocado (bug encontrado corriendo el
    // dry-run contra el corpus real antes de este fix).
    const line = '| annona_muricata | ANTAGONIST_OF | annona_squamosa | Annona squamosa (sugar apple) \\| CABI Compendium (sin DOI verificado) | alta |';
    expect(splitTableRow(line)).toEqual([
      'annona_muricata',
      'ANTAGONIST_OF',
      'annona_squamosa',
      'Annona squamosa (sugar apple) | CABI Compendium (sin DOI verificado)',
      'alta',
    ]);
  });

  it('reconoce filas separadoras con alineación izquierda/centrada/derecha', () => {
    expect(isSeparatorRow([':----', '-----', '----:'])).toBe(true);
    expect(isSeparatorRow(['a', '----'])).toBe(false);
  });
});

describe('findMarkdownTables', () => {
  it('detecta una tabla bien-formada con header + separador + filas', () => {
    const text = [
      '# DR x',
      '',
      '| origen_id | TIPO | destino_id | fuente | confianza |',
      '|:----------|:-----|:-----------|:-------|:----------|',
      '| a | AFFECTS | b | fuente 1 | alta |',
      '',
    ].join('\n');
    const tables = findMarkdownTables(text);
    expect(tables).toHaveLength(1);
    expect(tables[0].rows).toEqual([['a', 'AFFECTS', 'b', 'fuente 1', 'alta']]);
  });

  it('ignora un header sin fila separadora inmediata (caso real: DR degenerado sin filas)', () => {
    const text = [
      '### Entregable',
      '',
      '| origen_id | TIPO | destino_id | fuente |',
      '',
      '',
    ].join('\n');
    expect(findMarkdownTables(text)).toHaveLength(0);
  });

  it('detecta múltiples tablas en el mismo documento', () => {
    const text = [
      '| origen_id | TIPO | destino_id | fuente | confianza |',
      '|:--|:--|:--|:--|:--|',
      '| a | X | b | f | alta |',
      '',
      'prosa en el medio',
      '',
      '| Aspecto | Detalle |',
      '| :--- | :--- |',
      '| x | y |',
    ].join('\n');
    expect(findMarkdownTables(text)).toHaveLength(2);
  });
});

describe('classifyEdgeHeader', () => {
  it('reconoce el header canónico origen_id/TIPO/destino_id/fuente/confianza', () => {
    const cols = classifyEdgeHeader(['origen_id', 'TIPO', 'destino_id', 'fuente', 'confianza']);
    expect(cols).toEqual({ origenIdx: 0, tipoIdx: 1, destinoIdx: 2, fuenteIdx: 3, confianzaIdx: 4 });
  });

  it('reconoce la variante NodoA (slug)/Relación/NodoB (slug)/Fuente/Confianza', () => {
    const cols = classifyEdgeHeader(['NodoA (slug)', 'Relación', 'NodoB (slug)', 'Fuente', 'Confianza']);
    expect(cols).not.toBeNull();
    expect(cols.origenIdx).toBe(0);
    expect(cols.tipoIdx).toBe(1);
    expect(cols.destinoIdx).toBe(2);
  });

  it('reconoce columnas extra al final (p.ej. "slugs genero_especie") sin romper', () => {
    const cols = classifyEdgeHeader(['origen_id', 'TIPO', 'destino_id', 'fuente', 'confianza', 'slugs genero_especie']);
    expect(cols).not.toBeNull();
  });

  it('rechaza una tabla de índice de fuentes (Origen_ID | TIPO | Fuente | Confianza, sin destino) — caso real observado', () => {
    // Este header aparece en una DR real (micorrizas) como sección "9. Fuentes
    // (DOIs/URLs)" — comparte nombres de columna con la tabla de aristas pero
    // NO es una arista (no hay destino). Debe clasificar como null.
    const cols = classifyEdgeHeader(['Origen_ID', 'TIPO', 'Fuente', 'Confianza']);
    expect(cols).toBeNull();
  });

  it('rechaza tablas de dominio no-arista (Cultivo/Problema/Manejo/...)', () => {
    const cols = classifyEdgeHeader(['Cultivo', 'Problema', 'Agente científico', 'Manejo', 'Dosis', 'Confianza']);
    expect(cols).toBeNull();
  });
});

describe('extractRawEdgesFromText', () => {
  it('extrae filas válidas y cuenta filas malformadas (fila truncada real: physalisperuviana)', () => {
    const text = [
      '| origen_id | TIPO | destino_id | fuente | confianza |',
      '|:----------|:-----|:-----------|:-------|:----------|',
      '| fusarium_oxysporum_f_sp_physali | AFFECTS | physalis_peruviana | AGROSAVIA | alta |',
      '| rhizoglomus_irregulare | CONTROLS | fusarium_oxysporum_f_sp_physali | AGROSAVIA (SciELO) | alta |',
      '| bacillus_subtilis | CONTROLS',
    ].join('\n');
    const { tablesFound, edgeTablesFound, rawEdges, malformedRowCount } = extractRawEdgesFromText(text);
    expect(tablesFound).toBe(1);
    expect(edgeTablesFound).toBe(1);
    expect(rawEdges).toHaveLength(2);
    expect(malformedRowCount).toBe(1);
  });

  it('ignora filas con celdas vacías en origen/tipo/destino como malformadas', () => {
    const text = [
      '| NodoA | Relación | NodoB | Fuente | Confianza |',
      '| :---- | :------- | :---- | :----- | :-------- |',
      '| fuego | AFFECTS | suelo | | Alta |',
      '|  |  |  | | Alta |',
    ].join('\n');
    const { rawEdges, malformedRowCount } = extractRawEdgesFromText(text);
    expect(rawEdges).toHaveLength(1);
    expect(rawEdges[0].fuente).toBe('');
    expect(malformedRowCount).toBe(1);
  });
});

describe('sanitizeRelType / slugifyId / normalizeConfianza', () => {
  it('sanitiza TIPO a mayúsculas + underscore', () => {
    expect(sanitizeRelType('POLINIZA')).toBe('POLINIZA');
    expect(sanitizeRelType('Tipo de suelo')).toBe('TIPO_DE_SUELO');
    expect(sanitizeRelType('  ')).toBeNull();
    expect(sanitizeRelType('')).toBeNull();
  });

  it('prefija REL_ si el tipo empieza con dígito', () => {
    expect(sanitizeRelType('2x_control')).toBe('REL_2X_CONTROL');
  });

  it('normaliza ids a slug lowercase con espacios->underscore', () => {
    expect(slugifyId(' Passiflora Ligularis ')).toBe('passiflora_ligularis');
  });

  it('normaliza confianza conocida y marca desconocida/vacía', () => {
    expect(normalizeConfianza('Alta')).toBe('alta');
    expect(normalizeConfianza('MEDIA')).toBe('media');
    expect(normalizeConfianza('')).toBe('sin_dato');
    expect(normalizeConfianza('rara')).toBe('sin_normalizar');
  });
});

describe('isColombiaScopedText', () => {
  it('reconoce scope Colombia/Andes/páramo en el título+intro', () => {
    expect(isColombiaScopedText('# DR foo en Colombia\nintro')).toBe(true);
    expect(isColombiaScopedText('# DR páramo andino\nintro')).toBe(true);
    expect(isColombiaScopedText('# DR genérico global\nsin scope regional')).toBe(false);
  });
});

describe('curateRawEdges', () => {
  const raw = [
    { origen: 'a', tipo: 'AFFECTS', destino: 'b', fuente: 'fuente 1', confianza: 'alta' },
    { origen: 'a', tipo: 'AFFECTS', destino: 'b', fuente: 'fuente 1', confianza: 'alta' }, // duplicado exacto
    { origen: 'c', tipo: 'CONTROLS', destino: 'd', fuente: '', confianza: 'alta' }, // sin fuente
    { origen: '', tipo: 'AFFECTS', destino: 'x', fuente: 'y', confianza: 'alta' }, // nodo vacío
  ];

  it('acepta la primera ocurrencia y descarta duplicado/sin-fuente/nodo-vacío', () => {
    const { accepted, rejected, byReason } = curateRawEdges(raw, { drScoped: true, drId: 'dr-test' });
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({ origen: 'a', tipo: 'AFFECTS', destino: 'b', drId: 'dr-test' });
    expect(byReason.duplicado).toBe(1);
    expect(byReason.sin_fuente).toBe(1);
    expect(byReason.nodo_vacio).toBe(1);
    expect(rejected).toHaveLength(3);
  });

  it('descarta TODO si el DR no está CO/Andes-scoped (defensivo)', () => {
    const { accepted, byReason } = curateRawEdges(raw, { drScoped: false, drId: 'dr-test' });
    expect(accepted).toHaveLength(0);
    expect(byReason.dr_no_co_scoped).toBe(raw.length);
  });

  it('marca isKnownRelationType usando el snapshot de INFRA_FACTS', () => {
    const { accepted } = curateRawEdges(
      [{ origen: 'a', tipo: 'CONTROLS', destino: 'b', fuente: 'f', confianza: 'alta' }],
      { drScoped: true, drId: 'x' },
    );
    expect(accepted[0].isKnownRelationType).toBe(true);
    expect(KNOWN_RELATION_TYPES.has('CONTROLS')).toBe(true);
    expect(KNOWN_RELATION_TYPES.has('POLINIZA')).toBe(false);
  });
});

describe('buildCypherStatements', () => {
  it('dedupea el MERGE de nodo por id repetido entre varias aristas', () => {
    const accepted = [
      { origen: 'a', tipo: 'AFFECTS', destino: 'b', fuente: 'f1', confianza: 'alta', drId: 'dr1' },
      { origen: 'a', tipo: 'CONTROLS', destino: 'c', fuente: 'f2', confianza: 'media', drId: 'dr1' },
    ];
    const { statements, nodeCount } = buildCypherStatements(accepted, { dateStr: '2026-07-01' });
    expect(nodeCount).toBe(3); // a, b, c — 'a' solo una vez pese a aparecer 2 veces
    const nodeMerges = statements.filter((s) => s.includes(`MERGE (n:${NODE_LABEL}`));
    expect(nodeMerges).toHaveLength(3);
    const relMerges = statements.filter((s) => s.includes('MERGE (a)-[r:'));
    expect(relMerges).toHaveLength(2);
  });

  it('usa MATCH (no MERGE) para los endpoints de la arista — los nodos ya se mergearon antes', () => {
    const accepted = [{ origen: 'a', tipo: 'AFFECTS', destino: 'b', fuente: 'f1', confianza: 'alta', drId: 'dr1' }];
    const { statements } = buildCypherStatements(accepted, { dateStr: '2026-07-01' });
    const rel = statements.find((s) => s.includes('MERGE (a)-[r:'));
    expect(rel).toContain(`MATCH (a:${NODE_LABEL} {id: 'a'})`);
    expect(rel).toContain(`MATCH (b:${NODE_LABEL} {id: 'b'})`);
  });

  it('escapa comillas simples en la fuente vía cypherLiteral (reuso de catalog-to-age.mjs)', () => {
    const accepted = [{ origen: 'a', tipo: 'AFFECTS', destino: 'b', fuente: "Restrepo's bocashi", confianza: 'alta', drId: 'dr1' }];
    const { statements } = buildCypherStatements(accepted, { dateStr: '2026-07-01' });
    const rel = statements.find((s) => s.includes('MERGE (a)-[r:'));
    expect(rel).toContain("Restrepo\\'s bocashi");
  });
});

describe('drIdFromPath / processDrFile', () => {
  it('deriva el drId del nombre de archivo sin extensión', () => {
    expect(drIdFromPath('/x/y/aristas-grafo-foo.md')).toBe('aristas-grafo-foo');
  });

  it('procesa un DR completo de punta a punta (fixture en disco)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'age-graph-gaps-test-'));
    const filePath = join(dir, 'aristas-grafo-fixture.md');
    writeFileSync(filePath, [
      '# DR aristas-grafo-fixture — colombia',
      '',
      'Dossier de prueba en Colombia.',
      '',
      '| origen_id | TIPO | destino_id | fuente | confianza |',
      '|:----------|:-----|:-----------|:-------|:----------|',
      '| xylocopa_spp | POLINIZA | fixture_species | Fuente real 2020 | alta |',
      '| thrips_spp | AFFECTS | fixture_species | | media |',
      '| xylocopa_spp | POLINIZA | fixture_species | Fuente real 2020 | alta |',
    ].join('\n'), 'utf8');

    try {
      const result = processDrFile(filePath);
      expect(result.drId).toBe('aristas-grafo-fixture');
      expect(result.drScoped).toBe(true);
      expect(result.edgeTablesFound).toBe(1);
      expect(result.acceptedCount).toBe(1);
      expect(result.rejectedByReason.sin_fuente).toBe(1);
      expect(result.rejectedByReason.duplicado).toBe(1);
      expect(result.relationTypeCounts.POLINIZA).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('buildDryRunReport / formatReportText', () => {
  it('agrega totales, motivos de descarte y tipos nuevos vs conocidos', () => {
    const perDr = [
      {
        drId: 'dr-a',
        drScoped: true,
        tablesFound: 1,
        edgeTablesFound: 1,
        rawEdgeCount: 2,
        malformedRowCount: 0,
        acceptedCount: 1,
        rejectedCount: 1,
        rejectedByReason: { sin_fuente: 1 },
        relationTypeCounts: { POLINIZA: 1 },
        accepted: [{ origen: 'a', tipo: 'POLINIZA', destino: 'b', fuente: 'f', confianza: 'alta', drId: 'dr-a', isKnownRelationType: false }],
        rejected: [{ reason: 'sin_fuente' }],
      },
    ];
    const report = buildDryRunReport(perDr);
    expect(report.totals.accepted).toBe(1);
    expect(report.totals.rejected).toBe(1);
    expect(report.totals.newNodeIds).toBe(2);
    expect(report.rejectedByReason.sin_fuente).toBe(1);
    expect(report.newRelationTypes).toEqual(['POLINIZA']);

    const text = formatReportText(report);
    expect(text).toContain('DRY-RUN');
    expect(text).toContain('POLINIZA');
    expect(text).toContain('sin_fuente');
  });
});

describe('parseArgs', () => {
  it('acumula múltiples --glob y --file', () => {
    const opts = parseArgs(['--dr-dir', '/x', '--glob', 'aristas-grafo-*.md', '--file', 'a.md', '--file', 'b.md', '--json']);
    expect(opts.drDir).toBe('/x');
    expect(opts.globs).toEqual(['aristas-grafo-*.md']);
    expect(opts.files).toEqual(['a.md', 'b.md']);
    expect(opts.json).toBe(true);
  });

  it('acepta --out-cypher/--out-report/--graph', () => {
    const opts = parseArgs(['--out-cypher', '/tmp/x.sql', '--out-report', '/tmp/x.json', '--graph', 'otro_grafo']);
    expect(opts.outCypher).toBe('/tmp/x.sql');
    expect(opts.outReport).toBe('/tmp/x.json');
    expect(opts.graph).toBe('otro_grafo');
  });
});
