import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// El asset que el store devolverá al test. Mutado por test para variar el
// escenario (planta con/sin speciesSlug en catálogo, no-plant).
let currentAsset = null;

// Mock del store antes del import del componente. selectedAssetId se
// deriva del currentAsset para que el AssetDetailView lo encuentre via
// useMemo([...plants, ...structures, ...].find(a => a.id === selectedId)).
vi.mock('../../store/useAssetStore', () => {
  const useAssetStore = (selector) => {
    return selector({
      selectedAssetId: currentAsset?.id || null,
      plants: currentAsset && (currentAsset.asset_type || '').includes('plant') ? [currentAsset] : [],
      structures: currentAsset && (currentAsset.asset_type || '').includes('structure') ? [currentAsset] : [],
      equipment: [],
      materials: [],
      lands: [],
      clearSelectedAsset: vi.fn(),
      updateAsset: vi.fn(),
    });
  };
  return { default: useAssetStore };
});

// Mock catalogDB.getAllSpecies — controla si la especie tiene
// feeding_plan_template o no.
const mockSpecies = [
  {
    id: 'tomate',
    feeding_plan_template: {
      primary_steps: [{ action: 'apply_biofertilizer', offset_days: 7, biofertilizer_slug: 'biol_tomate', dose_ml: 100 }],
    },
  },
  {
    id: 'planta_sin_plan',
    // sin feeding_plan_template
  },
];

vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn(async () => mockSpecies),
}));

// Mock planGeneratorService para PlanEditor: por defecto plan vacío.
vi.mock('../../services/planGeneratorService', () => ({
  getPlanForAsset: vi.fn(async () => null),
  generatePlanForPlant: vi.fn(),
  updatePlanStep: vi.fn(),
  markStepExecuted: vi.fn(),
}));

vi.mock('../../services/operatorIdentityService', () => ({
  getCurrentOperatorHash: () => 'test-hash',
}));

// Mocks de sub-componentes pesados para que el smoke test corra rápido.
vi.mock('../AssetTimeline', () => ({
  default: () => <div data-testid="asset-timeline">[AssetTimeline]</div>,
}));

vi.mock('../InputLogForm', () => ({
  InputLogForm: () => <div data-testid="input-log-form">[InputLogForm]</div>,
}));

vi.mock('../MapPicker', () => ({
  default: () => null,
}));

vi.mock('../PlantCemeteryModal', () => ({
  default: () => null,
}));

vi.mock('../SplitFlow', () => ({
  SplitFlow: () => null,
}));

vi.mock('../common/ExternalAiButton', () => ({
  ExternalAiButton: () => <button type="button">Ayuda IA</button>,
}));

vi.mock('../../hooks/useAssetPerformance', () => ({
  useAssetPerformance: () => ({ globalRatio: 0, byCategory: {}, totalHarvestWeight: 0, totalInputWeight: 0, hasData: false }),
}));

vi.mock('../../services/photoService', () => ({
  listUserPhotosBySpecies: vi.fn(async () => []),
  captureAndCompress: vi.fn(),
  savePhoto: vi.fn(),
}));

vi.mock('../../services/externalAiPromptBuilder', () => ({
  buildOpenExternalPrompt: vi.fn(),
}));

import { AssetDetailView } from '../AssetDetailView';

describe('AssetDetailView smoke — PlanSection wiring (audit 070.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('monta PlanSection para una planta cuya especie tiene feeding_plan_template', async () => {
    currentAsset = {
      id: 'asset-1',
      asset_type: 'plant',
      attributes: { name: 'Tomate #1', status: 'active', created: 1700000000 },
    };

    render(<AssetDetailView />);

    // El PlanSection arranca en loading y luego resuelve a has_template,
    // que renderiza PlanEditor — su fallback "Sin plan / Generar Plan"
    // aparece porque getPlanForAsset() devolvió null en el mock.
    await waitFor(() => {
      expect(screen.getByText(/Generar Plan/i)).toBeTruthy();
    });
  });

  it('muestra placeholder "Solicitar al equipo Chagra" cuando la especie no tiene template', async () => {
    currentAsset = {
      id: 'asset-2',
      asset_type: 'plant',
      attributes: { name: 'Planta sin plan #1', status: 'active', created: 1700000000 },
    };

    render(<AssetDetailView />);

    await waitFor(() => {
      expect(screen.getByText(/Sin plan disponible para esta especie/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /Solicitar al equipo Chagra agregar plan/i })).toBeTruthy();
  });

  it('no monta PlanSection para assets que no son plants', async () => {
    currentAsset = {
      id: 'asset-3',
      asset_type: 'structure',
      attributes: { name: 'Invernadero', status: 'active', created: 1700000000 },
    };

    render(<AssetDetailView />);

    await waitFor(() => {
      expect(screen.getByText('Invernadero')).toBeTruthy();
    });

    // No debe aparecer ni PlanEditor ni el placeholder de solicitud.
    expect(screen.queryByText(/Generar Plan/i)).toBeNull();
    expect(screen.queryByText(/Solicitar al equipo Chagra/i)).toBeNull();
  });
});
