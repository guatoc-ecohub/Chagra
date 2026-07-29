import { describe, it, expect, beforeEach } from 'vitest';
import {
  aggregateLLMMetrics,
  setLLMTelemetryEnabled,
  isLLMTelemetryEnabled,
} from '../llmTelemetryService.js';

/**
 * Tests de la parte pura de llmTelemetryService: aggregateLLMMetrics
 * (totals / byModel / byFlujo) y el flag de habilitación (localStorage).
 * Las funciones IndexedDB (record/get/prune/export) quedan fuera de este set.
 * Fixtures con nombres de modelo genéricos.
 */

const EVENTS = [
  { status: 'success', processor: 'gpu', total_ms: 100, eval_rate: 20, eval_count: 50, model: 'modelo-a', flujo: 'chat' },
  { status: 'success', processor: 'gpu', total_ms: 200, eval_rate: 30, eval_count: 60, model: 'modelo-a', flujo: 'chat' },
  { status: 'error', processor: 'cpu', total_ms: 50, model: 'modelo-b', flujo: 'vision' },
  { status: 'abort', processor: 'gpu', model: 'modelo-a', flujo: 'chat' },
];

describe('aggregateLLMMetrics — totals', () => {
  it('retorna ceros para lista vacía o no-array', () => {
    for (const input of [[], null, undefined, 'x']) {
      const { totals, byModel, byFlujo } = aggregateLLMMetrics(/** @type {any} */ (input));
      expect(totals.total).toBe(0);
      expect(totals.successRate).toBe(0);
      expect(byModel).toEqual({});
      expect(byFlujo).toEqual({});
    }
  });

  it('cuenta success / error / abort y la tasa de éxito', () => {
    const { totals } = aggregateLLMMetrics(EVENTS);
    expect(totals.total).toBe(4);
    expect(totals.success).toBe(2);
    expect(totals.error).toBe(1);
    expect(totals.abort).toBe(1);
    expect(totals.successRate).toBe(0.5);
  });

  it('cuenta llamadas por procesador', () => {
    const { totals } = aggregateLLMMetrics(EVENTS);
    expect(totals.gpuCalls).toBe(3);
    expect(totals.cpuCalls).toBe(1);
  });

  it('promedia y calcula p95 ignorando valores no numéricos', () => {
    const { totals } = aggregateLLMMetrics(EVENTS);
    // total_ms presentes: [100, 200, 50] (el abort no trae total_ms)
    expect(totals.avgTotalMs).toBe(117); // round(350/3)
    expect(totals.p95TotalMs).toBe(200); // sorted [50,100,200], idx floor(3*0.95)=2
    expect(totals.avgEvalRate).toBe(25); // avg([20,30])
  });
});

describe('aggregateLLMMetrics — byModel', () => {
  it('agrupa por modelo con conteos, tasa de error y gpuShare', () => {
    const { byModel } = aggregateLLMMetrics(EVENTS);
    expect(byModel['modelo-a'].count).toBe(3);
    expect(byModel['modelo-a'].success).toBe(2);
    expect(byModel['modelo-a'].errorRate).toBe(0);
    expect(byModel['modelo-a'].gpuShare).toBe(1);
    expect(byModel['modelo-a'].avgTotalMs).toBe(150); // avg([100,200])
    expect(byModel['modelo-b'].count).toBe(1);
    expect(byModel['modelo-b'].errorRate).toBe(1);
    expect(byModel['modelo-b'].gpuShare).toBe(0);
  });

  it('usa "unknown" cuando falta el modelo', () => {
    const { byModel } = aggregateLLMMetrics([{ status: 'success', total_ms: 10 }]);
    expect(byModel.unknown.count).toBe(1);
  });
});

describe('aggregateLLMMetrics — byFlujo', () => {
  it('agrupa por flujo con conteo y tasa de error', () => {
    const { byFlujo } = aggregateLLMMetrics(EVENTS);
    expect(byFlujo.chat.count).toBe(3);
    expect(byFlujo.chat.errorRate).toBe(0);
    expect(byFlujo.vision.count).toBe(1);
    expect(byFlujo.vision.errorRate).toBe(1);
  });

  it('usa "other" cuando falta el flujo', () => {
    const { byFlujo } = aggregateLLMMetrics([{ status: 'success' }]);
    expect(byFlujo.other.count).toBe(1);
  });
});

describe('flag de telemetría (localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('persiste el toggle activado y desactivado', () => {
    setLLMTelemetryEnabled(true);
    expect(isLLMTelemetryEnabled()).toBe(true);
    setLLMTelemetryEnabled(false);
    expect(isLLMTelemetryEnabled()).toBe(false);
  });
});
