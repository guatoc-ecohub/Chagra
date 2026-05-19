import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Audit 070.7 smoke tests para el wiring de PlanEditor dentro de
// AssetDetailView. Cubrimos:
//   1. Planta cuya species tiene `feeding_plan_template` → monta PlanEditor.
//   2. Planta cuya species NO tiene template → muestra placeholder
//      "Sin plan disponible" + botón "Solicitar al equipo Chagra".
//   3. Asset no-plant (land) → no monta PlanSection.

// Mock del catálogo SQLite (jsdom no carga WASM): inyectamos un getAllSpecies
// con dos especies, una con template y otra sin. vi.mock se hoistea, por eso
// definimos el dataset DENTRO de la factory en vez de a top-level (evita el
// ReferenceError "Cannot access before initialization").
vi.mock('../../db/catalogDB', () => {
  const speciesFixtures = [
    {
      id: 'solanum_lycopersicum',
      feeding_plan_template: {
        primary_steps: [{ offset_days: 7, biofertilizer_slug: 'biol_basico', dose_ml: 50 }],
      },
    },
    {
      id: 'lactuca_sativa',
      // sin feeding_plan_template
    },
  ];
  return {
    getAllSpecies: vi.fn().mockResolvedValue(speciesFixtures),
  };
});

// PlanEditor self-fetchea desde IDB — stubeamos para que el smoke no toque
// el store real ni IndexedDB.
vi.mock('../../services/planGeneratorService', () => ({
  getPlanForAsset: vi.fn().mockResolvedValue(null),
  generatePlanForPlant: vi.fn(),
  updatePlanStep: vi.fn(),
  markStepExecuted: vi.fn(),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: () => 'hash-test',
}));

// useAssetPerformance vacío (sin métricas).
vi.mock('../../hooks/useAssetPerformance', () => ({
  useAssetPerformance: () => ({
    globalRatio: 0, byCategory: {}, totalHarvestWeight: 0, totalInputWeight: 0, hasData: false,
  }),
}));

// AssetTimeline pesado — render stub.
vi.mock('../AssetTimeline', () => ({
  default: () => <div data-testid="timeline-stub" />,
}));

// InputLogForm pesado (tira asset store + payload) — stub.
vi.mock('../InputLogForm', () => ({
  InputLogForm: () => <div data-testid="input-log-form-stub" />,
}));

// MapPicker, PlantCemeteryModal, SplitFlow lazy-mounted via state flags;
// stubeamos por si acaso.
vi.mock('../MapPicker', () => ({ default: () => null }));
vi.mock('../PlantCemeteryModal', () => ({ default: () => null }));
vi.mock('../SplitFlow', () => ({ SplitFlow: () => null }));

// photoService listUserPhotosBySpecies → resolve [].
vi.mock('../../services/photoService', () => ({
  listUserPhotosBySpecies: vi.fn().mockResolvedValue([]),
  captureAndCompress: vi.fn(),
  savePhoto: vi.fn(),
}));

// externalAiPromptBuilder used by ExternalAiButton import chain.
vi.mock('../../services/externalAiPromptBuilder', () => ({
  buildOpenExternalPrompt: () => 'stub-prompt',
}));

// State mutable del mock store: cada test reasigna selectedAssetId + plants/lands.
const mockState = {
  selectedAssetId: null,
  plants: [],
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
  mockState.selectedAssetId = null;
  mockState.plants = [];
  mockState.structures = [];
  mockState.equipment = [];
  mockState.materials = [];
  mockState.lands = [];
});

describe('AssetDetailView — PlanSection wiring (audit 070.7)', () => {
  it('monta PlanEditor cuando la planta es una species con feeding_plan_template', async () => {
    mockState.selectedAssetId = 'plant-tomate';
    mockState.plants = [{
      id: 'plant-tomate',
      asset_type: 'plant',
      attributes: {
        name: 'Tomate Cherry #1',
        _speciesSlug: 'solanum_lycopersicum',
        _chagra_plant_meta: { fecha_germinacion: '2026-05-01' },
      },
    }];

    render(<AssetDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('plan-section-editor')).toBeTruthy();
    });
    // PlanEditor renderiza su propio CTA "Generar Plan" cuando getPlanForAsset → null.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar Plan/i })).toBeTruthy();
    });
  });

  it('muestra placeholder + botón "Solicitar" cuando la species no tiene template', async () => {
    mockState.selectedAssetId = 'plant-lechuga';
    mockState.plants = [{
      id: 'plant-lechuga',
      asset_type: 'plant',
      attributes: {
        name: 'Lechuga #3',
        _speciesSlug: 'lactuca_sativa',
      },
    }];

    render(<AssetDetailView />);

    await waitFor(() => {
      expect(screen.getByTestId('plan-section-empty')).toBeTruthy();
    });
    expect(screen.getByText(/Sin plan disponible/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Solicitar al equipo Chagra/i })).toBeTruthy();
  });

  it('no monta PlanSection cuando el asset es land (no-plant)', async () => {
    mockState.selectedAssetId = 'land-1';
    mockState.lands = [{
      id: 'land-1',
      asset_type: 'land',
      attributes: { name: 'Era 4' },
    }];

    render(<AssetDetailView />);

    // El nombre del land sí está; PlanSection no.
    expect(screen.getByText(/Era 4/i)).toBeTruthy();
    expect(screen.queryByTestId('plan-section-editor')).toBeNull();
    expect(screen.queryByTestId('plan-section-empty')).toBeNull();
    expect(screen.queryByTestId('plan-section-loading')).toBeNull();
    expect(screen.queryByTestId('plan-section-no-slug')).toBeNull();
  });
});
