/**
 * FincaVivaHero — la ESCENA/hero toma la PIEL del TEMA ACTIVO (los 4 temas).
 *
 * La escena se ve bajo CUALQUIER tema (la monta la flag de finca viva, no el
 * tema). Aquí verificamos que el hero adopta la piel del tema activo: el ícono
 * de marca del agente sigue al tema (la A roja en biopunk, la sol-mano frondosa
 * en verde-vivo, el frailejón en nature, el monoline en minimalista). La piel de
 * COLOR (cielo/sol/paleta) sale de los tokens "--c-" y "--fvh-" del CSS (contrato
 * de estilos cubierto aparte; aquí basta con que el cableado por tema sea correcto).
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Datos de finca deterministas (no necesitamos datos reales para el cableado).
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../services/userProfileService', () => ({ getProfile: () => ({ rol: 'campesino' }) }));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

// Tema activo controlable: el hero debe pedirle al tema su ícono de marca.
let activeTheme = 'biopunk';
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: activeTheme, setTheme: vi.fn() }),
}));

// themeIcon stub identificable por tema para aseverar el ícono efectivo.
vi.mock('../themeIcon', () => ({
  iconForTheme: (theme) => <svg data-testid={`brand-icon-${theme}`} />,
}));

import FincaVivaHero from '../FincaVivaHero';

beforeEach(() => {
  activeTheme = 'biopunk';
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe('FincaVivaHero — piel del tema activo (los 4 temas)', () => {
  for (const theme of ['biopunk', 'nature', 'minimalista', 'verde-vivo']) {
    test(`con tema "${theme}" la escena usa el ícono de marca de ese tema`, () => {
      activeTheme = theme;
      render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
      // El hero/escena se renderiza bajo el tema activo…
      expect(screen.getByTestId('finca-viva-hero')).toBeInTheDocument();
      // …y su marca toma el ícono del tema activo (la piel del tema).
      expect(screen.getByTestId(`brand-icon-${theme}`)).toBeInTheDocument();
    });
  }
});
