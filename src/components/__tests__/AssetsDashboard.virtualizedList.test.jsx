import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * queue/056.1 — Virtualizar AssetsDashboard lista principal.
 *
 * La integración de `react-virtuoso` ya vive en `AssetsDashboard.jsx` (merge
 * previo, PR #1799 — commit aa259ea) sobre las dos listas largas: el
 * drill-down raíz de zonas y la lista principal de activos/plantas
 * (`currentAssets`). Lo que faltaba era cobertura de test que probara que,
 * con `react-virtuoso` mockeado (jsdom no mide layout real, así que Virtuoso
 * sin mock no expone items), los items siguen siendo visibles y el
 * comportamiento existente (filtro de búsqueda, tap para abrir detalle,
 * eliminar, testid del conmutador multifinca) se conserva intacto.
 *
 * El mock de `react-virtuoso` sigue el mismo patrón ya establecido en
 * `AssetTimeline.smoke.test.jsx`: renderiza `itemContent` para todos los
 * `data[]` recibidos (sin windowing), suficiente para aserciones de jsdom.
 */

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data = [], itemContent, components }) => {
    const Header = components?.Header;
    return (
      <div data-testid="virtuoso-mock">
        {Header ? <Header /> : null}
        {data.map((item, idx) => (
          <div key={item?.id ?? idx}>{itemContent(idx, item)}</div>
        ))}
      </div>
    );
  },
}));

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

vi.mock('../../services/fincaActiveStore', () => {
  const useFincaActiveStore = () => ({
    activeFincaSlug: 'guatoc',
    getActiveFinca: () => ({ slug: 'guatoc', nombre: 'Guatoc' }),
    fincas: [{ slug: 'guatoc', nombre: 'Guatoc' }],
    setActiveFincaManual: vi.fn(),
  });
  return { useFincaActiveStore, default: useFincaActiveStore };
});

const removeAsset = vi.fn().mockResolvedValue(undefined);
const setSelectedAsset = vi.fn();
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
  removeAsset,
  addHarvestLog: vi.fn(),
  setSelectedAsset,
};
vi.mock('../../store/useAssetStore', () => ({
  default: () => mockAssetState,
}));

import AssetsDashboard from '../AssetsDashboard';

