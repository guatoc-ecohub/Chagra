import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'subsuelo' → MundoSubsuelo (ux-audit
// P1-1). La entrada de MiFincaVivaScreen llama onNavigate('subsuelo') y un
// chagraNavigate{subsuelo} también lo dispara; sin el case en el switch de App
// esa navegación caía en "Vista no disponible" (huérfano). Acá montamos App con
// #subsuelo + sesión autenticada y comprobamos que la pantalla monta (no el
// fallback de vista no disponible).
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
// de la ruta, no el render interno del juego (ya cubierto en su propio test).
vi.mock('../components/juego/MundoSubsuelo', () => ({
  default: () => <div data-testid="mundo-subsuelo">subsuelo stub</div>,
}));

// Procesos vacíos (sin IDB).
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "subsuelo"', () => {
  beforeEach(() => {
    window.location.hash = '#subsuelo';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #subsuelo monta MundoSubsuelo (no "Vista no disponible")', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('mundo-subsuelo')).toBeTruthy(),
      { timeout: 4000 },
    );
    expect(screen.queryByText('Vista no disponible')).toBeNull();
  });
});
