/**
 * scripts/__tests__/bench-judge-wiring.test.mjs
 *
 * TDD del FIX del pipeline judge (2026-06-03). El bug: bench-llm-judge.mjs
 * evaluaba MOCK data aunque bench-agente-completo.mjs le pasara el JSONL real,
 * por TRES fallas:
 *   1. `--from <path>` (separado por espacio) no se parseaba (solo `--from=path`).
 *   2. auto-discovery solo globeaba `.json`, pero el bench escribe `.jsonl`.
 *   3. el formato del JSONL real (per-model anidado, sin ground_truth ni
 *      model_response plano) no se transformaba a items evaluables.
 *
 * Estos tests cubren las funciones PURAS exportadas por bench-llm-judge.mjs
 * tras el refactor (parseFromArg, loadBenchData con .jsonl, normalizeBenchData).
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseFromArg,
  loadBenchData,
  normalizeBenchData,
} from '../bench-llm-judge.mjs';

describe('parseFromArg — acepta --from path Y --from=path', () => {
  it('parsea --from <path> separado por espacio (como lo invoca el bench)', () => {
    const argv = ['node', 'bench-llm-judge.mjs', '--from', '/data/run.jsonl'];
    expect(parseFromArg(argv)).toBe('/data/run.jsonl');
  });

  it('parsea --from=<path> con igual', () => {
    const argv = ['node', 'bench-llm-judge.mjs', '--from=/data/run.jsonl'];
    expect(parseFromArg(argv)).toBe('/data/run.jsonl');
  });

  it('devuelve null si no hay --from', () => {
    const argv = ['node', 'bench-llm-judge.mjs', '--judge'];
    expect(parseFromArg(argv)).toBeNull();
  });

  it('no confunde --from con el flag siguiente', () => {
    const argv = ['node', 'bench-llm-judge.mjs', '--from', '--other'];
    // --from sin valor (lo siguiente es otro flag) → null, no '--other'.
    expect(parseFromArg(argv)).toBeNull();
  });
});

describe('normalizeBenchData — transforma el JSONL real del bench a items evaluables', () => {
  // Una línea del JSONL que escribe bench-agente-completo.mjs: per-model anidado,
  // sin ground_truth ni model_response plano.
  //
  // Desde el refactor #1947 (alinear juez/target/flattenDoc), normalizeBenchData
  // ya NO asume un modelo objetivo por defecto: el target se resuelve en la capa
  // superior (loadBenchData/resolveTargetDescriptor lo INFIERE del JSONL) o se
  // pasa explícito. Estos tests unitarios llaman a normalizeBenchData de forma
  // directa, así que pasan el target explícito del fixture (granite3.3:8b).
  const TARGET = 'granite3.3:8b';
  const benchLine = {
    prompt_id: 1,
    category: 'species',
    query: '¿Qué cuidados requiere la fresa en clima frío?',
    expected_keywords: ['drenaje', 'riego', 'heladas', 'poda'],
    timestamp: '2026-06-03T00:00:00.000Z',
    granite3_3_8b: {
      model: 'granite3.3:8b',
      response: 'La fresa necesita buen drenaje y protección contra heladas.',
      keywords_matched: 3,
      keywords_total: 4,
      halluc_count: 0,
      error: null,
    },
    winner: 'granite3_3_8b',
  };

  it('extrae la respuesta del modelo objetivo (granite) a model_response', () => {
    const norm = normalizeBenchData([benchLine], { targetModel: TARGET });
    expect(norm.results).toHaveLength(1);
    const item = norm.results[0];
    expect(item.model_response).toBe(
      'La fresa necesita buen drenaje y protección contra heladas.',
    );
    expect(item.query).toBe('¿Qué cuidados requiere la fresa en clima frío?');
    expect(item.id).toBe(1);
  });

  it('deriva ground_truth de los expected_keywords cuando no hay uno explícito', () => {
    const norm = normalizeBenchData([benchLine], { targetModel: TARGET });
    const item = norm.results[0];
    // El ground_truth debe mencionar los conceptos esperados (guía del juez).
    expect(item.ground_truth).toContain('drenaje');
    expect(item.ground_truth).toContain('heladas');
  });

  it('propaga expected_keywords y halluc_count del sidecar al item', () => {
    const norm = normalizeBenchData([benchLine], { targetModel: TARGET });
    const item = norm.results[0];
    expect(item.expected_keywords).toEqual(['drenaje', 'riego', 'heladas', 'poda']);
    expect(item.sidecar_halluc_count).toBe(0);
  });

  it('respeta TARGET_MODEL para elegir qué modelo evaluar', () => {
    const multi = {
      ...benchLine,
      gemma3_4b: { model: 'gemma3:4b', response: 'Respuesta de gemma.', error: null },
    };
    const norm = normalizeBenchData([multi], { targetModel: 'gemma3:4b' });
    expect(norm.results[0].model_response).toBe('Respuesta de gemma.');
  });

  it('omite items donde el modelo objetivo falló (error != null) sin crashear', () => {
    const errored = {
      ...benchLine,
      granite3_3_8b: { model: 'granite3.3:8b', response: null, error: 'Timeout' },
    };
    const norm = normalizeBenchData([errored], { targetModel: TARGET });
    expect(norm.results).toHaveLength(0);
    expect(norm.skipped).toBe(1);
  });

  it('pasa por alto datos ya en formato judge (model_response plano)', () => {
    const flat = {
      id: 7,
      query: '¿Test?',
      ground_truth: 'Respuesta correcta.',
      model_response: 'Respuesta similar.',
    };
    const norm = normalizeBenchData([flat]);
    expect(norm.results[0].model_response).toBe('Respuesta similar.');
    expect(norm.results[0].ground_truth).toBe('Respuesta correcta.');
  });
});

describe('loadBenchData — lee el JSONL real, NO cae a mock cuando --from existe', () => {
  it('carga un .jsonl per-model y lo normaliza (no mock)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bench-judge-'));
    try {
      const path = join(dir, 'agente-completo-2026-06-03.jsonl');
      const lines = [
        JSON.stringify({
          prompt_id: 1,
          category: 'species',
          query: '¿Cuidados de la fresa?',
          expected_keywords: ['drenaje', 'heladas'],
          granite3_3_8b: { model: 'granite3.3:8b', response: 'Buen drenaje.', error: null },
        }),
        JSON.stringify({
          prompt_id: 2,
          category: 'species',
          query: '¿Roya del café?',
          expected_keywords: ['variedades resistentes'],
          granite3_3_8b: { model: 'granite3.3:8b', response: 'Variedades resistentes.', error: null },
        }),
      ];
      writeFileSync(path, lines.join('\n') + '\n');

      const data = loadBenchData(path);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].model_response).toBe('Buen drenaje.');
      expect(data.usedMock).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lanza (no usa mock silencioso) si --from apunta a un archivo inexistente', () => {
    expect(() => loadBenchData('/no/existe/jamas.jsonl')).toThrow();
  });

  it('carga un .json single-object con results[] sin normalizar de más', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bench-judge-'));
    try {
      const path = join(dir, 'legacy.json');
      const payload = {
        timestamp: '2026-06-03T00:00:00.000Z',
        model: 'granite3.3:8b',
        results: [
          { id: 1, query: '¿Q?', ground_truth: 'GT.', model_response: 'R.' },
        ],
      };
      writeFileSync(path, JSON.stringify(payload));
      const data = loadBenchData(path);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].model_response).toBe('R.');
      expect(data.usedMock).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
