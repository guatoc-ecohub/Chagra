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
