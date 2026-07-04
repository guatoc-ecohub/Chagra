/**
 * ThemeSelector — gate del 4º tema "Verde Vivo" tras la flag de finca viva.
 *
 * Con la flag VITE_FINCA_VIVA_HOME_PERFIL:
 *   · ON  (dev)  → el selector muestra los 3 temas + auto + Verde Vivo, y se
 *                  puede seleccionar (persiste + aplica data-theme="verde-vivo").
 *   · OFF (prod) → el selector es EXACTO el de hoy: NO aparece Verde Vivo.
 *
 * Innegociable: con la flag OFF, prod intacto (selector como hoy).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi } from 'vitest';

// Flag mutable para probar ON y OFF en el mismo archivo.
let flagOn = false;
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

import ThemeSelector from '../ThemeSelector';
import { STORAGE_KEY } from '../../../hooks/useTheme';

describe('ThemeSelector — 4º tema Verde Vivo gateado por flag', () => {
  beforeEach(() => {
    flagOn = false;
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  const verdeBtn = () => screen.queryByRole('button', { name: /^Verde Vivo/i });

  it('flag OFF (prod): NO muestra el tema verde-vivo, y sigue el catálogo base', () => {
    flagOn = false;
    render(<ThemeSelector />);
    expect(verdeBtn()).toBeNull();
    // "Bio-Punk 2" y "Bio-Punk" coexisten desde el split GO-LIVE 2026-07-04:
    // el clásico se distingue por el arranque de su descripción.
    expect(screen.getByRole('button', { name: /^Bio-Punk 2/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Bio-Punk Oscuro/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Nature/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Minimalista/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Autom/i })).toBeTruthy();
  });

  it('flag ON (dev): muestra el 4º tema "Verde Vivo"', () => {
    flagOn = true;
    render(<ThemeSelector />);
    expect(verdeBtn()).toBeTruthy();
  });

  it('flag ON: al elegir Verde Vivo persiste y aplica data-theme="verde-vivo"', () => {
    flagOn = true;
    render(<ThemeSelector />);
    fireEvent.click(verdeBtn());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('verde-vivo');
    expect(document.documentElement.getAttribute('data-theme')).toBe('verde-vivo');
    expect(verdeBtn().getAttribute('aria-pressed')).toBe('true');
  });
});
