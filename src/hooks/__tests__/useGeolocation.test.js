import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useGeolocation', () => {
  test('module exports function', async () => {
    const { useGeolocation } = await import('../useGeolocation');
    expect(typeof useGeolocation).toBe('function');
  });

  test('returns expected shape', async () => {
    const { useGeolocation } = await import('../useGeolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
  });
});
