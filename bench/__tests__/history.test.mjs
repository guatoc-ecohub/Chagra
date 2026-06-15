/**
 * bench/__tests__/history.test.mjs — tests del esquema + tendencia del historial.
 * Deterministas, sin FS de produccion (usan tmpdir) ni red.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync as writeFileSyncRaw } from 'node:fs';
import {
  buildHistoryRecord,
  recordFilename,
  writeHistoryRecord,
  readHistory,
  groupByBenchModel,
  directionVerdict,
  computeTrend,
  summarizeAllTrends,
  latestRunFor,
  HISTORY_SCHEMA_VERSION,
} from '../lib/history.mjs';

describe('buildHistoryRecord', () => {
  it('arma un registro v1 con campos obligatorios', () => {
    const r = buildHistoryRecord({ bench: 'x', model: 'm', metrics: { ah_pct: 16 } });
    expect(r.schema).toBe(HISTORY_SCHEMA_VERSION);
    expect(r.bench).toBe('x');
    expect(r.model).toBe('m');
    expect(r.metrics.ah_pct).toBe(16);
    expect(typeof r.date).toBe('string');
  });

  it('lanza si falta bench', () => {
    expect(() => buildHistoryRecord({ metrics: {} })).toThrow(/bench/);
  });

  it('filtra metricas no numericas', () => {
    const r = buildHistoryRecord({ bench: 'x', metrics: { good: 5, bad: 'nope', nan: NaN } });
    expect(r.metrics).toEqual({ good: 5 });
  });

  it('deriva passPct de passCount/failCount', () => {
    const r = buildHistoryRecord({ bench: 'x', passCount: 21, failCount: 4 });
    expect(r.passPct).toBe(84);
  });

  it('respeta pass_pct explicito en metrics', () => {
    const r = buildHistoryRecord({ bench: 'x', metrics: { pass_pct: 90 }, passCount: 1, failCount: 9 });
    expect(r.passPct).toBe(90);
  });
});

describe('recordFilename', () => {
  it('genera nombre seguro y ordenable', () => {
    const r = buildHistoryRecord({ bench: 'borde-alucinacion', model: 'granite3.3:8b', date: '2026-06-14T08:00:00.000Z' });
    const f = recordFilename(r);
    expect(f).toBe('borde-alucinacion__granite3.3-8b__2026-06-14T08-00-00-000Z.json');
    expect(f).not.toMatch(/[:]/);
  });

  it('usa nomodel cuando model es null', () => {
    const r = buildHistoryRecord({ bench: 'rag', model: null, date: '2026-06-14T00:00:00.000Z' });
    expect(recordFilename(r)).toContain('__nomodel__');
  });
});

describe('write + read roundtrip', () => {
  it('escribe y relee registros, ignorando basura', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bench-hist-'));
    try {
      writeHistoryRecord(buildHistoryRecord({ bench: 'a', model: 'm', date: '2026-01-01T00:00:00.000Z', metrics: { pass_pct: 50 } }), dir);
      writeHistoryRecord(buildHistoryRecord({ bench: 'a', model: 'm', date: '2026-01-02T00:00:00.000Z', metrics: { pass_pct: 60 } }), dir);
      // archivo basura: no debe romper readHistory
      writeFileSyncRaw(join(dir, 'garbage.json'), '{ not json');
      const recs = readHistory(dir);
      expect(recs).toHaveLength(2);
      expect(recs[0].date < recs[1].date).toBe(true); // ordenado asc
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});


describe('directionVerdict', () => {
  it('up: subir es mejora, bajar es empeora', () => {
    expect(directionVerdict('pass_pct', 5)).toBe('mejora');
    expect(directionVerdict('pass_pct', -5)).toBe('empeora');
  });
  it('down: bajar es mejora (alucinacion/latencia)', () => {
    expect(directionVerdict('ah_pct', -5)).toBe('mejora');
    expect(directionVerdict('latency_p95_ms', 100)).toBe('empeora');
  });
  it('banda muerta -> neutro', () => {
    expect(directionVerdict('pass_pct', 0.01)).toBe('neutro');
  });
  it('metrica desconocida -> sin-direccion', () => {
    expect(directionVerdict('foo_bar', 5)).toBe('sin-direccion');
  });
});

describe('computeTrend', () => {
  const runs = [
    buildHistoryRecord({ bench: 'b', model: 'm', date: '2026-01-01T00:00:00.000Z', metrics: { ah_pct: 22, pass_pct: 78 } }),
    buildHistoryRecord({ bench: 'b', model: 'm', date: '2026-01-03T00:00:00.000Z', metrics: { ah_pct: 16, pass_pct: 84 } }),
  ];
  it('calcula delta ultima vs penultima con veredicto', () => {
    const t = computeTrend(runs);
    expect(t.n).toBe(2);
    expect(t.metrics.ah_pct.delta).toBe(-6);
    expect(t.metrics.ah_pct.verdict).toBe('mejora');
    expect(t.metrics.pass_pct.verdict).toBe('mejora');
  });
  it('n<2 deja delta null', () => {
    const t = computeTrend([runs[0]]);
    expect(t.n).toBe(1);
    expect(t.metrics.ah_pct.delta).toBeNull();
  });
  it('serie vacia no rompe', () => {
    expect(computeTrend([]).n).toBe(0);
    expect(computeTrend(undefined).n).toBe(0);
  });
});

describe('groupByBenchModel + summarizeAllTrends + latestRunFor', () => {
  const recs = [
    buildHistoryRecord({ bench: 'a', model: 'm1', date: '2026-01-01T00:00:00.000Z', metrics: { pass_pct: 50 } }),
    buildHistoryRecord({ bench: 'a', model: 'm1', date: '2026-01-02T00:00:00.000Z', metrics: { pass_pct: 70 } }),
    buildHistoryRecord({ bench: 'a', model: 'm2', date: '2026-01-02T00:00:00.000Z', metrics: { pass_pct: 90 } }),
  ];
  it('agrupa por bench::model', () => {
    const g = groupByBenchModel(recs);
    expect(g.get('a::m1')).toHaveLength(2);
    expect(g.get('a::m2')).toHaveLength(1);
  });
  it('resume todas las series', () => {
    const s = summarizeAllTrends(recs);
    const m1 = s.find((x) => x.model === 'm1');
    expect(m1.trend.metrics.pass_pct.verdict).toBe('mejora');
  });
  it('latestRunFor devuelve la corrida mas reciente', () => {
    const latest = latestRunFor(recs, 'a');
    expect(latest.date).toBe('2026-01-02T00:00:00.000Z');
  });
  it('latestRunFor null si no hay corridas', () => {
    expect(latestRunFor(recs, 'inexistente')).toBeNull();
  });
});
