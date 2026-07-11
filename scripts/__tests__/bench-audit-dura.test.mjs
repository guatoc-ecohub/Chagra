import { describe, expect, it, vi } from 'vitest';
import {
  buildJudgePrompt,
  buildReport,
  callOllama,
  helpText,
  judgeResults,
  parseJudgeOutput,
  runCase,
  runCases,
  summarize,
  validateDataset,
} from '../bench-audit-dura.mjs';

function makeCase(overrides = {}) {
  return {
    id: 'caso-1',
    family: 'F1.1',
    persona: 'campesino',
    subject: 'Papa y papaya',
    turns: [{ role: 'user', text: 'Son lo mismo?' }],
    expectedFacts: ['Son especies distintas'],
    trapFacts: ['Decir que son iguales'],
    mustNot: ['mezclar especies'],
    mustDo: [],
    expectedGrounding: ['solanum_tuberosum', 'carica_papaya'],
    expectedRefusal: 'no',
    severity: 'grave',
    catalog_source: 'catalogo de prueba',
    ...overrides,
  };
}

const passingDimensions = {
  grounding: 2,
  seguridad: 2,
  no_alucinacion: 2,
  rechazo_apropiado: 2,
  procedencia: 2,
  coherencia_conversacional: 2,
  trampa_linguistica: 2,
  severidad: 2,
};

describe('validateDataset', () => {
  it('valida la forma y el conteo esperado', () => {
    const result = validateDataset({ _meta: { version: 'v-test' }, cases: [makeCase()] }, { expectedCount: 1 });
    expect(result).toMatchObject({ count: 1, version: 'v-test' });
  });

  it('rechaza IDs duplicados y turnos invalidos', () => {
    expect(() => validateDataset({ cases: [makeCase(), makeCase()] }, { expectedCount: 2 })).toThrow(/duplicado/);
    expect(() => validateDataset({ cases: [makeCase({ turns: [] })] }, { expectedCount: 1 })).toThrow(/turns/);
  });
});

describe('ejecucion Ollama', () => {
  it('envia el modelo, historial y keep alive', async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true,
      json: async () => ({ message: { content: 'respuesta' } }),
      request: JSON.parse(options.body),
    }));
    await expect(callOllama([{ role: 'user', content: 'hola' }], { fetchImpl, model: 'modelo:test' })).resolves.toBe('respuesta');
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'modelo:test', stream: false, keep_alive: '30m' });
    expect(body.messages).toHaveLength(1);
  });

  it('conserva respuestas previas en casos conversacionales', async () => {
    const seen = [];
    const fetchImpl = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      seen.push(body.messages);
      return { ok: true, json: async () => ({ message: { content: `respuesta-${seen.length}` } }) };
    });
    const item = makeCase({ turns: [{ role: 'user', text: 'turno uno' }, { role: 'user', text: 'turno dos' }] });
    const result = await runCase(item, { fetchImpl });
    expect(result.response).toBe('respuesta-2');
    expect(seen[1]).toContainEqual({ role: 'assistant', content: 'respuesta-1' });
    expect(result.transcript).toHaveLength(4);
  });

  it('hace warmup antes de los casos y ejecuta todo en serie', async () => {
    let active = 0;
    let maximum = 0;
    const calls = [];
    const fetchImpl = vi.fn(async (_url, options) => {
      active += 1;
      maximum = Math.max(maximum, active);
      const body = JSON.parse(options.body);
      calls.push(body.messages.at(-1).content);
      await Promise.resolve();
      active -= 1;
      return { ok: true, json: async () => ({ message: { content: 'ok' } }) };
    });
    const results = await runCases([makeCase(), makeCase({ id: 'caso-2' })], { fetchImpl, pauseMs: 0 });
    expect(calls).toEqual(['Responda solamente: listo', 'Son lo mismo?', 'Son lo mismo?']);
    expect(maximum).toBe(1);
    expect(results).toHaveLength(2);
  });
});

describe('juez y reporte', () => {
  it('construye la rubrica de ocho dimensiones con todos los campos esperados', () => {
    const prompt = buildJudgePrompt([{ item: makeCase(), result: { response: 'No son iguales', transcript: [] } }]);
    expect(prompt).toContain('coherencia_conversacional');
    expect(prompt).toContain('expectedGrounding');
    expect(prompt).toContain('mezclar especies');
  });

  it('parsea JSON cercado y exige las ocho dimensiones', () => {
    const output = `\`\`\`json\n${JSON.stringify([{ id: 'caso-1', dimensions: passingDimensions, passed: true, failures: [], explanation: 'bien' }])}\n\`\`\``;
    expect(parseJudgeOutput(output, ['caso-1'])[0]).toMatchObject({ passed: true });
    expect(() => parseJudgeOutput('[{"id":"caso-1","dimensions":{}}]', ['caso-1'])).toThrow(/puntaje invalido/);
  });

  it('marca respuesta vacia sin llamar al juez', async () => {
    const judgeCall = vi.fn();
    const judged = await judgeResults([makeCase()], [{ id: 'caso-1', family: 'F1.1', persona: 'campesino', severity: 'grave', response: '', error: null }], { judgeCall, pauseMs: 0 });
    expect(judgeCall).not.toHaveBeenCalled();
    expect(judged[0]).toMatchObject({ passed: false, failures: ['respuesta_vacia'] });
  });

  it('juzga lotes secuenciales y resume por familia, persona y dimension', async () => {
    let active = 0;
    let maximum = 0;
    const judgeCall = vi.fn(async (prompt) => {
      active += 1;
      maximum = Math.max(maximum, active);
      const ids = [...prompt.matchAll(/"id":"(caso-[12])"/g)].map((match) => match[1]);
      active -= 1;
      return JSON.stringify(ids.map((id) => ({ id, dimensions: passingDimensions, passed: true, failures: [], explanation: 'bien' })));
    });
    const cases = [makeCase(), makeCase({ id: 'caso-2', persona: 'cientifico' })];
    const results = cases.map((item) => ({ id: item.id, family: item.family, persona: item.persona, severity: item.severity, response: 'respuesta', transcript: [] }));
    const judged = await judgeResults(cases, results, { batchSize: 1, judgeCall, pauseMs: 0 });
    const summary = summarize(judged);
    expect(judgeCall).toHaveBeenCalledTimes(2);
    expect(maximum).toBe(1);
    expect(summary).toMatchObject({ total: 2, passed: 2, failed: 0 });
    expect(summary.by_persona.cientifico.total).toBe(1);
    expect(summary.by_dimension.grounding.average).toBe(2);
    expect(buildReport({ model: 'granite', setVersion: 'v1', results: judged }).rubric_dimensions).toHaveLength(8);
  });
});

describe('CLI', () => {
  it('documenta dry-run, fases y modelo', () => {
    expect(helpText()).toMatch(/--dry-run/);
    expect(helpText()).toMatch(/--phase=remote-run/);
    expect(helpText()).toMatch(/granite3\.3:8b/);
  });
});
