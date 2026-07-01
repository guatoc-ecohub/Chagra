/**
 * scripts/__tests__/export-graph-stats.test.mjs
 *
 * Cobertura unitaria del regenerador de src/data/graph-stats-snapshot.json.
 * NO toca postgres/AGE: verifica SQL builders, parsers de salida psql y los
 * agregadores puros (computeEdgesByType/computeControlsStats/computeMipStats/
 * mergeGraphSnapshot) con datos mock, igual que
 * scripts/__tests__/audit-milpa-citations.test.mjs y
 * scripts/__tests__/snapshot-grafo-crecimiento.test.mjs.
 */
import { describe, it, expect } from 'vitest';

import {
  buildNodeCountSql,
  buildEdgeCountSql,
  buildEdgesByTypeSql,
  buildControlsRowsSql,
  buildPestRowsSql,
  parseSingleCount,
  parseRows,
  computeEdgesByType,
  computeControlsStats,
  computeMipStats,
  mergeGraphSnapshot,
  resolveDate,
} from '../export-graph-stats.mjs';

describe('SQL builders', () => {
  it('incluyen LOAD/SET y el nombre del grafo', () => {
    expect(buildNodeCountSql('chagra_kg')).toContain("LOAD 'age'");
    expect(buildNodeCountSql('chagra_kg')).toContain("cypher('chagra_kg'");
    expect(buildEdgeCountSql()).toContain('count(r)');
    expect(buildEdgesByTypeSql()).toContain('type(r)');
    expect(buildControlsRowsSql()).toContain('CONTROLS');
    expect(buildControlsRowsSql()).toContain('r.doi');
    expect(buildPestRowsSql()).toContain('umbral_accion');
    expect(buildPestRowsSql()).toContain('control_biologico');
  });
});

describe('parseSingleCount', () => {
  it('extrae el último entero ignorando ruido LOAD/SET', () => {
    const out = 'LOAD\nSET\n42\n(1 row)';
    expect(parseSingleCount(out)).toBe(42);
  });

  it('lanza si no hay línea numérica', () => {
    expect(() => parseSingleCount('LOAD\nSET\n')).toThrow();
  });
});

describe('parseRows', () => {
  it('parsea filas tab-separated e ignora ruido', () => {
    const out = 'LOAD\nSET\nCONTROLS\t591\nGROWS_IN\t1097\n(2 rows)';
    expect(parseRows(out, 2)).toEqual([
      ['CONTROLS', '591'],
      ['GROWS_IN', '1097'],
    ]);
  });

  it('descarta filas con columnas incompletas', () => {
    const out = 'a\tb\nsolo_una_columna';
    expect(parseRows(out, 2)).toEqual([['a', 'b']]);
  });
});

describe('computeEdgesByType', () => {
  it('convierte filas [tipo, n] a mapa tipo->numero', () => {
    expect(
      computeEdgesByType([
        ['CONTROLS', '591'],
        ['GROWS_IN', '1097'],
      ]),
    ).toEqual({ CONTROLS: 591, GROWS_IN: 1097 });
  });
});

describe('computeControlsStats', () => {
  it('cuenta con_doi = filas con doi truthy', () => {
    const rows = [{ doi: '10.1/x' }, { doi: null }, { doi: 'false' }, { doi: '10.2/y', verificadoOpenalex: true }];
    expect(computeControlsStats(rows)).toEqual({ con_doi: 2, total: 4 });
  });

  it('devuelve 0/0 con lista vacía', () => {
    expect(computeControlsStats([])).toEqual({ con_doi: 0, total: 0 });
  });
});

describe('computeMipStats', () => {
  it('MIP completo requiere umbral_accion Y control_biologico a la vez', () => {
    const rows = [
      { umbralAccion: 'texto', controlBiologico: 'texto' }, // cuenta
      { umbralAccion: 'texto', controlBiologico: null }, // no cuenta (falta control)
      { umbralAccion: null, controlBiologico: 'texto' }, // no cuenta (falta umbral)
      { umbralAccion: null, controlBiologico: null }, // no cuenta
    ];
    expect(computeMipStats(rows)).toEqual({ con_mip: 1, total: 4 });
  });
});

describe('mergeGraphSnapshot', () => {
  const prev = {
    _meta: { fecha_snapshot: '2026-06-28', aristas_por_tipo_fecha: '2026-06-14' },
    especies: 700,
    nodos: 2800,
    aristas: 12000,
    aristas_por_tipo: { CONTROLS: 500 },
    controls: { con_doi: 400, total: 800 },
    mip_plagas: { con_mip: 150, total: 300 },
    cobertura_por_vertical: {
      control_biologico: { pct: 50, descripcion: 'x' },
      mip: { pct: 50, descripcion: 'y' },
      asociaciones: { pct: 19, numerador: null, denominador: null },
    },
  };
  const live = {
    especies: 721,
    nodos: 2909,
    aristas: 12325,
    aristasPorTipo: { CONTROLS: 591, GROWS_IN: 1097 },
    controls: { con_doi: 446, total: 816 },
    mip: { con_mip: 163, total: 318 },
  };

  it('refresca los conteos vivos y recalcula porcentajes', () => {
    const next = mergeGraphSnapshot(prev, live, '2026-07-05');
    expect(next.especies).toBe(721);
    expect(next.nodos).toBe(2909);
    expect(next.aristas).toBe(12325);
    expect(next.aristas_por_tipo).toEqual({ CONTROLS: 591, GROWS_IN: 1097 });
    expect(next.controls).toEqual({ con_doi: 446, total: 816 });
    expect(next.mip_plagas).toEqual({ con_mip: 163, total: 318 });
    expect(next.cobertura_por_vertical.control_biologico.pct).toBe(54.7);
    expect(next.cobertura_por_vertical.mip.pct).toBe(51.3);
  });

  it('preserva cobertura_por_vertical.asociaciones (no lo recalcula este script)', () => {
    const next = mergeGraphSnapshot(prev, live, '2026-07-05');
    expect(next.cobertura_por_vertical.asociaciones).toEqual({ pct: 19, numerador: null, denominador: null });
  });

  it('actualiza _meta con la fecha del snapshot sin desfase aristas_por_tipo', () => {
    const next = mergeGraphSnapshot(prev, live, '2026-07-05');
    expect(next._meta.fecha_snapshot).toBe('2026-07-05');
    expect(next._meta.aristas_por_tipo_fecha).toBe('2026-07-05');
  });

  it('no muta el snapshot anterior', () => {
    const before = JSON.stringify(prev);
    mergeGraphSnapshot(prev, live, '2026-07-05');
    expect(JSON.stringify(prev)).toBe(before);
  });
});

describe('resolveDate', () => {
  it('prioriza --date sobre SNAPSHOT_DATE sobre el reloj', () => {
    expect(resolveDate(['--date', '2026-01-01'], { SNAPSHOT_DATE: '2026-02-02' })).toBe('2026-01-01');
    expect(resolveDate([], { SNAPSHOT_DATE: '2026-02-02' })).toBe('2026-02-02');
    expect(resolveDate([], {})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
