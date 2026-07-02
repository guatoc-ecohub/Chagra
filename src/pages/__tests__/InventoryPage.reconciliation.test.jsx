import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import InventoryPage from '../InventoryPage';

// Test de WIRING interno de InventoryPage (descubribilidad 2026-06-30):
// verifica que la vista 'reconciliation' monta InventoryAuditDashboard
// (reconcileAllItems de inventoryReconcile.js) + InventoryEventTimeline
// (línea de tiempo global), los dos componentes que quedaban huérfanos junto
// con InventoryAuditTrail. No probamos el render interno de cada componente
// (fuera de scope aquí) — solo que InventoryPage los alcanza y navega bien.
vi.mock('../../components/InventoryDashboard', () => ({
  InventoryDashboard: () => <div data-testid="inventory-dashboard-stub">dashboard stub</div>,
  default: () => <div data-testid="inventory-dashboard-stub">dashboard stub</div>,
}));
vi.mock('../../components/InventoryAuditTrail', () => ({
  default: () => <div data-testid="inventory-audit-trail-stub">audit trail stub</div>,
}));
vi.mock('../../components/InventoryAuditDashboard', () => ({
  default: () => <div data-testid="inventory-audit-dashboard-stub">reconciliation stub</div>,
}));
vi.mock('../../components/InventoryEventTimeline', () => ({
  default: () => <div data-testid="inventory-event-timeline-stub">timeline stub</div>,
}));

describe('InventoryPage — vista de auditoría y reconciliación', () => {
  it('el botón "Auditoría y reconciliación" monta InventoryAuditDashboard + InventoryEventTimeline', async () => {
    render(<InventoryPage />);
    expect(screen.getByTestId('inventory-dashboard-stub')).toBeTruthy();

    await userEvent.click(screen.getByTestId('inventory-open-reconciliation'));

    expect(screen.getByTestId('inventory-view-reconciliation')).toBeTruthy();
    expect(screen.getByTestId('inventory-audit-dashboard-stub')).toBeTruthy();
    expect(screen.getByTestId('inventory-event-timeline-stub')).toBeTruthy();
    expect(screen.queryByTestId('inventory-dashboard-stub')).toBeNull();
  });

  it('"← Volver" regresa al dashboard de stock en vivo', async () => {
    render(<InventoryPage />);
    await userEvent.click(screen.getByTestId('inventory-open-reconciliation'));
    expect(screen.getByTestId('inventory-view-reconciliation')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /volver al dashboard/i }));
    expect(screen.getByTestId('inventory-dashboard-stub')).toBeTruthy();
    expect(screen.queryByTestId('inventory-view-reconciliation')).toBeNull();
  });
});
