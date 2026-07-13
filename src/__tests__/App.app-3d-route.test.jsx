import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'app_3d' → ShellApp3D.
// Montamos App con #/app-3d y sesión autenticada, pero mockeamos el shell para
// probar solo el wiring de la ruta, no el render 3D completo.

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
vi.mock('../components/ShellApp3D', () => ({
  default: () => <div data-testid="shell-app-3d-stub">shell 3d</div>,
}));
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "app_3d"', () => {
  beforeEach(() => {
    window.location.hash = '#app-3d';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #app-3d monta ShellApp3D', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('shell-app-3d-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
