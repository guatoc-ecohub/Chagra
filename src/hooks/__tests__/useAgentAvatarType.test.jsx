import { describe, it, expect, beforeEach } from 'vitest';
import useAgentAvatarType, { AVATAR_TYPES, DEFAULT_AVATAR_TYPE } from '../useAgentAvatarType.js';
import { renderHook, act } from '@testing-library/react';

describe('useAgentAvatarType', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna tipo default al iniciar', () => {
    const { result } = renderHook(() => useAgentAvatarType());
    const [type] = result.current;
    expect(type).toBe(DEFAULT_AVATAR_TYPE);
  });

  it('lee preferencia guardada en localStorage', () => {
    localStorage.setItem('chagra:agent-avatar-type', 'maiz');
    const { result } = renderHook(() => useAgentAvatarType());
    const [type] = result.current;
    expect(type).toBe('maiz');
  });

  it('permite cambiar tipo valido', () => {
    const { result } = renderHook(() => useAgentAvatarType());
    const [, updateType] = result.current;
    act(() => { updateType('maiz'); });
    const [type] = result.current;
    expect(type).toBe('maiz');
    expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('maiz');
  });

  it('ignora tipo invalido', () => {
    const { result } = renderHook(() => useAgentAvatarType());
    const [, updateType] = result.current;
    act(() => { updateType('invalido'); });
    const [type] = result.current;
    expect(type).toBe(DEFAULT_AVATAR_TYPE);
  });

  it('exporta AVATAR_TYPES como array', () => {
    expect(Array.isArray(AVATAR_TYPES)).toBe(true);
    expect(AVATAR_TYPES.length).toBeGreaterThan(0);
  });
});
