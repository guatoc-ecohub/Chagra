import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Test de REGRESIÓN PERF (diag ops/DIAGNOSTICO-PERF-DEV-20260905, orden 3):
// App.jsx disparaba prefetchHomeChunks() (chunks de TopBar + DashboardLive)
// mientras la vista seguía siendo 'login'. Medido en chagra-dev (build
// 0afe6f0a): el formulario de login aparecía entre 8.898 y 11.873 ms con un
// waterfall de 183 solicitudes que incluía chunks de rutas posteriores
// (DashboardLive-Bs8LghpM.js=69.982 B encoded, mundo3d, creatures). El fix
// mueve el prefetch al ÉXITO de autenticación (onLoginSuccess / onSuccess de
// OAuthCallback), así el arranque anónimo solo baja lo que el login necesita.
//
// Cómo se observa el "import" en jsdom: TopBar y DashboardLive se mockean con
// factorías que incrementan contadores en window. La factoría corre UNA vez
// por módulo, así que los contadores miden "el módulo se importó" y, gracias
// a makeLazyLoader (promesa memoizada), prefetch + lazy render = 1 sola
// importación. Los efectos pesados de boot se mockean como en los demás
// tests de ruta de App.

vi.mock('../services/authService', () => ({
  isAuthenticated: () => Promise.resolve(false), // sin sesión → vista 'login'
  logoutUser: () => Promise.resolve(),
}));
vi.mock('../db/catalogDB', () => ({ initCatalog: () => Promise.resolve() }));
vi.mock('../services/ragRetriever', () => ({
  prewarmCorpus: vi.fn(),
  retrieve: () => Promise.resolve([]),
}));
vi.mock('../services/alertEngine', () => ({ alertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/cropAlertEngine', () => ({ cropAlertEngine: { start: () => Promise.resolve() } }));
vi.mock('../services/apiService', () => ({
  fetchFromFarmOS: () => Promise.resolve(null),
  fetchWithAuthRetry: () => Promise.resolve({ ok: true }),
}));
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));
vi.mock('../store/useOllamaWarmStore', () => ({
  default: { getState: () => ({ startWarmup: vi.fn(), status: 'unknown' }) },
}));
vi.mock('../config/homeCampesinoBFlag', () => ({
  homeCampesinoBActivo: () => false,
}));

// TopBar / DashboardLive: factorías que delatan la primera importación.
vi.mock('../components/TopBar', () => {
  window.__importsTopBar = (window.__importsTopBar || 0) + 1;
  return { default: () => <div data-testid="top-bar-stub">topbar</div> };
});
vi.mock('../components/dashboard/DashboardLive', () => {
  window.__importsDashboardLive = (window.__importsDashboardLive || 0) + 1;
  return { default: () => <div data-testid="dashboard-live-view">dashboard stub</div> };
});

// LoginScreen: stub que dispara onLoginSuccess al hacer clic (simula el submit
// exitoso sin montar el formulario real, que tiene sus propios tests).
vi.mock('../components/LoginScreen', () => ({
  default: ({ onLoginSuccess }) => (
    <button type="button" data-testid="login-success-btn" onClick={onLoginSuccess}>
      login stub
    </button>
  ),
}));

import App from '../App';
import { prewarmCorpus } from '../services/ragRetriever';

function limpiarContadores() {
  delete window.__importsTopBar;
  delete window.__importsDashboardLive;
}

describe('App — prefetch del home NO corre en login, corre al éxito de auth', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
    limpiarContadores();
    // Perfil con marco3d:false → el dashboard monta DashboardLiveView (no el
    // valle 3D, que es el default de '/' para autenticados).
    localStorage.setItem('chagra:profile:v1', JSON.stringify({
      rol: 'campesino',
      vocacion: 'mixta',
      finca_tipo: 'integral',
      nivel_respuestas: 'simple',
      vereda: 'El Volador',
      municipio: 'Guatavita',
      marco3d: false,
    }));
    // Onboarding marcado como visto → resolveDestinoPostLogin() → 'dashboard'
    // (hasSeenProfileOnboarding lee chagra:profile:done:v1; sin tenant activo
    // en el test, la clave va sin sufijo de usuario).
    localStorage.setItem('chagra:profile:done:v1', '1');
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('en el arranque anónimo (vista login) NO se importan TopBar ni DashboardLive', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('login-success-btn')).toBeInTheDocument());
    // Margen para que cualquier efecto de boot (mal gateado) disparara imports.
    await new Promise((r) => setTimeout(r, 50));
    expect(window.__importsTopBar || 0).toBe(0);
    expect(window.__importsDashboardLive || 0).toBe(0);
    expect(prewarmCorpus).not.toHaveBeenCalled(); // el corpus tampoco (orden 1)
  });

  it('al éxito de autenticación se importan UNA sola vez y se llega al dashboard con el corpus calentándose', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('login-success-btn')).toBeInTheDocument());
    expect(window.__importsTopBar || 0).toBe(0); // nada prematuro antes del clic

    fireEvent.click(screen.getByTestId('login-success-btn'));

    // El commit de la vista dashboard tras resolver los chunks lazy puede
    // tardar >1s de scheduling en jsdom (Suspense + remount por key): esperar
    // con margen.
    await waitFor(() => expect(screen.getByTestId('dashboard-live-view')).toBeInTheDocument(), { timeout: 8000 });
    await waitFor(() => expect(screen.getByTestId('top-bar-stub')).toBeInTheDocument(), { timeout: 8000 });
    // prefetch (al éxito de auth) + lazy render → UNA sola importación por
    // módulo gracias a la promesa memoizada de makeLazyLoader.
    expect(window.__importsTopBar).toBe(1);
    expect(window.__importsDashboardLive).toBe(1);
    // Orden 1 del diag: el dueño del prewarm del corpus es el efecto de App
    // para currentView === 'dashboard'; al llegar al dashboard debe haber
    // arrancado (y NO antes, ver test anterior).
    await waitFor(() => expect(prewarmCorpus).toHaveBeenCalled());
  });
});
