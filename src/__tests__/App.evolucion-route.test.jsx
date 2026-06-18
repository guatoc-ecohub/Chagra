import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA: verifica que App rutea 'evolucion' → MiFincaEvolucionScreen.
// El botón "¿Qué es esto?" de FincaEvolutionCard llama onNavigate('evolucion');
// sin el case en el switch de App esa navegación quedaba muerta. Acá montamos
// App con #evolucion + sesión autenticada y comprobamos que la pantalla monta.
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
// de la ruta, no el render interno de la pantalla (ya cubierto en su propio test).
vi.mock('../components/hoy/MiFincaEvolucionScreen', () => ({
  default: () => <div data-testid="mi-finca-evolucion-screen">evolucion stub</div>,
}));

// Procesos vacíos (sin IDB).
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "evolucion"', () => {
  beforeEach(() => {
    window.location.hash = '#evolucion';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #evolucion monta MiFincaEvolucionScreen', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('mi-finca-evolucion-screen')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
