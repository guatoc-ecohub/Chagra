/**
 * useAgentOutboxStore — capa reactiva sobre `agentOutboxService` (IndexedDB).
 *
 * El store NO es la fuente de verdad: IndexedDB lo es (durabilidad ante cierre
 * de app). Este store es solo un espejo en memoria del estado de la outbox para
 * que la UI (badge del compositor, indicador "enviando…") reaccione sin pollear.
 *
 * Flujo típico:
 *   - AgentHero.send()  → store.send({ kind, text, blob, … }) → service.enqueue
 *                         → refresh() → navega
 *   - AgentScreen mount → store.refresh() para pintar burbujas "ya enviadas"
 *
 * Toda mutación delega al service (durable) y luego refresca el snapshot. Si la
 * persistencia falla en `send`, el error se propaga para que el caller NO
 * navegue dejando al usuario con la sensación de "se perdió mi mensaje".
 */

import { create } from 'zustand';
import {
  enqueue as svcEnqueue,
  getAll as svcGetAll,
  getInFlight as svcGetInFlight,
} from '../services/agentOutboxService';

const useAgentOutboxStore = create((set) => ({
  /** Snapshot de TODOS los items (cualquier status), FIFO. */
  items: [],
  /** Solo los items en vuelo (queued|processing) — conveniencia derivada. */
  inFlight: [],
  /** Marca de refresco en curso (evita parpadeos). */
  loading: false,

  /**
   * Recarga el snapshot desde IndexedDB. Idempotente y barato.
   */
  refresh: async () => {
    set({ loading: true });
    try {
      const [items, inFlight] = await Promise.all([svcGetAll(), svcGetInFlight()]);
      set({ items, inFlight, loading: false });
    } catch (e) {
      console.debug('[useAgentOutboxStore] refresh error:', e);
      set({ loading: false });
    }
  },

  /**
   * Persiste una consulta del usuario (durable) y refresca. Devuelve el id.
   * Propaga el error si el enqueue falla — el caller decide si navegar.
   *
   * @param {Object} payload — { kind, text?, blob?, mime?, fileName?, meta? }
   * @returns {Promise<number>} id del item persistido
   */
  send: async (payload) => {
    const id = await svcEnqueue(payload);
    try {
      const [items, inFlight] = await Promise.all([svcGetAll(), svcGetInFlight()]);
      set({ items, inFlight });
    } catch (e) {
      console.debug('[useAgentOutboxStore] post-send refresh error:', e);
    }
    return id;
  },
}));

export default useAgentOutboxStore;
