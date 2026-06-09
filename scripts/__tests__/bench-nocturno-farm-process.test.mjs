import { describe, expect, it } from 'vitest';
import {
  BENCH_SCENARIOS,
  PRIMARY_MODELS,
  SMOKE_ONLY_MODELS,
  getDefaultModels,
  getSmokeScenarios,
} from '../lib/bench-nocturno-scenarios.mjs';
import {
  HTTP_REPEAT_ELIMINATION_THRESHOLD,
  aggregateCapabilityScores,
  applyFailureToModelState,
  buildCandidateConfig,
  buildManifest,
  createInitialModelState,
  extractJsonObject,
  parseBenchModels,
  scoreScenarioResponse,
} from '../lib/bench-nocturno-runner.mjs';

describe('bench nocturno farm process scenarios', () => {
  it('expone pool principal y smoke-only requeridos', () => {
    expect(PRIMARY_MODELS).toEqual([
      'gemma4:e4b',
      'ministral-3:latest',
      'ministral-3:14b',
      'granite3.3:8b',
      'gemma3:12b',
      'qwen3.5:9b',
      'gemma3:4b',
      'granite3.1-dense:8b',
    ]);
    expect(SMOKE_ONLY_MODELS).toContain('qwen3:30b');
  });

  it('incluye escenarios A01-A04, voz, ENSO, reforestación y silvopastoreo', () => {
    const ids = BENCH_SCENARIOS.map((item) => item.id);
    expect(ids).toContain('voice_draft_tomate');
    expect(ids).toContain('voice_correction_200_to_20');
    expect(ids).toContain('confirmation_honest_pending_sync');
    expect(ids).toContain('phenology_estimation_cafe');
    expect(ids).toContain('enso_preventive_task_papa');
    expect(ids).toContain('reforestation_process_quercus');
    expect(ids).toContain('silvopasture_process_leucaena');
  });

  it('smoke usa 2 prompts y el modo smoke une pools por defecto', () => {
    expect(getSmokeScenarios()).toHaveLength(2);
    expect(getDefaultModels('smoke')).toContain('phi4:14b');
    expect(getDefaultModels('smoke')).toContain('gemma4:e4b');
  });
});

describe('bench nocturno farm process runner helpers', () => {
  it('parsea BENCH_MODELS desde env', () => {
    expect(parseBenchModels('a,b,c', ['x'])).toEqual(['a', 'b', 'c']);
    expect(parseBenchModels('', ['x'])).toEqual(['x']);
  });

  it('genera manifest inmutable por modelos y escenarios', () => {
    const scenarios = BENCH_SCENARIOS.slice(0, 2);
    const first = buildManifest({ models: ['a'], scenarios, mode: 'smoke', runId: 'r1' });
    const second = buildManifest({ models: ['a'], scenarios, mode: 'smoke', runId: 'r1' });
    const third = buildManifest({ models: ['b'], scenarios, mode: 'smoke', runId: 'r1' });

    expect(first.manifest_id).toBe(second.manifest_id);
    expect(first.manifest_id).not.toBe(third.manifest_id);
  });

  it('elimina temprano por timeout, OOM y HTTP repetido', () => {
    let state = createInitialModelState(['m1']);
    state = applyFailureToModelState(state, 'm1', 'HTTP 500');
    expect(state.m1.eliminated).toBe(false);
    state = applyFailureToModelState(state, 'm1', 'HTTP 502');
    expect(state.m1.eliminated).toBe(true);
    expect(state.m1.elimination_reason).toBe(`http_repeated:${HTTP_REPEAT_ELIMINATION_THRESHOLD}`);

    let timeoutState = createInitialModelState(['m2']);
    timeoutState = applyFailureToModelState(timeoutState, 'm2', 'timeout');
    expect(timeoutState.m2.eliminated).toBe(true);

    let oomState = createInitialModelState(['m3']);
    oomState = applyFailureToModelState(oomState, 'm3', 'CUDA error: out of memory');
    expect(oomState.m3.eliminated).toBe(true);
  });

  it('parsea JSON tolerando texto alrededor', () => {
    expect(extractJsonObject('ok {"a":1} done')).toEqual({ a: 1 });
    expect(extractJsonObject('sin json')).toBeNull();
  });

  it('puntúa respuesta JSON de extracción/corrección', () => {
    const scenario = BENCH_SCENARIOS.find((item) => item.id === 'voice_correction_200_to_20');
    const response = JSON.stringify({
      draft_status: 'awaiting_confirmation',
      updated_fields: { quantity: 20 },
      message_to_user: 'Corrijo la cantidad a 20 antes de confirmar.',
    });
    const result = scoreScenarioResponse(scenario, response);
    expect(result.error).toBeNull();
    expect(result.score).toBe(result.maxScore);
  });

  it('agrega resultados por capacidad y genera candidate config', () => {
    const records = [
      {
        model: 'model-a',
        scenario_id: 's1',
        capabilities: ['voice_extraction'],
        ok: true,
        normalized_score: 0.9,
      },
      {
        model: 'model-b',
        scenario_id: 's1',
        capabilities: ['voice_extraction'],
        ok: true,
        normalized_score: 0.5,
      },
      {
        model: 'model-a',
        scenario_id: 's2',
        capabilities: ['phenology'],
        ok: true,
        normalized_score: 0.6,
      },
    ];
    const capabilityScores = aggregateCapabilityScores(records);
    expect(capabilityScores.voice_extraction[0].model).toBe('model-a');

    const manifest = buildManifest({
      models: ['model-a', 'model-b'],
      scenarios: BENCH_SCENARIOS.slice(0, 2),
      mode: 'full',
      runId: 'r1',
    });
    const candidate = buildCandidateConfig({
      manifest,
      capabilityScores,
      primaryModels: ['model-a', 'model-b'],
    });
    expect(candidate.nlu_model).toBe('model-a');
    expect(candidate.capability_models.voice_extraction).toBe('model-a');
  });
});
