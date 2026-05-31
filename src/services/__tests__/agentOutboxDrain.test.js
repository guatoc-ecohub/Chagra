/**
 * agentOutboxDrain.test.js — contrato de DRENADO que el AgentScreen implementa
 * al montar (recoverStale → claimNext loop → process → markAnswered).
 *
 * Replica EXACTAMENTE el orden de operaciones del `drainOutbox` de
 * AgentScreen.jsx, pero con un dispatcher de prueba en lugar del pipeline LLM
 * real. Prueba el invariante que importa al usuario:
 *   - cada item del home se procesa EXACTAMENTE una vez (sin duplicar burbujas),
 *   - en orden FIFO,
 *   - los items huérfanos en 'processing' (app cerrada mid-flight) se recuperan
 *     y se procesan (no se pierden),
 *   - un segundo "montaje" (segundo drenado) NO re-procesa lo ya respondido.
 *
 * Mismo mock IDB en memoria persistente que agentOutboxService.test.js.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const dbState = { data: new Map(), seq: 0 };

function makeReq(resultFn) {
  const req = {};
  queueMicrotask(() => {
    try {
      req.result = resultFn();
      req.onsuccess?.({ target: req });
    } catch (e) {
      req.error = e;
      req.onerror?.({ target: req });
    }
  });
  return req;
}
function makeStore() {
  return {
    add(r) { return makeReq(() => { const id = r.id != null ? r.id : ++dbState.seq; dbState.data.set(id, { ...r, id }); return id; }); },
    put(r) { return makeReq(() => { const id = r.id != null ? r.id : ++dbState.seq; dbState.data.set(id, { ...r, id }); return id; }); },
    get(id) { return makeReq(() => dbState.data.get(id) || undefined); },
    getAll() { return makeReq(() => [...dbState.data.values()]); },
    delete(id) { return makeReq(() => { dbState.data.delete(id); return undefined; }); },
    clear() { return makeReq(() => { dbState.data.clear(); return undefined; }); },
  };
}
function makeDB() {
  return {
    transaction() {
      const tx = {};
      tx.objectStore = () => makeStore();
      setTimeout(() => tx.oncomplete?.(), 0);
      return tx;
    },
  };
}
vi.mock('../../db/dbCore', () => ({
  STORES: { AGENT_OUTBOX: 'agent_outbox' },
  openDB: vi.fn(async () => makeDB()),
}));

import {
  enqueue,
  claimNext,
  markAnswered,
  recoverStaleProcessing,
  getAll,
} from '../agentOutboxService';

/** Replica del drainOutbox de AgentScreen con un dispatcher inyectable. */
async function drain(dispatch) {
  await recoverStaleProcessing();
  let item = await claimNext();
  let guard = 0;
  while (item && guard < 25) {
    guard += 1;
    await dispatch(item);
    await markAnswered(item.id);
    item = await claimNext();
  }
}

beforeEach(() => {
  dbState.data.clear();
  dbState.seq = 0;
});

describe('drenado de la outbox al montar AgentScreen', () => {
  it('procesa todos los items en orden FIFO, exactamente una vez', async () => {
    await enqueue({ kind: 'text', text: 'uno', meta: { createdAt: 1 } });
    await enqueue({ kind: 'voice', blob: new Blob(['a'], { type: 'audio/webm' }), meta: { createdAt: 2 } });
    await enqueue({ kind: 'text', text: 'tres', meta: { createdAt: 3 } });

    const seen = [];
    await drain(async (item) => { seen.push(item.kind === 'voice' ? 'voice' : item.text); });

    expect(seen).toEqual(['uno', 'voice', 'tres']);
    const all = await getAll();
    expect(all.every((i) => i.status === 'answered')).toBe(true);
  });

  it('un segundo drenado (re-montaje) NO re-procesa lo ya respondido', async () => {
    await enqueue({ kind: 'text', text: 'sola' });
    const first = [];
    await drain(async (i) => first.push(i.text));
    expect(first).toEqual(['sola']);

    const second = [];
    await drain(async (i) => second.push(i.text));
    expect(second).toEqual([]); // nada que re-procesar
  });

  it('recupera y procesa un item huérfano en processing (app cerrada mid-flight)', async () => {
    const id = await enqueue({ kind: 'text', text: 'a mitad' });
    await claimNext(); // queda 'processing' (simula cierre antes de markAnswered)

    const seen = [];
    await drain(async (i) => seen.push(i.text));
    expect(seen).toEqual(['a mitad']); // recuperado y procesado, NO perdido

    const all = await getAll();
    expect(all.find((i) => i.id === id).status).toBe('answered');
  });

  it('drenado concurrente (dos montajes) no duplica el procesamiento', async () => {
    await enqueue({ kind: 'text', text: 'x', meta: { createdAt: 1 } });
    await enqueue({ kind: 'text', text: 'y', meta: { createdAt: 2 } });

    const seen = [];
    const dispatch = async (i) => { seen.push(i.text); };
    // Dos drenados arrancados "a la vez" (claimNext atómico evita duplicar).
    await Promise.all([drain(dispatch), drain(dispatch)]);

    expect(seen.sort()).toEqual(['x', 'y']);
    // Cada item visto exactamente una vez.
    expect(new Set(seen).size).toBe(2);
  });
});
