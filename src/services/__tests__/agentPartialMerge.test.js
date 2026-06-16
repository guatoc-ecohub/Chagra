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
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('preservePartial');
    expect(result).toHaveProperty('error');
    expect(result.reason).toBe('timeout');
  });

  test('mergePartialOnInterruption handles undefined inputs', () => {
    const result = mergePartialOnInterruption({});
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('preservePartial');
    expect(result).toHaveProperty('reason');
  });

  test('mergePartialOnInterruption with content merges properly', () => {
    const result = mergePartialOnInterruption({ partialContent: 'Hola mundo', reason: 'abort' });
    expect(typeof result).toBe('object');
    expect(result.preservePartial).toBe(true);
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
  });
});
