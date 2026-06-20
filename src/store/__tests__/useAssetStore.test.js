import { describe, it, expect, beforeEach } from 'vitest';
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
    const fetchFn = async () => { const e = new Error('FarmOS API Error: 401'); e.status = 401; throw e; };
    await useAssetStore.getState().syncFromServer(fetchFn);
    const s = useAssetStore.getState();
    expect(s.error).toBeTruthy();
    expect(s.error.toLowerCase()).toContain('sesión');
  });
});
