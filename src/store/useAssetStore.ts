import { create } from 'zustand';
import { assetCache, openDB, STORES } from '../db/assetCache';
import { logCache } from '../db/logCache';
import { useLogStore } from './useLogStore';
import type { ChagraAsset, AssetType, TaxonomyTerm } from '../types';

/**
 * Store global de Activos (Zustand)
 * Patrón Offline-First: memoria (Zustand) ← IndexedDB ← FarmOS API
 *
 * Tipos de activos FarmOS v2:
 *   - structure: Invernaderos, Composteras, Infraestructura bioclimática
 *   - equipment: Azadones, Carretillas, Herramientas manuales
 *   - material:  Biol, Lombricompost, Insumos orgánicos
 */

interface HarvestData {
  cropName: string;
  yield: string | number;
  unit: string;
  notes?: string;
}

interface InputData {
  name?: string;
  value: string | number;
  unit: string;
  label?: string;
  notes?: string;
}

type AssetUpdateEntry = { assetType: AssetType; asset: ChagraAsset };

interface AssetState {
  plants: ChagraAsset[];
  structures: ChagraAsset[];
  equipment: ChagraAsset[];
  materials: ChagraAsset[];
  lands: ChagraAsset[];
  taxonomyTerms: TaxonomyTerm[];
  lastSync: number | null;
  isLoading: boolean;
  error: string | null;
  selectedAssetId: string | null;
  setSelectedAsset: (id: string) => void;
  clearSelectedAsset: () => void;
  hydrate: () => Promise<void>;
  syncFromServer: (
    fetchFn: (endpoint: string) => Promise<{ data?: unknown[] }>,
    assetType?: AssetType | null
  ) => Promise<void>;
  syncTaxonomyTerms: (
    fetchFn: (endpoint: string) => Promise<{ data?: unknown[] }>
  ) => Promise<void>;
  addAsset: (
    assetType: AssetType,
    asset: ChagraAsset,
    pendingTxs?: unknown[]
  ) => Promise<void>;
  updateAsset: (
    assetType: AssetType,
    asset: ChagraAsset,
    pendingTxs?: unknown[]
  ) => Promise<void>;
  removeAsset: (assetType: AssetType, assetId: string) => Promise<void>;
  addHarvestLog: (assetId: string, harvestData: HarvestData) => Promise<void>;
  addInputLog: (assetId: string, inputData: InputData) => Promise<void>;
  refillMaterial: (
    materialId: string,
    amount: number | string,
    selectedUnit?: string | null
  ) => Promise<void>;
  getAllAssets: () => ChagraAsset[];
}

type AssetKey = 'plants' | 'structures' | 'equipment' | 'materials' | 'lands';

const assetTypeToKey = (assetType: AssetType): AssetKey =>
  assetType === 'plant'
    ? 'plants'
    : assetType === 'structure'
      ? 'structures'
      : assetType === 'equipment'
        ? 'equipment'
        : assetType === 'land'
          ? 'lands'
          : 'materials';

