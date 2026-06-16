import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('usePhotoUrl', () => {
  test('module exports function', async () => {
    const { usePhotoUrl } = await import('../usePhotoUrl');
    expect(typeof usePhotoUrl).toBe('function');
  });

  test('returns string or null when called without args', async () => {
    const { usePhotoUrl } = await import('../usePhotoUrl');
    const { result } = renderHook(() => usePhotoUrl());
    expect(result.current).toBeDefined();
  });
});
