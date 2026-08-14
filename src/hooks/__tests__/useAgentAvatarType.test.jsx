import { describe, it, expect, beforeEach } from 'vitest';
import useAgentAvatarType, { AVATAR_TYPES, DEFAULT_AVATAR_TYPE, AVATAR_NOMBRE } from '../useAgentAvatarType.js';
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
    localStorage.setItem('chagra:agent-avatar-type', 'jaguar');
    const { result } = renderHook(() => useAgentAvatarType());
    const [type] = result.current;
    expect(type).toBe('jaguar');
  });

  it('permite cambiar tipo valido', () => {
    const { result } = renderHook(() => useAgentAvatarType());
    const [, updateType] = result.current;
    act(() => { updateType('jaguar'); });
    const [type] = result.current;
    expect(type).toBe('jaguar');
    expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('jaguar');
  });

  it('guacamaya se retiró del roster (2026-08-14): lee/escribe y siempre migra a angelita', () => {
    localStorage.setItem('chagra:agent-avatar-type', 'guacamaya');
    const { result } = renderHook(() => useAgentAvatarType());
    const [type, updateType] = result.current;
    expect(type).toBe(DEFAULT_AVATAR_TYPE);

    act(() => { updateType('guacamaya'); });
    // updateType rechaza 'guacamaya' porque ya no está en AVATAR_TYPES — el tipo
    // se queda en el default, no se corrompe el storage.
    expect(result.current[0]).toBe(DEFAULT_AVATAR_TYPE);
  });

  it('maiz se retiró del roster (2026-08-14): lee/escribe y siempre migra a angelita', () => {
    localStorage.setItem('chagra:agent-avatar-type', 'maiz');
    const { result } = renderHook(() => useAgentAvatarType());
    const [type, updateType] = result.current;
    expect(type).toBe(DEFAULT_AVATAR_TYPE);

    act(() => { updateType('maiz'); });
    // updateType rechaza 'maiz' porque ya no está en AVATAR_TYPES — el tipo
    // se queda en el default, no se corrompe el storage.
    expect(result.current[0]).toBe(DEFAULT_AVATAR_TYPE);
  });

  it('dante y oliver están en AVATAR_TYPES pero NO en el selector 2D (sin arte propio)', () => {
    expect(AVATAR_TYPES).toContain('dante');
    expect(AVATAR_TYPES).toContain('oliver');
    expect(AVATAR_NOMBRE.dante).toBe('Dante');
    expect(AVATAR_NOMBRE.oliver).toBe('Oliver');
  });

  it('guacamaya YA NO está en AVATAR_TYPES (retirada 2026-08-14)', () => {
    expect(AVATAR_TYPES).not.toContain('guacamaya');
    expect(AVATAR_NOMBRE.guacamaya).toBeUndefined();
  });

  it('ignora tipo invalido', () => {
    const { result } = renderHook(() => useAgentAvatarType());
    const [, updateType] = result.current;
    act(() => { updateType('invalido'); });
    const [type] = result.current;
    expect(type).toBe(DEFAULT_AVATAR_TYPE);
  });

  it('exporta AVATAR_TYPES como array de 8 (roster-8)', () => {
    expect(Array.isArray(AVATAR_TYPES)).toBe(true);
    expect(AVATAR_TYPES.length).toBe(8);
    expect(AVATAR_TYPES).toEqual(['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga', 'chivito-punk', 'dante', 'oliver']);
  });
});
