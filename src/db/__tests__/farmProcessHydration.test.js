/**
 * farmProcessCache.test.js — Tests de hidratación de ciclos desde plantas de farmOS
 * TASK #ciclo-backfill-plantas-2026-06-19
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Store en memoria que captura los ciclos sintéticos persistidos (BUG A: antes
// no se persistían → recordFarmEvent no los encontraba). Compartido por el mock.
/**
 * @type {Map<any, any>}
 */
let persistedStore;

// Mock de dependencias
vi.mock('../assetCache.js', () => ({
  assetCache: {
    getByType: vi.fn(),
  },
}));

vi.mock('../catalogDB.js', () => ({
  getAllSpecies: vi.fn(),
}));

vi.mock('../utils/id.js', () => ({
  newUlid: () => 'ULID_TEST_' + Math.random().toString(36).substr(2, 9),
}));

// Mock IDB: putFarmProcess (interno) escribe acá vía openDB.
vi.mock('../dbCore', () => {
  const STORES = { FARM_PROCESSES: 'farm_processes', FARM_PROCESS_EVENTS: 'farm_process_events' };
  const makeTx = () => {
    const tx = { oncomplete: null, onerror: null };
    /** @type {any} */
    (tx).objectStore = () => ({
      /**
       * @param {any} record
       */
      put(record) { persistedStore.set(record.process_id, record); },
    });
    Promise.resolve().then(() => /** @type {any} */ (tx).oncomplete?.());
    return tx;
  };
  return { STORES, openDB: vi.fn(() => Promise.resolve({ transaction: () => makeTx() })) };
});

import { hydrateCyclesFromFarmOS } from '../farmProcessCache';
import { assetCache } from '../assetCache';
import { getAllSpecies } from '../catalogDB';

