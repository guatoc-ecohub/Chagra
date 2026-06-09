/**
 * farmEventService — única puerta de escritura para eventos de ciclo.
 *
 * recordFarmEvent es la función autorizada para mutar el agregado.
 * Toda escritura pasa por acá. No exponer al LLM sin pruebas E2E.
 */
import { openDB, STORES } from '../db/dbCore';
import { newUlid } from '../utils/id';
import { validateFarmProcess, validateFarmProcessEvent } from '../types/farmProcess';

/**
 * Registra un evento atómico en un ciclo productivo.
 *
 * - Genera event_id ULID
 * - Deduplica por idempotency_key (si ya existe, retorna el existente)
 * - Actualiza updated_at del proceso en la misma transacción
 *
 * @param {Object} input
 * @param {string} input.process_id
 * @param {string} input.event_type
 * @param {number} [input.occurred_at]
 * @param {string} [input.actor]
 * @param {string} [input.source]
 * @param {Object} [input.payload]
 * @param {string} [input.idempotency_key]
 * @param {number} [input.confidence]
 * @param {string} [input.evidence]
 * @returns {Promise<import('../types/farmProcess').FarmProcessEvent>}
 */
export const recordFarmEvent = async (input) => {
  const processId = input.process_id;
  if (!processId) throw new Error('recordFarmEvent: process_id required');

  const occurredAt = input.occurred_at || Date.now();
  const idempotencyKey = input.idempotency_key || `${processId}:${input.event_type}:${occurredAt}`;

  const event = {
    event_id: newUlid(),
    type: 'farm_process_event',
    attributes: {
      process_id: processId,
      event_type: input.event_type,
      occurred_at: occurredAt,
      actor: input.actor || 'operator',
      source: input.source || 'operator',
      idempotency_key: idempotencyKey,
      ...(input.payload !== undefined && { payload: input.payload }),
      ...(input.confidence !== undefined && { confidence: input.confidence }),
      ...(input.evidence !== undefined && { evidence: input.evidence }),
    },
  };

  validateFarmProcessEvent(event);

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.FARM_PROCESS_EVENTS, STORES.FARM_PROCESSES], 'readwrite');
    const evStore = tx.objectStore(STORES.FARM_PROCESS_EVENTS);
    const procStore = tx.objectStore(STORES.FARM_PROCESSES);

    // Dedup: buscar por idempotency_key
    const dedupReq = evStore.index('idempotency_key').get(idempotencyKey);
    dedupReq.onsuccess = () => {
      if (dedupReq.result) {
        resolve(dedupReq.result);
        return;
      }

      // Verificar que el proceso existe
      const procReq = procStore.get(processId);
      procReq.onsuccess = () => {
        if (!procReq.result) {
          reject(new Error(`recordFarmEvent: process ${processId} not found`));
          return;
        }

        evStore.add(event);
        procReq.result.attributes.updated_at = occurredAt;
        procStore.put(procReq.result);
      };
      procReq.onerror = () => reject(procReq.error);
    };
    dedupReq.onerror = () => reject(dedupReq.error);

    tx.oncomplete = () => resolve(event);
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Crea un FarmProcess y su evento sowing_confirmed en una transacción atómica.
 * @param {import('../types/farmProcess').FarmProcess} process
 * @returns {Promise<{process: import('../types/farmProcess').FarmProcess, event: import('../types/farmProcess').FarmProcessEvent}>}
 */
export const createFarmProcess = async (process) => {
  validateFarmProcess(process);

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.FARM_PROCESSES, STORES.FARM_PROCESS_EVENTS], 'readwrite');
    const procStore = tx.objectStore(STORES.FARM_PROCESSES);
    const evStore = tx.objectStore(STORES.FARM_PROCESS_EVENTS);

    procStore.put(process);

    const event = {
      event_id: newUlid(),
      type: 'farm_process_event',
      attributes: {
        process_id: process.process_id,
        event_type: 'sowing_confirmed',
        occurred_at: process.attributes.created_at,
        actor: 'operator',
        source: 'operator',
        idempotency_key: `create:${process.process_id}`,
      },
    };

    evStore.add(event);

    tx.oncomplete = () => resolve({ process, event });
    tx.onerror = () => reject(tx.error);
  });
};
