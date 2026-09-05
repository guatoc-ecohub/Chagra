/**
 * BUG-08 (2026-09-04): InventoryDashboard recibía onRecount/onViewAudit desde
 * InventoryPage pero los IGNORABA (firmaba `_props`) → RecountDrawer era
 * inalcanzable y inventory_events se quedaba en 0. Estos tests fijan el
 * cableo: las tarjetas exponen "Conteo manual" y "Bitácora" y llaman los
 * callbacks con (itemId, stock, unidad) / (itemId).
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import InventoryDashboard from '../InventoryDashboard.jsx';

const MATERIAL = {
  id: 'asset--material-1',
  name: 'Biopreparado ferro',
  attributes: {
    name: 'Biopreparado ferro',
    inventory_value: '3.5',
    inventory_unit: 'kg',
  },
};

const estadoStore = {
  materials: [MATERIAL],
  refillMaterial: vi.fn(),
};

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector(estadoStore),
}));

vi.mock('../../hooks/useConsumptionMetrics', () => ({
  useConsumptionMetrics: () => ({ values: [] }),
}));

vi.mock('../../services/planGeneratorService', () => ({
  getAllPlans: vi.fn(async () => []),
  markStepExecuted: vi.fn(),
}));

vi.mock('../../services/exportService', () => ({
  exportTraceabilityCsv: vi.fn(),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: vi.fn(() => 'hash-test'),
}));

vi.mock('../BiopreparadoRecetasGallery', () => ({
  default: () => <div data-testid="recetas-gallery-stub" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InventoryDashboard — cableo de onRecount/onViewAudit (BUG-08)', () => {
  test('cada tarjeta expone "Conteo manual" y "Bitácora" cuando la página cablea los callbacks', () => {
    render(<InventoryDashboard onRecount={vi.fn()} onViewAudit={vi.fn()} />);

    expect(
      screen.getByTestId('inventory-recount-asset--material-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('inventory-audit-asset--material-1'),
    ).toBeInTheDocument();
  });

  test('"Conteo manual" llama onRecount con (itemId, stock, unidad)', async () => {
    const onRecount = vi.fn();
    render(<InventoryDashboard onRecount={onRecount} />);

    await userEvent.click(screen.getByTestId('inventory-recount-asset--material-1'));

    expect(onRecount).toHaveBeenCalledTimes(1);
    expect(onRecount).toHaveBeenCalledWith('asset--material-1', 3.5, 'kg');
  });

  test('"Bitácora" llama onViewAudit con el itemId', async () => {
    const onViewAudit = vi.fn();
    render(<InventoryDashboard onViewAudit={onViewAudit} />);

    await userEvent.click(screen.getByTestId('inventory-audit-asset--material-1'));

    expect(onViewAudit).toHaveBeenCalledTimes(1);
    expect(onViewAudit).toHaveBeenCalledWith('asset--material-1');
  });

  test('sin callbacks cableados la tarjeta no muestra las acciones (retrocompatible)', () => {
    render(<InventoryDashboard />);

    expect(screen.queryByTestId('inventory-card-audit-actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Conteo manual')).not.toBeInTheDocument();
    expect(screen.queryByText('Bitácora')).not.toBeInTheDocument();
  });
});
