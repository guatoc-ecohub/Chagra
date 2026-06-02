/**
 * deepResearchClient.test.js — TDD del cliente HTTP de Deep Research (A6/A7).
 *
 * Tests escritos ANTES del código (TDD). Validan:
 *   - isDeepResearchEnabled() lee correctamente la flag de entorno.
 *   - submitDeepResearch() retorna null con flag off / offline / fetch fail.
 *   - submitDeepResearch() retorna { job_id } en happy path.
 *   - fetchDeepResearchStatus() normaliza correctamente el body del sidecar.
 *   - normalizeStatus() maneja campos faltantes con defaults seguros.
 *   - pollDeepResearch() invoca onUpdate en cada tick y resuelve al done.
 *   - pollDeepResearch() respeta AbortSignal (cancel-on-demand).
 *   - Backoff exponencial — usa los pasos definidos en BACKOFF_STEPS_MS.
 *
 * Mocking: solo fetch global — sin net real, sin sidecar, sin timer real.
 * Español colombiano en strings, nunca voseo argentino.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDeepResearchEnabled,
  submitDeepResearch,
  fetchDeepResearchStatus,
  normalizeStatus,
  pollDeepResearch,
  BACKOFF_STEPS_MS,
} from '../deepResearchClient.js';

// ── Helpers ────────────────────────────────────────────────────────────────

let fetchMock;

function mockEnv(value) {
  // Parchea import.meta.env.VITE_DEEP_RESEARCH_ENABLED
  vi.stubEnv('VITE_DEEP_RESEARCH_ENABLED', value);
}

function setOnline(online) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

function mockFetchOnce(body, { status = 200, ok = true } = {}) {
  const jsonFn = vi.fn().mockResolvedValueOnce(body);
  const res = { ok, status, json: jsonFn };
  fetchMock.mockResolvedValueOnce(res);
  return jsonFn;
}

function mockFetchFail(error = new Error('network error')) {
  fetchMock.mockRejectedValueOnce(error);
}

// ── Setup global ──────────────────────────────────────────────────────────

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  setOnline(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setOnline(true);
});

// ── isDeepResearchEnabled ──────────────────────────────────────────────────

describe('isDeepResearchEnabled', () => {

  it('retorna false si la flag no está definida (default seguro)', () => {
    vi.unstubAllEnvs();
    expect(isDeepResearchEnabled()).toBe(false);
  });

  it('retorna true con "true"', () => {
    mockEnv('true');
    expect(isDeepResearchEnabled()).toBe(true);
  });

  it('retorna true con "1"', () => {
    mockEnv('1');
    expect(isDeepResearchEnabled()).toBe(true);
  });

  it('retorna false con "false"', () => {
    mockEnv('false');
    expect(isDeepResearchEnabled()).toBe(false);
  });

  it('retorna false con string vacío', () => {
    mockEnv('');
    expect(isDeepResearchEnabled()).toBe(false);
  });

  it('acepta boolean true directamente', () => {
    // import.meta.env puede devolver boolean en algunos bundlers
    mockEnv(true);
    expect(isDeepResearchEnabled()).toBe(true);
  });
});

// ── normalizeStatus ────────────────────────────────────────────────────────

describe('normalizeStatus', () => {
  it('normaliza body completo correctamente', () => {
    const result = normalizeStatus({
      status: 'done',
      steps: ['¿Qué es el achiote?', '¿Cuándo se siembra?'],
      report: 'El achiote es una especie nativa.',
      citations: [{ source_id: 'agrosavia-1', label: 'Agrosavia', url: 'https://agrosavia.co/doc' }],
      timings: { total_ms: 12000 },
    });
    expect(result.status).toBe('done');
    expect(result.steps).toHaveLength(2);
    expect(result.report).toBe('El achiote es una especie nativa.');
    expect(result.citations).toHaveLength(1);
    expect(result.timings.total_ms).toBe(12000);
  });

  it('usa valores por defecto seguros si faltan campos', () => {
    const result = normalizeStatus({});
    expect(result.status).toBe('running'); // default si no hay status válido
    expect(result.steps).toEqual([]);
    expect(result.report).toBe('');
    expect(result.citations).toEqual([]);
    expect(result.timings).toEqual({});
  });

  it('filtra steps que no son strings no vacíos', () => {
    const result = normalizeStatus({
      status: 'running',
      steps: ['paso válido', '', null, 42, '  '],
    });
    expect(result.steps).toEqual(['paso válido']);
  });

  it('filtra citations que no son objetos', () => {
    const result = normalizeStatus({
      status: 'done',
      citations: [{ source_id: 'ok' }, null, 'no-objeto', 42],
    });
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].source_id).toBe('ok');
  });

  it('acepta status running, done y error', () => {
    for (const s of ['running', 'done', 'error']) {
      expect(normalizeStatus({ status: s }).status).toBe(s);
    }
  });

  it('status desconocido cae a "running" (defensa)', () => {
    expect(normalizeStatus({ status: 'unknown-estado' }).status).toBe('running');
    expect(normalizeStatus({ status: null }).status).toBe('running');
  });
});

// ── submitDeepResearch ─────────────────────────────────────────────────────

describe('submitDeepResearch', () => {
  it('retorna null si la flag está off (default)', async () => {
    // flag off → no hay fetch
    const result = await submitDeepResearch('¿Qué siembro en diciembre?');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna null para query vacía', async () => {
    mockEnv('true');
    expect(await submitDeepResearch('')).toBeNull();
    expect(await submitDeepResearch('   ')).toBeNull();
    expect(await submitDeepResearch(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna null si está offline', async () => {
    mockEnv('true');
    setOnline(false);
    const result = await submitDeepResearch('¿Qué siembro?');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna { job_id } en happy path', async () => {
    mockEnv('true');
    mockFetchOnce({ job_id: 'abc-123' }, { status: 200, ok: true });
    const result = await submitDeepResearch('Sistema agroforestal cacao');
    expect(result).toEqual({ job_id: 'abc-123' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/deep-research'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retorna null si el server responde non-2xx', async () => {
    mockEnv('true');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: vi.fn() });
    const result = await submitDeepResearch('agroforestería');
    expect(result).toBeNull();
  });

  it('retorna null si el body no trae job_id', async () => {
    mockEnv('true');
    mockFetchOnce({ error: 'no job' });
    const result = await submitDeepResearch('agroforestería');
    expect(result).toBeNull();
  });

  it('retorna null ante error de red (catch silencioso)', async () => {
    mockEnv('true');
    mockFetchFail();
    const result = await submitDeepResearch('agroforestería');
    expect(result).toBeNull();
  });
});

// ── fetchDeepResearchStatus ────────────────────────────────────────────────

describe('fetchDeepResearchStatus', () => {
  it('retorna null si la flag está off', async () => {
    const result = await fetchDeepResearchStatus('abc-123');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna null para jobId vacío', async () => {
    mockEnv('true');
    expect(await fetchDeepResearchStatus('')).toBeNull();
    expect(await fetchDeepResearchStatus(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna el status normalizado en happy path', async () => {
    mockEnv('true');
    mockFetchOnce({
      status: 'running',
      steps: ['Paso uno', 'Paso dos'],
      report: '',
      citations: [],
    });
    const result = await fetchDeepResearchStatus('abc-123');
    expect(result).not.toBeNull();
    expect(result.status).toBe('running');
    expect(result.steps).toHaveLength(2);
  });

  it('retorna null ante non-2xx', async () => {
    mockEnv('true');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn() });
    expect(await fetchDeepResearchStatus('abc-123')).toBeNull();
  });

  it('retorna null ante error de red', async () => {
    mockEnv('true');
    mockFetchFail();
    expect(await fetchDeepResearchStatus('abc-123')).toBeNull();
  });

  it('respeta AbortSignal externo', async () => {
    mockEnv('true');
    // La señal ya está abortada cuando se llama — debe fallar el fetch
    const controller = new AbortController();
    controller.abort();
    // fetch con señal abortada lanza AbortError inmediato
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    );
    const result = await fetchDeepResearchStatus('abc-123', controller.signal);
    expect(result).toBeNull();
  });
});

// ── pollDeepResearch ───────────────────────────────────────────────────────

describe('pollDeepResearch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null si jobId está vacío', async () => {
    const result = await pollDeepResearch('', vi.fn());
    expect(result).toBeNull();
  });

  it('resuelve con status=done en primer tick (sin backoff)', async () => {
    mockEnv('true');
    // Si el primer fetch devuelve done, el loop termina sin esperar
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({
        status: 'done',
        steps: ['Solo un paso'],
        report: 'Informe rápido.',
        citations: [{ source_id: 'src-1', url: 'https://ejemplo.co' }],
      }),
    });

    const onUpdate = vi.fn();
    const result = await pollDeepResearch('job-fast', onUpdate);

    expect(result.status).toBe('done');
    expect(result.report).toBe('Informe rápido.');
    expect(result.citations).toHaveLength(1);
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(['Solo un paso'], 'done');
  });

  it('resuelve con status=error cuando el sidecar devuelve error', async () => {
    mockEnv('true');
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      json: () => Promise.resolve({ status: 'error', steps: [], report: '', citations: [] }),
    });

    const result = await pollDeepResearch('job-err', vi.fn());
    expect(result.status).toBe('error');
  });

  it('llama onUpdate en cada tick con pasos nuevos y resuelve al done', async () => {
    mockEnv('true');
    // Usamos fake timers para controlar el backoff sin esperar 1s real
    vi.useFakeTimers();

    fetchMock
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ status: 'running', steps: ['Paso A'], report: '', citations: [] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ status: 'done', steps: ['Paso A', 'Paso B'], report: 'Informe final.', citations: [] }),
      });

    const onUpdate = vi.fn();
    // Lanzar el poll (llama fetch inmediatamente, luego duerme 1000ms antes del 2do)
    const pollPromise = pollDeepResearch('job-1', onUpdate);

    // Primer fetch ya corrió (resolve inmediato del mock) — avanzar el timer del backoff
    await vi.runAllTimersAsync();
    const result = await pollPromise;

    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[0]).toEqual([['Paso A'], 'running']);
    expect(onUpdate.mock.calls[1]).toEqual([['Paso A', 'Paso B'], 'done']);
    expect(result.status).toBe('done');
    expect(result.report).toBe('Informe final.');
  });

  it('cancela el loop cuando el AbortSignal se aborta antes del primer fetch', async () => {
    mockEnv('true');
    const controller = new AbortController();
    controller.abort(); // abortar ANTES de llamar a poll

    // fetch rechazará con AbortError por la señal
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    );

    const onUpdate = vi.fn();
    const result = await pollDeepResearch('job-cancel', onUpdate, controller.signal);
    expect(result).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('BACKOFF_STEPS_MS tiene 5 entradas con el cap correcto', () => {
    expect(BACKOFF_STEPS_MS).toHaveLength(5);
    expect(BACKOFF_STEPS_MS[0]).toBe(1000);
    expect(BACKOFF_STEPS_MS[1]).toBe(2000);
    expect(BACKOFF_STEPS_MS[2]).toBe(4000);
    expect(BACKOFF_STEPS_MS[3]).toBe(8000);
    expect(BACKOFF_STEPS_MS[4]).toBe(8000); // cap
  });
});
