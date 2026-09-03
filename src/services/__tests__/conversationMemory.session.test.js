/**
 * conversationMemory.session.test.js
 *
 * Tests para el fix N3 (cross-conversation contamination, PR
 * fix/n3-cross-conv-contamination 2026-05-23).
 *
 * Bug: el operador hacía Q3 sobre broca del café → "Volver" al dashboard →
 * reabría AgentScreen → Q8 sobre flor del aguacate. AgentScreen cargaba el
 * historial previo desde IndexedDB y `getContextString` inyectaba turns
 * viejos como `contextMemory` del LLM. Resultado: respuestas mezclaban
 * residuos de la conversación previa con la nueva query.
 *
 * Cobertura:
 *   1. `shouldStartNewSession` con historial vacío → true (primer encuentro
 *      siempre es sesión nueva).
 *   2. `shouldStartNewSession` con gap > SESSION_GAP_MS (30min) → true.
 *   3. `shouldStartNewSession` con gap < SESSION_GAP_MS → false (continúa
 *      conversación útil reciente).
 *   4. `addTurn` × 2 + `clearMemory` → `getRecentContext` devuelve 0.
 *   5. `getLastTurnTimestamp` devuelve null si no hay turns, ts del último
 *      si hay.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────
// Fake IndexedDB que reproduce las APIs usadas por conversationMemory.js:
//   - transaction(store, mode)
//   - objectStore(name).{add, delete}
//   - objectStore(name).index('operator_id').getAll(IDBKeyRange.only(opId))
//   - objectStore(name).index('operator_id').openCursor(range) → cursor con
//     .delete + .continue (para clearMemory).
//   - tx.oncomplete fires después de operaciones.
//
// Mantenemos el storage en un array en memoria por test. beforeEach lo
// resetea para aislamiento.

let fakeStorage = [];

// Track pending ops queue para disparar tx.oncomplete sólo después de
// que TODOS los store.add/delete/cursor iteraciones de la transaction
// hayan ejecutado. Sin esto, en suite completo el oncomplete dispara
// antes de que store.add corra (race timing) y addTurn resuelve sin
// haber pushed al storage → clearMemory no encuentra el turn.

const makeFakeDB = () => ({
  transaction(_storeName, _mode) {
    const tx = { oncomplete: null, onerror: null, error: null };
    let opsScheduled = 0;
    let opsCompleted = 0;
    const maybeComplete = () => {
      if (opsScheduled === opsCompleted) {
        // Dispara oncomplete en next tick para emular semántica IDB
        // (handler agendado tras ops del microtask).
        setTimeout(() => tx.oncomplete?.(), 0);
      }
    };
    const trackOp = (fn) => {
      opsScheduled += 1;
      setTimeout(() => {
        fn();
        opsCompleted += 1;
        maybeComplete();
      }, 0);
    };
    // Trigger inicial: si la tx no agendó ninguna op síncronamente,
    // oncomplete debe disparar igualmente (caso noop tx).
    setTimeout(() => {
      if (opsScheduled === 0) tx.oncomplete?.();
    }, 1);

    return {
      get oncomplete() { return tx.oncomplete; },
      set oncomplete(fn) { tx.oncomplete = fn; },
      get onerror() { return tx.onerror; },
      set onerror(fn) { tx.onerror = fn; },
      get error() { return tx.error; },
      objectStore(_name) {
        return {
          add(turn) {
            const req = { onsuccess: null, onerror: null };
            trackOp(() => {
              fakeStorage.push(turn);
              req.result = turn;
              req.onsuccess?.({ target: req });
            });
            return req;
          },
          delete(id) {
            const req = { onsuccess: null, onerror: null };
            trackOp(() => {
              fakeStorage = fakeStorage.filter((t) => t.id !== id);
              req.onsuccess?.({ target: req });
            });
            return req;
          },
          index(_indexName) {
            return {
              getAll(range) {
                const req = { onsuccess: null, onerror: null };
                trackOp(() => {
                  const target = range?.lower ?? range?._only;
                  req.result = fakeStorage.filter((t) => t.operator_id === target);
                  req.onsuccess?.({ target: req });
                });
                return req;
              },
              openCursor(range) {
                const req = { onsuccess: null, onerror: null };
                opsScheduled += 1;
                const target = range?.lower ?? range?._only;
                let entries;
                let idx = 0;
                const step = () => {
                  if (entries === undefined) {
                    // Recalcular en cada openCursor para reflejar estado
                    // actual del storage post-deletes previos.
                    entries = fakeStorage.filter((t) => t.operator_id === target);
                  }
                  if (idx >= entries.length) {
                    setTimeout(() => {
                      req.onsuccess?.({ target: { result: null } });
                      opsCompleted += 1;
                      maybeComplete();
                    }, 0);
                    return;
                  }
                  const entry = entries[idx];
                  idx += 1;
                  const cursor = {
                    value: entry,
                    delete() {
                      fakeStorage = fakeStorage.filter((t) => t.id !== entry.id);
                    },
                    continue() {
                      step();
                    },
                  };
                  setTimeout(() => req.onsuccess?.({ target: { result: cursor } }), 0);
                };
                setTimeout(step, 0);
                return req;
              },
            };
          },
        };
      },
    };
  },
});

vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(makeFakeDB())),
  STORES: { CONVERSATION_MEMORY: 'conversation_memory' },
}));

// Polyfill IDBKeyRange para jsdom: el módulo conversationMemory llama
// `IDBKeyRange.only(operatorId)`. Devolvemos un objeto plano con `_only`
// que nuestro fake DB sabe leer (también soporta `.lower` para compat).
if (typeof globalThis.IDBKeyRange === 'undefined') {
  globalThis.IDBKeyRange = /** @type {any} */ ({
    only: (value) => ({ _only: value, lower: value, upper: value }),
  });
}

