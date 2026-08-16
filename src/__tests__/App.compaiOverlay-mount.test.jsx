import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: CompaiOverlay (src/components/CompaiOverlay.jsx) estaba
// construido y testeado (CompaiOverlay.test.jsx) pero NUNCA se montaba desde
// App.jsx (hallazgo 2026-08-14, unificación compAI). Verifica el WIRING:
// aparece en una ruta 2D-app del manifiesto (rutasProdChagraApp.js) y NO en
// una ruta 3D — ahí el compai ya vive dentro de la escena (regla "UNA SOLA
// ABEJA #2341").
//
// Los efectos pesados de boot se mockean para que App arranque limpio en
// jsdom (mismo criterio que App.compost-route.test.jsx). DashboardLive y
// EntradaValle3D se stubean livianos: este test cubre el WIRING de la
// ruta→overlay, no el render interno de esas pantallas (cubierto por sus
// propios tests).

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
// 'subsuelo' (categoria '3D' en rutasProdChagraApp.js) monta MundoSubsuelo,
// sin gates extra de preferencia/device-tier (a diferencia de 'valle3d', que
// pasa por ValleMarcoScreen con más ceremonia de arranque) — ruta 3D simple
// y estable para probar el WIRING del overlay.
vi.mock('../components/juego/MundoSubsuelo', () => ({
  default: () => <div data-testid="subsuelo-stub">subsuelo stub</div>,
}));

import App from '../App';

describe('App — CompaiOverlay se monta según categoria del manifiesto', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('#dashboard (categoria 2D-app) monta la burbuja de CompaiOverlay', async () => {
    window.location.hash = '#dashboard';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('dashboard-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    await waitFor(
      () => expect(screen.getByTestId('compai-bubble')).toBeTruthy(),
      { timeout: 4000 },
    );
  });

  it('#subsuelo (categoria 3D) NO monta CompaiOverlay — el compai ya vive en la escena', async () => {
    window.location.hash = '#subsuelo';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('subsuelo-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    // Da tiempo a que un montaje indebido (si lo hubiera) aparezca antes de
    // afirmar la ausencia.
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(screen.queryByTestId('compai-bubble')).toBeNull();
  });

});
