import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'estiercol' → EstiercolScreen ("Del
// corral al abono"). El tile del home (DashboardLive APRENDER_TILES) llama
// onNavigate('estiercol') y #estiercol / #biodigestor también lo disparan; sin
// el case en el switch de App esa navegación caería en "Vista no disponible"
// (feature huérfana). Acá montamos App con #estiercol + sesión autenticada y
// comprobamos que la pantalla monta.
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
// de la ruta, no el render interno del módulo (cubierto en su propio test).
vi.mock('../components/EstiercolScreen', () => ({
  default: () => <div data-testid="estiercol-screen">del corral al abono stub</div>,
}));

vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "estiercol"', () => {
  beforeEach(() => {
    window.location.hash = '#estiercol';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #estiercol monta EstiercolScreen (no "Vista no disponible")', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('estiercol-screen')).toBeTruthy(),
      { timeout: 4000 },
    );
    expect(screen.queryByText('Vista no disponible')).toBeNull();
  });
});
