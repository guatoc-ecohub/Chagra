import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Unificación compai 2026-08-23: `CompaiOverlay` (el segundo compai que
// deambulaba por la franja inferior) se RETIRÓ de la PWA 2D. En cada ruta 2D
// montaba una abejita idéntica a la del AgentFab → dos compai por pantalla
// (AUDITORIA-ABEJITAS-DUPLICADAS-2D-2026-08-23.md). Este test blinda la
// de-duplicación: el overlay global (`compai-bubble`) NO se monta encima del
// AgentFab en ninguna ruta 2D estándar.
//
// EXCEPCIÓN CONTROLADA (portada campesina B, 2026-08-27): cuando la bandera
// `VITE_HOME_CAMPESINO_B` está activa, la home del dashboard es HomeCampesinoB
// y su ÚNICO compai es el `CompaiOverlay` que CAMINA (marcha real); ahí el
// AgentFab idle se SUPRIME. O sea la invariante real — "un solo compai por
// pantalla, nunca dos abejitas duplicadas" — SIGUE cumpliéndose: sólo cambia el
// mecanismo (el walker en vez del fab). Este test cubre AMBOS lados:
//   - bandera OFF → dashboard estándar: AgentFab, SIN overlay (regla original).
//   - bandera ON  → home campesina B: overlay walker presente, AgentFab ausente.
//
// Los efectos pesados de boot se mockean para que App arranque limpio en jsdom
// (mismo criterio que App.compost-route.test.jsx). DashboardLive, HomeCampesinoB
// y MundoSubsuelo se stubean livianos: este test cubre el WIRING del overlay, no
// el render interno de esas pantallas.

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
// Stubs livianos: este test cubre el WIRING del overlay (se monta o no según la
// bandera de la home B), no el render interno de HomeCampesinoB ni de CompaiOverlay.
vi.mock('../components/dashboard/HomeCampesinoB', () => ({
  default: () => <div data-testid="home-campesino-b-stub">home B stub</div>,
}));
vi.mock('../components/CompaiOverlay', () => ({
  default: () => <div data-testid="compai-overlay-container">overlay walker stub</div>,
}));

import App from '../App';

describe('App — CompaiOverlay: un solo compai por pantalla (unificación 2026-08-23 + home B 2026-08-27)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('#dashboard con home B APAGADA: dashboard estándar, AgentFab solo, SIN overlay', async () => {
    vi.stubEnv('VITE_HOME_CAMPESINO_B', 'false');
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

  it('#dashboard con home B ENCENDIDA: la home monta EXACTAMENTE un compai walker (overlay), sin duplicar', async () => {
    vi.stubEnv('VITE_HOME_CAMPESINO_B', 'true');
    window.location.hash = '#dashboard';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('home-campesino-b-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    // El dashboard estándar NO se monta (la home B lo reemplaza).
    expect(screen.queryByTestId('dashboard-stub')).toBeNull();
    // Un ÚNICO compai walker: el overlay presente exactamente una vez.
    expect(screen.getAllByTestId('compai-overlay-container')).toHaveLength(1);
  });

  it('#subsuelo (3D): tampoco monta CompaiOverlay — el compai vive en la escena', async () => {
    vi.stubEnv('VITE_HOME_CAMPESINO_B', 'false');
    window.location.hash = '#subsuelo';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('subsuelo-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(screen.queryByTestId('compai-bubble')).toBeNull();
    expect(screen.queryByTestId('compai-overlay-container')).toBeNull();
  });
});
