import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test de RUTA: verifica que App rutea 'auditoria_inventario' → InventoryPage
// (descubribilidad 2026-06-30). Antes de este wiring, InventoryPage.jsx NO
// estaba ruteado en App.jsx y la capa de auditoría/reconciliación de
// inventario (InventoryAuditDashboard/InventoryEventTimeline/InventoryAuditTrail
// + inventoryReconcile.js/inventoryEvents.js) quedaba huérfana (0 importers
// alcanzables desde la app). Acá probamos DOS caminos de alcance:
//   1. Hash directo (#auditoria-inventario) monta InventoryPage.
//   2. Desde 'bodega' (#bodega), el botón "Auditoría" navega a la misma vista.
//
// Los efectos pesados de boot (auth, catálogo SQLite WASM, motores de alerta,
// RAG, warm-up de Ollama) se mockean para que App arranque limpio en jsdom sin
// tocar red/IDB. No probamos el render interno de InventoryPage/InventoryDashboard
// acá (ya cubierto en sus propios tests); solo el wiring de la ruta.

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

// Destinos: stubs livianos que delatan que se montaron.
vi.mock('../pages/InventoryPage', () => ({
  default: () => <div data-testid="inventory-page-stub">auditoria inventario stub</div>,
}));
vi.mock('../components/InventoryDashboard', () => ({
  InventoryDashboard: () => <div data-testid="inventory-dashboard-stub">bodega stub</div>,
  default: () => <div data-testid="inventory-dashboard-stub">bodega stub</div>,
}));

// Procesos vacíos (sin IDB).
vi.mock('../db/farmProcessCache', () => ({ listFarmProcesses: () => Promise.resolve([]) }));

import App from '../App';

describe('App — ruta "auditoria_inventario"', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
  });

  it('con sesión autenticada y #auditoria-inventario monta InventoryPage', async () => {
    window.location.hash = '#auditoria-inventario';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('inventory-page-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    expect(screen.queryByText('Vista no disponible')).toBeNull();
  });

  it('desde Bodega, el botón "Auditoría" navega a InventoryPage', async () => {
    window.location.hash = '#bodega';
    render(<App />);
    await waitFor(
      () => expect(screen.getByTestId('inventory-dashboard-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
    const auditButton = screen.getByTestId('bodega-open-auditoria');
    await userEvent.click(auditButton);
    await waitFor(
      () => expect(screen.getByTestId('inventory-page-stub')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
