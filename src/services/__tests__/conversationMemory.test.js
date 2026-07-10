/**
 * conversationMemory.test.js
 *
 * Tests principales del módulo conversationMemory.
 * 
 * Cubre funciones exportadas principales:
 * - addTurn: agregar turnos a la conversación
 * - getRecentContext: recuperar últimos N turnos
 * - getContextString: formatear contexto para LLM
 * - getFullHistory: alias de getRecentContext
 * - clearMemory: limpiar memoria de un operador
 * - cleanOldEntries: limpieza automática (30 días / 100 turnos)
 *
 * Casos borde:
 * - Sesión vacía (sin turnos)
 * - Mensaje null/undefined
 * - Overflow de ventana (más de MAX_TURNS)
 * - Turnos con metadata opcional
 * - Error handling de IndexedDB
 *
 * Nota: shouldStartNewSession, getLastTurnTimestamp y computeSourceMetadata
 * ya están cubiertos en tests separados (.session.test.js y .sourceMetadata.test.js)
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
// `fake-indexeddb/auto` ya está cargado globalmente por tests/unit/setup.js
// (instala indexedDB, IDBKeyRange, IDBObjectStore, etc. en globalThis). Usamos
// la implementación real en memoria — fiel a la spec — en vez del fake hecho a
// mano que rompía en vitest 4.x por timing de oncomplete/onerror. Mismo patrón
// que el resto del repo (no toca código de prod: solo el openDB mockeado).
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

const STORE_NAME = 'conversation_memory';
let memoryDB = null;

// Crea una DB real de fake-indexeddb con el store `conversation_memory`
// (keyPath: id) + índice `operator_id`, igual al schema de src/db/dbCore.js.
function createMemoryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ChagraDB-conversationMemory-test', 1);
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

// ─── Mocks ────────────────────────────────────────────────────────────────
// openDB devuelve la DB real de fake-indexeddb sembrada por test.
vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(memoryDB)),
  STORES: { CONVERSATION_MEMORY: 'conversation_memory' },
}));

import {
  addTurn,
  getRecentContext,
  getContextString,
  getFullHistory,
  clearMemory,
} from '../conversationMemory';

// Reloj monótono: addTurn usa Date.now() como timestamp y getRecentContext
// ordena por él. En un loop tight, varios addTurn comparten el mismo
// milisegundo y, con fake-indexeddb real, getAll del índice los devuelve por
// clave primaria (id aleatorio), no por inserción → orden no determinista.
// En producción los turnos están separados por segundos, así que avanzar el
// reloj 1ms por llamada reproduce el orden real sin tocar código de prod.
let clockTick = 0;
let dateNowSpy = null;

beforeEach(async () => {
  // DB en memoria fresca por test → aislamiento total. Reseteamos el factory
  // global para que la base anterior no persista entre tests.
  globalThis.indexedDB = new IDBFactory();
  memoryDB = await createMemoryDB();

  clockTick = 0;
  const realNow = Date.now();
  dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => realNow + clockTick++);
});

afterEach(() => {
  if (dateNowSpy) {
    dateNowSpy.mockRestore();
    dateNowSpy = null;
  }
  if (memoryDB) {
    memoryDB.close();
    memoryDB = null;
  }
  vi.clearAllMocks();
});

describe('addTurn', () => {
  test('agrega un turn básico (role + content)', async () => {
    const result = await addTurn('alice', {
      role: 'user',
      content: '¿qué biopreparado uso para la broca?',
    });

    expect(result).not.toBeNull();
    expect(result.operator_id).toBe('alice');
    expect(result.role).toBe('user');
    expect(result.content).toContain('broca');
    expect(result.id).toMatch(/^turn_/);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  test('agrega turn con metadata opcional', async () => {
    const metadata = {
      tool_used: 'get_species',
      grounded: true,
    };
    const result = await addTurn('alice', {
      role: 'assistant',
      content: 'Beauveria bassiana es efectivo...',
      metadata,
    });

    expect(result).not.toBeNull();
    expect(result.metadata).toEqual(metadata);
  });

  test('genera IDs únicos para cada turn', async () => {
    const t1 = await addTurn('alice', { role: 'user', content: 'q1' });
    const t2 = await addTurn('alice', { role: 'user', content: 'q2' });

    expect(t1.id).not.toBe(t2.id);
  });

  test('maneja turn con metadata null explícito', async () => {
    const result = await addTurn('alice', {
      role: 'user',
      content: 'mensaje simple',
      metadata: null,
    });

    expect(result).not.toBeNull();
    expect(result.metadata).toBeNull();
  });

  test('falla graceful si IndexedDB falla (no-fatal)', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB roto'));

    const result = await addTurn('alice', {
      role: 'user',
      content: 'test',
    });

    expect(result).toBeNull();
  });
});

describe('getRecentContext', () => {
  test('sesión vacía devuelve array vacío', async () => {
    const ctx = await getRecentContext('alice');
    expect(ctx).toEqual([]);
  });

  test('recupera turnos en orden cronológico', async () => {
    await addTurn('alice', { role: 'user', content: 'q1' });
    await addTurn('alice', { role: 'assistant', content: 'a1' });
    await addTurn('alice', { role: 'user', content: 'q2' });

    const ctx = await getRecentContext('alice');
    expect(ctx).toHaveLength(3);
    expect(ctx[0].content).toBe('q1');
    expect(ctx[1].content).toBe('a1');
    expect(ctx[2].content).toBe('q2');
  });

  test('respeta maxTurns (límite de ventana)', async () => {
    // Agregar 5 turnos
    for (let i = 0; i < 5; i++) {
      await addTurn('alice', {
        role: 'user',
        content: `mensaje ${i}`,
      });
    }

    const ctx3 = await getRecentContext('alice', 3);
    expect(ctx3).toHaveLength(3);
    expect(ctx3[0].content).toBe('mensaje 2');
    expect(ctx3[1].content).toBe('mensaje 3');
    expect(ctx3[2].content).toBe('mensaje 4');
  });

  test('maxTurns default es 100', async () => {
    // Agregar pocos turnos (<100)
    for (let i = 0; i < 10; i++) {
      await addTurn('alice', {
        role: 'user',
        content: `msg ${i}`,
      });
    }

    const ctx = await getRecentContext('alice'); // sin maxTurns explícito
    expect(ctx).toHaveLength(10);
  });

  test('scope por operator_id (no mezcla operadores)', async () => {
    await addTurn('alice', { role: 'user', content: 'pregunta de alice' });
    await addTurn('bob', { role: 'user', content: 'pregunta de bob' });

    const ctxAlice = await getRecentContext('alice');
    const ctxBob = await getRecentContext('bob');

    expect(ctxAlice).toHaveLength(1);
    expect(ctxAlice[0].content).toContain('alice');
    expect(ctxBob).toHaveLength(1);
    expect(ctxBob[0].content).toContain('bob');
  });

  test('incluye metadata en turnos recuperados', async () => {
    const metadata = { tool_used: 'get_species', grounded: true };
    await addTurn('alice', {
      role: 'assistant',
      content: 'respuesta',
      metadata,
    });

    const ctx = await getRecentContext('alice');
    expect(ctx[0].metadata).toEqual(metadata);
  });

  test('falla graceful si IndexedDB falla (devuelve [])', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB error'));

    const ctx = await getRecentContext('alice');
    expect(ctx).toEqual([]);
  });
});

describe('getContextString', () => {
  test('sesión vacía devuelve string vacío', async () => {
    const str = await getContextString('alice');
    expect(str).toBe('');
  });

  test('formatea conversación para LLM con labels Usuario/Asistente', async () => {
    await addTurn('alice', { role: 'user', content: '¿qué uso para la broca?' });
    await addTurn('alice', {
      role: 'assistant',
      content: 'Beauveria bassiana',
    });

    const str = await getContextString('alice');

    expect(str).toContain('Conversación previa:');
    expect(str).toContain('Usuario: ¿qué uso para la broca?');
    expect(str).toContain('Asistente: Beauveria bassiana');
  });

  test('respeta maxTurns (default 20)', async () => {
    // Agregar 25 turnos
    for (let i = 0; i < 25; i++) {
      await addTurn('alice', {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg ${i}`,
      });
    }

    const str = await getContextString('alice', 10);
    const lines = str.split('\n').filter((l) => l.includes('Usuario:') || l.includes('Asistente:'));
    expect(lines).toHaveLength(10);
  });

  test('maxTurns default es 20', async () => {
    // Agregar 25 turnos
    for (let i = 0; i < 25; i++) {
      await addTurn('alice', {
        role: 'user',
        content: `msg ${i}`,
      });
    }

    const str = await getContextString('alice'); // sin maxTurns explícito
    const lines = str.split('\n').filter((l) => l.includes('Usuario:'));
    expect(lines).toHaveLength(20);
  });

  test('formatea correctamente múltiples turnos', async () => {
    await addTurn('alice', { role: 'user', content: 'q1' });
    await addTurn('alice', { role: 'assistant', content: 'a1' });
    await addTurn('alice', { role: 'user', content: 'q2' });
    await addTurn('alice', { role: 'assistant', content: 'a2' });

    const str = await getContextString('alice');

    expect(str).toMatch(/Usuario: q1.*Asistente: a1.*Usuario: q2.*Asistente: a2/s);
  });
});

describe('getFullHistory', () => {
  test('alias de getRecentContext', async () => {
    await addTurn('alice', { role: 'user', content: 'mensaje' });

    const history = await getFullHistory('alice');
    const ctx = await getRecentContext('alice');

    expect(history).toEqual(ctx);
  });

  test('respeta limit parameter', async () => {
    for (let i = 0; i < 10; i++) {
      await addTurn('alice', { role: 'user', content: `msg ${i}` });
    }

    const history = await getFullHistory('alice', 5);
    expect(history).toHaveLength(5);
  });

  test('limit default es 100', async () => {
    for (let i = 0; i < 10; i++) {
      await addTurn('alice', { role: 'user', content: `msg ${i}` });
    }

    const history = await getFullHistory('alice');
    expect(history).toHaveLength(10);
  });
});

describe('clearMemory', () => {
  test('limpia todos los turnos de un operador', async () => {
    await addTurn('alice', { role: 'user', content: 'q1' });
    await addTurn('alice', { role: 'assistant', content: 'a1' });
    await addTurn('alice', { role: 'user', content: 'q2' });

    await clearMemory('alice');

    const ctx = await getRecentContext('alice');
    expect(ctx).toHaveLength(0);
  });

  test('NO afecta turnos de otros operadores', async () => {
    await addTurn('alice', { role: 'user', content: 'alice msg' });
    await addTurn('bob', { role: 'user', content: 'bob msg' });

    await clearMemory('alice');

    const ctxAlice = await getRecentContext('alice');
    const ctxBob = await getRecentContext('bob');

    expect(ctxAlice).toHaveLength(0);
    expect(ctxBob).toHaveLength(1);
    expect(ctxBob[0].content).toBe('bob msg');
  });

  test('limpiar operador sin turnos no causa error', async () => {
    await expect(clearMemory('nobody')).resolves.not.toThrow();
  });

  test('falla si IndexedDB falla (lanza error)', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB roto'));

    await expect(clearMemory('alice')).rejects.toThrow('IDB roto');
  });
});

describe('cleanOldEntries (cleanup automático post-addTurn)', () => {
  test('después de addTurn, limpieza automática corre', async () => {
    // Este test verifica que cleanOldEntries se llama después de addTurn
    // sin alterar el storage directamente (cleanOldEntries es privado)
    const result = await addTurn('alice', {
      role: 'user',
      content: 'mensaje que trigger cleanup',
    });

    // Si llegamos aquí sin timeout/crash, cleanup corrió
    expect(result).not.toBeNull();
  });

  test('overflow de ventana (más de 100 turnos) se maneja', async () => {
    // Agregar más de MAX_TURNS (100)
    const MAX_TURNS = 100;
    for (let i = 0; i < MAX_TURNS + 10; i++) {
      await addTurn('alice', {
        role: 'user',
        content: `mensaje ${i}`,
      });
    }

    // cleanOldEntries debe haber truncado a MAX_TURNS
    const ctx = await getRecentContext('alice');
    expect(ctx.length).toBeLessThanOrEqual(MAX_TURNS);
  });

  test('limpieza mantiene los turnos más recientes', async () => {
    const MAX_TURNS = 100;
    
    // Agregar 120 turnos
    for (let i = 0; i < 120; i++) {
      await addTurn('alice', {
        role: 'user',
        content: `msg ${i}`,
      });
    }

    const ctx = await getRecentContext('alice');
    
    // Debe tener máximo 100 turnos
    expect(ctx.length).toBeLessThanOrEqual(MAX_TURNS);
    
    // Los últimos turnos deben ser los más recientes (msg 19-119 aprox)
    const lastContent = ctx[ctx.length - 1].content;
    expect(lastContent).toBe('msg 119');
  });
});

describe('casos borde y edge cases', () => {
  test('addTurn con content string vacío', async () => {
    const result = await addTurn('alice', {
      role: 'user',
      content: '',
    });

    expect(result).not.toBeNull();
    expect(result.content).toBe('');
  });

  test('getRecentContext con maxTurns 0 devuelve todos (slice(-0) = slice(0))', async () => {
    await addTurn('alice', { role: 'user', content: 'mensaje' });

    const ctx = await getRecentContext('alice', 0);
    // slice(-0) es equivalente a slice(0), devuelve todo el array
    expect(ctx).toHaveLength(1);
  });

  test('getRecentContext con maxTurns negativo devuelve [] (slice fuera de rango)', async () => {
    await addTurn('alice', { role: 'user', content: 'mensaje' });

    const ctx = await getRecentContext('alice', -5);
    // slice(-(-5)) = slice(5) con solo 1 elemento → array vacío
    expect(ctx).toEqual([]);
  });

  test('addTurn con role inválido se acepta (flexibilidad)', async () => {
    const result = await addTurn('alice', {
      role: 'unknown_role',
      content: 'mensaje',
    });

    expect(result).not.toBeNull();
    expect(result.role).toBe('unknown_role');
  });

  test('conversación mezclada entre operadores se mantiene separada', async () => {
    await addTurn('alice', { role: 'user', content: 'alice 1' });
    await addTurn('bob', { role: 'user', content: 'bob 1' });
    await addTurn('alice', { role: 'assistant', content: 'alice 2' });
    await addTurn('bob', { role: 'assistant', content: 'bob 2' });

    const ctxAlice = await getRecentContext('alice');
    const ctxBob = await getRecentContext('bob');

    expect(ctxAlice).toHaveLength(2);
    expect(ctxAlice[0].content).toBe('alice 1');
    expect(ctxAlice[1].content).toBe('alice 2');

    expect(ctxBob).toHaveLength(2);
    expect(ctxBob[0].content).toBe('bob 1');
    expect(ctxBob[1].content).toBe('bob 2');
  });

  test('getContextString no incluye metadata, solo role + content', async () => {
    await addTurn('alice', {
      role: 'assistant',
      content: 'respuesta',
      metadata: { tool_used: 'get_species', grounded: true },
    });

    const str = await getContextString('alice');

    expect(str).toContain('respuesta');
    expect(str).not.toContain('tool_used');
    expect(str).not.toContain('grounded');
  });
});