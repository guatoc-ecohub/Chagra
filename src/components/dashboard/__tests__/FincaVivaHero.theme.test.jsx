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
// La campana real del header (regresión 2026-07-04) arrastra stores +
// climaService; aquí se prueba la piel del tema, así que va un stub.
vi.mock('../../NotificationsBell', () => ({
  default: () => <button type="button" aria-label="Notificaciones" />,
}));

// Tema activo controlable: el hero debe pedirle al tema su ícono de marca.
// `resolveAutoTheme` acompaña a useTheme en el mock porque el hero lo usa para
// resolver 'auto' (misma regla que applyTheme); aquí es identidad (no probamos
// 'auto').
let activeTheme = 'biopunk';
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: activeTheme, setTheme: vi.fn() }),
  resolveAutoTheme: (t) => t,
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

describe('FincaVivaHero — piel del tema activo (los 5 temas)', () => {
  for (const theme of ['biopunk', 'biopunk2', 'nature', 'minimalista', 'verde-vivo']) {
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

describe('FincaVivaHero — split biopunk/biopunk2 (GO-LIVE 2026-07-04)', () => {
  test('biopunk2 (default) monta la "Finca Organismo" con el wrap organismo', () => {
    activeTheme = 'biopunk2';
    const { container } = render(
      <FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />,
    );
    expect(screen.getByTestId('fvo-escena')).toBeInTheDocument();
    expect(container.querySelector('.fvh-escena-wrap--organismo')).not.toBeNull();
    // La isométrica clásica NO se monta a la vez.
    expect(screen.queryByTestId('fvh-escena-finca')).toBeNull();
  });

  test('biopunk (respaldo) restaura la escena isométrica ORIGINAL (sin organismo)', () => {
    activeTheme = 'biopunk';
    const { container } = render(
      <FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />,
    );
    expect(screen.getByTestId('fvh-escena-finca')).toBeInTheDocument();
    expect(screen.queryByTestId('fvo-escena')).toBeNull();
    expect(container.querySelector('.fvh-escena-wrap--organismo')).toBeNull();
  });
});
