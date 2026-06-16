import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useAssetPerformance', () => {
  test('module exports default function', async () => {
    const mod = await import('../useAssetPerformance');
    expect(typeof mod.default).toBe('function');
  });

  test('returns expected shape when called without assetId', async () => {
    const { useAssetPerformance } = await import('../useAssetPerformance');
    const { result } = renderHook(() => useAssetPerformance(null));
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
  });
});
