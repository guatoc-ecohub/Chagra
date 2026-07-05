import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'conoce' (deep-link #conoce) → el
// recorrido guiado ConoceChagra. Sin el case en el switch de App, el botón
// "Conoce Chagra" del Manual/Perfil y la auto-oferta de primera vez quedarían
// muertos (feature huérfana, memoria feedback-features-ui-huerfanas-sin-cablear).
//
// Los efectos pesados de boot (auth, catálogo SQLite WASM, motores de alerta,
// RAG, warm-up de Ollama) se mockean para que App arranque limpio en jsdom sin
// tocar red/IDB. No probamos esos sistemas acá; solo el wiring de la ruta.

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
// de la ruta, no el render interno del tour (ya cubierto en su propio test).
vi.mock('../components/conoce/ConoceChagra', () => ({
  default: () => <div data-testid="conoce-chagra-stub">recorrido stub</div>,
}));

// Procesos vacíos (sin IDB).
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "conoce" (recorrido Conoce Chagra)', () => {
  beforeEach(() => {
    window.location.hash = '#conoce';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #conoce monta el recorrido ConoceChagra', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('conoce-chagra-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
