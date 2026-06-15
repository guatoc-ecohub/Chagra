import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import useIdleVisibility from '../useIdleVisibility.js';

describe('useIdleVisibility', () => {
  it('retorna true inicialmente', () => {
    const { result } = renderHook(() => useIdleVisibility(5000));
    expect(result.current).toBe(true);
  });
});
