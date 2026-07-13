import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { fetchWithAuthRetry } = vi.hoisted(() => ({
  fetchWithAuthRetry: vi.fn((...args) => {
    const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
    return globalThis.fetch(a[0], a[1]);
  }),
}));

vi.mock('../apiService.js', () => ({
  fetchWithAuthRetry,
}));

import {
  sendFeedback,
  queueFeedbackOffline,
  getQueuedFeedback,
  flushFeedbackQueue,
  clearFeedbackQueue,
} from '../feedbackService.js';

/**
 * Tests de la cola offline de feedback (B1). Cuando navigator.onLine === false,
 * el feedback se encola en localStorage para envío diferido en vez de perderse.
 * flushFeedbackQueue() lo reenvía cuando vuelve la conexión.
 */

import { setOnline } from '../../test-utils/index.js';

beforeEach(() => {
  localStorage.clear();
  clearFeedbackQueue();
  setOnline(true);
  fetchWithAuthRetry.mockClear();
  fetchWithAuthRetry.mockImplementation((...args) => {
    const a = /** @type {[RequestInfo | URL, RequestInit?]} */ (args);
    return globalThis.fetch(a[0], a[1]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('cola offline de feedback', () => {
  it('queueFeedbackOffline encola y getQueuedFeedback lo lee', () => {
    queueFeedbackOffline({ id: 'a', thumb: 'up' });
    queueFeedbackOffline({ id: 'b', thumb: 'down' });
    const q = getQueuedFeedback();
    expect(q).toHaveLength(2);
    expect(q[0].id).toBe('a');
  });

  it('la cola está acotada (no crece sin límite)', () => {
    for (let i = 0; i < 80; i++) queueFeedbackOffline({ id: `f${i}`, thumb: 'up' });
    expect(getQueuedFeedback().length).toBeLessThanOrEqual(50);
    // conserva los más recientes
    const ids = getQueuedFeedback().map((f) => f.id);
    expect(ids).toContain('f79');
  });

  it('sendFeedback offline ENCOLA en vez de perder, y devuelve false', async () => {
    setOnline(false);
    const r = await sendFeedback({ prompt: 'p', response: 'r', thumb: 'down', comment: 'c' });
    expect(r).toBe(false);
    const q = getQueuedFeedback();
    expect(q).toHaveLength(1);
    expect(q[0].prompt).toBe('p');
    expect(q[0].thumb).toBe('down');
    expect(q[0].id).toBeTruthy(); // se construyó el objeto completo
  });

  it('flushFeedbackQueue reenvía lo encolado y vacía la cola si tiene éxito', async () => {
    queueFeedbackOffline({ id: 'x', prompt: 'p', response: 'r', thumb: 'up' });
    queueFeedbackOffline({ id: 'y', prompt: 'p2', response: 'r2', thumb: 'down' });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const flushed = await flushFeedbackQueue();
    expect(flushed).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(2);
    expect(getQueuedFeedback()).toHaveLength(0);
  });

  it('flushFeedbackQueue NO descarta lo que falla al reenviar', async () => {
    queueFeedbackOffline({ id: 'z', prompt: 'p', response: 'r', thumb: 'up' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const flushed = await flushFeedbackQueue();
    expect(flushed).toBe(0);
    expect(getQueuedFeedback()).toHaveLength(1); // sigue en cola para reintentar
  });

  it('flushFeedbackQueue no hace nada si la cola está vacía', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await flushFeedbackQueue()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
