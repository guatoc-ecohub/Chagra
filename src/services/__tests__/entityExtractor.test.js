import { describe, test, expect } from 'vitest';
import { resolveSystemPrompt, _resetSystemPromptCache, extractEntities, SYSTEM_PROMPT, MODEL } from '../entityExtractor';

describe('entityExtractor', () => {
  test('MODEL is a non-empty string', () => {
    expect(typeof MODEL).toBe('string');
    expect(MODEL.length).toBeGreaterThan(0);
  });

  test('SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  test('resolveSystemPrompt resolves to a string', async () => {
    const prompt = await resolveSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('_resetSystemPromptCache does not throw', () => {
    expect(() => _resetSystemPromptCache()).not.toThrow();
  });

  test('extractEntities returns expected shape', async () => {
    const result = await extractEntities('Tengo 3 plantas de cafe en la finca');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('extractEntities handles empty text', async () => {
    const result = await extractEntities('');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
