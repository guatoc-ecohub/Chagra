import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Test de RUTA + GATE: el módulo "Reporte de Punto Glaciar" (ruta #glaciar)
// está restringido a los beta testers de "La Cordada" (src/config/glaciarAccess.js).
// Verificamos que:
//   - un usuario de La Cordada (username en localStorage) que navega a #glaciar
//     SÍ monta el módulo;
//   - un usuario fuera de la whitelist NO monta el módulo (queda en dashboard).
//
// El gate lee el username con getActiveTenantId() → localStorage, sin red
// (offline-first). jsdom provee localStorage real, así que ejercitamos el gate
// de verdad sin mockear glaciarAccess.
//
// Los efectos pesados de boot (auth, catálogo SQLite WASM, alertas, RAG, API)
// se mockean para que App arranque limpio en jsdom sin tocar red/IDB.

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
vi.mock('../services/apiService', () => ({ fetchFromFarmOS: () => Promise.resolve(null) }));
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

// El módulo glaciar: stub liviano que delata que se montó. Si el gate funciona,
// este testid NUNCA aparece para usuarios fuera de La Cordada.
vi.mock('../components/GlaciarReporteScreen', () => ({
  default: () => <div data-testid="glaciar-reporte-screen">glaciar stub</div>,
}));

const TENANT_KEY = 'chagra:active_tenant_id';

import App from '../App';

describe('App — gate de ruta #glaciar (La Cordada)', () => {
  beforeEach(() => {
    window.location.hash = '#glaciar';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('usuario de La Cordada en #glaciar SÍ monta el módulo glaciar', async () => {
    localStorage.setItem(TENANT_KEY, 'mario'); // whitelisted
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('glaciar-reporte-screen')).toBeTruthy(),
      { timeout: 4000 },
    );
  });

  it('usuario fuera de la whitelist en #glaciar NO monta el módulo glaciar', async () => {
    localStorage.setItem(TENANT_KEY, 'usuario_normal'); // NO whitelisted
    render(<App />);
    // Damos tiempo a que los efectos de ruta corran y redirijan al dashboard.
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByTestId('glaciar-reporte-screen')).toBeNull();
  });

  it('sin sesión (sin username) en #glaciar NO monta el módulo glaciar', async () => {
    // Sin tenantId → sin acceso (default seguro). authService está mockeado a
    // autenticado, pero el gate de glaciar igual bloquea por falta de username.
    render(<App />);
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByTestId('glaciar-reporte-screen')).toBeNull();
  });
});
