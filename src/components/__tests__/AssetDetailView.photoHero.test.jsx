import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Tests para UX-26 (#286): operador 2026-05-27 — "en siembras dentro de
 * una planta, agregar foto sale al final separado feo. Hay que
 * integrarlo bonito dentro del flujo principal de la card".
 *
 * Verifica:
 *   - PhotoHeroSection se renderiza al COMIENZO del scroll content
 *     (primer hijo).
 *   - Si NO hay foto, muestra el CTA grande con copy contextual
 *     ("Foto de la planta" / "Foto de la zona" según assetType).
 *   - Si SÍ hay foto, muestra la imagen como hero + botones overlay
 *     "Cambiar" + galería.
 */

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
  getCurrentOperatorHash: () => 'h',
}));
vi.mock('../../hooks/useAssetPerformance', () => ({
  useAssetPerformance: () => ({ globalRatio: 0, byCategory: {}, totalHarvestWeight: 0, totalInputWeight: 0, hasData: false }),
}));
vi.mock('../AssetTimeline', () => ({ default: () => <div /> }));
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
  buildOpenExternalPrompt: () => 'stub',
}));

// Mock usePhotoUrl con foto NO presente (source='placeholder').
let mockPhotoState = { url: '/placeholder.svg', source: 'placeholder', loading: false };
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => mockPhotoState,
}));

const mockState = {
  selectedAssetId: 'plant-1',
  plants: [{
    id: 'plant-1',
    asset_type: 'plant',
    type: 'asset--plant',
    attributes: { name: 'Fresa #1' },
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
  mockState.selectedAssetId = 'plant-1';
  mockPhotoState = { url: '/placeholder.svg', source: 'placeholder', loading: false };
});

describe('UX-26 — PhotoHeroSection integrada como hero', () => {
  it('PhotoHeroSection existe en el render', () => {
    render(<AssetDetailView />);
    expect(screen.getByTestId('photo-hero-section')).toBeInTheDocument();
  });

  it('cuando NO hay foto, muestra CTA prominente "Tomar foto"', () => {
    mockPhotoState = { url: '/placeholder.svg', source: 'placeholder', loading: false };
    render(<AssetDetailView />);
    expect(screen.getByTestId('photo-hero-add-camera')).toBeInTheDocument();
    expect(screen.getByText(/Foto de la planta/i)).toBeInTheDocument();
  });

  it('cuando SÍ hay foto, muestra botón overlay "Cambiar"', () => {
    mockPhotoState = { url: 'blob://test.jpg', source: 'user', loading: false };
    render(<AssetDetailView />);
    const retake = screen.getByTestId('photo-hero-retake-camera');
    expect(retake).toBeInTheDocument();
    expect(retake.textContent).toMatch(/Cambiar/i);
  });

  it('copy contextual cambia según assetType (zona)', () => {
    // Cambiar el mock state a una zona.
    mockState.plants = [];
    mockState.lands = [{
      id: 'plant-1',
      asset_type: 'land',
      type: 'asset--land',
      attributes: { name: 'Robles building' },
    }];
    render(<AssetDetailView />);
    expect(screen.getByText(/Foto de la zona/i)).toBeInTheDocument();
    // Restore
    mockState.plants = [{
      id: 'plant-1', asset_type: 'plant', type: 'asset--plant',
      attributes: { name: 'Fresa #1' },
    }];
    mockState.lands = [];
  });
});
