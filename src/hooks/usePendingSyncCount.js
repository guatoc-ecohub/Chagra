/**
 * usePendingSyncCount.js — Hook para leer el contador de transacciones pendientes
 * del syncManager. Se actualiza cada 30s, al cambiar de red (online/offline) o
 * cuando el syncManager termina un ciclo de sincronización.
 *
 * Offline-first: lee de IndexedDB vía `syncManager.getSyncStats()` (el mismo
 * método que ya usa NetworkStatusBar). Si el syncManager no está disponible
 * todavía (o falla), cae a un fallback que lee la store directo de IndexedDB.
 *
 * NOTA (rescate #2668 → cableado): la versión original llamaba a
 * `syncManager.getPendingCount()`, un método que nunca existió en ninguna
 * rama — el contador quedaba siempre en el fallback manual de IDB. Corregido
 * para usar `getSyncStats()`, el método real ya probado en producción.
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * @returns {{ pending: number, refresh: () => void }}
 */
export function usePendingSyncCount() {
  const [pending, setPending] = useState(0);

  const refresh = useCallback(() => {
    // Leer del syncManager si está disponible, o de IndexedDB directo.
    try {
      import('../services/syncManager.js').then(({ syncManager }) => {
        if (syncManager?.getSyncStats) {
          syncManager.getSyncStats()
            .then((stats) => setPending(stats?.pendingCount ?? 0))
            .catch(() => _leerDeIDB().then(setPending).catch(() => setPending(0)));
        } else {
          _leerDeIDB().then(setPending).catch(() => setPending(0));
        }
      }).catch(() => setPending(0));
    } catch {
      setPending(0);
    }
  }, []);

  useEffect(() => {
    // Lectura inicial inmediata al montar (mismo patrón ya establecido en
    // NetworkStatusBar.jsx: sin esto el badge queda desfasado hasta el
    // primer polling a los 30s).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, 30_000);
    window.addEventListener('online', refresh);
    // Refrescar en cuanto el syncManager termina un ciclo (éxito o error),
    // en vez de esperar hasta 30s para que el badge baje/desaparezca.
    window.addEventListener('syncComplete', refresh);
    window.addEventListener('syncCompleted', refresh);
    window.addEventListener('syncError', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('syncComplete', refresh);
      window.removeEventListener('syncCompleted', refresh);
      window.removeEventListener('syncError', refresh);
    };
  }, [refresh]);

  return { pending, refresh };
}

/**
 * Lee el conteo de transacciones pendientes directo de IndexedDB.
 * Fallback si el syncManager todavía no está disponible o `getSyncStats()` falla.
 * @returns {Promise<number>}
 */
async function _leerDeIDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('ChagraDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pending_transactions')) {
          db.close();
          resolve(0);
          return;
        }
        const tx = db.transaction('pending_transactions', 'readonly');
        const countReq = tx.objectStore('pending_transactions').count();
        countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
        countReq.onerror = () => { db.close(); resolve(0); };
      };
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}
