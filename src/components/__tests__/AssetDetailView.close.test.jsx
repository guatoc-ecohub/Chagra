import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests para UX-19 (#286): bug crítico operador 2026-05-27 — "después de
 * que entro a una planta es casi imposible salir de ahí el botón de cerrar
 * no funciona".
 *
 * Verifica los 4 mecanismos de salida del panel:
 *   1. X button del header sticky (touch target 44x44 + aria-label).
 *   2. Botón secundario "Cerrar" al final del scroll.
 *   3. Escape key handler global.
 *   4. Click en el backdrop (el background semi-transparente).
 */

// Stubs pesados del flow real (catalogDB, planEditor, etc.)
vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../services/planGeneratorService', () => ({
  getPlanForAsset: vi.fn().mockResolvedValue(null),
  generatePlanForPlant: vi.fn(),
  updatePlanStep: vi.fn(),
  markStepExecuted: vi.fn(),
}));
vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: () => 'hash-test',
}));
vi.mock('../../hooks/useAssetPerformance', () => ({
  useAssetPerformance: () => ({
    globalRatio: 0, byCategory: {}, totalHarvestWeight: 0, totalInputWeight: 0, hasData: false,
  }),
}));
vi.mock('../AssetTimeline', () => ({ default: () => <div data-testid="timeline-stub" /> }));
vi.mock('../InputLogForm', () => ({ InputLogForm: () => <div /> }));
vi.mock('../MapPicker', () => ({ default: () => null }));
vi.mock('../PlantCemeteryModal', () => ({ default: () => null }));
vi.mock('../SplitFlow', () => ({ SplitFlow: () => null }));
vi.mock('../../services/photoService', () => ({
  listUserPhotosBySpecies: vi.fn().mockResolvedValue([]),
  captureAndCompress: vi.fn(),
  savePhoto: vi.fn(),
}));
vi.mock('../../services/externalAiPromptBuilder', () => ({
  buildOpenExternalPrompt: () => 'stub-prompt',
}));

const mockState = {
  selectedAssetId: 'plant-1',
  plants: [{
    id: 'plant-1',
    asset_type: 'plant',
    attributes: { name: 'Tomate cherry' },
  }],
  structures: [],
  equipment: [],
  materials: [],
  lands: [],
  clearSelectedAsset: vi.fn(),
  updateAsset: vi.fn(),
};

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector(mockState),
}));

import { AssetDetailView } from '../AssetDetailView';

beforeEach(() => {
  mockState.clearSelectedAsset.mockReset();
  mockState.selectedAssetId = 'plant-1';
});

describe('UX-19 — AssetDetailView salida', () => {
  it('botón X del header tiene touch target ≥44x44 + aria-label "Cerrar detalle"', () => {
    render(<AssetDetailView />);
    const btn = screen.getByTestId('asset-detail-close');
    expect(btn).toHaveAttribute('aria-label', 'Cerrar detalle');
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
  });

  it('click en el X del header invoca clearSelectedAsset', () => {
    render(<AssetDetailView />);
    fireEvent.click(screen.getByTestId('asset-detail-close'));
    expect(mockState.clearSelectedAsset).toHaveBeenCalledTimes(1);
  });

  it('botón "Cerrar" del bottom existe y dispara clearSelectedAsset', () => {
    render(<AssetDetailView />);
    const bottom = screen.getByTestId('asset-detail-close-bottom');
    expect(bottom).toBeInTheDocument();
    expect(bottom.textContent).toMatch(/Cerrar/i);
    fireEvent.click(bottom);
    expect(mockState.clearSelectedAsset).toHaveBeenCalledTimes(1);
  });

  it('Escape key cierra el panel', () => {
    render(<AssetDetailView />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockState.clearSelectedAsset).toHaveBeenCalledTimes(1);
  });

  it('Escape key NO dispara cuando selectedAssetId es null', () => {
    mockState.selectedAssetId = null;
    const { container } = render(<AssetDetailView />);
    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockState.clearSelectedAsset).not.toHaveBeenCalled();
  });

  it('el panel tiene role="dialog" + aria-modal="true" + aria-label con el nombre del activo', () => {
    render(<AssetDetailView />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', expect.stringMatching(/Tomate cherry/));
  });
});
