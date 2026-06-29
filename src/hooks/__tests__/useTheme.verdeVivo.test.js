/**
 * useTheme — 4º tema "Verde Vivo" (la piel de la finca viva).
 * ============================================================
 * El 4º tema existe y se registra como id VÁLIDO siempre (para que una
 * selección persistida sobreviva y applyTheme la pueda escribir), pero su
 * VISIBILIDAD en el selector la gobierna la flag de finca viva:
 *
 *   · getSelectableThemes(true)  → 3 temas + auto + Verde Vivo (dev).
 *   · getSelectableThemes(false) → EXACTO los 3 temas + auto de hoy (prod).
 *
 * Innegociable: con la flag OFF el selector es idéntico al de hoy.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTheme,
  applyTheme,
  THEME_IDS,
  THEMES,
  VERDE_VIVO_THEME,
  getSelectableThemes,
  normalizeTheme,
  STORAGE_KEY,
} from '../useTheme';

describe('useTheme — 4º tema Verde Vivo', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('el 4º tema existe y se registra (id verde-vivo válido)', () => {
    expect(VERDE_VIVO_THEME.id).toBe('verde-vivo');
    expect(VERDE_VIVO_THEME.label).toBe('Verde Vivo');
    expect(THEME_IDS).toContain('verde-vivo');
    // normalizeTheme lo acepta (NO cae al default): una selección persistida
    // de verde-vivo sobrevive a un reload.
    expect(normalizeTheme('verde-vivo')).toBe('verde-vivo');
  });

  it('NO va en el catálogo base THEMES (los 3 temas + auto de siempre)', () => {
    expect(THEMES.map((t) => t.id)).toEqual([
      'auto',
      'biopunk',
      'nature',
      'minimalista',
    ]);
    expect(THEMES.map((t) => t.id)).not.toContain('verde-vivo');
  });

  it('flag ON (dev): el selector muestra el 4º tema al final', () => {
    const ids = getSelectableThemes(true).map((t) => t.id);
    expect(ids).toEqual(['auto', 'biopunk', 'nature', 'minimalista', 'verde-vivo']);
  });

  it('flag OFF (prod): el selector es EXACTO el de hoy (sin verde-vivo)', () => {
    const ids = getSelectableThemes(false).map((t) => t.id);
    expect(ids).toEqual(['auto', 'biopunk', 'nature', 'minimalista']);
    expect(ids).not.toContain('verde-vivo');
  });

  it('applyTheme(verde-vivo) escribe data-theme="verde-vivo" en <html>', () => {
    const resolved = applyTheme('verde-vivo');
    expect(resolved).toBe('verde-vivo');
    expect(document.documentElement.getAttribute('data-theme')).toBe('verde-vivo');
  });

  it('setTheme(verde-vivo) persiste y aplica (es un id seleccionable)', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('verde-vivo'));
    expect(result.current.theme).toBe('verde-vivo');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('verde-vivo');
    expect(document.documentElement.getAttribute('data-theme')).toBe('verde-vivo');
  });
});
