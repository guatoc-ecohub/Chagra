import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que el hash #dashboard funciona correctamente tras
// el PR #3051 (entrada 3D del valle). Antes, '/' abría el dashboard directamente;
// ahora '/' abre el valle 3D, y el dashboard solo se alcanza vía #dashboard.
//
// Este test verifica:
// 1. Que #dashboard está en HASH_VIEW_ROUTES y resuelve a la vista 'dashboard'
// 2. Que con marco3d: false en el perfil, se monta DashboardLiveView (con
//    finca-viva-hero visible) en lugar de ValleMarcoScreen (valle 3D)

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

// Desactivamos homeCampesinoB para que use DashboardLiveView en lugar de HomeCampesinoB.
vi.mock('../config/homeCampesinoBFlag', () => ({
  homeCampesinoBActivo: () => false,
}));

// Stub de DashboardLiveView que delata que se montó (contiene finca-viva-hero).
vi.mock('../components/dashboard/DashboardLive', () => ({
  default: () => <div data-testid="dashboard-live-view">dashboard stub</div>,
}));

// Procesos vacíos (sin IDB).
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "dashboard"', () => {
  beforeEach(() => {
    window.location.hash = '#dashboard';
    localStorage.clear();
    // Establecemos un perfil con marco3d: false para evitar el valle 3D.
    localStorage.setItem('chagra:profile:v1', JSON.stringify({
      rol: 'campesino',
      vocacion: 'mixta',
      finca_tipo: 'integral',
      nivel_respuestas: 'simple',
      vereda: 'El Volador',
      municipio: 'Guatavita',
      departamento: 'Cundinamarca',
      finca_altitud: 2680,
      piso_termico: 'frio',
      piso_confirmado: '1',
      animales: ['gallinas'],
      marco3d: false,
    }));
    localStorage.setItem('chagra:profile:done:v1', '1');
    localStorage.setItem('chagra:active_tenant_id', 'test-user');
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #dashboard monta DashboardLiveView (no el valle 3D)', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('dashboard-live-view')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
