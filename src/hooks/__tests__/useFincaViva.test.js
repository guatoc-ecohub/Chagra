import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const storeState = {
  plants: [],
  lands: [],
  isHydrated: true,
  hydrate: vi.fn(() => Promise.resolve()),
};

let climaSnapshotValue = null;
let skySnapshotValue = null;
let locationValue = null;
let atmosphereValue = { luz: 'dia', condition: 'despejado', enso: 'neutro' };
let sceneValue = {
  vacia: true,
  cultivosActivos: 0,
  totalCultivos: 0,
  enCosecha: 0,
  vitalidad: 0,
  vitalidadLabel: 'Tu finca está por sembrar',
};

const listFarmProcessesMock = vi.fn(() => Promise.resolve([]));
const getAnimalAssetsMock = vi.fn(() => Promise.resolve([]));
const getHarvestLogsMock = vi.fn(() => Promise.resolve([]));

vi.mock('../../store/useAssetStore.js', () => ({
  __esModule: true,
  default: (selector) => {
    if (typeof selector === 'function') return selector(storeState);
    return storeState;
  },
}));

vi.mock('../../db/farmProcessCache.js', () => ({
  listFarmProcesses: (...args) => listFarmProcessesMock(...args),
}));

vi.mock('../../db/assetCache.js', () => ({
  assetCache: {
    getByType: (...args) => getAnimalAssetsMock(...args),
  },
}));

vi.mock('../../db/logCache.js', () => ({
  logCache: {
    getByType: (...args) => getHarvestLogsMock(...args),
  },
}));

vi.mock('../../services/cosechaService.js', () => ({
  HARVEST_LOG_TYPE: 'log--harvest',
  normalizeHarvestLog: (log) => log,
}));

vi.mock('../../services/fincaSceneService.js', () => ({
  buildFincaScene: () => sceneValue,
}));

vi.mock('../../services/hoyEnFincaService.js', () => ({
  buildClimaHoy: () => ({
    hasData: Boolean(climaSnapshotValue),
    condition: climaSnapshotValue?.condition || 'despejado',
    label: climaSnapshotValue?.label || 'Despejado',
    tempMinC: climaSnapshotValue?.tempMinC ?? null,
    tempMaxC: climaSnapshotValue?.tempMaxC ?? null,
  }),
}));

vi.mock('../../services/atmosphereService.js', () => ({
  deriveAtmosphere: () => atmosphereValue,
}));

vi.mock('../../services/climaService.js', () => ({
  CLIMA_UPDATED_EVENT: 'chagra:clima:updated',
  getCachedClimaSnapshot: () => climaSnapshotValue,
  resolveClimaLocation: () => locationValue,
}));

vi.mock('../../services/skyConditionService.js', () => ({
  getCachedSkyConditions: () => skySnapshotValue,
}));

vi.mock('../../services/locationService.js', () => ({
  getPisoTermicoInfo: () => (locationValue ? { slug: 'templado' } : null),
}));

const mod = await import('../useFincaViva.js');
const useFincaViva = mod.default;

function resetState() {
  storeState.plants = [];
  storeState.lands = [];
  storeState.isHydrated = true;
  storeState.hydrate.mockClear();
  climaSnapshotValue = null;
  skySnapshotValue = null;
  locationValue = null;
  atmosphereValue = { luz: 'dia', condition: 'despejado', enso: 'neutro' };
  sceneValue = {
    vacia: true,
    cultivosActivos: 0,
    totalCultivos: 0,
    enCosecha: 0,
    vitalidad: 0,
    vitalidadLabel: 'Tu finca está por sembrar',
  };
  listFarmProcessesMock.mockReset();
  listFarmProcessesMock.mockResolvedValue([]);
  getAnimalAssetsMock.mockReset();
  getAnimalAssetsMock.mockResolvedValue([]);
  getHarvestLogsMock.mockReset();
  getHarvestLogsMock.mockResolvedValue([]);
}

