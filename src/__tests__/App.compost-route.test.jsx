import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'compost' → CompostScreen ("El compost,
// paso a paso"), la sala photo-forward del mundo Estiércol y compost. Se llega
// desde el hub del mundo (MundoScreen) y #compost / #estiercol-compost también
// lo disparan; sin el case en el switch de App esa navegación caería en "Vista
// no disponible" (feature huérfana). Acá montamos App con #compost + sesión
// autenticada y comprobamos que la pantalla monta.
//
// Los efectos pesados de boot se mockean para que App arranque limpio en jsdom.

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

// La pantalla destino: stub liviano que delata que se montó. Probamos el WIRING
// de la ruta, no el render interno del módulo (cubierto por el build y su foto).
vi.mock('../components/CompostScreen', () => ({
  default: () => <div data-testid="compost-screen">el compost paso a paso stub</div>,
}));

vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "compost"', () => {
  beforeEach(() => {
    window.location.hash = '#compost';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #compost monta CompostScreen (no "Vista no disponible")', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('compost-screen')).toBeTruthy(),
      { timeout: 4000 },
    );
    expect(screen.queryByText('Vista no disponible')).toBeNull();
  });
});
