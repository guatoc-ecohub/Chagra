import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
      nombre_comun: 'Tomate',
      nombre_cientifico: 'Solanum lycopersicum',
      imagen: {
        url: 'https://catalogo.test/tomate.jpg',
        thumbUrl: 'https://catalogo.test/tomate-thumb.jpg',
        license: 'CC BY 4.0',
        rightsHolder: 'Catálogo Chagra',
      },
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
  getPhotoUrl: vi.fn().mockResolvedValue({ url: null, source: 'missing', loading: false }),
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
  mockState.clearSelectedAsset = vi.fn();
  mockState.updateAsset = vi.fn().mockResolvedValue(undefined);
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

  it('muestra la foto curada del catálogo en la ficha cuando no hay foto local del asset', async () => {
    mockState.selectedAssetId = 'plant-tomate';
    mockState.plants = [{
      id: 'plant-tomate',
      asset_type: 'plant',
      attributes: {
        name: 'Tomate Cherry #1',
        _speciesSlug: 'solanum_lycopersicum',
      },
    }];

    render(<AssetDetailView />);

    const img = await screen.findByRole('img', { name: /Solanum lycopersicum/i });
    expect(img).toHaveAttribute('src', 'https://catalogo.test/tomate-thumb.jpg');
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

  // Bug 2026-06-20 (operador, fresa): asset viejo SIN _speciesSlug cuyo
  // nombre es el común ("Tomate #1"). El slug derivado ("tomate") no es el
  // id del catálogo ("solanum_lycopersicum"), pero matchSpeciesInCatalog lo
  // resuelve por nombre común → el plan y la foto de referencia funcionan.
  it('resuelve plan + fallback por nombre común cuando el asset no tiene _speciesSlug (bug fresa)', async () => {
    mockState.selectedAssetId = 'plant-tomate-viejo';
    mockState.plants = [{
      id: 'plant-tomate-viejo',
      asset_type: 'plant',
      attributes: { name: 'Tomate #1' }, // sin _speciesSlug
    }];

    render(<AssetDetailView />);

    // El plan SÍ monta (template del catálogo resuelto por nombre común).
    await waitFor(() => {
      expect(screen.getByTestId('plan-section-editor')).toBeTruthy();
    });
    // Y la foto curada del catálogo aparece (resuelta vía nombre común).
    const img = await screen.findByRole('img', { name: /Solanum lycopersicum/i });
    expect(img).toHaveAttribute('src', 'https://catalogo.test/tomate-thumb.jpg');
  });

  it('muestra un fallback de foto claro (no un hueco) cuando la especie no tiene imagen ni match', async () => {
    mockState.selectedAssetId = 'plant-marciana';
    mockState.plants = [{
      id: 'plant-marciana',
      asset_type: 'plant',
      attributes: { name: 'Planta Marciana #1' }, // no existe en catálogo
    }];

    render(<AssetDetailView />);

    let fallback;
    await waitFor(() => {
      fallback = screen.getByTestId('species-image-fallback');
      expect(fallback).toBeTruthy();
    });
    // El fallback muestra el nombre legible derivado, nunca vacío.
    expect(within(fallback).getByText(/Planta Marciana/i)).toBeTruthy();
  });

  it('persiste la fecha de siembra editable vía updateAsset', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    mockState.updateAsset = vi.fn().mockResolvedValue(undefined);
    mockState.selectedAssetId = 'plant-tomate';
    mockState.plants = [{
      id: 'plant-tomate',
      asset_type: 'plant',
      attributes: { name: 'Tomate Cherry #1', _speciesSlug: 'solanum_lycopersicum' },
    }];

    render(<AssetDetailView />);

    const dateInput = await screen.findByTestId('seeding-date-editor');
    const input = dateInput.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
    await userEvent.clear(input);
    await userEvent.type(input, '2026-03-15');

    await waitFor(() => {
      expect(mockState.updateAsset).toHaveBeenCalled();
    });
    const [assetType, updatedAsset] = mockState.updateAsset.mock.calls.at(-1);
    expect(assetType).toBe('plant');
    expect(updatedAsset.attributes._chagra_plant_meta.fecha_germinacion).toBe('2026-03-15');
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