const useAssetStore = create<AssetState>()((set, get) => ({
  // Estado
  plants: [],
  structures: [],
  equipment: [],
  materials: [],
  lands: [],
  taxonomyTerms: [],
  lastSync: null,
  isLoading: false,
  error: null,

  // Estado de navegación: activo seleccionado para vista de detalle (Fase 12.1)
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  clearSelectedAsset: () => set({ selectedAssetId: null }),

  // Cargar desde IndexedDB al iniciar (rehidratación offline)
  hydrate: async () => {
    try {
      const [plants, structures, equipment, materials, lands, taxonomyTerms] = await Promise.all([
        assetCache.getByType('plant'),
        assetCache.getByType('structure'),
        assetCache.getByType('equipment'),
        assetCache.getByType('material'),
        assetCache.getByType('land'),
        assetCache.getAllTaxonomyTerms(),
      ]);
      const lastSync = await assetCache.getLastSync();
      set({ plants, structures, equipment, materials, lands, taxonomyTerms, lastSync });
    } catch (err) {
      console.error('Error rehidratando asset store desde IndexedDB:', err);
    }
  },

  // Sincronizar desde FarmOS API → IndexedDB → Zustand.
  syncFromServer: async (fetchFn, assetType = null) => {
    set({ isLoading: true, error: null });
    const targets: AssetType[] = assetType
      ? [assetType]
      : ['plant', 'structure', 'equipment', 'material', 'land'];
    const typeToKey: Record<AssetType, AssetKey> = {
      plant: 'plants',
      structure: 'structures',
      equipment: 'equipment',
      material: 'materials',
      land: 'lands',
    };
    try {
      const settled = await Promise.allSettled(
        targets.map(async (t) => {
          const res = await fetchFn(`/api/asset/${t}`);
          const list = (res.data as ChagraAsset[]) || [];
          await assetCache.bulkPut(t, list);
          return { key: typeToKey[t], data: await assetCache.getByType(t) };
        })
      );
      const partialUpdate: Partial<Record<AssetKey, ChagraAsset[]>> = {};
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          partialUpdate[result.value.key] = result.value.data;
        } else {
          const err = result.reason as { status?: number; message?: string };
          if (err?.status === 404) {
            console.info('[AssetStore] Tipo de activo no disponible en FarmOS (404), omitiendo.');
          } else {
            console.warn('[AssetStore] Error sincronizando tipo de activo:', err?.message || err);
          }
        }
      }
      await assetCache.setLastSync(Date.now());
      set({
        ...partialUpdate,
        lastSync: Date.now(),
        isLoading: false,
      });
    } catch (err) {
      console.error('Error sincronizando activos:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  // Sincronizar taxonomy terms desde FarmOS API
  syncTaxonomyTerms: async (fetchFn) => {
    try {
      const [plantResult, materialResult] = await Promise.allSettled([
        fetchFn('/api/taxonomy_term/plant_type'),
        fetchFn('/api/taxonomy_term/material_type'),
      ]);

      type RawTerm = { id: string; type: string; attributes?: { name?: string; description?: string } };
      const normalize = (raw: RawTerm): TaxonomyTerm => ({
        id: raw.id,
        type: raw.type,
        name: raw.attributes?.name ?? (raw as unknown as TaxonomyTerm).name ?? '',
        description: raw.attributes?.description ?? null,
      });

      const terms: TaxonomyTerm[] = [
        ...(plantResult.status === 'fulfilled' ? ((plantResult.value.data as RawTerm[]) || []).map(normalize) : []),
        ...(materialResult.status === 'fulfilled' ? ((materialResult.value.data as RawTerm[]) || []).map(normalize) : []),
      ];

      await assetCache.bulkPutTaxonomyTerms(terms);
      set({ taxonomyTerms: terms });
    } catch (err) {
      console.error('Error sincronizando taxonomy terms:', err);
    }
  },

  // Crear asset con commit atómico: IDB (assets + pending_transactions) en una sola tx
  addAsset: async (assetType, asset, pendingTxs = []) => {
    try {
      await assetCache.commitOptimisticUpdate(
        [{ assetType, asset }],
        pendingTxs as Parameters<typeof assetCache.commitOptimisticUpdate>[1]
      );
      set((state) => {
        const key = assetTypeToKey(assetType);
        return { [key]: [...state[key], asset] } as Partial<AssetState>;
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en addAsset atómico:', error);
      throw error;
    }
  },

  // Actualizar asset con commit atómico
  updateAsset: async (assetType, asset, pendingTxs = []) => {
    try {
      await assetCache.commitOptimisticUpdate(
        [{ assetType, asset }],
        pendingTxs as Parameters<typeof assetCache.commitOptimisticUpdate>[1]
      );
      set((state) => {
        const key = assetTypeToKey(assetType);
        return {
          [key]: state[key].map((a) => (a.id === asset.id ? asset : a)),
        } as Partial<AssetState>;
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en updateAsset atómico:', error);
      throw error;
    }
  },

  // Eliminar asset con borrado físico + encolado del DELETE en una sola tx IDB
  removeAsset: async (assetType, assetId) => {
    try {
      const pendingTx = {
        id: crypto.randomUUID(),
        remoteId: assetId,
        type: `delete_${assetType}`,
        endpoint: `/api/asset/${assetType}/${assetId}`,
        method: 'DELETE',
        payload: null,
      };

      const db = await openDB();
      const tx = db.transaction([STORES.ASSETS, STORES.PENDING_TX], 'readwrite');
      tx.objectStore(STORES.ASSETS).delete(assetId);
      tx.objectStore(STORES.PENDING_TX).put({
        ...pendingTx,
        synced: false,
        retries: 0,
        timestamp: Date.now(),
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });

      set((state) => {
        const key = assetTypeToKey(assetType);
        return { [key]: state[key].filter((a) => a.id !== assetId) } as Partial<AssetState>;
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en removeAsset atómico:', error);
      throw error;
    }
  },

  // Registrar una cosecha (log--harvest) con actualización optimista atómica
  addHarvestLog: async (assetId, harvestData) => {
    const logId = crypto.randomUUID();
    const payload = {
      data: {
        type: 'log--harvest',
        id: logId,
        attributes: {
          name: `Cosecha: ${harvestData.cropName} - ${new Date().toISOString().split('T')[0]}`,
          timestamp: Math.floor(Date.now() / 1000),
          status: 'done',
          notes: harvestData.notes || '',
        },
        relationships: {
          asset: { data: [{ type: 'asset--plant', id: assetId }] },
          quantity: {
            data: [
              {
                type: 'quantity--standard',
                attributes: {
                  measure: 'weight',
                  value: parseFloat(String(harvestData.yield)) || 0,
                  label: harvestData.unit,
                },
              },
            ],
          },
        },
      },
    };

    const currentPlant = get().plants.find((p) => p.id === assetId);
    if (!currentPlant) throw new Error('Planta no encontrada en el store local');

    const updatedPlant: ChagraAsset = {
      ...currentPlant,
      // cast: campos extendidos no parte del tipo base
      ...({
        latestHarvest: harvestData.yield,
        status: 'harvested',
      } as unknown as Partial<ChagraAsset>),
    };
    const harvestQuantity = {
      value: parseFloat(String(harvestData.yield)) || 0,
      unit: harvestData.unit,
      label: 'weight',
      measure: 'weight',
    };
    const pendingTx = {
      id: logId,
      type: 'log--harvest',
      endpoint: '/api/log/harvest',
      payload,
      method: 'POST',
    };

    const optimisticLog = {
      id: logId,
      type: 'log--harvest',
      asset_id: assetId,
      timestamp: Math.floor(Date.now() / 1000),
      name: payload.data.attributes.name,
      quantity: harvestQuantity,
      status: 'pending',
      attributes: { ...payload.data.attributes, quantity: harvestQuantity },
      relationships: payload.data.relationships,
      _pending: true,
    };

    try {
      await logCache.put(optimisticLog);
      useLogStore.getState().loadLogsForAsset(assetId);
    } catch (logErr) {
      console.warn('[Store] Fallo al persistir log optimista (no bloqueante):', logErr);
    }

    try {
      await assetCache.commitOptimisticUpdate(
        [{ assetType: 'plant', asset: updatedPlant }],
        [pendingTx]
      );

      set((state) => ({
        plants: state.plants.map((plant) => (plant.id === assetId ? updatedPlant : plant)),
      }));

      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Transaction] Fallo al aplicar mutación atómica:', error);
      throw error;
    }
  },

  // Registrar una aplicación de insumo (log--input) — Fase 11.7 / refactor 13.1.
  addInputLog: async (assetId, inputData) => {
    const logId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const materialName = inputData.name?.replace(/^Aplicación de /, '') || '';
    const { materials } = get();
    const materialAsset = materials.find(
      (m) => ((m as unknown as { attributes?: { name?: string } }).attributes?.name || m.name) === materialName
    );

    const assetUpdates: AssetUpdateEntry[] = [];
    const extraPendingTxs: Array<Record<string, unknown>> = [];
    if (materialAsset) {
      let deduction = parseFloat(String(inputData.value)) || 0;
      const matAttrs = (materialAsset as unknown as {
        attributes?: { inventory_unit?: string; inventory_value?: number | string };
        unit?: string;
      });
      const invUnit =
        matAttrs.attributes?.inventory_unit || matAttrs.unit || inputData.unit;

      if (inputData.unit === 'ml' && invUnit === 'l') deduction /= 1000;
      if (inputData.unit === 'g' && invUnit === 'kg') deduction /= 1000;
      if (inputData.unit === 'l' && invUnit === 'ml') deduction *= 1000;
      if (inputData.unit === 'kg' && invUnit === 'g') deduction *= 1000;

      const currentStock = parseFloat(String(matAttrs.attributes?.inventory_value ?? 0)) || 0;
      const newStock = Math.max(0, currentStock - deduction);

      const updatedMaterial: ChagraAsset = {
        ...materialAsset,
        ...({
          attributes: {
            ...(matAttrs.attributes || {}),
            inventory_value: newStock,
            inventory_unit: invUnit,
          },
          _pending: true,
        } as unknown as Partial<ChagraAsset>),
      };

      assetUpdates.push({ assetType: 'material', asset: updatedMaterial });

      extraPendingTxs.push({
        id: crypto.randomUUID(),
        type: 'asset_material',
        remoteId: materialAsset.id,
        endpoint: `/api/asset/material/${materialAsset.id}`,
        method: 'PATCH',
        payload: {
          data: {
            type: 'asset--material',
            id: materialAsset.id,
            attributes: { inventory_value: newStock },
          },
        },
      });
    }

    const payload = {
      data: {
        type: 'log--input',
        id: logId,
        attributes: {
          name: inputData.name || 'Aplicación de insumo',
          timestamp,
          status: 'done',
          notes: inputData.notes ? { value: inputData.notes, format: 'default' } : null,
        },
        relationships: {
          asset: { data: [{ type: 'asset--plant', id: assetId }] },
        },
      },
    };

    const inputQuantity = {
      value: parseFloat(String(inputData.value)) || 0,
      unit: inputData.unit || 'ml',
      label: inputData.label || 'Cantidad',
      measure: null,
    };
    const optimisticLog = {
      id: logId,
      type: 'log--input',
      asset_id: assetId,
      timestamp,
      name: payload.data.attributes.name,
      quantity: inputQuantity,
      status: 'done',
      attributes: { ...payload.data.attributes, quantity: inputQuantity },
      relationships: payload.data.relationships,
      _pending: true,
    };

    try {
      await logCache.put(optimisticLog);
      useLogStore.getState().loadLogsForAsset(assetId);
    } catch (logErr) {
      console.warn('[Store] Fallo al persistir log de insumo optimista (no bloqueante):', logErr);
    }

    const pendingTx = {
      id: logId,
      type: 'log--input',
      endpoint: '/api/log/input',
      payload,
      method: 'POST',
      _quantityMeta: {
        label: inputData.label || 'Cantidad',
        value: parseFloat(String(inputData.value)) || 0,
        unit: inputData.unit || 'ml',
        measure: 'volume',
      },
    };

    try {
      await assetCache.commitOptimisticUpdate(
        assetUpdates,
        [pendingTx, ...extraPendingTxs]
      );

      if (assetUpdates.length > 0) {
        const first = assetUpdates[0]!;
        set((state) => ({
          materials: state.materials.map((m) => (m.id === first.asset.id ? first.asset : m)),
        }));
      }

      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Transaction] Fallo al aplicar log de insumo:', error);
      throw error;
    }
  },

  // Abastecimiento de material (Fase 13.4 / refactor 13.6)
  refillMaterial: async (materialId, amount, selectedUnit = null) => {
    const material = get().materials.find((m) => m.id === materialId);
    if (!material) throw new Error('Material no encontrado en bodega');

    const matAttrs = material as unknown as {
      attributes?: { inventory_unit?: string; inventory_value?: number | string };
      unit?: string;
    };

    const invUnit =
      matAttrs.attributes?.inventory_unit || matAttrs.unit || selectedUnit;
    let converted = parseFloat(String(amount)) || 0;
    if (selectedUnit && invUnit && selectedUnit !== invUnit) {
      if (selectedUnit === 'l' && invUnit === 'ml') converted *= 1000;
      else if (selectedUnit === 'kg' && invUnit === 'g') converted *= 1000;
      else if (selectedUnit === 'ml' && invUnit === 'l') converted /= 1000;
      else if (selectedUnit === 'g' && invUnit === 'kg') converted /= 1000;
    }

    const currentStock = parseFloat(String(matAttrs.attributes?.inventory_value ?? 0)) || 0;
    const newStock = currentStock + converted;

    const updatedMaterial: ChagraAsset = {
      ...material,
      ...({
        attributes: { ...(matAttrs.attributes || {}), inventory_value: newStock },
        _pending: true,
      } as unknown as Partial<ChagraAsset>),
    };

    const pendingTx = {
      id: crypto.randomUUID(),
      type: 'asset_material',
      remoteId: material.id,
      endpoint: `/api/asset/material/${material.id}`,
      method: 'PATCH',
      payload: {
        data: {
          type: 'asset--material',
          id: material.id,
          attributes: { inventory_value: newStock },
        },
      },
    };

    try {
      await assetCache.commitOptimisticUpdate(
        [{ assetType: 'material', asset: updatedMaterial }],
        [pendingTx]
      );

      set((state) => ({
        materials: state.materials.map((m) => (m.id === materialId ? updatedMaterial : m)),
      }));

      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Store] Fallo en refillMaterial:', error);
      throw error;
    }
  },

  // Obtener todos los assets como lista plana
  getAllAssets: () => {
    const { plants, structures, equipment, materials } = get();
    return [...plants, ...structures, ...equipment, ...materials];
  },
}));

// Listener global: al recibir confirmación de sincronización exitosa,
// liberar el flag _pending del asset y disparar un pull dirigido que lo
// sobrescriba con el objeto oficial del servidor (Hotfix 10.3 — Opción C).
if (typeof window !== 'undefined') {
  window.addEventListener('syncCompleted', async (event: Event) => {
    const detail = (event as CustomEvent<{ type?: string; id?: string }>).detail || {};
    const { type, id } = detail;
    if (!type || !id || (!type.startsWith('asset_') && !type.startsWith('delete_'))) return;

    try {
      const assetTypeStr = type.split('_')[1] as AssetType | undefined;
      if (!assetTypeStr) return;

      // 1. Liberación del flag _pending del asset local confirmado
      const localAsset = await assetCache.getAsset(id);
      if (localAsset) {
        const localWithMeta = localAsset as ChagraAsset & { asset_type?: AssetType };
        await assetCache.put(
          (localWithMeta.asset_type || assetTypeStr) as AssetType,
          { ...localAsset, ...({ _pending: false } as unknown as Partial<ChagraAsset>) }
        );
        console.log(`[Sync] Activo ${id} liberado para actualización oficial.`);
      }

      // 2. Pull dirigido al tipo afectado (no refresca los 4 tipos)
      const { fetchFromFarmOS } = await import('../services/apiService');
      await useAssetStore
        .getState()
        .syncFromServer(
          fetchFromFarmOS as (endpoint: string) => Promise<{ data?: unknown[] }>,
          assetTypeStr
        );
    } catch (err) {
      console.error('[Sync-Listener] Error en post-procesamiento:', err);
    }
  });
}

export default useAssetStore;
