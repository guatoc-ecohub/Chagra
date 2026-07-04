/**
 * conversationMemory.ttl.test.js — cobertura del fix P1-1 (audit 2026-07-03).
 *
 * La retención de memoria rompía el TTL de 30 días para usuarios con pocos
 * turnos: `cleanOldEntries()` solo purgaba si `allTurns.length > MAX_TURNS`, así
 * que un operador con menos de 100 turnos conservaba historial de hace meses
 * indefinidamente.
 *
 * El fix separa DOS políticas independientes:
 *   1. Purga por EDAD (TTL 30 días) — corre SIEMPRE.
 *   2. Purga por VOLUMEN (MAX_TURNS) — solo al exceder el tope.
 *
 * Estos tests siembran turnos con timestamps explícitos (sin pasar por addTurn,
 * que fuerza Date.now()) para verificar ambas políticas por separado.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

const STORE_NAME = 'conversation_memory';
let memoryDB = null;

// DB real de fake-indexeddb con el mismo schema que src/db/dbCore.js.
function createMemoryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ChagraDB-conversationMemory-ttl-test', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('operator_id', 'operator_id', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// openDB devuelve la DB real sembrada por test.
vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(memoryDB)),
  STORES: { CONVERSATION_MEMORY: 'conversation_memory' },
}));

import { cleanOldEntries, getRecentContext } from '../conversationMemory';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TURNS = 100;

// Inserta un turn con timestamp explícito directamente en el store, saltándose
// addTurn (que siempre usa Date.now()). Así podemos sembrar historial "viejo".
function seedTurn(operatorId, { id, content, timestamp }) {
  return new Promise((resolve, reject) => {
    const tx = memoryDB.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      id,
      operator_id: operatorId,
      role: 'user',
      content,
      metadata: null,
      timestamp,
      created_at: new Date(timestamp).toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  memoryDB = await createMemoryDB();
});

afterEach(() => {
  if (memoryDB) {
    memoryDB.close();
    memoryDB = null;
  }
  vi.clearAllMocks();
});

describe('cleanOldEntries — TTL por EDAD corre con pocos turnos (P1-1)', () => {
  test('purga turnos de más de 30 días aunque haya MENOS de MAX_TURNS', async () => {
    const now = Date.now();
    await seedTurn('op', { id: 'old_1', content: 'viejo 1', timestamp: now - 40 * DAY_MS });
    await seedTurn('op', { id: 'old_2', content: 'viejo 2', timestamp: now - 35 * DAY_MS });
    await seedTurn('op', { id: 'recent_1', content: 'reciente 1', timestamp: now - 2 * DAY_MS });
    await seedTurn('op', { id: 'recent_2', content: 'reciente 2', timestamp: now - 1 * DAY_MS });

    // Solo 4 turnos (<< MAX_TURNS): antes del fix el guard de volumen cortaba
    // la purga por edad y los turnos viejos nunca se limpiaban.
    await cleanOldEntries('op');

    const ctx = await getRecentContext('op');
    const contents = ctx.map((t) => t.content);
    expect(contents).toEqual(['reciente 1', 'reciente 2']);
    expect(contents).not.toContain('viejo 1');
    expect(contents).not.toContain('viejo 2');
  });

  test('un turno justo en el borde (>30 días) se purga; uno dentro de la ventana se conserva', async () => {
    const now = Date.now();
    await seedTurn('op', { id: 'edge_old', content: 'borde viejo', timestamp: now - (30 * DAY_MS + 60 * 1000) });
    await seedTurn('op', { id: 'edge_new', content: 'borde nuevo', timestamp: now - (30 * DAY_MS - 60 * 1000) });

    await cleanOldEntries('op');

    const ctx = await getRecentContext('op');
    expect(ctx.map((t) => t.content)).toEqual(['borde nuevo']);
  });

  test('no purga nada si todos los turnos están dentro de la ventana de 30 días', async () => {
    const now = Date.now();
    await seedTurn('op', { id: 'r1', content: 'a', timestamp: now - 10 * DAY_MS });
    await seedTurn('op', { id: 'r2', content: 'b', timestamp: now - 5 * DAY_MS });
    await seedTurn('op', { id: 'r3', content: 'c', timestamp: now - 29 * DAY_MS });

    await cleanOldEntries('op');

    const ctx = await getRecentContext('op');
    expect(ctx).toHaveLength(3);
  });

  test('la purga por edad respeta el scope por operador', async () => {
    const now = Date.now();
    await seedTurn('alice', { id: 'a_old', content: 'alice vieja', timestamp: now - 45 * DAY_MS });
    await seedTurn('bob', { id: 'b_old', content: 'bob viejo', timestamp: now - 45 * DAY_MS });
    await seedTurn('alice', { id: 'a_new', content: 'alice nueva', timestamp: now - 1 * DAY_MS });

    await cleanOldEntries('alice');

    const alice = await getRecentContext('alice');
    const bob = await getRecentContext('bob');
    expect(alice.map((t) => t.content)).toEqual(['alice nueva']);
    // cleanOldEntries es por operador: el turno viejo de bob NO se toca.
    expect(bob.map((t) => t.content)).toEqual(['bob viejo']);
  });
});

describe('cleanOldEntries — purga por VOLUMEN independiente de la edad', () => {
  test('con > MAX_TURNS turnos recientes, conserva los MAX_TURNS más nuevos', async () => {
    const now = Date.now();
    // MAX_TURNS + 5 turnos, todos recientes (dentro de 30 días) → excede volumen.
    for (let i = 0; i < MAX_TURNS + 5; i++) {
      await seedTurn('op', {
        id: `t_${String(i).padStart(3, '0')}`,
        content: `msg ${i}`,
        timestamp: now - (MAX_TURNS + 5 - i) * 60 * 1000, // separados 1 min
      });
    }

    await cleanOldEntries('op');

    const ctx = await getRecentContext('op', 1000);
    expect(ctx).toHaveLength(MAX_TURNS);
    // Los 5 más antiguos (msg 0..4) se purgaron por volumen.
    expect(ctx[0].content).toBe('msg 5');
    expect(ctx[ctx.length - 1].content).toBe(`msg ${MAX_TURNS + 4}`);
  });

  test('purga combinada: elimina viejos por edad Y excedente por volumen', async () => {
    const now = Date.now();
    // 3 turnos viejos (>30 días) + MAX_TURNS + 2 recientes.
    for (let i = 0; i < 3; i++) {
      await seedTurn('op', {
        id: `old_${i}`,
        content: `viejo ${i}`,
        timestamp: now - (40 - i) * DAY_MS,
      });
    }
    for (let i = 0; i < MAX_TURNS + 2; i++) {
      await seedTurn('op', {
        id: `new_${String(i).padStart(3, '0')}`,
        content: `nuevo ${i}`,
        timestamp: now - (MAX_TURNS + 2 - i) * 60 * 1000,
      });
    }

    await cleanOldEntries('op');

    const ctx = await getRecentContext('op', 1000);
    const contents = ctx.map((t) => t.content);
    // Ningún viejo sobrevive (purga por edad).
    expect(contents.some((c) => c.startsWith('viejo'))).toBe(false);
    // Quedan exactamente MAX_TURNS recientes (purga por volumen).
    expect(ctx).toHaveLength(MAX_TURNS);
    expect(contents[0]).toBe('nuevo 2');
    expect(contents[contents.length - 1]).toBe(`nuevo ${MAX_TURNS + 1}`);
  });
});
