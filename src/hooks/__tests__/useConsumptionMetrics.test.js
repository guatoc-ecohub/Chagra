import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useConsumptionMetrics', () => {
  test('module exports default function', async () => {
    const mod = await import('../useConsumptionMetrics');
    expect(typeof mod.default).toBe('function');
  });

  test('returns expected shape', async () => {
    const { useConsumptionMetrics } = await import('../useConsumptionMetrics');
    const { result } = renderHook(() => useConsumptionMetrics('test-material'));
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
  });
});
