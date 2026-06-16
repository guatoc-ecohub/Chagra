import { describe, test, expect } from 'vitest';
import {
  PARTIAL_MARKERS,
  FULL_ERROR_MESSAGES,
  normalizeInterruptReason,
  mergePartialOnInterruption,
} from '../agentPartialMerge';

describe('agentPartialMerge', () => {
  test('PARTIAL_MARKERS is a non-empty frozen object', () => {
    expect(typeof PARTIAL_MARKERS).toBe('object');
    expect(Object.keys(PARTIAL_MARKERS).length).toBeGreaterThan(0);
  });

  test('FULL_ERROR_MESSAGES is a non-empty frozen object', () => {
    expect(typeof FULL_ERROR_MESSAGES).toBe('object');
    expect(Object.keys(FULL_ERROR_MESSAGES).length).toBeGreaterThan(0);
  });

  test('normalizeInterruptReason returns string for valid input', () => {
    const result = normalizeInterruptReason('timeout');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('normalizeInterruptReason handles null/undefined gracefully', () => {
    expect(() => normalizeInterruptReason(null)).not.toThrow();
    expect(() => normalizeInterruptReason(undefined)).not.toThrow();
  });

  test('normalizeInterruptReason returns something for empty string', () => {
    const result = normalizeInterruptReason('');
    expect(typeof result).toBe('string');
  });

  test('mergePartialOnInterruption handles null partialContent', () => {
    const result = mergePartialOnInterruption({ partialContent: null, reason: 'timeout' });
    expect(result).toMatchObject({
      preservePartial: false,
      content: null,
      incomplete: false,
      reason: 'timeout',
    });
    expect(typeof result.error).toBe('string');
  });

  test('mergePartialOnInterruption handles undefined inputs', () => {
    const result = mergePartialOnInterruption({});
    expect(result).toMatchObject({
      preservePartial: false,
      content: null,
      incomplete: false,
      reason: 'abort',
    });
    expect(typeof result.error).toBe('string');
  });

  test('mergePartialOnInterruption with content merges properly', () => {
    const result = mergePartialOnInterruption({ partialContent: 'Hola mundo', reason: 'abort' });
    expect(result).toMatchObject({
      preservePartial: true,
      error: null,
      incomplete: true,
      reason: 'abort',
    });
    expect(typeof result.content).toBe('string');
    expect(result.content).toContain('Hola mundo');
  });
});
