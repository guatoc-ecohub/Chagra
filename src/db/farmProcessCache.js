/**
 * farmProcessCache — persistencia local de ciclos productivos.
 *
 * Solo local. No toca syncManager. Escritura atómica por transacción.
 * Sigue el patrón IDB callback de assetCache/logCache.
 */
import { openDB, STORES } from './dbCore';
import { validateFarmProcess, validateFarmProcessEvent } from '../types/farmProcess';
import { assetCache } from './assetCache';
import { getAllSpecies } from './catalogDB';
import { newUlid } from '../utils/id';

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

/**
 * Hidrata ciclos de cultivo desde plantas activas de farmOS.
 *
 * POLÍTICA: El ciclo debe activarse para TODAS las plantas vivas del usuario
 * en farmOS (su inventario), no solo las creadas in-app. Excluir archivadas.
 * Dedupe por nombre+lote (subject_label + location_land_asset_id).
 *
 * @param {import('../types/farmProcess').FarmProcess[]} localProcesses - Procesos ya existentes en IndexedDB
 * @returns {Promise<import('../types/farmProcess').FarmProcess[]>} Lista mergeada con ciclos sintéticos
 */
export const hydrateCyclesFromFarmOS = async (localProcesses) => {
  try {
    // Obtener plantas activas del cache local (no archivadas)
    const allPlants = await assetCache.getByType('plant');
    const activePlants = allPlants.filter(p => p.attributes?.status !== 'archived');

    // Crear mapa de dedupe: subject_label + location_land_asset_id -> process
    const processMap = new Map();
    for (const proc of localProcesses) {
      const key = `${proc.attributes?.subject_label || ''}|${proc.attributes?.location_land_asset_id || ''}`;
      processMap.set(key, proc);
    }

    // Catálogo para mapear nombres a slugs
    let catalog = [];
    try {
      catalog = await getAllSpecies();
    } catch {
      // Catálogo caído — seguimos sin slug
    }

    // Convertir plantas sin ciclo local en FarmProcesses sintéticos
    for (const plant of activePlants) {
      try {
        const plantName = plant.attributes?.name || '';
        const locationId = plant.relationships?.location?.data?.id || '';

        const key = `${plantName}|${locationId}`;

        // Si ya existe un proceso local, no lo duplicamos
        if (processMap.has(key)) {
          continue;
        }

        // Valores por defecto
        let speciesSlug = '';
        let subjectKind = 'individual'; // Default por si no hay match en catálogo

        // Buscar slug en catálogo
        const match = catalog.find(s => (s.nombre_comun || '').toLowerCase() === plantName.toLowerCase());
        if (match) {
          speciesSlug = match.id;
          subjectKind = match.tracking_mode || 'individual';
        }

        // Extraer cantidad si existe
        let quantity = 1;
        let unit = 'plantas';
        if (subjectKind === 'aggregate') {
          unit = 'semillas';
        }
        const qtyValue = plant.attributes?.quantity?.value;
        if (typeof qtyValue === 'number') {
          quantity = qtyValue;
        }

        // Timestamp de creación: usar _createdAt o timestamp del asset
        const createdAt = plant._createdAt || plant.attributes?.timestamp || Date.now();

        // Crear FarmProcess sintético (solo lectura)
        const syntheticProcess = {
          process_id: newUlid(),
          type: 'farm_process',
          attributes: {
            process_type: 'sowing',
            subject_kind: subjectKind,
            subject_slug: speciesSlug,
            subject_label: plantName,
            quantity,
            unit,
            location_land_asset_id: locationId,
            status: 'active',
            current_stage: 'sowing_confirmed',
            created_at: createdAt,
            updated_at: createdAt,
            // Flag para marcar como sintético (no sincronizar con farmOS)
            _synthetic: true,
          },
        };

        processMap.set(key, syntheticProcess);
      } catch (loopErr) {
        // Si falla una planta, continuamos con las demás
        // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- log técnico
        console.warn('[hydrateCyclesFromFarmOS] Error procesando planta:', loopErr.message);
      }
    }

    // Retornar array de procesos mergeados
    return Array.from(processMap.values());
  } catch (err) {
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- log técnico
    console.warn('[hydrateCyclesFromFarmOS] Error al hidratar ciclos desde plantas:', err.message);
    // Fallback: retornar procesos locales sin hidratación
    return localProcesses;
  }
};
