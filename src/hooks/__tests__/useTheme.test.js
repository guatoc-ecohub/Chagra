/**
 * useTheme — sistema de temas visuales de la app.
 *
 * Tres temas curados (operador 2026-06-03, demo Bogotá):
 *   - bio-punk (DEFAULT)  → oscuro neón teal "cosecha mística"
 *   - nature              → cálido botánico (terracota/salvia/ocre)
 *   - minimalista         → limpio, crema, monoline verde
 * Más un modo `auto` (alterna minimalista/biopunk según la hora).
 *
 * Cubre:
 *   - default = bio-punk (sin localStorage previo, desde PR #1501)
 *   - applyTheme escribe / limpia data-theme en <html> (biopunk = sin attr)
 *   - setTheme persiste en localStorage (chagra:theme) y rechaza ids inválidos
 *   - THEME_IDS expone exactamente los 3 temas + auto
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTheme,
  applyTheme,
  THEME_IDS,
  THEMES,
  DEFAULT_THEME,
  STORAGE_KEY,
} from '../useTheme';

describe('useTheme — sistema de temas', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute('data-theme');
  });

  it('default es biopunk cuando no hay nada en localStorage', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('biopunk');
    expect(DEFAULT_THEME).toBe('biopunk');
  });

  it('THEME_IDS expone los 3 temas curados + auto', () => {
    expect(THEME_IDS).toContain('biopunk');
    expect(THEME_IDS).toContain('nature');
    expect(THEME_IDS).toContain('minimalista');
    expect(THEME_IDS).toContain('auto');
    // El catálogo visible al usuario contiene los 3 temas explícitos + auto.
    expect(THEMES.map((t) => t.id)).toEqual([
      'auto',
      'biopunk',
      'nature',
      'minimalista',
    ]);
  });

  it('applyTheme(biopunk) NO pone data-theme (biopunk = estilos base)', () => {
    document.documentElement.setAttribute('data-theme', 'nature');
    const resolved = applyTheme('biopunk');
    expect(resolved).toBe('biopunk');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('applyTheme(nature) escribe data-theme="nature" en <html>', () => {
    const resolved = applyTheme('nature');
    expect(resolved).toBe('nature');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
  });

  it('applyTheme(minimalista) escribe data-theme="minimalista" en <html>', () => {
    const resolved = applyTheme('minimalista');
    expect(resolved).toBe('minimalista');
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'minimalista'
    );
  });

  it('applyTheme(auto) de día resuelve a nature (data-theme escrito)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00'));
    const resolved = applyTheme('auto');
    expect(resolved).toBe('nature');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
  });

  it('applyTheme(auto) de noche resuelve a biopunk (sin data-theme)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T22:00:00'));
    const resolved = applyTheme('auto');
    expect(resolved).toBe('biopunk');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('setTheme persiste en localStorage (chagra:theme) y aplica al DOM', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('nature'));
    expect(result.current.theme).toBe('nature');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('nature');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
  });

  it('setTheme rechaza ids inválidos (no muta estado ni storage)', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('minimalista'));
    act(() => result.current.setTheme('no-existe'));
    expect(result.current.theme).toBe('minimalista');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('minimalista');
  });

  it('al montar, lee el tema persistido y lo aplica (minimalista → data-theme)', () => {
    localStorage.setItem(STORAGE_KEY, 'minimalista');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('minimalista');
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'minimalista'
    );
  });

  it('migra ids legados (dark-sober/light) al default biopunk en el getter', () => {
    // dark-sober y light fueron reemplazados por los 3 temas curados + auto.
    localStorage.setItem(STORAGE_KEY, 'dark-sober');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('biopunk');
  });
});
