import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capa visual de la Bodega (pasada 2026-07): skeleton de primer paint,
// EmptyState con CTA, chips de categoría + estado por tarjeta, y el wiring
// de onViewAudit/onRecount que InventoryPage pasaba y el dashboard ignoraba.
// Solo presentación — la lógica de stock (store/refill) queda stubeada.

const mockState = {
  materials: [],
  isHydrated: true,
  refillMaterial: vi.fn(),
};

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector(mockState),
}));

vi.mock('../../hooks/useConsumptionMetrics', () => ({
  useConsumptionMetrics: () => ({ values: [] }),
}));

// La galería self-fetchea recetas — fuera de scope del smoke visual.
vi.mock('../BiopreparadoRecetasGallery', () => ({
  default: () => <div data-testid="recetas-gallery-stub" />,
}));

vi.mock('../../services/exportService', () => ({
  exportTraceabilityCsv: vi.fn().mockResolvedValue({ rowCount: 0, pendingCount: 0 }),
}));

vi.mock('../../services/planGeneratorService', () => ({
  getAllPlans: vi.fn().mockResolvedValue([]),
  markStepExecuted: vi.fn(),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: vi.fn().mockReturnValue('hash-test'),
}));

import { InventoryDashboard } from '../InventoryDashboard';

// Nombres tomados de MATERIAL_PRESETS reales (config/materials.js) para que
// el lookup de categoría matchee: Bokashi=fertilization, Caldo Bordelés=protection.
const material = (id, name, value, unit = 'kg') => ({
  id,
  attributes: { name, inventory_value: String(value), inventory_unit: unit },
});

beforeEach(() => {
  mockState.materials = [];
  mockState.isHydrated = true;
  mockState.refillMaterial = vi.fn();
});

describe('InventoryDashboard — capa visual de la Bodega', () => {
  it('muestra skeleton mientras hidrata (primer paint, IndexedDB)', () => {
    mockState.isHydrated = false;
    render(<InventoryDashboard />);
    expect(screen.getByTestId('inventory-loading-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('inventory-empty-state')).toBeNull();
  });

  it('bodega vacía (ya hidratada) → EmptyState con CTA hacia Activos', () => {
    const onGoToActivos = vi.fn();
    render(<InventoryDashboard onGoToActivos={onGoToActivos} />);
    expect(screen.getByTestId('inventory-empty-state')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Registrar el primer insumo/i }));
    expect(onGoToActivos).toHaveBeenCalledTimes(1);
  });

  it('tarjetas con chip de categoría + chip de estado (Poco/Suficiente/Agotado)', () => {
    mockState.materials = [
      material('m1', 'Bokashi', 20),
      material('m2', 'Caldo Bordelés', 2, 'ml'),
      material('m3', 'Melaza de Caña', 0, 'l'),
    ];
    render(<InventoryDashboard />);
    const cards = screen.getAllByTestId('inventory-material-card');
    expect(cards).toHaveLength(3);
    expect(screen.getByText('Suficiente')).toBeTruthy();
    expect(screen.getByText('Poco')).toBeTruthy();
    expect(screen.getByText('Agotado')).toBeTruthy();
    // Chips de categoría en las tarjetas (labels de MATERIAL_CATEGORIES).
    expect(screen.getAllByText('Fertilización').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fitoprotección').length).toBeGreaterThan(0);
  });

  it('filtro por categoría: chips solo con 2+ categorías y filtran las tarjetas', () => {
    mockState.materials = [
      material('m1', 'Bokashi', 20),
      material('m2', 'Caldo Bordelés', 2, 'ml'),
    ];
    render(<InventoryDashboard />);
    const chips = screen.getAllByTestId('inventory-category-chip');
    // "Todos" + Fertilización + Fitoprotección
    expect(chips).toHaveLength(3);

    fireEvent.click(chips.find((c) => c.textContent === 'Fitoprotección'));
    const visible = screen.getAllByTestId('inventory-material-card');
    expect(visible).toHaveLength(1);
    expect(visible[0].textContent).toContain('Caldo Bordelés');
  });

  it('sin chips de filtro cuando hay una sola categoría', () => {
    mockState.materials = [material('m1', 'Bokashi', 20)];
    render(<InventoryDashboard />);
    expect(screen.queryByTestId('inventory-category-chip')).toBeNull();
  });

  it('wiring onViewAudit/onRecount: botones por tarjeta con id + nombre/qty', () => {
    mockState.materials = [material('m1', 'Bokashi', 20)];
    const onViewAudit = vi.fn();
    const onRecount = vi.fn();
    render(<InventoryDashboard onViewAudit={onViewAudit} onRecount={onRecount} />);

    fireEvent.click(screen.getByTestId('inventory-card-audit'));
    expect(onViewAudit).toHaveBeenCalledWith('m1', 'Bokashi');

    fireEvent.click(screen.getByTestId('inventory-card-recount'));
    expect(onRecount).toHaveBeenCalledWith('m1', { qty: 20, unit: 'kg' });
  });

  it('sin callbacks (ruta bodega) las tarjetas no pintan botones de auditoría', () => {
    mockState.materials = [material('m1', 'Bokashi', 20)];
    render(<InventoryDashboard />);
    expect(screen.queryByTestId('inventory-card-audit')).toBeNull();
    expect(screen.queryByTestId('inventory-card-recount')).toBeNull();
  });
});
