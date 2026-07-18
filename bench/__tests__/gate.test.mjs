import { describe, it, expect } from 'vitest';
import {
  classifyMetric,
  regressionAmount,
  metricVerdict,
  diffRecords,
  renderMarkdown,
  GATE_RULES,
} from '../gate.mjs';

// Helper: registro v1 minimo.
const rec = (metrics, extra = {}) => ({
  schema: 1,
  bench: 'agro-rotatorio',
  date: '2026-07-18T00:00:00.000Z',
  model: 'granite3.3:8b',
  config: 'PROD',
  commit: 'abc1234',
  metrics,
  ...extra,
});

describe('classifyMetric', () => {
  it('mapea familias correctamente', () => {
    expect(classifyMetric('accuracy')).toBe('accuracy');
    expect(classifyMetric('pass_pct')).toBe('accuracy');
    expect(classifyMetric('name_accuracy')).toBe('accuracy');
    expect(classifyMetric('ah_pct')).toBe('hallucination');
    expect(classifyMetric('hallucination_rate')).toBe('hallucination');
    expect(classifyMetric('parse_rate')).toBe('parse');
    expect(classifyMetric('latency_p95_ms')).toBe('latency');
    expect(classifyMetric('cold_load_ms')).toBe('latency');
    expect(classifyMetric('recall1_bm25')).toBe('other');
  });
});

describe('regressionAmount', () => {
  it('metrica up (accuracy): bajar = empeorar (positivo)', () => {
    expect(regressionAmount('accuracy', 80, 74, 'pp')).toBeCloseTo(6);
    expect(regressionAmount('accuracy', 80, 85, 'pp')).toBeCloseTo(-5); // mejoro
  });
  it('metrica down (ah_pct): subir = empeorar (positivo)', () => {
    expect(regressionAmount('ah_pct', 10, 14, 'pp')).toBeCloseTo(4);
    expect(regressionAmount('ah_pct', 10, 8, 'pp')).toBeCloseTo(-2); // mejoro
  });
  it('latency en porcentaje relativo', () => {
    expect(regressionAmount('latency_p95_ms', 1000, 1300, 'pct')).toBeCloseTo(30);
    expect(regressionAmount('latency_p95_ms', 1000, 900, 'pct')).toBeCloseTo(-10);
  });
  it('baseline 0 en pct: subir = Infinity, bajar = 0', () => {
    expect(regressionAmount('latency_p95_ms', 0, 100, 'pct')).toBe(Infinity);
    expect(regressionAmount('latency_p95_ms', 0, 0, 'pct')).toBe(0);
  });
});

describe('metricVerdict - fronteras por familia', () => {
  it('accuracy: RED > 5pp, YELLOW > 2pp, GREEN si no', () => {
    expect(metricVerdict('accuracy', 80, 74).severity).toBe('red'); // -6
    expect(metricVerdict('accuracy', 80, 77).severity).toBe('yellow'); // -3
    expect(metricVerdict('accuracy', 80, 79).severity).toBe('green'); // -1
    expect(metricVerdict('accuracy', 80, 90).severity).toBe('green'); // mejora
  });
  it('accuracy: exactamente en el umbral NO dispara (estricto >)', () => {
    expect(metricVerdict('accuracy', 80, 75).severity).toBe('yellow'); // -5 exacto -> no RED, si YELLOW
    expect(metricVerdict('accuracy', 80, 78).severity).toBe('green'); // -2 exacto -> no YELLOW
  });
  it('hallucination: RED > 3pp, YELLOW > 1pp', () => {
    expect(metricVerdict('ah_pct', 10, 14).severity).toBe('red'); // +4
    expect(metricVerdict('ah_pct', 10, 12).severity).toBe('yellow'); // +2
    expect(metricVerdict('ah_pct', 10, 8).severity).toBe('green'); // mejora
  });
  it('parse_rate: RED > 2pp, YELLOW > 1pp', () => {
    expect(metricVerdict('parse_rate', 100, 97).severity).toBe('red'); // -3
    expect(metricVerdict('parse_rate', 100, 98.5).severity).toBe('yellow'); // -1.5
    expect(metricVerdict('parse_rate', 100, 100).severity).toBe('green');
  });
  it('latency: RED > 25%, YELLOW > 10%', () => {
    expect(metricVerdict('latency_p95_ms', 1000, 1300).severity).toBe('red'); // +30%
    expect(metricVerdict('latency_p95_ms', 1000, 1150).severity).toBe('yellow'); // +15%
    expect(metricVerdict('latency_p95_ms', 1000, 900).severity).toBe('green'); // mejora
  });
  it('metrica "other" no vota (info)', () => {
    expect(metricVerdict('recall1_bm25', 14, 10).severity).toBe('info');
  });
});

