import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useVoiceRecorder', () => {
  test('module exports default function', async () => {
    const mod = await import('../useVoiceRecorder');
    expect(typeof mod.default).toBe('function');
  });

  test('returns expected shape', async () => {
    const { default: useVoiceRecorder } = await import('../useVoiceRecorder');
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
  });
});
