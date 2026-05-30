import { describe, it, expect, beforeEach } from 'vitest';
import {
  EVENT_TYPES,
  VALID_EVENT_TYPES,
  VALID_UNITS,
  VALID_RECEIVED_SOURCES,
  VALID_ADJUSTED_REASONS,
  VALID_LOST_CAUSES,
  validateLogEntry,
  createInventoryEvent,
  ValidationError,
} from '../inventoryEvents.js';

/**
 * Tests del validador gatekeeper de inventoryEvents (ADR-027.ii).
 * validateLogEntry y los enums son puros; createInventoryEvent usa
 * localStorage + crypto (disponibles en el entorno jsdom de los tests).
 */

const VALID_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'; // 26 chars Crockford-Base32
const HASH64 = 'a'.repeat(64);

// Payloads válidos por tipo de evento.
const PAYLOADS = {
  [EVENT_TYPES.RECEIVED]: { item_id: 'maiz', delta: 10, unit: 'kg', source: 'compra' },
  [EVENT_TYPES.CONSUMED]: { item_id: 'maiz', delta: -3, unit: 'kg' },
  [EVENT_TYPES.TRANSFORMED]: {
    inputs: [{ item_id: 'cana', delta_consumido: 30, unit: 'kg' }],
    outputs: [{ item_id: 'panela', delta_producido: 5, unit: 'kg' }],
  },
  [EVENT_TYPES.COUNTED]: { item_id: 'maiz', counted_qty: 5, unit: 'kg' },
  [EVENT_TYPES.ADJUSTED]: { item_id: 'maiz', delta: 2, reason: 'error_registro' },
  [EVENT_TYPES.TRANSFERRED]: { item_id: 'maiz', from_location_id: 'bodega', to_location_id: 'campo', qty: 5 },
  [EVENT_TYPES.LOST]: { item_id: 'maiz', delta: -2, cause: 'plaga' },
  [EVENT_TYPES.PRODUCED]: { item_id: 'panela', delta: 8 },
};

function validEntry(eventType = EVENT_TYPES.RECEIVED, overrides = {}) {
  return {
    id: VALID_ULID,
    event_type: eventType,
    timestamp: '2026-01-01T00:00:00.000Z',
    device_id_lex_hash: 'ABCD2345', // 8 chars
    sequence_number: 1,
    operator_id_hash: HASH64,
    idempotency_key: 'k-1',
    payload: PAYLOADS[eventType],
    schema_version: '1',
    ...overrides,
  };
}

describe('enums canónicos', () => {
  it('EVENT_TYPES está congelado y tiene los 8 tipos', () => {
    expect(Object.isFrozen(EVENT_TYPES)).toBe(true);
    expect(Object.keys(EVENT_TYPES)).toHaveLength(8);
    expect(EVENT_TYPES.RECEIVED).toBe('inventory_received');
  });

  it('VALID_EVENT_TYPES contiene todos los valores de EVENT_TYPES', () => {
    Object.values(EVENT_TYPES).forEach((v) => expect(VALID_EVENT_TYPES.has(v)).toBe(true));
  });

  it('los sets de vocabulario controlado tienen los valores esperados', () => {
    expect(VALID_UNITS.has('kg')).toBe(true);
    expect(VALID_UNITS.has('toneladas')).toBe(false);
    expect(VALID_RECEIVED_SOURCES.has('compra')).toBe(true);
    expect(VALID_ADJUSTED_REASONS.has('error_registro')).toBe(true);
    expect(VALID_LOST_CAUSES.has('plaga')).toBe(true);
  });
});

describe('ValidationError', () => {
  it('expone field, expected y got', () => {
    try {
      validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { id: 'no-ulid' }));
      throw new Error('debió lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.field).toBe('id');
      expect(err.expected).toContain('regex');
      expect(err.got).toBe('no-ulid');
    }
  });
});

describe('validateLogEntry — entradas válidas', () => {
  it.each(Object.values(EVENT_TYPES))('acepta un entry válido de tipo %s', (eventType) => {
    expect(validateLogEntry(validEntry(eventType))).toBe(true);
  });

  it('acepta prev_hash y notes opcionales válidos', () => {
    const entry = validEntry(EVENT_TYPES.RECEIVED, { prev_hash: 'b'.repeat(64), notes: 'todo bien' });
    expect(validateLogEntry(entry)).toBe(true);
  });
});

describe('validateLogEntry — fallos de shape', () => {
  it('rechaza null o no-objeto', () => {
    expect(() => validateLogEntry(null)).toThrow(ValidationError);
    expect(() => validateLogEntry('x')).toThrow(ValidationError);
  });

  it('rechaza id que no es ULID', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { id: 'abc' }))).toThrow(/id/);
  });

  it('rechaza event_type desconocido', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { event_type: 'inventory_x' }))).toThrow(ValidationError);
  });

  it('rechaza timestamp sin formato ISO con offset', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { timestamp: '2026-01-01' }))).toThrow(/timestamp/);
  });

  it('rechaza device_id_lex_hash que no mide exactamente 8 chars', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { device_id_lex_hash: 'ABC' }))).toThrow(/device_id_lex_hash/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { device_id_lex_hash: 'ABCDEFGHI' }))).toThrow(/device_id_lex_hash/);
  });

  it('rechaza sequence_number negativo o no entero', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { sequence_number: -1 }))).toThrow(/sequence_number/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { sequence_number: 1.5 }))).toThrow(/sequence_number/);
  });

  it('rechaza operator_id_hash que no mide 64 chars', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { operator_id_hash: 'short' }))).toThrow(/operator_id_hash/);
  });

  it('rechaza idempotency_key vacío', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { idempotency_key: '' }))).toThrow(/idempotency_key/);
  });

  it('rechaza schema_version distinto de "1"', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { schema_version: '2' }))).toThrow(/schema_version/);
  });

  it('rechaza notes que excede 500 chars', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { notes: 'x'.repeat(501) }))).toThrow(/notes/);
  });
});

