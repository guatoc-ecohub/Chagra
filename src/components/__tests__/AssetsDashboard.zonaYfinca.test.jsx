import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * BUG #7 (flujo core david/campesino — agregar planta) + BUG #10 (steve —
 * cambiar de finca con 2 fincas), hallados por el test integral 2026-06-21.
 *
 * BUG #7: al agregar una planta TODAS caían en "Sin zona asignada" porque el
 *   alta no auto-asignaba zona. Fix: si la finca tiene UNA sola zona, se
 *   auto-asigna al abrir el form; si tiene varias, el selector pide cuál;
 *   "Sin zona por ahora" pasa a ser una elección explícita.
 *
 * BUG #10: con 2+ fincas el conmutador de finca no se hallaba (la píldora
 *   mostraba el nombre sin affordance de selector). Fix: chevron + aria-label
 *   "Cambiar de finca" cuando hay más de una finca.
 *
 * Estos tests montan el componente real y verifican el comportamiento.
 */

vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ request: vi.fn() }),
}));
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ loading: false, url: null }),
  default: () => ({ loading: false, url: null }),
}));
vi.mock('../../services/voiceRagEnricher', () => ({
  enrichEntity: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/apiService', () => ({
  fetchFromFarmOS: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../db/catalogDB', () => ({
  findBiopreparadosByIngredient: vi.fn().mockResolvedValue([]),
}));
vi.mock('../SpeciesSelect', () => ({ default: () => <div data-testid="species-select-stub" /> }));
vi.mock('../GuildSuggestions', () => ({ default: () => null }));
vi.mock('../MapPicker', () => ({ default: () => null }));
vi.mock('../FarmMap', () => ({ default: () => null }));
vi.mock('../AssetDetailView', () => ({ default: () => null, AssetDetailView: () => null }));
vi.mock('../BiopreparadoSuggestionModal', () => ({ default: () => null }));
vi.mock('../MultiFincaModal', () => ({ default: () => null }));

// Finca activa configurable por test (1 o 2 fincas) para BUG #10.
const fincaState = {
  activeFincaSlug: 'guatoc',
  getActiveFinca: () => ({ slug: 'guatoc', nombre: 'Guatoc' }),
  fincas: [{ slug: 'guatoc', nombre: 'Guatoc' }],
  setActiveFincaManual: vi.fn(),
};
vi.mock('../../services/fincaActiveStore', () => {
  const useFincaActiveStore = () => fincaState;
  return { useFincaActiveStore, default: useFincaActiveStore };
});

// Asset store mutable. addAsset captura el payload para inspeccionar la zona.
const addAsset = vi.fn();
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
  addAsset,
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
  // El form persiste la zona pre-elegida en localStorage (PENDING_FORM_ZONE_KEY)
  // para no re-pedirla al agregar varias plantas seguidas. Sin limpiar, un test
  // contamina la zona inicial del siguiente.
  localStorage.clear();
  mockAssetState.plants = [];
  mockAssetState.lands = [];
  addAsset.mockClear();
  fincaState.setActiveFincaManual.mockClear();
  fincaState.fincas = [{ slug: 'guatoc', nombre: 'Guatoc' }];
});

describe('BUG #7 — auto-asignar zona al agregar planta', () => {
  it('si la finca tiene UNA sola zona, el selector la deja seleccionada (no vacía)', () => {
    mockAssetState.lands = [
      { id: 'land-uno', attributes: { name: 'Lote del Río', land_type: 'lote' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" initialShowForm />);
    const select = screen.getByLabelText('¿En qué lote o zona va?');
    // El efecto de auto-asignación deja parentLandId = land-uno → opción
    // seleccionada NO es la de "Sin zona por ahora" (value vacío).
    expect(/** @type {HTMLSelectElement} */ (select).value).toBe('land-uno');
  });

  it('ofrece la elección explícita "Sin zona por ahora"', () => {
    mockAssetState.lands = [
      { id: 'land-uno', attributes: { name: 'Lote del Río', land_type: 'lote' } },
      { id: 'land-dos', attributes: { name: 'Huerta', land_type: 'huerta' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" initialShowForm />);
    expect(screen.getByText(/Sin zona por ahora/i)).toBeTruthy();
  });

  it('con varias zonas NO auto-asigna: el campesino debe elegir el lote', () => {
    mockAssetState.lands = [
      { id: 'land-uno', attributes: { name: 'Lote del Río', land_type: 'lote' } },
      { id: 'land-dos', attributes: { name: 'Huerta', land_type: 'huerta' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" initialShowForm />);
    const select = screen.getByLabelText('¿En qué lote o zona va?');
    // Sin zona elegida aún → cae a la opción vacía "Sin zona por ahora".
    expect(/** @type {HTMLSelectElement} */ (select).value).toBe('');
  });
});

describe('BUG #10 — affordance clara para cambiar de finca', () => {
  it('con 2 fincas, el botón de finca activa es un conmutador accesible', () => {
    fincaState.fincas = [
      { slug: 'guatoc', nombre: 'Guatoc' },
      { slug: 'la-esperanza', nombre: 'La Esperanza' },
    ];
    render(<AssetsDashboard onBack={() => {}} />);
    // aria-label "Cambiar de finca" hace el conmutador hallable por affordance.
    expect(screen.getByLabelText(/Cambiar de finca/i)).toBeTruthy();
  });

  it('con 1 sola finca, el botón es indicador (no anuncia cambio)', () => {
    fincaState.fincas = [{ slug: 'guatoc', nombre: 'Guatoc' }];
    render(<AssetsDashboard onBack={() => {}} />);
    expect(screen.queryByLabelText(/Cambiar de finca/i)).toBeNull();
    expect(screen.getByLabelText(/Finca activa: Guatoc/i)).toBeTruthy();
  });
});
