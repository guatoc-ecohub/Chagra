/**
 * scripts/__tests__/bench-sidecar.test.mjs - tests del lib compartido de
 * sidecar/GPU/generador de los benches anti-alucinacion. fetch/exec inyectados,
 * sin red ni GPU.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  gpuTemp,
  thermalGuard,
  resolveEntities,
  postValidate,
  buildEnrichedSystemPrompt,
  generateChat,
  makeJudgeOllamaCall,
} from '../lib/bench-sidecar.mjs';

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

describe('gpuTemp', () => {
  it('parsea la temperatura del exec inyectado', () => {
    expect(gpuTemp(() => '72\n')).toBe(72);
  });
  it('null si exec lanza', () => {
    expect(gpuTemp(() => { throw new Error('no nvidia-smi'); })).toBeNull();
  });
  it('null si la salida no es numero', () => {
    expect(gpuTemp(() => 'N/A')).toBeNull();
  });
});

describe('thermalGuard', () => {
  it('no bloquea si no hay telemetria (temp null)', async () => {
    const waitFn = vi.fn();
    await thermalGuard({ tempFn: () => null, waitFn });
    expect(waitFn).not.toHaveBeenCalled();
  });
  it('no espera si la GPU esta fria', async () => {
    const waitFn = vi.fn();
    await thermalGuard({ tempFn: () => 40, waitFn });
    expect(waitFn).not.toHaveBeenCalled();
  });
  it('espera mientras esta caliente y sale al enfriar', async () => {
    const temps = [90, 70];
    const tempFn = () => temps.shift();
    const waitFn = vi.fn(async () => {});
    await thermalGuard({ tempFn, waitFn, limit: 88, resume: 75, log: () => {} });
    expect(waitFn).toHaveBeenCalledTimes(1);
  });
});

describe('resolveEntities', () => {
  it('devuelve entities del sidecar', async () => {
    const fetchImpl = async () => okJson({ entities: [{ kind: 'species', mentioned: 'mora' }] });
    const r = await resolveEntities('hola mora', { fetchImpl, token: 't' });
    expect(r.entities).toHaveLength(1);
  });
  it('degrada a [] si el sidecar responde !ok', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const r = await resolveEntities('x', { fetchImpl });
    expect(r.entities).toEqual([]);
  });
  it('degrada a [] si fetch lanza', async () => {
    const fetchImpl = async () => { throw new Error('timeout'); };
    const r = await resolveEntities('x', { fetchImpl });
    expect(r.entities).toEqual([]);
  });
});

describe('postValidate', () => {
  it('mapea hallucinated/detected_count/age_available', async () => {
    const fetchImpl = async () => okJson({ hallucinated: ['Xy inventada'], detected_count: 1, age_available: true });
    const r = await postValidate('q', 'resp', { fetchImpl });
    expect(r.detected_count).toBe(1);
    expect(r.age_available).toBe(true);
  });
  it('degrada graceful si fetch lanza', async () => {
    const fetchImpl = async () => { throw new Error('down'); };
    const r = await postValidate('q', 'resp', { fetchImpl });
    expect(r).toEqual({ hallucinated: [], detected_count: 0, age_available: false });
  });
});

describe('buildEnrichedSystemPrompt', () => {
  it('sin entidades devuelve el base', () => {
    const p = buildEnrichedSystemPrompt([]);
    expect(p).toMatch(/asistente agroecologico/);
    expect(p).not.toMatch(/ENTIDADES DEL CATALOGO/);
  });
  it('con entidades inyecta nombres canonicos', () => {
    const p = buildEnrichedSystemPrompt([
      { kind: 'species', mentioned: 'mora', nombre_cientifico: 'Rubus glaucus', nombre_comun: 'mora' },
    ]);
    expect(p).toMatch(/ENTIDADES DEL CATALOGO/);
    expect(p).toMatch(/Rubus glaucus/);
  });
});

describe('generateChat (fetch inyectado)', () => {
  it('devuelve response + latency_ms y manda model/options correctos', async () => {
    let sentBody;
    const fetchImpl = async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return okJson({ message: { content: 'respuesta del modelo' } });
    };
    const r = await generateChat({
      model: 'granite3.1-dense:8b',
      systemPrompt: 'sys',
      userPrompt: 'user',
      temperature: 0.3,
      seed: 42,
      maxTokens: 768,
      fetchImpl,
    });
    expect(r.response).toBe('respuesta del modelo');
    expect(typeof r.latency_ms).toBe('number');
    expect(sentBody.model).toBe('granite3.1-dense:8b');
    expect(sentBody.options).toMatchObject({ temperature: 0.3, seed: 42, num_predict: 768 });
  });
  it('lanza en HTTP !ok', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 });
    await expect(
      generateChat({ model: 'm', systemPrompt: 's', userPrompt: 'u', fetchImpl }),
    ).rejects.toThrow(/HTTP 503/);
  });
  it('incluye num_ctx en options cuando se pasa por param', async () => {
    let sentBody;
    const fetchImpl = async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return okJson({ message: { content: 'ok' } });
    };
    await generateChat({ model: 'm', systemPrompt: 's', userPrompt: 'u', numCtx: 8192, fetchImpl });
    expect(sentBody.options.num_ctx).toBe(8192);
  });
  it('incluye num_ctx desde env BENCH_NUM_CTX cuando no hay param', async () => {
    let sentBody;
    const fetchImpl = async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return okJson({ message: { content: 'ok' } });
    };
    process.env.BENCH_NUM_CTX = '4096';
    await generateChat({ model: 'm', systemPrompt: 's', userPrompt: 'u', fetchImpl });
    expect(sentBody.options.num_ctx).toBe(4096);
    delete process.env.BENCH_NUM_CTX;
  });
  it('no incluye num_ctx en options si no se pasa ni env', async () => {
    let sentBody;
    const fetchImpl = async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return okJson({ message: { content: 'ok' } });
    };
    await generateChat({ model: 'm', systemPrompt: 's', userPrompt: 'u', fetchImpl });
    expect(sentBody.options.num_ctx).toBeUndefined();
  });
});

describe('makeJudgeOllamaCall', () => {
  it('fabrica un caller (prompt)=>texto', async () => {
    const fetchImpl = async () => okJson({ response: 'PASS' });
    const call = makeJudgeOllamaCall({ model: 'qwen2.5:14b', fetchImpl });
    expect(await call('juzga esto')).toBe('PASS');
  });
});
