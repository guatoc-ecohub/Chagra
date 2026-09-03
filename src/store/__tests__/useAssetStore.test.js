import { describe, it, expect, beforeEach, vi } from 'vitest';
import useAssetStore from '../useAssetStore';

function resetStore() {
  useAssetStore.setState({
    plants: [], structures: [], equipment: [], materials: [], lands: [],
    taxonomyTerms: [], lastSync: null, isLoading: false, isHydrated: false,
    error: null, syncProgress: null, selectedAssetId: null,
  });
}

describe('useAssetStore', function () {
  beforeEach(resetStore);

  it('initial state defaults', function () {
    var s = useAssetStore.getState();
    expect(s.plants).toEqual([]);
    expect(s.isHydrated).toBe(false);
    expect(s.selectedAssetId).toBeNull();
  });

  it('setSelectedAsset and clearSelectedAsset', function () {
    useAssetStore.getState().setSelectedAsset('p-1');
    expect(useAssetStore.getState().selectedAssetId).toBe('p-1');
    useAssetStore.getState().clearSelectedAsset();
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });

  it('getAllAssets empty and flat', function () {
    expect(useAssetStore.getState().getAllAssets()).toEqual([]);
    useAssetStore.setState({ plants: [{ id: 'p1' }], materials: [{ id: 'm1' }] });
    expect(useAssetStore.getState().getAllAssets()).toHaveLength(2);
  });

  it('tenantChanged limpia el estado en memoria y rehidrata', async function () {
    const hydrate = vi.fn().mockResolvedValue(undefined);
    useAssetStore.setState({
      plants: [{ id: 'stale-plant' }],
      structures: [{ id: 'stale-structure' }],
      equipment: [{ id: 'stale-equipment' }],
      materials: [{ id: 'stale-material' }],
      lands: [{ id: 'stale-land' }],
      taxonomyTerms: [{ id: 'stale-tax' }],
      lastSync: 123,
      selectedAssetId: 'selected-stale',
      syncProgress: { current: 1, total: 1 },
      error: 'stale-error',
      hydrate,
    });

    window.dispatchEvent(
      new CustomEvent('tenantChanged', { detail: { previous: 'alice', current: 'bob' } }),
    );

    const s = useAssetStore.getState();
    expect(s.plants).toEqual([]);
    expect(s.structures).toEqual([]);
    expect(s.equipment).toEqual([]);
    expect(s.materials).toEqual([]);
    expect(s.lands).toEqual([]);
    expect(s.taxonomyTerms).toEqual([]);
    expect(s.lastSync).toBeNull();
    expect(s.selectedAssetId).toBeNull();
    expect(s.syncProgress).toBeNull();
    expect(s.error).toBeNull();
    expect(hydrate).toHaveBeenCalledTimes(1);
  });

  it('addAssetsBulk rejects empty', async function () {
    await expect(useAssetStore.getState().addAssetsBulk('plant', []))
      .rejects.toThrow('no vac');
  });

  it('addAssetsBulk rejects null', async function () {
    await expect(useAssetStore.getState().addAssetsBulk('plant', null))
      .rejects.toThrow('array');
  });
});

