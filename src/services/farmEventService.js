/**
 * farmEventService — única puerta de escritura para eventos de ciclo.
 *
 * recordFarmEvent es la función autorizada para mutar el agregado.
 * Toda escritura pasa por aquí. No exponer al LLM sin pruebas E2E.
 */
import { openDB, STORES } from '../db/dbCore';
import { newUlid } from '../utils/id';
import { validateFarmProcess, validateFarmProcessEvent } from '../types/farmProcess';

/**
 * Construye un FarmProcess mínimo y válido para el upsert de recordFarmEvent.
 *
 * Si llega `hint` (el ciclo seleccionado en la UI) se reutilizan sus atributos
 * para no perder slug/etiqueta/lote/etapa. Si no, se arma un placeholder
 * genérico válido. Garantiza que la observación del campesino se persista aunque
 * el proceso falte en el store (desincronización post-clear-cache).
 *
 * @param {string} processId
 * @param {import('../types/farmProcess').FarmProcess} [hint]
 * @param {number} [occurredAt] - timestamp del evento que disparo el upsert
 * @returns {import('../types/farmProcess').FarmProcess}
 */
export const buildUpsertPlaceholder = (processId, hint, occurredAt) => {
  /** @type {Partial<import('../types/farmProcess').FarmProcessAttributes>} */
  const ha = (hint && hint.attributes) || {};
  const createdAt = Number.isInteger(ha.created_at) && ha.created_at > 0 ? ha.created_at : (occurredAt || Date.now());
  return {
    process_id: processId,
    type: 'farm_process',
    attributes: {
      process_type: ha.process_type || 'sowing',
      subject_kind: ha.subject_kind || 'individual',
      ...(ha.subject_slug ? { subject_slug: ha.subject_slug } : {}),
      subject_label: ha.subject_label || 'Cultivo sin nombre',
      quantity: Number.isInteger(ha.quantity) && ha.quantity >= 1 ? ha.quantity : 1,
      unit: ha.unit || 'plantas',
      ...(ha.location_land_asset_id ? { location_land_asset_id: ha.location_land_asset_id } : {}),
      status: ha.status || 'active',
      current_stage: ha.current_stage || 'sowing_confirmed',
      created_at: createdAt,
      updated_at: occurredAt || Date.now(),
      /** @ts-ignore */
      _synthetic: true,
    },
  };
};

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
 * @param {import('../types/farmProcess').FarmProcess} [input.process_hint] - proceso
 *   (ej. el ciclo seleccionado en la UI) para auto-crearlo si todavía no está en
 *   el store. Nunca perdemos una observación del campesino por desincronización.
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

  // Placeholder de upsert: si el proceso no está en el store (típico tras un
  // CLEAR CACHE, cuando la lista lo muestra desde un ciclo hidratado que no se
  // alcanzó a persistir) NO fallamos. Auto-creamos el proceso para que la
  // observación del campesino NUNCA se pierda. Si llega `process_hint` lo usamos
  // (datos ricos del ciclo de la UI); si no, un mínimo válido.
  const placeholderProcess = buildUpsertPlaceholder(processId, input.process_hint, occurredAt);
  // Validar fuera de la transacción IDB (validate puede lanzar y abortaría el tx).
  validateFarmProcess(placeholderProcess);

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

      // Verificar que el proceso existe; si no, auto-crearlo (upsert).
      const procReq = procStore.get(processId);
      procReq.onsuccess = () => {
        evStore.add(event);
        if (procReq.result) {
          procReq.result.attributes.updated_at = occurredAt;
          procStore.put(procReq.result);
        } else {
          // Upsert: el proceso faltaba en el store → lo persistimos ahora para
          // que la lista, la fenología y las próximas observaciones funcionen.
          console.warn(`[recordFarmEvent] proceso ${processId} ausente; auto-creado (upsert) para no perder la observacion`);
          procStore.put(placeholderProcess);
        }
      };
      procReq.onerror = () => reject(procReq.error);
    };
    dedupReq.onerror = () => reject(dedupReq.error);

    tx.oncomplete = () => {
      resolve(/** @type {any} */ (event));
      // Fire-and-forget: encolar para sync a FarmOS (NO bloquea el registro local).
      // Si falla, el evento ya está seguro en IDB. Cap #9 — antes dormido.
      import('./farmProcessSync').then(({ enqueueFarmProcessEvent }) =>
        enqueueFarmProcessEvent(event, null).catch(() => {}),
      );
    };
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

    const eventType = (() => {
      const ptype = process.attributes?.process_type || 'sowing';
      if (ptype === 'harvest') return 'harvest_confirmed';
      if (ptype === 'post_harvest') return 'post_harvest_confirmed';
      if (ptype === 'pest_management') return 'pest_management_confirmed';
      return 'sowing_confirmed';
    })();

    const event = {
      event_id: newUlid(),
      type: 'farm_process_event',
      attributes: {
        process_id: process.process_id,
        event_type: eventType,
        occurred_at: process.attributes.created_at,
        actor: 'operator',
        source: 'operator',
        idempotency_key: `create:${process.process_id}`,
      },
    };

    evStore.add(event);

    tx.oncomplete = () => {
      // Avisa a quien escuche (cropAlertEngine) que cambió un ciclo, para
      // re-evaluar alertas de plaga/etapa. Guard SSR/test.
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('farmProcessChanged', { detail: { process_id: process.process_id } }));
        }
      } catch { /* noop */ }
      resolve({ process, event: /** @type {any} */ (event) });
      // Fire-and-forget: encolar para sync a FarmOS (NO bloquea).
      import('./farmProcessSync').then(({ enqueueFarmProcessEvent }) =>
        enqueueFarmProcessEvent(/** @type {any} */ (event), process).catch(() => {}),
      );
    };
    tx.onerror = () => reject(tx.error);
  });
};
