import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests de pilotTelemetryService: recordPilotEvent, getPilotMetrics,
 * clearOldEvents. Mockea dbCore para simular IndexedDB sin dependencia real.
 */

const mockStore = {
  add: vi.fn(),
  getAll: vi.fn(),
  index: vi.fn(),
};

function makeGetAllRequest(data) {
  return {
    set onsuccess(fn) {
      if (typeof fn === 'function') {
        Promise.resolve().then(() => {
          this.result = data;
          fn();
        });
      }
    },
    set onerror(_fn) { /* noop */ },
    result: undefined,
  };
}

function makeTx() {
  const tx = {
    objectStore: vi.fn(() => mockStore),
  };
  // Simula el comportamiento real de IndexedDB: oncomplete se dispara en
  // microtask tras add/put/delete.
  Object.defineProperty(tx, 'oncomplete', {
    set(fn) {
      if (typeof fn === 'function') Promise.resolve().then(fn);
    },
    enumerable: true,
  });
  Object.defineProperty(tx, 'onerror', {
    set(_fn) { /* noop — no simulamos error en estos tests */ },
    enumerable: true,
  });
  Object.defineProperty(tx, 'onabort', {
    set(_fn) { /* noop */ },
    enumerable: true,
  });
  return tx;
}

let mockDB;

vi.mock('../../db/dbCore', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
  STORES: { PILOT_TELEMETRY: 'pilot_telemetry' },
}));

import { recordPilotEvent, getPilotMetrics, clearOldEvents, getAnonSessionId } from '../pilotTelemetryService.js';

beforeEach(async () => {
  vi.clearAllMocks();
  mockDB = {
    transaction: vi.fn(() => makeTx()),
  };
  mockStore.add.mockClear();
  mockStore.getAll.mockReturnValue(makeGetAllRequest([]));
  mockStore.index = vi.fn();
});

describe('recordPilotEvent', () => {
  it('guarda evento en IndexedDB', async () => {
    const result = await recordPilotEvent({ event_type: 'modulo_abierto', metadata: { modulo_id: 'activos', desde_home: true } });
    expect(result).not.toBeNull();
    expect(result.event_type).toBe('modulo_abierto');
    expect(result.metadata).toEqual({ modulo_id: 'activos', desde_home: true });
    expect(result.id.startsWith('pt_')).toBe(true);
    expect(result.synced).toBe(false);
    expect(result.created_at).toBeTruthy();
    // session_id anónimo y efímero (no PII) — siempre presente, formato as_*.
    expect(typeof result.session_id).toBe('string');
    expect(result.session_id.startsWith('as_')).toBe(true);
    expect(mockStore.add).toHaveBeenCalled();
  });

  it('evento no debe tener PII', async () => {
    const result = await recordPilotEvent({
      event_type: 'pregunta_al_agente',
      metadata: {
        user_id: '123',
        nombre: 'Juan',
        email: 'juan@example.com',
        prompt_text: 'qué siembro',
        gps_lat: 4.5,
        gps_lng: -74.1,
        intent_detectado: 'siembra',
        source: 'text',
        grounded: true,
      },
    });
    expect(result).not.toBeNull();
    expect(result.metadata.user_id).toBeUndefined();
    expect(result.metadata.nombre).toBeUndefined();
    expect(result.metadata.email).toBeUndefined();
    expect(result.metadata.prompt_text).toBeUndefined();
    expect(result.metadata.gps_lat).toBeUndefined();
    expect(result.metadata.gps_lng).toBeUndefined();
    expect(result.metadata.intent_detectado).toBe('siembra');
    expect(result.metadata.source).toBe('text');
    expect(result.metadata.grounded).toBe(true);
  });

  it('retorna null si event_type está vacío', async () => {
    const result = await recordPilotEvent({ event_type: '', metadata: {} });
    expect(result).toBeNull();
    expect(mockStore.add).not.toHaveBeenCalled();
  });

  it('retorna null si event_type no es string', async () => {
    const result = await recordPilotEvent({ event_type: null, metadata: {} });
    expect(result).toBeNull();
  });

  it('falla silente si DB lanza', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('DB crashed'));
    const result = await recordPilotEvent({ event_type: 'sync_resultado', metadata: { exitoso: true } });
    expect(result).toBeNull();
  });
});

describe('getPilotMetrics', () => {
  it('agrega conteos por event_type', async () => {
    mockStore.getAll.mockReturnValue(makeGetAllRequest([
      { event_type: 'modulo_abierto', id: '1' },
      { event_type: 'modulo_abierto', id: '2' },
      { event_type: 'feedback_dado', id: '3' },
      { event_type: 'sync_resultado', id: '4' },
      { event_type: 'sync_resultado', id: '5' },
      { event_type: 'sync_resultado', id: '6' },
    ]));
    const metrics = await getPilotMetrics();
    expect(metrics).toEqual({
      modulo_abierto: 2,
      feedback_dado: 1,
      sync_resultado: 3,
    });
  });

  it('retorna {} si no hay eventos', async () => {
    mockStore.getAll.mockReturnValue(makeGetAllRequest([]));
    const metrics = await getPilotMetrics();
    expect(metrics).toEqual({});
  });

  it('retorna {} si DB falla', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('DB down'));
    const metrics = await getPilotMetrics();
    expect(metrics).toEqual({});
  });
});

describe('clearOldEvents', () => {
  it('retorna 0 si olderThanDays no es válido', async () => {
    const removed = await clearOldEvents(0);
    expect(removed).toBe(0);
  });

  it('retorna 0 si DB falla', async () => {
    const { openDB } = await import('../../db/dbCore');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('DB down'));
    const removed = await clearOldEvents(7);
    expect(removed).toBe(0);
  });
});


describe('getAnonSessionId', () => {
  it('devuelve un id anónimo estable dentro de la misma sesión (formato as_*)', () => {
    const a = getAnonSessionId();
    const b = getAnonSessionId();
    expect(typeof a).toBe('string');
    expect(a.startsWith('as_')).toBe(true);
    // Estable dentro de la sesión: misma llamada → mismo id.
    expect(a).toBe(b);
  });
});
