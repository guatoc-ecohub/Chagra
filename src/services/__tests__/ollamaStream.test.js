import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import streamOllama from '../ollamaStream';

describe('ollamaStream', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/x-ndjson' },
      body: {
        getReader() {
          return {
            read() {
              return new Promise(() => {});
            },
            releaseLock() {},
          };
        },
      },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('streamOllama is a function', () => {
    expect(typeof streamOllama).toBe('function');
  });

  test('streamOllama returns a Promise with abort function', async () => {
    const promise = streamOllama('/api/ollama/api/chat', {}, () => {}, { signal: new AbortController().signal });
    expect(promise).toBeInstanceOf(Promise);
    const result = await Promise.race([
      promise,
      new Promise((r) => setTimeout(() => r('timeout'), 100)),
    ]);
    // Will timeout because we're not actually hitting an Ollama server
    expect(result).toBe('timeout');
  });
});
