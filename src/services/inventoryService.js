/**
 * inventoryService — append-only event store + projectStock reconstruible.
 *
 * Implementa ADR-027 (event sourcing híbrido):
 *   - appendEvent(event)          → persiste log inmutable + actualiza stock snapshot
 *   - getStock(itemId)            → lee del snapshot O(1)
 *   - getEventsForItem(itemId)    → bitácora completa
 *   - rebuildSnapshot()           → recomputa el stock desde scratch (post-sync)
 *   - projectStock(events)        → función pura — corazón de la reconciliación
 *
 * Reglas inviolables (ADR-019 + ADR-027):
 *   1. inventory_events es append-only — NUNCA delete ni update.
 *   2. inventory_stock_snapshot es CACHE — siempre reconstruible desde events.
 *   3. Reconciliación determinista: timestamp ASC + device_id_lex_hash + sequence_number.
 */

import { openDB, STORES } from '../db/dbCore.js';
import { validateLogEntry, EVENT_TYPES } from './inventoryEvents.js';

// ─── Append (write path) ─────────────────────────────────────────────

/**
 * Persiste un evento ya validado. Idempotente — si el id ya existe, NO sobrescribe
 * (ADR-019 inmutable).
 */
export async function appendEvent(event) {
  validateLogEntry(event); // defensive: re-validate antes de persistir

  const db = await openDB();
  const tx = db.transaction([STORES.INVENTORY_EVENTS, STORES.INVENTORY_STOCK], 'readwrite');
  const eventStore = tx.objectStore(STORES.INVENTORY_EVENTS);

  // Check duplicado por id (ULID es global unique, pero defense-in-depth)
  const existing = await new Promise((resolve, reject) => {
    const r = eventStore.get(event.id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  if (existing) {
    return { duplicated: true, event: existing };
  }

  await new Promise((resolve, reject) => {
    const r = eventStore.add(event);
    r.onsuccess = resolve;
    r.onerror = () => reject(r.error);
  });

  // Update stock snapshot incrementalmente (proyección incremental)
  await applyToSnapshot(tx, event);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ duplicated: false, event });
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Read paths (snapshot O(1)) ──────────────────────────────────────

export async function getStock(itemId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.INVENTORY_STOCK, 'readonly');
    const r = tx.objectStore(STORES.INVENTORY_STOCK).get(itemId);
    r.onsuccess = () => resolve(r.result || { item_id: itemId, quantity: 0, unit: null, last_updated: null });
    r.onerror = () => reject(r.error);
  });
}

export async function getAllStock() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.INVENTORY_STOCK, 'readonly');
    const r = tx.objectStore(STORES.INVENTORY_STOCK).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

export async function getEventsForItem(itemId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.INVENTORY_EVENTS, 'readonly');
    const idx = tx.objectStore(STORES.INVENTORY_EVENTS).index('item_id');
    const r = idx.getAll(itemId);
    r.onsuccess = () => {
      const sorted = (r.result || []).sort(compareEventOrder);
      resolve(sorted);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function getAllEvents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.INVENTORY_EVENTS, 'readonly');
    const r = tx.objectStore(STORES.INVENTORY_EVENTS).getAll();
    r.onsuccess = () => {
      const sorted = (r.result || []).sort(compareEventOrder);
      resolve(sorted);
    };
    r.onerror = () => reject(r.error);
  });
}

// ─── Pure projection (corazón de la reconciliación) ──────────────────

/**
 * Compara eventos para orden canónico determinista.
 * Orden: timestamp ASC, luego device_id_lex_hash ASC, luego sequence_number ASC.
 */
export function compareEventOrder(a, b) {
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;
  if (a.device_id_lex_hash < b.device_id_lex_hash) return -1;
  if (a.device_id_lex_hash > b.device_id_lex_hash) return 1;
  return a.sequence_number - b.sequence_number;
}

/**
 * Función PURA — corazón de ADR-027 Alt E.
 * Toma una lista de eventos (de cualquier orden, cualquier item), retorna
 * el snapshot de stock derivado.
 *
 * Garantía: dos máquinas con los mismos eventos producen el MISMO snapshot.
 *
 * @param {Array} events - lista de log entries (cualquier orden)
 * @returns {Map<itemId, {quantity, unit, last_updated, last_event_id}>}
 */
