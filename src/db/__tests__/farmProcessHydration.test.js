/**
 * farmProcessCache.test.js — Tests de hidratación de ciclos desde plantas de farmOS
 * TASK #ciclo-backfill-plantas-2026-06-19
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { hydrateCyclesFromFarmOS } from '../farmProcessCache';
import { assetCache } from '../assetCache';
import { getAllSpecies } from '../catalogDB';

describe('hydrateCyclesFromFarmOS — backfill de plantas sin ciclo local', () => {
  beforeEach(() => {
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

    assetCache.getByType.mockResolvedValue([]);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toEqual(localProcesses);
    expect(assetCache.getByType).toHaveBeenCalledWith('plant');
  });

  it('crea ciclo sintético para planta activa sin ciclo local', async () => {
    const localProcesses = [];

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

    assetCache.getByType.mockResolvedValue(plants);
    getAllSpecies.mockResolvedValue([
      { id: 'caffea_arabica', nombre_comun: 'café', tracking_mode: 'individual' },
    ]);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toHaveLength(1);
    expect(result[0].attributes.subject_label).toBe('Café');
    expect(result[0].attributes.subject_slug).toBe('caffea_arabica');
    expect(result[0].attributes.status).toBe('active');
    expect(result[0].attributes._synthetic).toBe(true);
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

    assetCache.getByType.mockResolvedValue(plants);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toHaveLength(1);
    expect(result[0].process_id).toBe('p1'); // Solo el proceso local, no duplicado
  });

  it('excluye plantas archivadas', async () => {
    const localProcesses = [];

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

    assetCache.getByType.mockResolvedValue(plants);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toHaveLength(0); // No se crea ciclo para plantas archivadas
  });

  it('hidrata múltiples plantas con distintas ubicaciones', async () => {
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
              id: 'land-2',
              type: 'asset--land',
            },
          },
        },
      },
      {
        id: 'plant-2',
        type: 'asset--plant',
        attributes: {
          name: 'Fresa',
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

    assetCache.getByType.mockResolvedValue(plants);
    getAllSpecies.mockResolvedValue([
      { id: 'caffea_arabica', nombre_comun: 'café', tracking_mode: 'individual' },
      { id: 'fragaria_x_ananassa', nombre_comun: 'fresa', tracking_mode: 'individual' },
    ]);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toHaveLength(3); // 1 local + 2 nuevos sintéticos
  });

  it('tolera errores de catálogo y continua sin slug', async () => {
    const localProcesses = [];

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

    assetCache.getByType.mockResolvedValue(plants);
    getAllSpecies.mockRejectedValue(new Error('Catálogo caído'));

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toHaveLength(1);
    expect(result[0].attributes.subject_label).toBe('Planta desconocida');
    expect(result[0].attributes.subject_slug).toBe(''); // Sin slug por error de catálogo
  });

  it('usa quantity del asset si existe', async () => {
    const localProcesses = [];

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

    assetCache.getByType.mockResolvedValue(plants);
    getAllSpecies.mockResolvedValue([
      { id: 'caffea_arabica', nombre_comun: 'café', tracking_mode: 'individual' },
    ]);

    const result = await hydrateCyclesFromFarmOS(localProcesses);

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

    assetCache.getByType.mockRejectedValue(new Error('Error de cache'));

    const result = await hydrateCyclesFromFarmOS(localProcesses);

    expect(result).toEqual(localProcesses); // Fallback a locales
  });
});
