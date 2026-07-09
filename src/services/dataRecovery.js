import { fetchFromFarmOS } from './apiService';
import useAssetStore from '../store/useAssetStore';
import { useLogStore } from '../store/useLogStore';

/**
 * Recupera los datos locales desde FarmOS usando los mismos caminos que usa la
 * app al entrar al dashboard.
 *
 * El orden replica el boot normal:
 *  1. Hidratar el store de assets desde IndexedDB.
 *  2. Re-pull completo de assets desde FarmOS.
 *  3. Re-pull reciente de logs desde FarmOS.
 *
 * Si la red o la sesión no están listas, los stores ya degradan en silencio.
 *
 * @param {object} [deps]
 * @param {() => Promise<void>} [deps.hydrateAssets]
 * @param {(fetchFn: Function) => Promise<void>} [deps.syncAssets]
 * @param {(fetchFn: Function) => Promise<void>} [deps.pullLogs]
 * @param {Function} [deps.fetchFn]
 */
export async function recoverDataFromFarmOS(deps = {}) {
  const {
    hydrateAssets = useAssetStore.getState().hydrate,
    syncAssets = useAssetStore.getState().syncFromServer,
    pullLogs = useLogStore.getState().pullRecentLogs,
    fetchFn = fetchFromFarmOS,
  } = deps;

  if (typeof hydrateAssets === 'function') {
    await hydrateAssets();
  }

  if (typeof syncAssets === 'function') {
    await syncAssets(fetchFn);
  }

  if (typeof pullLogs === 'function') {
    await pullLogs(fetchFn);
  }
}
