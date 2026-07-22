/**
 * usePendingSyncCount.js — Hook para leer el contador de transacciones pendientes
 * del syncManager. Se actualiza cada 30s o cuando hay cambio de red (online/offline).
 *
 * Offline-first: lee de IndexedDB via syncManager.getPendingCount().
 * Si la función no existe todavía, usa un fallback que lee la store directamente.
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
      import('../../services/syncManager.js').then(({ syncManager }) => {
        if (syncManager?.getPendingCount) {
          syncManager.getPendingCount().then(setPending).catch(() => setPending(0));
        } else {
          _leerDeIDB().then(setPending).catch(() => setPending(0));
        }
      }).catch(() => setPending(0));
    } catch {
      setPending(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  return { pending, refresh };
}

/**
 * Lee el conteo de transacciones pendientes directo de IndexedDB.
 * Fallback si syncManager.getPendingCount no existe.
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