import {
  addTurn,
  getRecentContext,
  getLastTurnTimestamp,
  shouldStartNewSession,
  clearMemory,
  SESSION_GAP_MS,
} from '../conversationMemory';

beforeEach(() => {
  fakeStorage = [];
});

describe('shouldStartNewSession (N3 cross-conv contamination fix)', () => {
  test('sin historial previo → true (primer encuentro siempre fresco)', async () => {
    const fresh = await shouldStartNewSession('alice');
    expect(fresh).toBe(true);
  });

  test('último turn más viejo que SESSION_GAP_MS → true', async () => {
    const now = 1_700_000_000_000;
    const old = now - SESSION_GAP_MS - 1_000; // 30min y 1s atrás
    fakeStorage.push({
      id: 'turn_old',
      operator_id: 'alice',
      role: 'user',
      content: 'broca del café',
      timestamp: old,
    });

    const fresh = await shouldStartNewSession('alice', now);
    expect(fresh).toBe(true);
  });

  test('último turn más reciente que SESSION_GAP_MS → false (continuar)', async () => {
    const now = 1_700_000_000_000;
    const recent = now - 5 * 60 * 1000; // 5min atrás
    fakeStorage.push({
      id: 'turn_recent',
      operator_id: 'alice',
      role: 'user',
      content: 'cómo podo el café',
      timestamp: recent,
    });

    const fresh = await shouldStartNewSession('alice', now);
    expect(fresh).toBe(false);
  });

  test('scope por operator_id: turns de otro operator no cuentan', async () => {
    const now = 1_700_000_000_000;
    fakeStorage.push({
      id: 'turn_bob',
      operator_id: 'bob',
      role: 'user',
      content: 'algo reciente de bob',
      timestamp: now - 1000,
    });

    // alice no tiene historial → debe ser sesión fresca aunque bob sí
    const freshAlice = await shouldStartNewSession('alice', now);
    expect(freshAlice).toBe(true);
  });
});

describe('getLastTurnTimestamp', () => {
  test('sin turns → null', async () => {
    const ts = await getLastTurnTimestamp('alice');
    expect(ts).toBeNull();
  });

  test('con turns → timestamp del más reciente', async () => {
    fakeStorage.push(
      { id: 't1', operator_id: 'alice', role: 'user', content: 'q1', timestamp: 1000 },
      { id: 't2', operator_id: 'alice', role: 'user', content: 'q2', timestamp: 3000 },
      { id: 't3', operator_id: 'alice', role: 'user', content: 'q3', timestamp: 2000 },
    );
    const ts = await getLastTurnTimestamp('alice');
    expect(ts).toBe(3000);
  });
});

describe('addTurn + clearMemory cycle (N3 reset explícito)', () => {
  test('addTurn × 2 → getRecentContext devuelve 2; clearMemory → getRecentContext devuelve 0', async () => {
    await addTurn('alice', { role: 'user', content: 'qué biopreparado controla la broca del café' });
    await addTurn('alice', { role: 'assistant', content: 'puedes usar Beauveria bassiana...' });

    let ctx = await getRecentContext('alice');
    expect(ctx).toHaveLength(2);
    expect(ctx[0].content).toContain('broca');

    await clearMemory('alice');

    ctx = await getRecentContext('alice');
    expect(ctx).toHaveLength(0);
  });

  test('clearMemory NO toca turns de otro operator', async () => {
    await addTurn('alice', { role: 'user', content: 'q de alice' });
    await addTurn('bob', { role: 'user', content: 'q de bob' });

    await clearMemory('alice');

    const ctxAlice = await getRecentContext('alice');
    const ctxBob = await getRecentContext('bob');
    expect(ctxAlice).toHaveLength(0);
    expect(ctxBob).toHaveLength(1);
    expect(ctxBob[0].content).toBe('q de bob');
  });
});
