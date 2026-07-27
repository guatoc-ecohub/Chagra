// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Pre-warm de los modelos de visión (fire-and-forget, idempotente).
 *
 * ⚠️ 2026-07-26 — ESTE ARCHIVO CAMBIÓ DE CONTRATO, y el cambio es el bug.
 *
 * Antes se daba por bueno que `warmVisionModel()` SIEMPRE disparaba su fetch.
 * Pero hoy `VISION_MODEL` y `CHAT_MODEL` son el MISMO `qwen3.5:4b`, y ese
 * fetch mandaba `keep_alive: '5m'` — que en Ollama **reescribe la expiración
 * del modelo ya residente**. Medido en `alpha` con señuelo (`gemma3:4b`):
 *
 *     carga con keep_alive 24h  → expira 2026-07-27T18:44   (+24 h)
 *     misma petición con 5m     → expira 2026-07-26T18:49   (+5 min)
 *
 * O sea que cada toque a la cámara le bajaba el pin al modelo del chat de 24 h
 * a 5 minutos. El contrato correcto es el contrario: **cuando el modelo de
 * visión es el del chat, NO se toca**. Los tests de mecánica pasan a correrse
 * sobre el modelo que sí hay que precalentar (el del segundo paso).
 */

/** Carga el módulo con los modelos que diga el test. */
const cargar = async ({ vision, review, chat }) => {
  vi.resetModules();
  vi.doMock('../../config/env', () => ({
    ENV: { VISION_MODEL: vision, VISION_REVIEW_MODEL: review, CHAT_MODEL: chat },
  }));
  const mod = await import('../visionWarmService.js');
  mod.__resetVisionWarmState();
  return mod;
};

// El caso REAL de producción hoy: visión y chat son el mismo modelo.
const HOY = { vision: 'chat-model', review: 'review-model', chat: 'chat-model' };
// Y el caso en que se volvieran a separar.
const SEPARADOS = { vision: 'vision-model', review: 'review-model', chat: 'chat-model' };

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.doUnmock('../../config/env'));

const waitForMockCalls = async (mockFn, count) => {
  for (let i = 0; i < 20 && mockFn.mock.calls.length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(mockFn).toHaveBeenCalledTimes(count);
};

describe('warmVisionModel — la guarda del pin del chat', () => {
  it('NO toca la red si el modelo de visión ES el del chat (le acortaría el pin)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionModel } = await cargar(HOY);
    expect(await warmVisionModel()).toBe(true); // ya está caliente: no hay nada que hacer
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sí precalienta cuando visión y chat son modelos DISTINTOS', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionModel } = await cargar(SEPARADOS);
    expect(await warmVisionModel()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/ollama/api/generate');
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('keep_alive');
  });

  it('jamás manda el nombre del modelo del chat en un warm', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionModel, warmVisionReviewModel } = await cargar(HOY);
    await warmVisionModel();
    await warmVisionReviewModel();
    for (const [, opts] of fetchMock.mock.calls) {
      expect(JSON.parse(opts.body).model).not.toBe('chat-model');
    }
  });
});

describe('warmVisionReviewModel — precalentar el SEGUNDO paso', () => {
  it('dispara el POST con el modelo de revisión y devuelve true', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel } = await cargar(HOY);
    expect(await warmVisionReviewModel()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('review-model');
    expect(body.keep_alive).toBeTruthy();
  });

  it('NO precalienta si hay un turno en vuelo — esa concurrencia desaloja al chat', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel } = await cargar(HOY);
    expect(await warmVisionReviewModel({ ocupado: () => true })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si la sonda `ocupado` revienta, no se cae: sigue con los otros candados', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel } = await cargar(HOY);
    const r = await warmVisionReviewModel({ ocupado: () => { throw new Error('boom'); } });
    expect(r).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve false si la respuesta no es ok, y si fetch lanza (degrada callado)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const a = await cargar(HOY);
    expect(await a.warmVisionReviewModel()).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const b = await cargar(HOY);
    expect(await b.warmVisionReviewModel()).toBe(false);
  });

  it('idempotente: un segundo toque a la cámara no vuelve a cargar el modelo', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel } = await cargar(HOY);
    await warmVisionReviewModel();
    await warmVisionReviewModel();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tras el reset vuelve a precalentar', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel, __resetVisionWarmState } = await cargar(HOY);
    await warmVisionReviewModel();
    __resetVisionWarmState();
    await warmVisionReviewModel();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cerrojo en vuelo: dos llamadas simultáneas NO cargan el modelo dos veces', async () => {
    let resolveFetch;
    const fetchMock = vi.fn(() => new Promise((res) => { resolveFetch = () => res({ ok: true }); }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionReviewModel } = await cargar(HOY);
    const p1 = warmVisionReviewModel();
    const r2 = await warmVisionReviewModel();
    expect(r2).toBe(true);
    await waitForMockCalls(fetchMock, 1);
    resolveFetch();
    expect(await p1).toBe(true);
  });

  it('EL CERROJO ES COMPARTIDO entre los dos warms: nunca dos cargas a la vez', async () => {
    // Es el candado que importa: lo que desalojó al chat pineado no fue el
    // tamaño (los dos modelos caben) sino DOS cargas simultáneas.
    let resolveFetch;
    const fetchMock = vi.fn(() => new Promise((res) => { resolveFetch = () => res({ ok: true }); }));
    vi.stubGlobal('fetch', fetchMock);
    const { warmVisionModel, warmVisionReviewModel } = await cargar(SEPARADOS);
    const p1 = warmVisionModel();              // toma el cerrojo
    const r2 = await warmVisionReviewModel();  // debe cortocircuitar
    expect(r2).toBe(true);
    await waitForMockCalls(fetchMock, 1);
    resolveFetch();
    await p1;
  });
});

describe('modelosResidentes — la sonda que protege al chat', () => {
  it('devuelve los nombres que reporta /api/ps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ models: [{ name: 'chat-model' }, { model: 'review-model' }] }),
    })));
    const { modelosResidentes } = await cargar(HOY);
    expect(await modelosResidentes()).toEqual(['chat-model', 'review-model']);
  });

  it('si no se puede consultar devuelve [] — que el caller lee como "no sé"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const { modelosResidentes } = await cargar(HOY);
    expect(await modelosResidentes()).toEqual([]);
  });
});
