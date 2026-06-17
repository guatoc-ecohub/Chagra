import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../useAutosave';

describe('useAutosave', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

  it('restaura estado inicial cuando no hay datos guardados', () => {
    const { result } = renderHook(() => useAutosave('test-form', { name: '', notes: '' }));
    expect(result.current.savedState).toEqual({ name: '', notes: '' });
  });

  it('restaura estado guardado desde localStorage al montar', () => {
    localStorage.setItem('chagra:autosave:test-form', JSON.stringify({ name: 'Tarea guardada', notes: 'Notas' }));
    const { result } = renderHook(() => useAutosave('test-form', { name: '', notes: '' }));
    expect(result.current.savedState).toEqual({ name: 'Tarea guardada', notes: 'Notas' });
  });

  it('mergea estado guardado con initialState', () => {
    localStorage.setItem('chagra:autosave:test-partial', JSON.stringify({ name: 'Parcial' }));
    const { result } = renderHook(() => useAutosave('test-partial', { name: '', notes: '', severity: 'medium' }));
    expect(result.current.savedState).toEqual({ name: 'Parcial', notes: '', severity: 'medium' });
  });

  it('save actualiza React state inmediatamente', () => {
    const { result } = renderHook(() => useAutosave('live-form', { name: '', notes: '' }));
    act(() => { result.current.save({ name: 'Nuevo nombre' }); });
    expect(result.current.savedState.name).toBe('Nuevo nombre');
  });

  it('save persiste a localStorage tras debounce de 2s', () => {
    const { result } = renderHook(() => useAutosave('db-form', { name: '' }));
    act(() => { result.current.save({ name: 'Debounced' }); });
    expect(localStorage.getItem('chagra:autosave:db-form')).toBeNull();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(JSON.parse(localStorage.getItem('chagra:autosave:db-form')).name).toBe('Debounced');
  });

  it('debounce reinicia timer en saves consecutivos', () => {
    const { result } = renderHook(() => useAutosave('rst-form', { name: '' }));
    act(() => { result.current.save({ name: 'A' }); });
    act(() => { vi.advanceTimersByTime(1500); });
    act(() => { result.current.save({ name: 'B' }); });
    act(() => { vi.advanceTimersByTime(1500); });
    expect(localStorage.getItem('chagra:autosave:rst-form')).toBeNull();
    act(() => { vi.advanceTimersByTime(600); });
    expect(JSON.parse(localStorage.getItem('chagra:autosave:rst-form')).name).toBe('B');
  });

  it('markSubmitted limpia localStorage y previene futuros saves', () => {
    const { result } = renderHook(() => useAutosave('sub-form', { name: '' }));
    act(() => { result.current.save({ name: 'Draft' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem('chagra:autosave:sub-form')).not.toBeNull();
    act(() => { result.current.markSubmitted(); });
    expect(localStorage.getItem('chagra:autosave:sub-form')).toBeNull();
    act(() => { result.current.save({ name: 'After' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(localStorage.getItem('chagra:autosave:sub-form')).toBeNull();
  });

  it('clearAutosave limpia localStorage y resetea estado', () => {
    const { result } = renderHook(() => useAutosave('clr-form', { name: '', notes: '' }));
    act(() => { result.current.save({ name: 'X', notes: 'Y' }); });
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => { result.current.clearAutosave(); });
    expect(localStorage.getItem('chagra:autosave:clr-form')).toBeNull();
    expect(result.current.savedState).toEqual({ name: '', notes: '' });
  });

  it('no restaura estado si fue submitted en sesion previa', () => {
    localStorage.setItem('chagra:autosave:prev-sub', JSON.stringify({ name: 'Old', __submitted__: true }));
    const { result } = renderHook(() => useAutosave('prev-sub', { name: '', notes: '' }));
    expect(result.current.savedState).toEqual({ name: '', notes: '' });
  });

  it('lanza error si storageKey no se provee', () => {
    expect(() => renderHook(() => useAutosave('', {}))).toThrow('storageKey is required');
  });

  it('es tolerante a localStorage corrupto', () => {
    localStorage.setItem('chagra:autosave:corrupt', '{broken');
    const { result } = renderHook(() => useAutosave('corrupt', { name: 'fb' }));
    expect(result.current.savedState).toEqual({ name: 'fb' });
  });
});
