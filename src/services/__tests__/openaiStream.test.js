import { describe, it, expect, vi, afterEach } from 'vitest';

import streamOpenAI from '../openaiStream.js';

describe('streamOpenAI (unit)', () => {
  it('es una funcion exportada', () => {
    expect(typeof streamOpenAI).toBe('function');
  });
});

describe('openAI SSE parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parsea chunks SSE correctamente', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"hola"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" mundo"}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ];

    let chunkIndex = 0;
    const readable = new ReadableStream({
      pull(controller) {
        if (chunkIndex < chunks.length) {
          controller.enqueue(encoder.encode(chunks[chunkIndex++]));
        } else {
          controller.close();
        }
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: readable,
      headers: { get: vi.fn() },
    }));

    const result = await streamOpenAI('/api/llamacpp/v1/chat/completions', { model: 'olmoe' });
    expect(result.fullText).toContain('hola mundo');
  });

  it('finaliza con finish_reason aunque el proxy omita [DONE]', async () => {
    const encoder = new TextEncoder();
    let reads = 0;
    const readable = new ReadableStream({
      pull(controller) {
        if (reads++ === 0) {
          controller.enqueue(encoder.encode(
            'data: {"choices":[{"delta":{"content":"respuesta completa"}}]}\n\n' +
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          ));
          return;
        }
        // Simula el proxy que deja abierta la conexión después del último
        // chunk y nunca manda el sentinel SSE.
        return new Promise(() => {});
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: readable,
      headers: { get: vi.fn() },
    }));

    const result = await Promise.race([
      streamOpenAI('/api/llamacpp/v1/chat/completions', { model: 'olmoe' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('stream did not finalize')), 500)),
    ]);
    expect(result.fullText).toBe('respuesta completa');
  });

  it('lanza error para fetch no-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => '{}',
      headers: { get: vi.fn().mockReturnValue('') },
    }));

    await expect(
      streamOpenAI('/api/llamacpp/v1/chat/completions', { model: 'olmoe' })
    ).rejects.toThrow();
  });

  it('lanza error si sin body streameable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      headers: { get: vi.fn() },
    }));

    await expect(
      streamOpenAI('/api/llamacpp/v1/chat/completions', { model: 'olmoe' })
    ).rejects.toThrow('Respuesta sin body streameable');
  });
});
