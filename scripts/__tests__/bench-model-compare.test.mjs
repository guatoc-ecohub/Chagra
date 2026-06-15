/**
 * scripts/__tests__/bench-model-compare.test.mjs - tests del bench consolidado
 * de comparacion de modelos. Sin GPU: el caller de Ollama se INYECTA (callImpl).
 */
import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  loadSuite,
  scorePrompt,
  selectWinner,
  aggregateByModel,
  buildSummaryMarkdown,
  PROMPT_TEMPLATE,
} from '../bench-model-compare.mjs';

describe('parseArgs', () => {
  it('--suite', () => expect(parseArgs(['--suite', 'qwen3-vs-granite']).suite).toBe('qwen3-vs-granite'));
  it('--models lista coma-separada', () => {
    expect(parseArgs(['--models', 'a, b ,c']).models).toEqual(['a', 'b', 'c']);
  });
  it('--prompts', () => expect(parseArgs(['--prompts', 'x.json']).promptsFile).toBe('x.json'));
});

describe('loadSuite (suites reales del repo)', () => {
  it('carga qwen3-vs-granite (20 prompts, 2 modelos)', () => {
    const s = loadSuite({ suite: 'qwen3-vs-granite' });
    expect(s.prompts.length).toBe(20);
    expect(s.models.length).toBe(2);
    expect(s.id).toBe('qwen3-vs-granite');
  });
  it('carga nuevos-vs-baseline (10 prompts, 5 modelos)', () => {
    const s = loadSuite({ suite: 'nuevos-vs-baseline' });
    expect(s.prompts.length).toBe(10);
    expect(s.models.length).toBe(5);
  });
  it('lanza si no hay suite ni prompts', () => {
    expect(() => loadSuite({})).toThrow(/--suite|--prompts/);
  });
  it('lanza si la suite no existe', () => {
    expect(() => loadSuite({ suite: 'no-existe-xyz' })).toThrow(/no encontrada/);
  });
});

describe('selectWinner', () => {
  it('elige el de mejor ratio de keywords', () => {
    const results = {
      a: { keywords_matched: 4, keywords_total: 4, latency_ms: 1000, error: null },
      b: { keywords_matched: 2, keywords_total: 4, latency_ms: 500, error: null },
    };
    expect(selectWinner(results, ['a', 'b']).model).toBe('a');
  });
  it('desempata por latencia menor', () => {
    const results = {
      a: { keywords_matched: 2, keywords_total: 4, latency_ms: 2000, error: null },
      b: { keywords_matched: 2, keywords_total: 4, latency_ms: 500, error: null },
    };
    expect(selectWinner(results, ['a', 'b']).model).toBe('b');
  });
  it('ignora modelos con error', () => {
    const results = {
      a: { keywords_matched: 4, keywords_total: 4, error: 'boom' },
      b: { keywords_matched: 1, keywords_total: 4, latency_ms: 100, error: null },
    };
    expect(selectWinner(results, ['a', 'b']).model).toBe('b');
  });
  it('null si todos fallan', () => {
    const results = { a: { error: 'x' }, b: { error: 'y' } };
    expect(selectWinner(results, ['a', 'b']).model).toBeNull();
  });
});

describe('scorePrompt (callImpl inyectado, sin GPU)', () => {
  const prompt = { id: 1, category: 'species', query: 'fresa clima frio', expected_keywords: ['drenaje', 'riego', 'heladas', 'poda'] };
  it('puntua con keyword-matching flexible y elige ganador', async () => {
    const callImpl = async (model) => ({
      response: model === 'good'
        ? 'Necesita buen drenaje, riego moderado, proteger de las heladas y poda.'
        : 'Es una planta bonita.',
      latency_ms: model === 'good' ? 1200 : 800,
    });
    const row = await scorePrompt(prompt, ['good', 'bad'], { callImpl });
    expect(row.results.good.keywords_matched).toBe(4);
    expect(row.results.bad.keywords_matched).toBe(0);
    expect(row.winner.model).toBe('good');
  });
  it('captura errores del caller por modelo', async () => {
    const callImpl = async (model) => {
      if (model === 'broken') throw new Error('sm_52 unsupported architecture');
      return { response: 'drenaje riego', latency_ms: 100 };
    };
    const row = await scorePrompt(prompt, ['ok', 'broken'], { callImpl });
    expect(row.results.broken.error).toMatch(/sm_52/);
    expect(row.results.broken.maxwell).toBe(true);
    expect(row.results.ok.error).toBeNull();
  });
});

describe('aggregateByModel + buildSummaryMarkdown', () => {
  it('agrega ok/latencia/keywords/wins por modelo', async () => {
    const prompt = { id: 1, category: 'species', query: 'q', expected_keywords: ['drenaje', 'poda'] };
    const callImpl = async () => ({ response: 'drenaje y poda', latency_ms: 1000 });
    const rows = [await scorePrompt(prompt, ['m'], { callImpl })];
    const stats = aggregateByModel(rows, ['m']);
    expect(stats.m.ok).toBe(1);
    expect(stats.m.keywordsPct).toBe(100);
    expect(stats.m.wins).toBe(1);
    const md = buildSummaryMarkdown({ suiteId: 's', models: ['m'], rows, stats, totalMs: 1000, dateStr: '2026-06-15' });
    expect(md).toContain('| Modelo | Exitosos |');
    expect(md).toContain('keyword-matching flexible');
  });
});

describe('PROMPT_TEMPLATE', () => {
  it('inserta la pregunta y solo caracteres latinos', () => {
    const t = PROMPT_TEMPLATE('como podar el cafe');
    expect(t).toContain('como podar el cafe');
    expect(t).toMatch(/agroecologico/);
  });
});