beforeEach(() => {
  mockAssetState.plants = [];
  mockAssetState.structures = [];
  mockAssetState.equipment = [];
  mockAssetState.materials = [];
  mockAssetState.lands = [];
  removeAsset.mockClear();
  setSelectedAsset.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('AssetsDashboard — lista principal virtualizada (react-virtuoso, queue/056.1)', () => {
  it('renderiza los items de la lista de insumos a través del mock de Virtuoso', () => {
    mockAssetState.materials = [
      { id: 'mat-1', type: 'asset--material', attributes: { name: 'Compost casero' } },
      { id: 'mat-2', type: 'asset--material', attributes: { name: 'Abono orgánico' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="material" />);
    expect(screen.getByTestId('virtuoso-mock')).toBeTruthy();
    expect(screen.getByText('Compost casero')).toBeTruthy();
    expect(screen.getByText('Abono orgánico')).toBeTruthy();
  });

  it('el buscador sigue filtrando la lista virtualizada', async () => {
    const user = userEvent.setup();
    mockAssetState.materials = [
      { id: 'mat-1', type: 'asset--material', attributes: { name: 'Compost casero' } },
      { id: 'mat-2', type: 'asset--material', attributes: { name: 'Abono orgánico' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="material" />);
    await user.type(screen.getByLabelText('Buscar activo'), 'Compost');
    expect(screen.getByText('Compost casero')).toBeTruthy();
    expect(screen.queryByText('Abono orgánico')).toBeNull();
  });

  it('tap en un item de la lista virtualizada abre el detalle (setSelectedAsset)', async () => {
    const user = userEvent.setup();
    mockAssetState.materials = [
      { id: 'mat-1', type: 'asset--material', attributes: { name: 'Compost casero' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="material" />);
    const article = screen.getByRole('article');
    await user.click(within(article).getByText('Compost casero'));
    expect(setSelectedAsset).toHaveBeenCalledWith('mat-1');
  });

  it('el botón de eliminar del item virtualizado sigue funcionando', async () => {
    const user = userEvent.setup();
    mockAssetState.materials = [
      { id: 'mat-1', type: 'asset--material', attributes: { name: 'Compost casero' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="material" />);
    const article = screen.getByRole('article');
    const buttons = within(article).getAllByRole('button');
    // Orden DOM del item: [0] botón nombre/detalle, [1] botón eliminar (Trash2).
    await user.click(buttons[1]);
    expect(window.confirm).toHaveBeenCalled();
    expect(removeAsset).toHaveBeenCalledWith('material', 'mat-1');
  });

  it('conserva el testid del conmutador multifinca junto a la lista virtualizada', () => {
    mockAssetState.materials = [
      { id: 'mat-1', type: 'asset--material', attributes: { name: 'Compost casero' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="material" />);
    expect(screen.getByTestId('assets-finca-switcher')).toBeTruthy();
  });

  it('colapsa N matas iguales en una fila agrupada "×N" y la expande a las individuales', async () => {
    const user = userEvent.setup();
    // 3 fresas sembradas igual (mismo slug + misma fecha + mismo lote) → 1 fila.
    const meta = { _chagra_plant_meta: { fecha_germinacion: '2026-03-04' } };
    mockAssetState.plants = [
      { id: 'fresa-1', type: 'asset--plant', attributes: { name: 'Fresa #01', _speciesSlug: 'fragaria_ananassa', ...meta } },
      { id: 'fresa-2', type: 'asset--plant', attributes: { name: 'Fresa #02', _speciesSlug: 'fragaria_ananassa', ...meta } },
      { id: 'fresa-3', type: 'asset--plant', attributes: { name: 'Fresa #03', _speciesSlug: 'fragaria_ananassa', ...meta } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" />);
    await user.click(screen.getByText(/Ver todos/i));
    // Colapsado: badge "×3", nombre limpio "Fresa", y las individuales ocultas.
    expect(screen.getByText('×3')).toBeTruthy();
    expect(screen.getByText('Fresa')).toBeTruthy();
    expect(screen.queryByText('Fresa #01')).toBeNull();
    expect(screen.queryByText('Fresa #03')).toBeNull();
    // Expandir: aparecen las 3 matas individuales.
    await user.click(screen.getByText('Fresa'));
    expect(screen.getByText('Fresa #01')).toBeTruthy();
    expect(screen.getByText('Fresa #02')).toBeTruthy();
    expect(screen.getByText('Fresa #03')).toBeTruthy();
  });

  it('deja sueltas las matas de distinta especie (no agrupa lo que no es equivalente)', async () => {
    const user = userEvent.setup();
    mockAssetState.plants = [
      { id: 'plant-1', type: 'asset--plant', attributes: { name: 'Tomate cherry' } },
      { id: 'plant-2', type: 'asset--plant', attributes: { name: 'Fríjol cargamanto' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" />);
    await user.click(screen.getByText(/Ver todos/i));
    expect(screen.getByText('Tomate cherry')).toBeTruthy();
    expect(screen.getByText('Fríjol cargamanto')).toBeTruthy();
    expect(screen.queryByText(/^×/)).toBeNull(); // ningún badge de grupo
  });

  it('renderiza la lista de zonas (drill-down raíz de plantas) y permite ver todos los cultivos', async () => {
    const user = userEvent.setup();
    mockAssetState.lands = [
      { id: 'land-uno', attributes: { name: 'Lote del Río', land_type: 'lote' } },
    ];
    mockAssetState.plants = [
      { id: 'plant-1', type: 'asset--plant', attributes: { name: 'Tomate cherry' } },
      { id: 'plant-2', type: 'asset--plant', attributes: { name: 'Fríjol cargamanto' } },
    ];
    render(<AssetsDashboard onBack={() => {}} initialTab="plant" />);
    // Root drill-down: la zona se renderiza vía el mock de Virtuoso.
    expect(screen.getByText('Lote del Río')).toBeTruthy();
    // "Ver todos" cambia currentZoneId a '__all__' y expone la lista principal
    // de plantas (segunda instancia de Virtuoso en el árbol).
    await user.click(screen.getByText(/Ver todos/i));
    expect(screen.getByText('Tomate cherry')).toBeTruthy();
    expect(screen.getByText('Fríjol cargamanto')).toBeTruthy();
  });
});
