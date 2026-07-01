/**
 * bench-llm-judge.test.mjs
 *
 * Cobertura del judge de bench:
 * - parsing de `--from` y `--target`
 * - inferencia de target desde JSONL per-model
 * - skip de `seed:true` como no-medición
 * - falla ruidosa cuando el JSONL es ambiguo sin `--target`
 * - resolución del juez Anthropic con Claude Sonnet 5
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '..', 'bench-llm-judge.mjs');

function makeTempFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'bench-llm-judge-test-'));
  const file = join(dir, name);
  writeFileSync(file, content, 'utf-8');
  return { dir, file };
}

describe('bench-llm-judge.mjs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parseFromArg y parseTargetArg aceptan forma separada y con igual', async () => {
    const mod = await import(SCRIPT_PATH);
    expect(mod.parseFromArg(['node', 'bench-llm-judge.mjs', '--from', 'data/a.jsonl'])).toBe('data/a.jsonl');
    expect(mod.parseFromArg(['node', 'bench-llm-judge.mjs', '--from=data/b.jsonl'])).toBe('data/b.jsonl');
    expect(mod.parseTargetArg(['node', 'bench-llm-judge.mjs', '--target', 'granite3.1-dense:8b'])).toBe('granite3.1-dense:8b');
    expect(mod.parseTargetArg(['node', 'bench-llm-judge.mjs', '--target=granite3_1_8b'])).toBe('granite3_1_8b');
  });

  it('loadBenchData infiere el target desde JSONL per-model y omite seed:true', async () => {
    const mod = await import(SCRIPT_PATH);
    const { dir, file } = makeTempFile(
      'single-model.jsonl',
      [
        JSON.stringify({
          prompt_id: 1,
          query: 'Q1',
          expected_keywords: ['a'],
          seed: true,
          granite3_1_8b: { model: 'granite3.1-dense:8b', response: 'respuesta 1', halluc_count: 0 },
        }),
        JSON.stringify({
          prompt_id: 2,
          query: 'Q2',
          expected_keywords: ['b'],
          granite3_1_8b: { model: 'granite3.1-dense:8b', response: 'respuesta 2', halluc_count: 1 },
        }),
      ].join('\n') + '\n',
    );

    try {
      const data = mod.loadBenchData(file);
      expect(data.model).toBe('granite3.1-dense:8b');
      expect(data.results).toHaveLength(1);
      expect(data.skipped).toBe(1);
      expect(data.skippedSeeded).toBe(1);
      expect(data.results[0].model_response).toBe('respuesta 2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loadBenchData falla si el JSONL per-model es ambiguo y no hay target explícito', async () => {
    const mod = await import(SCRIPT_PATH);
    const { dir, file } = makeTempFile(
      'ambiguous.jsonl',
      [
        JSON.stringify({
          prompt_id: 1,
          query: 'Q1',
          expected_keywords: ['a'],
          granite3_1_8b: { model: 'granite3.1-dense:8b', response: 'a' },
          gemma3_4b: { model: 'gemma3:4b', response: 'b' },
        }),
      ].join('\n') + '\n',
    );

    try {
      expect(() => mod.loadBenchData(file)).toThrow(/--target|TARGET_MODEL/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loadBenchData respeta --target explícito aunque el JSONL tenga varios modelos', async () => {
    const mod = await import(SCRIPT_PATH);
    const { dir, file } = makeTempFile(
      'multi-model.jsonl',
      [
        JSON.stringify({
          prompt_id: 1,
          query: 'Q1',
          expected_keywords: ['a'],
          granite3_1_8b: { model: 'granite3.1-dense:8b', response: 'respuesta granite' },
          gemma3_4b: { model: 'gemma3:4b', response: 'respuesta gemma' },
        }),
      ].join('\n') + '\n',
    );

    try {
      const data = mod.loadBenchData(file, { targetModel: 'granite3.1-dense:8b' });
      expect(data.model).toBe('granite3.1-dense:8b');
      expect(data.results).toHaveLength(1);
      expect(data.results[0].model_response).toBe('respuesta granite');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolveJudgeCall usa Anthropic con Claude Sonnet 5 y falla sin key', async () => {
    const mod = await import(SCRIPT_PATH);
    const judge = mod.resolveJudgeCall({
      env: { JUDGE_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-test-FAKE' },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: '{"factualidad":1,"claridad_colombiana":2,"anti_alucinacion":3,"completitud":4,"promedio":2.5,"justificacion_breve":"ok"}' }] }),
      }),
    });

    expect(judge.provider).toBe('anthropic');
    expect(judge.model).toBe('claude-sonnet-5');
    const raw = await judge.judgeCall('PREGUNTA DE PRUEBA');
    expect(raw).toContain('"factualidad":1');

    expect(() => mod.resolveJudgeCall({
      env: { JUDGE_PROVIDER: 'anthropic' },
      keyPath: '/no/existe',
      fetchImpl: async () => ({}),
    })).toThrow(/key de Anthropic/i);
  });
});
