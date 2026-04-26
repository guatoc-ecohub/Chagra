import { create } from 'zustand';
import { logCache } from '../db/logCache';

/**
 * Store global de logs FarmOS (Fase 11).
 *
 * Maneja el estado volátil de líneas de tiempo por activo, permitiendo
 * reactividad fluida en la UI de detalle sin re-renderizar el árbol de activos.
 */
export const useLogStore = create((set, get) => ({
  logsByAsset: {}, // { assetId: [logs] }
  isSyncing: false,
  lastPullAt: null,

  /**
   * Carga logs desde IndexedDB al estado, scoped por asset.
   */
  loadLogsForAsset: async (assetId) => {
    try {
      const logs = await logCache.getLogsByAsset(assetId);
      set((state) => ({
        logsByAsset: { ...state.logsByAsset, [assetId]: logs },
      }));
      return logs;
    } catch (err) {
      console.error('[LogStore] Error cargando logs para asset:', assetId, err);
      return [];
    }
  },

  /**
   * Pull preventivo desde FarmOS: descarga los logs recientes de todos los tipos
   * relevantes para alimentar la línea de tiempo offline.
   *
   * @param {Function} fetchFn - función de red (fetchFromFarmOS)
   * @param {number}   days    - ventana temporal en días (default 30)
   */
  pullRecentLogs: async (fetchFn, days = 30) => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    const startTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    const types = ['log--seeding', 'log--planting', 'log--harvest', 'log--input', 'log--task', 'log--observation'];

    try {
      await Promise.all(types.map(async (type) => {
        const suffix = type.split('--')[1];
        const endpoint =
          `/api/log/${suffix}?` +
          'include=quantity&' +
          'filter[recent][condition][path]=timestamp&' +
          'filter[recent][condition][operator]=%3E&' +
          `filter[recent][condition][value]=${startTime}`;
        try {
          const res = await fetchFn(endpoint);
          await logCache.bulkPut(type, res.data || [], res.included || []);
        } catch (err) {
          console.warn(`[LogStore] Fallo en pull de ${type}:`, err.message || err);
        }
      }));

      // Rehidratar los assets actualmente visibles en el estado (si los hay)
      const currentKeys = Object.keys(get().logsByAsset);
      for (const assetId of currentKeys) {
        const logs = await logCache.getLogsByAsset(assetId);
        set((state) => ({
          logsByAsset: { ...state.logsByAsset, [assetId]: logs },
        }));
      }

      set({ lastPullAt: Date.now() });
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Obtiene todas las tareas pendientes del store unificado.
   */
  getPendingTasks: async () => {
    try {
      const allLogs = await logCache.getByType('log--task');
      // Filtramos por status 'pending'. Nota: el sync manager normaliza remote.status
      return allLogs.filter(l => l.status === 'pending');
    } catch (err) {
      console.error('[LogStore] Error en getPendingTasks:', err);
      return [];
    }
  }
}));

// Listener global: libera el flag _pending de logs confirmados por el servidor
// y rehidrata el estado scoped por asset (Hotfix 11.5 — análogo a Fase 10.3).
if (typeof window !== 'undefined') {
  window.addEventListener('syncCompleted', async (event) => {
    const { type, id } = event.detail || {};
    if (!type || !type.startsWith('log--')) return;

    try {
      const localLog = await logCache.getLog(id);
      if (localLog && localLog._pending) {
        await logCache.put({ ...localLog, _pending: false });
        if (localLog.asset_id) {
          await useLogStore.getState().loadLogsForAsset(localLog.asset_id);
        }
        console.log(`[Log-Sync] Log ${id} liberado y actualizado en UI.`);
      }
    } catch (err) {
      console.error('[LogStore-Listener] Error en liberación de flag:', err);
    }
  });
}

export default useLogStore;
