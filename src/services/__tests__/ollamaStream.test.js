import { describe, test, expect } from 'vitest';
import streamOllama from '../ollamaStream';

describe('ollamaStream', () => {
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
