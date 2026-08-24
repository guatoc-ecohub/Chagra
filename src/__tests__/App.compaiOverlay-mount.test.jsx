import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Unificación compai 2026-08-23: `CompaiOverlay` (el segundo compai que
// deambulaba por la franja inferior) se RETIRÓ de la PWA 2D. En cada ruta 2D
// montaba una abejita idéntica a la del AgentFab → dos compai por pantalla
// (AUDITORIA-ABEJITAS-DUPLICADAS-2D-2026-08-23.md). Este test blinda la
// de-duplicación: el overlay global (`compai-bubble`) YA NO se monta desde
// App.jsx, ni en 2D ni en 3D. El hint por ruta vive ahora plegado dentro del
// AgentFab (enseñanza en idle) — cubierto por los tests de AgentFab.
//
// Los efectos pesados de boot se mockean para que App arranque limpio en jsdom
// (mismo criterio que App.compost-route.test.jsx). DashboardLive y MundoSubsuelo
// se stubean livianos: este test cubre el WIRING (ausencia del overlay global),
// no el render interno de esas pantallas.

vi.mock('../services/authService', () => ({
  isAuthenticated: () => Promise.resolve(true),
  logoutUser: () => Promise.resolve(),
}));
vi.mock('../db/catalogDB', () => ({ initCatalog: () => Promise.resolve() }));
vi.mock('../services/ragRetriever', () => ({
  prewarmCorpus: () => {},
  retrieve: () => Promise.resolve([]),
}));
vi.mock('../services/alertEngine', () => ({ alertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/cropAlertEngine', () => ({ cropAlertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/apiService', () => ({
  fetchFromFarmOS: () => Promise.resolve(null),
  fetchWithAuthRetry: () => Promise.resolve({ ok: true }),
}));
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

vi.mock('../components/dashboard/DashboardLive', () => ({
  default: () => <div data-testid="dashboard-stub">dashboard stub</div>,
}));
vi.mock('../components/juego/MundoSubsuelo', () => ({
  default: () => <div data-testid="subsuelo-stub">subsuelo stub</div>,
}));

import App from '../App';

describe('App — CompaiOverlay YA NO se monta globalmente (unificación 2026-08-23)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('#dashboard (2D-app): NO monta el overlay deambulante — un solo compai por pantalla', async () => {
    window.location.hash = '#dashboard';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('dashboard-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    // Da tiempo a que un montaje indebido (si lo hubiera) aparezca antes de
    // afirmar la ausencia.
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(screen.queryByTestId('compai-bubble')).toBeNull();
    expect(screen.queryByTestId('compai-overlay-container')).toBeNull();
  });

  it('#subsuelo (3D): tampoco monta CompaiOverlay — el compai vive en la escena', async () => {
    window.location.hash = '#subsuelo';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('subsuelo-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(screen.queryByTestId('compai-bubble')).toBeNull();
  });
});