describe('useFincaViva', () => {
  beforeEach(() => {
    resetState();
  });

  it('deriva datos reales desde caches locales', async () => {
    storeState.plants = [{ id: 'plant-1' }, { id: 'plant-2' }];
    storeState.lands = [{ id: 'land-1' }];
    locationValue = { lat: 4.55, lng: -74.1, elevation: 2120 };
    climaSnapshotValue = { condition: 'lluvia', label: 'Lluvia', tempMinC: 15, tempMaxC: 22 };
    skySnapshotValue = { cloud_cover: 92 };
    atmosphereValue = { luz: 'amanecer', condition: 'lluvia', enso: 'nina' };
    sceneValue = {
      vacia: false,
      cultivosActivos: 2,
      totalCultivos: 2,
      enCosecha: 1,
      vitalidad: 87,
      vitalidadLabel: 'Tu finca está viva y fuerte',
    };
    listFarmProcessesMock.mockResolvedValue([
      {
        process_id: 'proc-1',
        type: 'farm_process',
        attributes: {
          process_type: 'livestock_cycle',
          status: 'active',
          subject_kind: 'animal',
          animal_type: 'vaca',
          breed: 'Holstein',
          quantity: 2,
          subject_slug: 'ganado_lechero',
          subject_label: 'Hato lechero',
        },
      },
    ]);
    getAnimalAssetsMock.mockResolvedValue([
      {
        id: 'animal-1',
        type: 'asset--animal',
        attributes: {
          name: 'Luna',
          animal_type: 'vaca',
          breed: 'Holstein',
          status: 'active',
        },
      },
    ]);
    getHarvestLogsMock.mockResolvedValue([
      {
        id: 'harvest-1',
        crop: 'Cafe',
        value: 18,
        unit: 'kg',
        kg: 18,
        assetId: 'plant-1',
        timestampMs: 1718600000000,
      },
    ]);

    const { result, unmount } = renderHook(() => useFincaViva());

    await waitFor(() => {
      expect(result.current._fuente.general).toBe('real');
    });

    expect(result.current.clima).toEqual({ piso: 'templado', lluvia: true, temp: 22 });
    expect(result.current.climaEscena).toBe('lluvia');
    expect(result.current.saludFinca).toEqual({ matasVivas: 2, matasTotal: 2, agua: 0.72 });
    expect(result.current.animales).toEqual([
      expect.objectContaining({
        tipo: 'vaca',
        raza: 'Holstein',
        estado: 'active',
        nombre: 'Luna',
      }),
      expect.objectContaining({
        tipo: 'vaca',
        raza: 'Holstein',
        estado: 'active',
        nombre: 'Hato lechero',
        cantidad: 2,
      }),
    ]);
    expect(result.current.cosechaReciente).toEqual({
      cultivo: 'Cafe',
      cantidad: 18,
      unidad: 'kg',
      kg: 18,
      assetId: 'plant-1',
      fechaMs: 1718600000000,
    });
    expect(result.current.cosecha).toEqual({ reciente: result.current.cosechaReciente });
    expect(result.current._fuente).toEqual({
      general: 'real',
      clima: 'real',
      saludFinca: 'real',
      animales: 'real',
      cosecha: 'real',
    });

    unmount();
  });

  it('marca muestra cuando no hay datos reales suficientes', async () => {
    const { result, unmount } = renderHook(() => useFincaViva());

    await waitFor(() => {
      expect(result.current._fuente.general).toBe('muestra');
    });

    expect(result.current.clima).toEqual({ piso: null, lluvia: true, temp: null });
    expect(result.current.climaEscena).toBe('soleado');
    expect(result.current.saludFinca).toEqual({ matasVivas: 34, matasTotal: 41, agua: 0.72 });
    expect(result.current.animales).toEqual([]);
    expect(result.current._fuente).toEqual({
      general: 'muestra',
      clima: 'muestra',
      saludFinca: 'muestra',
      animales: 'faltante',
      cosecha: 'faltante',
    });

    unmount();
  });

  it('marca faltante cuando la cosecha no existe aunque lo demás sea real', async () => {
    storeState.plants = [{ id: 'plant-1' }];
    locationValue = { lat: 4.55, lng: -74.1, elevation: 2120 };
    climaSnapshotValue = { condition: 'soleado', label: 'Soleado', tempMinC: 17, tempMaxC: 25 };
    skySnapshotValue = { cloud_cover: 12 };
    atmosphereValue = { luz: 'dia', condition: 'despejado', enso: 'neutro' };
    sceneValue = {
      vacia: false,
      cultivosActivos: 1,
      totalCultivos: 1,
      enCosecha: 0,
      vitalidad: 70,
      vitalidadLabel: 'Tu finca está viva y fuerte',
    };
    listFarmProcessesMock.mockResolvedValue([
      {
        process_id: 'proc-2',
        type: 'farm_process',
        attributes: {
          process_type: 'livestock_cycle',
          status: 'active',
          subject_kind: 'animal',
          animal_type: 'cerdo',
          breed: 'Criolla',
          quantity: 1,
          subject_slug: 'cerdo_criollo',
          subject_label: 'Hato porcino',
        },
      },
    ]);
    getAnimalAssetsMock.mockResolvedValue([
      {
        id: 'animal-2',
        type: 'asset--animal',
        attributes: {
          name: 'Gorda',
          animal_type: 'cerdo',
          breed: 'Criolla',
          status: 'active',
        },
      },
    ]);
    getHarvestLogsMock.mockResolvedValue([]);

    const { result, unmount } = renderHook(() => useFincaViva());

    await waitFor(() => {
      expect(result.current._fuente.animales).toBe('real');
    });

    expect(result.current._fuente.general).toBe('faltante');
    expect(result.current.clima).toEqual({ piso: 'templado', lluvia: false, temp: 25 });
    expect(result.current.saludFinca).toEqual({ matasVivas: 1, matasTotal: 1, agua: 0.72 });
    expect(result.current.animales).toEqual([
      expect.objectContaining({
        tipo: 'cerdo',
        raza: 'Criolla',
        estado: 'active',
        nombre: 'Gorda',
      }),
      expect.objectContaining({
        tipo: 'cerdo',
        raza: 'Criolla',
        estado: 'active',
        nombre: 'Hato porcino',
        cantidad: 1,
      }),
    ]);
    expect(result.current.cosechaReciente).toBeNull();
    expect(result.current.cosecha).toEqual({ reciente: null });

    unmount();
  });
});
