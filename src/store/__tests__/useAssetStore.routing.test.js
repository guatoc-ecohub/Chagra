import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock deps externas — IDB y servicios. Necesarios para que importar el
// store no rompa en JSDOM. El foco del test es ÚNICAMENTE el routing por
// assetType en las funciones mutadoras del store.
vi.mock('../../db/assetCache', () => ({
  assetCache: {
    commitOptimisticUpdate: vi.fn().mockResolvedValue(undefined),
    getByType: vi.fn().mockResolvedValue([]),
    getLastSync: vi.fn().mockResolvedValue(null),
    getAllTaxonomyTerms: vi.fn().mockResolvedValue([]),
  },
  openDB: vi.fn(),
  STORES: { ASSETS: 'assets', PENDING_TX: 'pending_tx' },
}));
vi.mock('../../db/logCache', () => ({ logCache: {} }));
vi.mock('../useLogStore', () => ({ useLogStore: { getState: () => ({}) } }));
vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn(),
  updatePayload: vi.fn(),
}));
vi.mock('../../services/authService', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/emptyDbDetector', () => ({ markHadData: vi.fn() }));

const STORE_PATH = '../useAssetStore';

/**
 * Regression test for BUG 2026-05-28 (operador): "al agregar una nueva
 * zona en zonas la información se guarda en insumos". Causa raíz: el
 * mapping ternary en las 4 funciones mutadoras no contemplaba 'land' y
 * caía silenciosamente al fallback 'materials'. Cubre cada tipo válido
 * (plant/land/structure/equipment/material) + el caso de tipo desconocido.
 */
describe('useAssetStore — assetType → storeKey routing (regression #327)', () => {
  let useAssetStore;
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import(STORE_PATH);
    useAssetStore = mod.default;
    useAssetStore.setState({
      plants: [],
      lands: [],
      structures: [],
      equipment: [],
      materials: [],
    });
  });

  const cases = [
    ['plant', 'plants'],
    ['land', 'lands'],
    ['structure', 'structures'],
    ['equipment', 'equipment'],
    ['material', 'materials'],
  ];

  for (const [assetType, expectedKey] of cases) {
    it(`addAsset(${assetType}) llena el array ${expectedKey} (y solo ése)`, async () => {
      const asset = { id: `id-${assetType}`, type: `asset--${assetType}`, attributes: { name: `T-${assetType}` } };
      await useAssetStore.getState().addAsset(assetType, asset);
      const state = useAssetStore.getState();
      expect(state[expectedKey]).toHaveLength(1);
      expect(state[expectedKey][0].id).toBe(`id-${assetType}`);
      // El resto de arrays NO debe haber sido tocado.
      for (const [, otherKey] of cases) {
        if (otherKey !== expectedKey) {
          expect(state[otherKey]).toHaveLength(0);
        }
      }
    });
  }

  it('addAsset con tipo desconocido NO muta el store y avisa por consola', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const asset = { id: 'id-bogus', type: 'asset--bogus', attributes: { name: 'X' } };
    await useAssetStore.getState().addAsset('bogus_type_inexistente', asset);
    const state = useAssetStore.getState();
    expect(state.plants).toHaveLength(0);
    expect(state.lands).toHaveLength(0);
    expect(state.materials).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('addAssetsBulk(land, [a,b,c]) llena lands con los 3', async () => {
    const assets = [
      { id: 'l1', type: 'asset--land', attributes: { name: 'L1' } },
      { id: 'l2', type: 'asset--land', attributes: { name: 'L2' } },
      { id: 'l3', type: 'asset--land', attributes: { name: 'L3' } },
    ];
    await useAssetStore.getState().addAssetsBulk('land', assets);
    expect(useAssetStore.getState().lands).toHaveLength(3);
    expect(useAssetStore.getState().materials).toHaveLength(0);
  });
});