export function projectStock(events) {
  const sorted = [...events].sort(compareEventOrder);
  const stock = new Map();

  // Track de qué events ya fueron absorbidos por un counted posterior
  // (LWW honesto: counted reanchora, ignorando contribuciones anteriores
  // del mismo item)
  const lastCountedIndexByItem = new Map();
  sorted.forEach((ev, idx) => {
    if (ev.event_type === EVENT_TYPES.COUNTED) {
      const itemId = ev.payload.item_id;
      lastCountedIndexByItem.set(itemId, idx);
    }
  });

  // Idempotency dedupe: si dos events tienen misma idempotency_key,
  // gana el de mayor timestamp (LWW). Los anteriores quedan visibles
  // en bitácora pero NO contribuyen al stock.
  const winnerByIdempotency = new Map();
  sorted.forEach((ev) => {
    const key = ev.idempotency_key;
    if (!key) return;
    const cur = winnerByIdempotency.get(key);
    if (!cur || ev.timestamp > cur.timestamp) {
      winnerByIdempotency.set(key, ev);
    }
  });

  sorted.forEach((ev, idx) => {
    // Skip si NO es el ganador idempotency LWW
    if (ev.idempotency_key) {
      const winner = winnerByIdempotency.get(ev.idempotency_key);
      if (winner && winner.id !== ev.id) return;
    }

    switch (ev.event_type) {
      case EVENT_TYPES.RECEIVED:
      case EVENT_TYPES.PRODUCED: {
        const itemId = ev.payload.item_id;
        // Si hay un counted posterior, este received NO cuenta
        const lastCounted = lastCountedIndexByItem.get(itemId);
        if (lastCounted != null && idx < lastCounted) break;
        const cur = stock.get(itemId) || { quantity: 0, unit: ev.payload.unit };
        cur.quantity += ev.payload.delta;
        cur.unit = ev.payload.unit;
        cur.last_updated = ev.timestamp;
        cur.last_event_id = ev.id;
        cur.item_id = itemId;
        stock.set(itemId, cur);
        break;
      }

      case EVENT_TYPES.CONSUMED:
      case EVENT_TYPES.LOST:
      case EVENT_TYPES.ADJUSTED: {
        const itemId = ev.payload.item_id;
        const lastCounted = lastCountedIndexByItem.get(itemId);
        if (lastCounted != null && idx < lastCounted) break;
        const cur = stock.get(itemId) || { quantity: 0, unit: null };
        cur.quantity += ev.payload.delta; // delta es negativo
        cur.last_updated = ev.timestamp;
        cur.last_event_id = ev.id;
        cur.item_id = itemId;
        if (cur.unit == null && ev.payload.unit) cur.unit = ev.payload.unit;
        stock.set(itemId, cur);
        break;
      }

      case EVENT_TYPES.COUNTED: {
        const itemId = ev.payload.item_id;
        // Reanchor — descarta contribuciones anteriores
        stock.set(itemId, {
          item_id: itemId,
          quantity: ev.payload.counted_qty,
          unit: ev.payload.unit,
          last_updated: ev.timestamp,
          last_event_id: ev.id,
        });
        break;
      }

      case EVENT_TYPES.TRANSFORMED: {
        const lastCountedFor = (id) => lastCountedIndexByItem.get(id);
        // Inputs: restar
        ev.payload.inputs.forEach((inp) => {
          if (lastCountedFor(inp.item_id) != null && idx < lastCountedFor(inp.item_id)) return;
          const cur = stock.get(inp.item_id) || { quantity: 0, unit: inp.unit };
          cur.quantity -= inp.delta_consumido;
          cur.unit = inp.unit;
          cur.last_updated = ev.timestamp;
          cur.last_event_id = ev.id;
          cur.item_id = inp.item_id;
          stock.set(inp.item_id, cur);
        });
        // Outputs: sumar
        ev.payload.outputs.forEach((out) => {
          if (lastCountedFor(out.item_id) != null && idx < lastCountedFor(out.item_id)) return;
          const cur = stock.get(out.item_id) || { quantity: 0, unit: out.unit };
          cur.quantity += out.delta_producido;
          cur.unit = out.unit;
          cur.last_updated = ev.timestamp;
          cur.last_event_id = ev.id;
          cur.item_id = out.item_id;
          stock.set(out.item_id, cur);
        });
        break;
      }

      case EVENT_TYPES.TRANSFERRED:
        // Movimiento entre ubicaciones — NO afecta stock total del item.
        // Ubicación per-se requeriría store separado de location_stock.
        // Para v1 lo dejamos como no-op en el snapshot total.
        break;

      default:
        // Tipo desconocido: log warning, no lanzar (defense-in-depth en upgrades)
        if (typeof console !== 'undefined') {
          console.warn(`[inventoryService] unknown event_type: ${ev.event_type}`);
        }
    }
  });

  return stock;
}

