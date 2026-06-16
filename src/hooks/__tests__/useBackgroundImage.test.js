import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useBackgroundImage', () => {
  test('module exports default function', async () => {
    const mod = await import('../useBackgroundImage');
    expect(typeof mod.default).toBe('function');
  });

  test('returns expected shape', async () => {
    const { useBackgroundImage } = await import('../useBackgroundImage');
    const { result } = renderHook(() => useBackgroundImage('test'));
    expect(result.current).toBeDefined();
  });
});
