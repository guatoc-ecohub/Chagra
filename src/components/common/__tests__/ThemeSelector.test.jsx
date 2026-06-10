/**
 * ThemeSelector — switcher de tema visual (Perfil / Ajustes).
 *
 * Cubre:
 *   - renderiza los 3 temas curados (bio-punk, Nature, Minimalista) + auto
 *   - el tema activo aparece marcado (aria-pressed)
 *   - al elegir un tema se persiste en localStorage y se aplica a <html>
 *   - default = bio-punk
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
  // mención de "Bio-Punk" en la descripción del modo Automático.
  const bioBtn = () => screen.getByRole('button', { name: /^Bio-Punk/i });
  const natureBtn = () => screen.getByRole('button', { name: /^Nature/i });
  const miniBtn = () => screen.getByRole('button', { name: /^Minimalista/i });
  const autoBtn = () => screen.getByRole('button', { name: /^Autom/i });

  it('renderiza los 3 temas curados + el modo automático', () => {
    render(<ThemeSelector />);
    expect(bioBtn()).toBeTruthy();
    expect(natureBtn()).toBeTruthy();
    expect(miniBtn()).toBeTruthy();
    expect(autoBtn()).toBeTruthy();
  });

  it('marca automático como activo por defecto (aria-pressed)', () => {
    render(<ThemeSelector />);
    expect(autoBtn().getAttribute('aria-pressed')).toBe('true');
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
});