// ─── Snapshot maintenance ────────────────────────────────────────────

/**
 * Recomputa el snapshot completo desde scratch.
 * Llamar después de un sync grande, o si se sospecha drift.
 */
export async function rebuildSnapshot() {
  const events = await getAllEvents();
  const stock = projectStock(events);

  const db = await openDB();
  const tx = db.transaction(STORES.INVENTORY_STOCK, 'readwrite');
  const store = tx.objectStore(STORES.INVENTORY_STOCK);

  // Limpiar snapshot anterior
  await new Promise((resolve, reject) => {
    const r = store.clear();
    r.onsuccess = resolve;
    r.onerror = () => reject(r.error);
  });

  // Escribir el nuevo
  for (const value of stock.values()) {
    await new Promise((resolve, reject) => {
      const r = store.put(value);
      r.onsuccess = resolve;
      r.onerror = () => reject(r.error);
    });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ rebuilt_count: stock.size });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Aplicación incremental — usado por appendEvent().
 * NOTA: para single-event appends es 1000× más rápido que full rebuild.
 * Si el orden de timestamps post-sync es problemático, debe llamarse
 * rebuildSnapshot() para reconciliación correcta.
 */
async function applyToSnapshot(tx, event) {
  const store = tx.objectStore(STORES.INVENTORY_STOCK);

  const update = async (itemId, mutation) => {
    return new Promise((resolve, reject) => {
      const get = store.get(itemId);
      get.onsuccess = () => {
        const cur = get.result || { item_id: itemId, quantity: 0, unit: null };
        const next = mutation(cur);
        next.last_updated = event.timestamp;
        next.last_event_id = event.id;
        next.item_id = itemId;
        const put = store.put(next);
        put.onsuccess = resolve;
        put.onerror = () => reject(put.error);
      };
      get.onerror = () => reject(get.error);
    });
  };

  switch (event.event_type) {
    case EVENT_TYPES.RECEIVED:
    case EVENT_TYPES.PRODUCED:
      await update(event.payload.item_id, (cur) => ({
        ...cur, quantity: cur.quantity + event.payload.delta, unit: event.payload.unit,
      }));
      break;
    case EVENT_TYPES.CONSUMED:
    case EVENT_TYPES.LOST:
    case EVENT_TYPES.ADJUSTED:
      await update(event.payload.item_id, (cur) => ({
        ...cur, quantity: cur.quantity + event.payload.delta,
        unit: cur.unit || event.payload.unit || null,
      }));
      break;
    case EVENT_TYPES.COUNTED:
      await update(event.payload.item_id, () => ({
        quantity: event.payload.counted_qty, unit: event.payload.unit,
      }));
      break;
    case EVENT_TYPES.TRANSFORMED:
      for (const inp of event.payload.inputs) {
        await update(inp.item_id, (cur) => ({
          ...cur, quantity: cur.quantity - inp.delta_consumido, unit: inp.unit,
        }));
      }
      for (const out of event.payload.outputs) {
        await update(out.item_id, (cur) => ({
          ...cur, quantity: cur.quantity + out.delta_producido, unit: out.unit,
        }));
      }
      break;
    // TRANSFERRED no afecta total
    default:
      break;
  }
}
