/**
 * ThemeSelector — switcher de tema visual (Perfil / Ajustes).
 *
 * Cubre:
 *   - renderiza los temas curados (Bio-Punk 2, Bio-Punk, Nature, Minimalista)
 *     + auto
 *   - el tema activo aparece marcado (aria-pressed)
 *   - al elegir un tema se persiste en localStorage y se aplica a <html>
 *   - default = biopunk2 (split GO-LIVE 2026-07-04; sin localStorage previo)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ThemeSelector from '../ThemeSelector';
import { STORAGE_KEY } from '../../../hooks/useTheme';

describe('ThemeSelector — switcher de tema', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  // El nombre accesible del botón empieza por su label (texto en negrita) y
  // sigue con la descripción. Anclamos al inicio (^) para no chocar con la
  // mención de "Bio-Punk" en la descripción del modo Automático. Como
  // "Bio-Punk 2" y "Bio-Punk" coexisten (split GO-LIVE 2026-07-04), el clásico
  // se distingue por el arranque de su descripción ("Oscuro, …").
  const bio2Btn = () => screen.getByRole('button', { name: /^Bio-Punk 2/i });
  const bioBtn = () => screen.getByRole('button', { name: /^Bio-Punk Oscuro/i });
  const natureBtn = () => screen.getByRole('button', { name: /^Nature/i });
  const miniBtn = () => screen.getByRole('button', { name: /^Minimalista/i });
  const autoBtn = () => screen.getByRole('button', { name: /^Autom/i });

  it('renderiza los temas curados + el modo automático', () => {
    render(<ThemeSelector />);
    expect(bio2Btn()).toBeTruthy();
    expect(bioBtn()).toBeTruthy();
    expect(natureBtn()).toBeTruthy();
    expect(miniBtn()).toBeTruthy();
    expect(autoBtn()).toBeTruthy();
  });

  it('marca biopunk2 como activo por defecto (aria-pressed)', () => {
    render(<ThemeSelector />);
    expect(bio2Btn().getAttribute('aria-pressed')).toBe('true');
    expect(bioBtn().getAttribute('aria-pressed')).toBe('false');
  });

  it('al elegir Nature persiste en localStorage y aplica data-theme', () => {
    render(<ThemeSelector />);
    fireEvent.click(natureBtn());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('nature');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
  });

  it('al elegir Minimalista marca aria-pressed y desmarca bio-punk', () => {
    render(<ThemeSelector />);
    fireEvent.click(miniBtn());
    expect(miniBtn().getAttribute('aria-pressed')).toBe('true');
    expect(bioBtn().getAttribute('aria-pressed')).toBe('false');
  });

  it('volver a bio-punk limpia data-theme (estilos base)', () => {
    render(<ThemeSelector />);
    fireEvent.click(natureBtn());
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
    fireEvent.click(bioBtn());
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('biopunk');
  });

  it('elegir Bio-Punk 2 tampoco escribe data-theme (comparte la piel base)', () => {
    render(<ThemeSelector />);
    fireEvent.click(natureBtn());
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
    fireEvent.click(bio2Btn());
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('biopunk2');
  });
});
