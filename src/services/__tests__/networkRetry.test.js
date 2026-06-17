/**
 * networkRetry.test.js — test del fetch con reintento y backoff exponencial.
 *
 * Tarea 77: verifica que solo GET reintenta, backoff 1s/2s/4s, max 3 retries,
 * POST mutaciones sin retry, y respuesta exitosa en primer intento.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../networkRetry';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe('networkRetry.fetchWithRetry', () => {
  it('GET exitoso en primer intento: no reintenta', async () => {
    globalThis.fetch.mockResolvedValue(
      new Response('{"ok": true}', { status: 200 })
    );

    const response = await fetchWithRetry('/api/test');
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('GET: reintenta hasta 3 veces en fallo de red', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response('{"ok": true}', { status: 200 }));

    const promise = fetchWithRetry('/api/test');

    // Avanzar timers para los backoffs
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('GET: lanza tras agotar los 3 reintentos (4 intentos totales)', async () => {
    globalThis.fetch.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });

    const promise = fetchWithRetry('/api/test');
    promise.catch(() => {});

    // Avanzar timers: 1s + 2s + 4s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it('GET: reintenta en error 500 del servidor', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('error', { status: 503 }))
      .mockResolvedValue(new Response('{"ok": true}', { status: 200 }));

    const promise = fetchWithRetry('/api/test');

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('GET: NO reintenta en error 4xx (error del cliente)', async () => {
    globalThis.fetch.mockResolvedValue(
      new Response('Not found', { status: 404 })
    );

    const response = await fetchWithRetry('/api/test');
    expect(response.status).toBe(404);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('POST: no reintenta, pasa directo a fetch', async () => {
    globalThis.fetch.mockResolvedValue(
      new Response('{"ok": true}', { status: 201 })
    );

    const response = await fetchWithRetry('/api/task', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    expect(response.status).toBe(201);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/task', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });
  });

  it('respeta el parametro retries del caller', async () => {
    globalThis.fetch.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });

    const promise = fetchWithRetry('/api/test', { retries: 1 });
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  it('backoff exponencial: respeta delays 1s, 2s, 4s', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(new Error('e3'))
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const t0 = Date.now();
    const promise = fetchWithRetry('/api/test');

    // 1s
    await vi.advanceTimersByTimeAsync(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    // 2s
    await vi.advanceTimersByTimeAsync(2000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    // 4s
    await vi.advanceTimersByTimeAsync(4000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(7000);
  });
});
