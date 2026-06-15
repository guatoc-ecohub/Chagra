import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalKeyboardShortcuts } from '../useGlobalKeyboardShortcuts.js';

describe('useGlobalKeyboardShortcuts', () => {
  it('no lanza excepcion al montar', () => {
    const { result } = renderHook(() => useGlobalKeyboardShortcuts({ enabled: true }));
    expect(result).toBeDefined();
  });

  it('no lanza excepcion con enabled=false', () => {
    const { result } = renderHook(() => useGlobalKeyboardShortcuts({ enabled: false }));
    expect(result).toBeDefined();
  });

  it('no lanza con opciones por defecto', () => {
    const { result } = renderHook(() => useGlobalKeyboardShortcuts());
    expect(result).toBeDefined();
  });
});