describe('diffRecords - veredicto global', () => {
  it('GREEN cuando todo mejora o estable', () => {
    const d = diffRecords(
      rec({ accuracy: 80, ah_pct: 10, latency_p95_ms: 1000 }),
      rec({ accuracy: 82, ah_pct: 9, latency_p95_ms: 950 }),
    );
    expect(d.verdict).toBe('GREEN');
    expect(d.blockers).toHaveLength(0);
  });
  it('RED si UNA metrica cruza su umbral critico', () => {
    const d = diffRecords(
      rec({ accuracy: 80, ah_pct: 10 }),
      rec({ accuracy: 82, ah_pct: 14 }), // ah_pct +4 -> RED
    );
    expect(d.verdict).toBe('RED');
    expect(d.blockers.map((b) => b.name)).toContain('ah_pct');
  });
  it('YELLOW si hay regresion menor pero ninguna critica', () => {
    const d = diffRecords(
      rec({ accuracy: 80, ah_pct: 10 }),
      rec({ accuracy: 77, ah_pct: 10 }), // -3 accuracy -> YELLOW
    );
    expect(d.verdict).toBe('YELLOW');
    expect(d.warnings.map((w) => w.name)).toContain('accuracy');
  });
  it('el peor gana: YELLOW + RED = RED', () => {
    const d = diffRecords(
      rec({ accuracy: 80, parse_rate: 100 }),
      rec({ accuracy: 77, parse_rate: 96 }), // accuracy -3 (Y), parse -4 (R)
    );
    expect(d.verdict).toBe('RED');
  });
  it('metricas sin par van a unmatched, no votan', () => {
    const d = diffRecords(
      rec({ accuracy: 80 }),
      rec({ accuracy: 82, nueva_metrica: 5 }),
    );
    expect(d.verdict).toBe('GREEN');
    expect(d.unmatched.map((u) => u.name)).toContain('nueva_metrica');
  });
  it('anota advertencia si la config es cruda (no producto)', () => {
    const d = diffRecords(
      rec({ accuracy: 80 }, { config: 'A' }),
      rec({ accuracy: 82 }, { config: 'A' }),
    );
    expect(d.notes.join(' ')).toMatch(/crud/i);
  });
  it('lanza si falta metrics', () => {
    expect(() => diffRecords({ bench: 'x' }, rec({ accuracy: 1 }))).toThrow();
  });
});

describe('renderMarkdown', () => {
  it('incluye el tag del veredicto y la tabla', () => {
    const d = diffRecords(
      rec({ accuracy: 80, ah_pct: 10 }),
      rec({ accuracy: 74, ah_pct: 10 }),
    );
    const md = renderMarkdown(d, { bench: 'agro-rotatorio', model: 'granite3.3:8b' });
    expect(md).toContain('[RED]');
    expect(md).toContain('| Metrica | Familia |');
    expect(md).toContain('accuracy');
    expect(md).toContain('Bloqueadores');
  });
  it('sin emojis (ASCII only, restriccion del repo)', () => {
    const d = diffRecords(rec({ accuracy: 80 }), rec({ accuracy: 82 }));
    const md = renderMarkdown(d, { bench: 'x' });
    expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(md)).toBe(false);
  });
});
