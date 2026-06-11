import { describe, it, expect } from 'vitest';
import { mean, stddev, summarizeReps, formatRepSummary } from '../lib/bench-stats.mjs';

describe('bench-stats — varianza de benches no-deterministas', () => {
  it('mean: promedio simple, 0 si vacío', () => {
    expect(mean([10, 20, 30])).toBe(20);
    expect(mean([])).toBe(0);
    expect(mean([5])).toBe(5);
    // ignora no-finitos
    expect(mean([10, NaN, 30, Infinity])).toBe(20);
  });

  it('stddev: muestral (n-1), 0 con <2 muestras', () => {
    expect(stddev([])).toBe(0);
    expect(stddev([42])).toBe(0);
    // [2,4,6] media 4, var muestral = ((4)+(0)+(4))/2 = 4 → sd 2
    expect(stddev([2, 4, 6])).toBe(2);
  });

  it('summarizeReps: reporta media, desviación, rango e IC95', () => {
    // Caso del bug real: 33% y 25% en la misma config.
    const s = summarizeReps([33.3, 25, 33.3, 25]);
    expect(s.n).toBe(4);
    expect(s.mean).toBeGreaterThan(28);
    expect(s.mean).toBeLessThan(30);
    expect(s.stddev).toBeGreaterThan(0);
    expect(s.min).toBe(25);
    expect(s.max).toBe(33.3);
    // El IC95 debe ENVOLVER la media y tener ancho > 0 con varianza real.
    expect(s.ci95Lo).toBeLessThanOrEqual(s.mean);
    expect(s.ci95Hi).toBeGreaterThanOrEqual(s.mean);
    expect(s.ci95Margin).toBeGreaterThan(0);
  });

  it('summarizeReps: n=1 → stddev 0, sin IC (no hay varianza medible)', () => {
    const s = summarizeReps([40]);
    expect(s.n).toBe(1);
    expect(s.mean).toBe(40);
    expect(s.stddev).toBe(0);
    expect(s.ci95Margin).toBe(0);
  });

  it('summarizeReps: vacío → todo 0, no crashea', () => {
    expect(summarizeReps([])).toEqual({
      n: 0, mean: 0, stddev: 0, min: 0, max: 0, ci95Margin: 0, ci95Lo: 0, ci95Hi: 0,
    });
  });

  it('formatRepSummary: avisa honestamente cuando n=1', () => {
    expect(formatRepSummary('AH%', summarizeReps([40]))).toMatch(/n=1/);
    expect(formatRepSummary('AH%', summarizeReps([40]))).toMatch(/varianza NO medible/i);
    expect(formatRepSummary('AH%', summarizeReps([]))).toMatch(/sin datos/);
    const multi = formatRepSummary('AH%', summarizeReps([33.3, 25, 33.3]));
    expect(multi).toMatch(/±/);
    expect(multi).toMatch(/IC95/);
  });
});