describe('useAssetStore — syncFromServer error mapping (bug demo 2026-06-19)', function () {
  beforeEach(resetStore);

  it('"Token no disponible." NO se muestra como banner (error=null, estado de auth transitorio)', async function () {
    // Simula el race post-login: un sync corre cuando getAccessToken() aún da
    // null (apiService lanza "Token no disponible."). El operador NO debe ver un
    // banner rojo crudo con texto de token. error queda null; el interceptor
    // 401/403 de apiService es quien maneja la sesión.
    const fetchFn = async () => { throw new Error('Token no disponible.'); };
    await useAssetStore.getState().syncFromServer(fetchFn);
    const s = useAssetStore.getState();
    expect(s.error).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('otros errores se mapean a copy amable (nunca el mensaje técnico crudo)', async function () {
    const fetchFn = async () => { throw new Error('NetworkError when attempting to fetch resource'); };
    await useAssetStore.getState().syncFromServer(fetchFn);
    const s = useAssetStore.getState();
    expect(s.error).toBeTruthy();
    // No es el texto crudo: friendlyMessage lo traduce a un mensaje en español.
    expect(s.error).not.toContain('NetworkError');
    expect(s.error.toLowerCase()).toContain('internet');
  });

  it('un 401 crudo se mapea a "sesión" (no expone el código HTTP al operador)', async function () {
    const fetchFn = async () => { const e = /** @type {Error & {status?: number}} */ (new Error('FarmOS API Error: 401')); e.status = 401; throw e; };
    await useAssetStore.getState().syncFromServer(fetchFn);
    const s = useAssetStore.getState();
    expect(s.error).toBeTruthy();
    expect(s.error.toLowerCase()).toContain('sesión');
  });
});

describe('useAssetStore — syncFromServer pagination (056.3)', function () {
  // Helper que limpia IndexedDB entre tests para evitar contaminación
  // cross-test de la base de datos real.
  beforeEach(async function () {
    useAssetStore.setState({
      plants: [], structures: [], equipment: [], materials: [], lands: [],
      taxonomyTerms: [], lastSync: null, isLoading: false, isHydrated: false,
      error: null, syncProgress: null, selectedAssetId: null,
    });
    try {
      await new Promise((res, rej) => {
        const req = indexedDB.deleteDatabase('ChagraDB');
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
        req.onblocked = () => {
          // Si hay conexiones abiertas, forzar cierre e intentar de nuevo
          console.warn('[Test] deleteDatabase bloqueado, reintentando...');
          setTimeout(() => { indexedDB.deleteDatabase('ChagraDB'); res(); }, 100);
        };
      });
    } catch (e) {
      // fake-indexeddb puede no tener deleteDatabase plenamente funcional
      console.warn('[Test] No se pudo limpiar IndexedDB:', e);
    }
  });

  it('fetches assets in pages, writes to IDB per page, runs GC una vez al final', async function () {
    const PAGE_SIZE = 2;
    // 3 páginas: 2 + 2 + 1 = 5 assets total
    const pages = [
      {
        data: [
          { id: 'pag-asset-01', type: 'asset--plant', attributes: { name: 'Planta P1' } },
          { id: 'pag-asset-02', type: 'asset--plant', attributes: { name: 'Planta P2' } },
        ],
        meta: { count: 5 },
      },
      {
        data: [
          { id: 'pag-asset-03', type: 'asset--plant', attributes: { name: 'Planta P3' } },
          { id: 'pag-asset-04', type: 'asset--plant', attributes: { name: 'Planta P4' } },
        ],
        meta: { count: 5 },
      },
      {
        data: [
          { id: 'pag-asset-05', type: 'asset--plant', attributes: { name: 'Planta P5' } },
        ],
        meta: { count: 5 },
      },
    ];
    let callCount = 0;

    const fetchFn = async (url) => {
      callCount++;
      // Verificar que la URL tiene paginación correcta
      const offset = (callCount - 1) * PAGE_SIZE;
      expect(url).toContain(`page[limit]=${PAGE_SIZE}`);
      expect(url).toContain(`page[offset]=${offset}`);
      expect(url).toContain('sort=-created,id');
      return pages[callCount - 1];
    };

    const progressUpdates = [];
    await useAssetStore.getState().syncFromServer(fetchFn, 'plant', {
      pageLimit: PAGE_SIZE,
      onProgress: (p) => { progressUpdates.push({ ...p }); },
    });

    const s = useAssetStore.getState();

    // 3 llamadas al fetch (3 páginas)
    expect(callCount).toBe(3);

    // Los 5 assets están en el store
    expect(s.plants).toHaveLength(5);
    expect(s.plants.map((p) => p.id)).toEqual([
      'pag-asset-01', 'pag-asset-02', 'pag-asset-03',
      'pag-asset-04', 'pag-asset-05',
    ]);

    // Progreso se actualizó en cada página
    expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    const lastProgress = progressUpdates[progressUpdates.length - 1];
    expect(lastProgress.current).toBe(5);
    expect(lastProgress.total).toBe(5);
    expect(lastProgress.isComplete).toBe(true);

    // Estado final
    expect(s.isLoading).toBe(false);
    expect(s.syncProgress.isComplete).toBe(true);
    expect(s.lastSync).toBeGreaterThan(0);
  });

  it('idempotente: re-correr sync no duplica assets', async function () {
    const PAGE_SIZE = 3;
    const items = [
      { id: 'idem-asset-01', type: 'asset--plant', attributes: { name: 'Idem 1' } },
      { id: 'idem-asset-02', type: 'asset--plant', attributes: { name: 'Idem 2' } },
    ];
    const calls = { n: 0 };

    const fetchFn = async () => {
      calls.n++;
      // misma respuesta siempre (simula servidor estable)
      return { data: items, meta: { count: 2 } };
    };

    // Primer sync
    await useAssetStore.getState().syncFromServer(fetchFn, 'plant', { pageLimit: PAGE_SIZE });
    expect(useAssetStore.getState().plants).toHaveLength(2);

    // Segundo sync idempotente
    await useAssetStore.getState().syncFromServer(fetchFn, 'plant', { pageLimit: PAGE_SIZE });
    const s = useAssetStore.getState();
    expect(s.plants).toHaveLength(2);
    expect(s.plants.map((p) => p.id)).toEqual(['idem-asset-01', 'idem-asset-02']);
  });

  it('cancellation via AbortSignal detiene el paginado a medio camino', async function () {
    const PAGE_SIZE = 2;
    const controller = new AbortController();
    const calls = { n: 0 };

    const fetchFn = async (_url, _opts) => {
      calls.n++;
      if (calls.n === 2) {
        controller.abort();
      }
      return {
        data: [
          { id: `cancel-asset-${calls.n}-1`, type: 'asset--plant', attributes: { name: `Cancel ${calls.n}.1` } },
          { id: `cancel-asset-${calls.n}-2`, type: 'asset--plant', attributes: { name: `Cancel ${calls.n}.2` } },
        ],
        meta: { count: 6 },
      };
    };

    await useAssetStore.getState().syncFromServer(fetchFn, 'plant', {
      pageLimit: PAGE_SIZE,
      signal: controller.signal,
    });

    const s = useAssetStore.getState();
    // Solo 2 páginas se procesaron, la 3ra no
    expect(calls.n).toBe(2);
    // Los assets de la página 1 y 2 están, pero no la 3
    expect(s.plants).toHaveLength(4);
    expect(s.syncProgress.isCancelled).toBe(true);
    // isLoading es false (sync terminó aunque cancelado)
    expect(s.isLoading).toBe(false);
  });

  it('procesa solo el assetType solicitado (targeted pull)', async function () {
    const fetchFn = async () => ({
      data: [
        { id: 'tp-str-01', type: 'asset--structure', attributes: { name: 'Invernadero' } },
      ],
      meta: { count: 1 },
    });

    await useAssetStore.getState().syncFromServer(fetchFn, 'structure', { pageLimit: 10 });

    const s = useAssetStore.getState();
    expect(s.structures).toHaveLength(1);
    // Otros tipos no se tocaron
    expect(s.plants).toHaveLength(0);
    expect(s.equipment).toHaveLength(0);
    expect(s.materials).toHaveLength(0);
  });
});