describe('validateLogEntry — validación de payload por tipo', () => {
  it('RECEIVED exige delta >= 0, unit válida y source válida', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { payload: { ...PAYLOADS[EVENT_TYPES.RECEIVED], delta: -1 } }))).toThrow(/delta/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { payload: { ...PAYLOADS[EVENT_TYPES.RECEIVED], unit: 'arroba' } }))).toThrow(/unit/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.RECEIVED, { payload: { ...PAYLOADS[EVENT_TYPES.RECEIVED], source: 'robo' } }))).toThrow(/source/);
  });

  it('CONSUMED exige delta <= 0', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.CONSUMED, { payload: { ...PAYLOADS[EVENT_TYPES.CONSUMED], delta: 5 } }))).toThrow(/delta/);
  });

  it('TRANSFORMED exige inputs y outputs no vacíos', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.TRANSFORMED, { payload: { inputs: [], outputs: PAYLOADS[EVENT_TYPES.TRANSFORMED].outputs } }))).toThrow(/inputs/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.TRANSFORMED, { payload: { inputs: PAYLOADS[EVENT_TYPES.TRANSFORMED].inputs, outputs: [] } }))).toThrow(/outputs/);
  });

  it('COUNTED exige counted_qty >= 0', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.COUNTED, { payload: { ...PAYLOADS[EVENT_TYPES.COUNTED], counted_qty: -1 } }))).toThrow(/counted_qty/);
  });

  it('ADJUSTED exige una reason válida', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.ADJUSTED, { payload: { ...PAYLOADS[EVENT_TYPES.ADJUSTED], reason: 'porque_si' } }))).toThrow(/reason/);
  });

  it('TRANSFERRED exige from/to location y qty >= 0', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.TRANSFERRED, { payload: { ...PAYLOADS[EVENT_TYPES.TRANSFERRED], to_location_id: '' } }))).toThrow(/to_location_id/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.TRANSFERRED, { payload: { ...PAYLOADS[EVENT_TYPES.TRANSFERRED], qty: -1 } }))).toThrow(/qty/);
  });

  it('LOST exige delta <= 0 y cause válida', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.LOST, { payload: { ...PAYLOADS[EVENT_TYPES.LOST], cause: 'magia' } }))).toThrow(/cause/);
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.LOST, { payload: { ...PAYLOADS[EVENT_TYPES.LOST], delta: 2 } }))).toThrow(/delta/);
  });

  it('PRODUCED exige delta >= 0', () => {
    expect(() => validateLogEntry(validEntry(EVENT_TYPES.PRODUCED, { payload: { ...PAYLOADS[EVENT_TYPES.PRODUCED], delta: -1 } }))).toThrow(/delta/);
  });
});

describe('createInventoryEvent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exige operator_id_hash', async () => {
    await expect(createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], {})).rejects.toThrow(/operator_id_hash/);
  });

  it('rechaza un eventType inválido', async () => {
    await expect(createInventoryEvent('inventory_x', {}, { operator_id_hash: HASH64 })).rejects.toThrow(ValidationError);
  });

  it('produce un entry válido con id ULID, schema_version y metadatos', async () => {
    const entry = await createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], { operator_id_hash: HASH64 });
    expect(validateLogEntry(entry)).toBe(true);
    expect(entry.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(entry.schema_version).toBe('1');
    expect(entry.event_type).toBe(EVENT_TYPES.RECEIVED);
    expect(entry.device_id_lex_hash).toHaveLength(8);
  });

  it('incrementa sequence_number entre llamadas', async () => {
    const a = await createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], { operator_id_hash: HASH64 });
    const b = await createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], { operator_id_hash: HASH64 });
    expect(b.sequence_number).toBe(a.sequence_number + 1);
  });

  it('respeta idempotency_key, prev_hash y notes provistos', async () => {
    const entry = await createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], {
      operator_id_hash: HASH64,
      idempotency_key: 'manual-key',
      prev_hash: 'c'.repeat(64),
      notes: 'compra semana 1',
    });
    expect(entry.idempotency_key).toBe('manual-key');
    expect(entry.prev_hash).toBe('c'.repeat(64));
    expect(entry.notes).toBe('compra semana 1');
  });

  it('reutiliza el mismo device_id_lex_hash en eventos sucesivos', async () => {
    const a = await createInventoryEvent(EVENT_TYPES.RECEIVED, PAYLOADS[EVENT_TYPES.RECEIVED], { operator_id_hash: HASH64 });
    const b = await createInventoryEvent(EVENT_TYPES.COUNTED, PAYLOADS[EVENT_TYPES.COUNTED], { operator_id_hash: HASH64 });
    expect(a.device_id_lex_hash).toBe(b.device_id_lex_hash);
  });
});
