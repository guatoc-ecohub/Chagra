/**
 * farmProcessCache — persistencia local de ciclos productivos.
 *
 * Solo local. No toca syncManager. Escritura atómica por transacción.
 * Sigue el patrón IDB callback de assetCache/logCache.
 */
import { openDB, STORES } from './dbCore';
import { validateFarmProcess, validateFarmProcessEvent } from '../types/farmProcess';

/**
 * Guarda (inserta o sobreescribe) un FarmProcess.
 * @param {import('../types/farmProcess').FarmProcess} process
 */
export const putFarmProcess = async (process) => {
  validateFarmProcess(process);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FARM_PROCESSES, 'readwrite');
    tx.objectStore(STORES.FARM_PROCESSES).put(process);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Obtiene un FarmProcess por process_id.
 * @param {string} processId
 * @returns {Promise<import('../types/farmProcess').FarmProcess|undefined>}
 */
export const getFarmProcess = async (processId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FARM_PROCESSES, 'readonly');
    const req = tx.objectStore(STORES.FARM_PROCESSES).get(processId);
    req.onsuccess = () => resolve(req.result || undefined);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Lista procesos activos.
 * @param {Object} [opts]
 * @param {string} [opts.status]
 * @param {string} [opts.process_type]
 * @returns {Promise<import('../types/farmProcess').FarmProcess[]>}
 */
export const listFarmProcesses = async (opts = {}) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FARM_PROCESSES, 'readonly');
    const req = tx.objectStore(STORES.FARM_PROCESSES).getAll();
    req.onsuccess = () => {
      let all = req.result || [];
      if (opts.status) all = all.filter((p) => p.attributes?.status === opts.status);
      if (opts.process_type) all = all.filter((p) => p.attributes?.process_type === opts.process_type);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
};

/**
 * Agrega un evento inmutable al log del proceso.
 * Actualiza updated_at del proceso padre en la misma transacción.
 * @param {import('../types/farmProcess').FarmProcessEvent} event
 */
export const addFarmEvent = async (event) => {
  validateFarmProcessEvent(event);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.FARM_PROCESS_EVENTS, STORES.FARM_PROCESSES], 'readwrite');
    tx.objectStore(STORES.FARM_PROCESS_EVENTS).add(event);

    const getReq = tx.objectStore(STORES.FARM_PROCESSES).get(event.attributes.process_id);
    getReq.onsuccess = () => {
      const proc = getReq.result;
      if (proc) {
        proc.attributes.updated_at = event.attributes.occurred_at;
        tx.objectStore(STORES.FARM_PROCESSES).put(proc);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Obtiene eventos de un proceso, ordenados por occurred_at descendente.
 * @param {string} processId
 * @returns {Promise<import('../types/farmProcess').FarmProcessEvent[]>}
 */
export const getFarmEvents = async (processId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FARM_PROCESS_EVENTS, 'readonly');
    const req = tx.objectStore(STORES.FARM_PROCESS_EVENTS).index('process_id').getAll(processId);
    req.onsuccess = () => {
      const events = req.result || [];
      events.sort((a, b) => (b.attributes?.occurred_at || 0) - (a.attributes?.occurred_at || 0));
      resolve(events);
    };
    req.onerror = () => reject(req.error);
  });
};