describe('hydrateCyclesFromFarmOS — backfill de plantas sin ciclo local', () => {
  beforeEach(() => {
    persistedStore = new Map();
    vi.clearAllMocks();
  });

  it('retorna procesos locales cuando no hay plantas', async () => {
    const localProcesses = [
      {
        process_id: 'p1',
        type: 'farm_process',
        attributes: {
          subject_label: 'Fresa',
          status: 'active',
          location_land_asset_id: 'land-1',
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue([]);

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toEqual(localProcesses);
    expect(assetCache.getByType).toHaveBeenCalledWith('plant');
  });

  it('crea ciclo sintético para planta activa sin ciclo local', async () => {
    const localProcesses = /** @type {any[]} */ ([]);

    const plants = [
      {
        id: 'plant-1',
        type: 'asset--plant',
        attributes: {
          name: 'Café',
          status: 'active',
        },
        relationships: {
          location: {
            data: {
              id: 'land-1',
              type: 'asset--land',
            },
          },
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([
      { id: 'caffea_arabica', nombre_comun: 'café', tracking_mode: 'individual' },
    ]);

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toHaveLength(1);
    expect(result[0].attributes.subject_label).toBe('Café');
    expect(result[0].attributes.subject_slug).toBe('caffea_arabica');
    expect(result[0].attributes.status).toBe('active');
    expect(/** @type {any} */ (result[0]).attributes._synthetic).toBe(true);
  });

  it('no duplica planta que ya tiene ciclo local (dedupe por nombre+lote)', async () => {
    const localProcesses = [
      {
        process_id: 'p1',
        type: 'farm_process',
        attributes: {
          subject_label: 'Café',
          status: 'active',
          location_land_asset_id: 'land-1',
        },
      },
    ];

    const plants = [
      {
        id: 'plant-1',
        type: 'asset--plant',
        attributes: {
          name: 'Café',
          status: 'active',
        },
        relationships: {
          location: {
            data: {
              id: 'land-1',
              type: 'asset--land',
            },
          },
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue(plants);

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toHaveLength(1);
    expect(result[0].process_id).toBe('p1');
  });

  it('excluye plantas archivadas', async () => {
    const localProcesses = /** @type {any[]} */ ([]);

    const plants = [
      {
        id: 'plant-1',
        type: 'asset--plant',
        attributes: {
          name: 'Café viejo',
          status: 'archived',
        },
        relationships: {
          location: {
            data: {
              id: 'land-1',
              type: 'asset--land',
            },
          },
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue(plants);

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));
    expect(result).toEqual(localProcesses);
    expect(assetCache.getByType).toHaveBeenCalledWith('plant');
  });

  it('crea ciclo sintético para planta activa sin ciclo local', async () => {
    const localProcesses = /** @type {any[]} */ ([]);

    const plants = [
      {
        id: 'plant-1',
        type: 'asset--plant',
        attributes: {
          name: 'Planta desconocida',
          status: 'active',
        },
        relationships: {
          location: {
            data: {
              id: 'land-1',
              type: 'asset--land',
            },
          },
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockRejectedValue(new Error('Catálogo caído'));

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toHaveLength(1);
    expect(result[0].attributes.subject_label).toBe('Planta desconocida');
    expect(result[0].attributes.subject_slug).toBe(''); // Sin slug por error de catálogo
  });

  it('usa quantity del asset si existe', async () => {
    const localProcesses = /** @type {any[]} */ ([]);

    const plants = [
      {
        id: 'plant-1',
        type: 'asset--plant',
        attributes: {
          name: 'Café',
          status: 'active',
          quantity: {
            value: 150,
          },
        },
        relationships: {
          location: {
            data: {
              id: 'land-1',
              type: 'asset--land',
            },
          },
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([
      { id: 'caffea_arabica', nombre_comun: 'café', tracking_mode: 'individual' },
    ]);

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toHaveLength(1);
    expect(result[0].attributes.quantity).toBe(150);
  });

  it('fallback a procesos locales si assetCache falla', async () => {
    const localProcesses = [
      {
        process_id: 'p1',
        type: 'farm_process',
        attributes: {
          subject_label: 'Fresa',
          status: 'active',
          location_land_asset_id: 'land-1',
        },
      },
    ];

    vi.mocked(assetCache.getByType).mockRejectedValue(new Error('Error de cache'));

    const result = await hydrateCyclesFromFarmOS(/** @type {any} */ (localProcesses));

    expect(result).toEqual(localProcesses); // Fallback a locales
  });

  // BUG A: el ciclo sintético DEBE persistirse en farm_processes, no solo
  // devolverse en memoria; si no, recordFarmEvent no lo encuentra.
  it('PERSISTE el ciclo sintético en el store (single source of truth)', async () => {
    const plants = [{
      id: 'plant-1', type: 'asset--plant',
      attributes: { name: 'Fresa', status: 'active' },
      relationships: { location: { data: { id: 'land-1' } } },
    }];
    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([{ id: 'fragaria_ananassa', nombre_comun: 'fresa', tracking_mode: 'individual' }]);

    const result = await hydrateCyclesFromFarmOS([]);

    const pid = result[0].process_id;
    expect(persistedStore.has(pid)).toBe(true);
    expect(persistedStore.get(pid).attributes.subject_label).toBe('Fresa');
  });

  it('NO persiste cuando persist:false (modo solo-lectura)', async () => {
    const plants = [{
      id: 'plant-1', type: 'asset--plant',
      attributes: { name: 'Fresa', status: 'active' },
      relationships: { location: { data: { id: 'land-1' } } },
    }];
    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([{ id: 'fragaria_ananassa', nombre_comun: 'fresa', tracking_mode: 'individual' }]);

    const result = await hydrateCyclesFromFarmOS([], { persist: false });

    expect(result).toHaveLength(1);
    expect(persistedStore.size).toBe(0);
  });

  // BUG B: la etapa se deriva de la fecha de siembra + fenología, no se congela
  // en sowing_confirmed.
  it('DERIVA la etapa desde la fecha de siembra (no congela en sowing_confirmed)', async () => {
    const sowingDate = Date.now() - 30 * 86400000; // hace 30 días
    const plants = [{
      id: 'plant-1', type: 'asset--plant',
      attributes: { name: 'Tomate', status: 'active', timestamp: sowingDate },
      relationships: { location: { data: { id: 'land-1' } } },
    }];
    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([{ id: 'solanum_lycopersicum', nombre_comun: 'tomate', tracking_mode: 'individual' }]);

    const result = await hydrateCyclesFromFarmOS([]);

    // A 30 días, el tomate ya no está en 'sowing_confirmed'.
    expect(result[0].attributes.current_stage).not.toBe('sowing_confirmed');
    expect(result[0].attributes.current_stage).toBe('flowering');
  });

  it('etapa recién sembrada (día 0) → sowing_confirmed', async () => {
    const plants = [{
      id: 'plant-1', type: 'asset--plant',
      attributes: { name: 'Tomate', status: 'active', timestamp: Date.now() },
      relationships: { location: { data: { id: 'land-1' } } },
    }];
    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([{ id: 'solanum_lycopersicum', nombre_comun: 'tomate', tracking_mode: 'individual' }]);

    const result = await hydrateCyclesFromFarmOS([]);

    expect(result[0].attributes.current_stage).toBe('sowing_confirmed');
  });

  it('especie sin plantilla → etapa cae a sowing_confirmed (no rompe)', async () => {
    const plants = [{
      id: 'plant-1', type: 'asset--plant',
      attributes: { name: 'Planta rara', status: 'active', timestamp: Date.now() - 100 * 86400000 },
      relationships: { location: { data: { id: 'land-1' } } },
    }];
    vi.mocked(assetCache.getByType).mockResolvedValue(plants);
    vi.mocked(getAllSpecies).mockResolvedValue([]); // sin match → sin slug → sin template

    const result = await hydrateCyclesFromFarmOS([]);

    expect(result).toHaveLength(1);
    expect(result[0].attributes.current_stage).toBe('sowing_confirmed');
  });
});
