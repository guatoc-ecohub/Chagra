import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import useIdleDetection from '../useIdleDetection.js';

describe('useIdleDetection', () => {
  it('retorna false inicialmente (no idle)', () => {
    const { result } = renderHook(() => useIdleDetection(10000, true));
    expect(result.current).toBe(false);
  });

  it('retorna false cuando disabled', () => {
    const { result } = renderHook(() => useIdleDetection(5000, false));
    expect(result.current).toBe(false);
  });
});
