/**
 * FincaVivaHero — MARCO 3D de la portada (2026-08-14): con `marco3d` ON en
 * usePrefsStore (Perfil → Apariencia), la ranura de la escena viva del tema
 * muestra el valle 3D vanilla (iframe same-origin a `/valle/index.html`,
 * mismo patrón `leerCompanero()` de ValleMarcoScreen.jsx) EN VEZ de la
 * escena 2D del tema. Con `marco3d` OFF la portada queda EXACTAMENTE como
 * siempre (la EscenaViva del tema activo).
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Datos de finca deterministas (no necesitamos datos reales para el cableado
// del marco 3D).
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../services/userProfileService', () => ({ getProfile: () => ({ rol: 'campesino' }) }));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
// La campana real del header arrastra stores + climaService; aquí se prueba
// el cableado del marco 3D, así que va un stub (mismo criterio que
// FincaVivaHero.theme.test.jsx).
vi.mock('../../NotificationsBell', () => ({
  default: () => <button type="button" aria-label="Notificaciones" />,
}));
// Tema fijo biopunk2 (default, trae la EscenaViva "Finca Organismo" con
// testid conocido `fvo-escena`) — no probamos aquí el cableado por tema, eso
// ya lo cubre FincaVivaHero.theme.test.jsx.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'biopunk2', setTheme: vi.fn() }),
  resolveAutoTheme: (t) => t,
}));
vi.mock('../themeIcon', () => ({
  iconForTheme: (theme) => <svg data-testid={`brand-icon-${theme}`} />,
}));

import usePrefsStore from '../../../store/usePrefsStore';
import FincaVivaHero from '../FincaVivaHero';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  usePrefsStore.setState({ marco3d: false });
});
afterEach(() => cleanup());

describe('FincaVivaHero — marco 3D de la portada (marco3d en usePrefsStore)', () => {
  test('marco3d OFF: la portada sigue siendo la EscenaViva del tema, sin iframe', () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    expect(screen.getByTestId('fvo-escena')).toBeInTheDocument();
    expect(screen.queryByTestId('fvh-escena-marco3d')).toBeNull();
    expect(screen.queryByTestId('fvh-marco3d-iframe')).toBeNull();
  });

  test('marco3d ON: la ranura muestra el iframe del valle, no la EscenaViva', () => {
    usePrefsStore.setState({ marco3d: true });
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    expect(screen.queryByTestId('fvo-escena')).toBeNull();
    const iframe = screen.getByTestId('fvh-marco3d-iframe');
    expect(iframe).toHaveAttribute('src', '/valle/index.html?compai=angelita');
    expect(iframe).toHaveAttribute('title', 'Valle 3D de Guatoc');
  });

  test('marco3d ON: el compai elegido de verdad (leerCompanero canónico) viaja en el src', () => {
    localStorage.setItem('compai:companero', 'oso-baston');
    usePrefsStore.setState({ marco3d: true });
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    const iframe = screen.getByTestId('fvh-marco3d-iframe');
    expect(iframe).toHaveAttribute('src', '/valle/index.html?compai=oso-baston');
  });

  test('marco3d ON con red institucional (children, sin finca propia): el slot institucional manda, no el iframe', () => {
    usePrefsStore.setState({ marco3d: true });
    render(
      <FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()}>
        <div data-testid="red-institucional">Red</div>
      </FincaVivaHero>,
    );
    expect(screen.getByTestId('red-institucional')).toBeInTheDocument();
    expect(screen.queryByTestId('fvh-marco3d-iframe')).toBeNull();
  });
});
