import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression P0 (TDZ): AssetsDashboard CRASHEABA en producción con
 * `ReferenceError: Cannot access 'X' before initialization` (temporal dead
 * zone) — el error boundary mostraba "Algo falló en Mi Finca", bloqueando
 * TODO el módulo de finca Y la ficha de especie (plant_asset), que viven en
 * este mismo componente.
 *
 * Causa: `renderPlantForm` / `renderGenericForm` (const arrow functions)
 * referenciaban `renderGeometryField`, declarado MÁS ABAJO en el mismo scope
 * del render. Al abrir el formulario (showForm=true) se invocaba el render
 * helper antes de que su dependencia saliera de la TDZ → ReferenceError.
 *
 * Este test MONTA el componente real (sin source-introspection) con el form
 * abierto en cada tab y confirma que NO lanza el ReferenceError.
 */

// jsdom no provee geolocation real — el form de plantas lo pide al abrir.
vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ request: vi.fn() }),
}));

// usePhotoUrl toca IndexedDB — stub a "sin foto" para caer al placeholder.
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ loading: false, url: null }),
  default: () => ({ loading: false, url: null }),
}));

// Servicios pesados que el form podría tocar al abrir/guardar — stub mínimo.
vi.mock('../../services/voiceRagEnricher', () => ({
  enrichEntity: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/apiService', () => ({
  fetchFromFarmOS: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../db/catalogDB', () => ({
  findBiopreparadosByIngredient: vi.fn().mockResolvedValue([]),
}));

// Sub-componentes pesados del form — stub para aislar el render de AssetsDashboard.
vi.mock('../SpeciesSelect', () => ({ default: () => <div data-testid="species-select-stub" /> }));
vi.mock('../GuildSuggestions', () => ({ default: () => null }));
vi.mock('../MapPicker', () => ({ default: () => null }));
vi.mock('../FarmMap', () => ({ default: () => null }));
vi.mock('../AssetDetailView', () => ({ default: () => null, AssetDetailView: () => null }));
vi.mock('../BiopreparadoSuggestionModal', () => ({ default: () => null }));
vi.mock('../MultiFincaModal', () => ({ default: () => null }));

// Store de finca activa: getActiveFinca() devuelve un objeto con nombre.
vi.mock('../../services/fincaActiveStore', () => {
  const useFincaActiveStore = () => ({
    activeFincaSlug: 'guatoc',
    getActiveFinca: () => ({ slug: 'guatoc', nombre: 'Guatoc' }),
  });
  return { useFincaActiveStore, default: useFincaActiveStore };
});

// Estado mutable del asset store. AssetsDashboard llama useAssetStore() sin
// selector y destructura el objeto, así que el mock devuelve este estado tal cual.
const mockAssetState = {
  plants: [],
  structures: [],
  equipment: [],
  materials: [],
  lands: [],
  isLoading: false,
  error: null,
  hydrate: vi.fn().mockResolvedValue(undefined),
  syncFromServer: vi.fn(),
  addAsset: vi.fn(),
  addAssetsBulk: vi.fn(),
  removeAsset: vi.fn(),
  addHarvestLog: vi.fn(),
  setSelectedAsset: vi.fn(),
};

vi.mock('../../store/useAssetStore', () => ({
  default: () => mockAssetState,
}));

import AssetsDashboard from '../AssetsDashboard';

beforeEach(() => {
  mockAssetState.plants = [];
  mockAssetState.lands = [];
});

describe('AssetsDashboard — sin TDZ (regresión P0 Mi Finca)', () => {
  it('monta sin lanzar ReferenceError (vista por defecto)', () => {
    expect(() => render(<AssetsDashboard onBack={() => {}} />)).not.toThrow();
  });

  it('abre el form de siembra (tab plant) sin TDZ — invoca renderPlantForm → renderGeometryField', () => {
    // initialShowForm fuerza showForm=true en mount → se invoca renderPlantForm(),
    // que usa renderGeometryField('point'). Si está en TDZ, esto lanza.
    expect(() =>
      render(<AssetsDashboard onBack={() => {}} initialTab="plant" initialShowForm />),
    ).not.toThrow();
    expect(screen.getByTestId('species-select-stub')).toBeTruthy();
  });

  it('abre el form genérico (tab material) sin TDZ — invoca renderGenericForm → renderGeometryField', () => {
    expect(() =>
      render(<AssetsDashboard onBack={() => {}} initialTab="material" initialShowForm />),
    ).not.toThrow();
  });

  it('abre el form de zona (tab land) sin TDZ — renderGeometryField("polygon")', () => {
    expect(() =>
      render(<AssetsDashboard onBack={() => {}} initialTab="land" initialShowForm />),
    ).not.toThrow();
  });

  it('abre el form de infraestructura (tab structure) sin TDZ', () => {
    expect(() =>
      render(<AssetsDashboard onBack={() => {}} initialTab="structure" initialShowForm />),
    ).not.toThrow();
  });
});
