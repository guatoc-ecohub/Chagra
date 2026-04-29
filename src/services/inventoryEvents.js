/**
 * inventoryEvents — runtime validators + factory para los 8 tipos canónicos
 * de eventos de inventario (ADR-027.i + ADR-027.ii).
 *
 * NO usa Zod (dependencia externa) — validación inline minimal pero estricta.
 * El log es append-only inmutable: una vez escrito, NUNCA se modifica.
 *
 * Para corregir un error operacional → emitir `inventory_adjusted` con razón.
 * Para reanchorar stock manual → emitir `inventory_counted` (LWW honesto).
 */

import { ulid } from 'ulid';

// ─── Enums canónicos ─────────────────────────────────────────────────

export const EVENT_TYPES = Object.freeze({
  RECEIVED: 'inventory_received',
  CONSUMED: 'inventory_consumed',
  TRANSFORMED: 'inventory_transformed',
  COUNTED: 'inventory_counted',
  ADJUSTED: 'inventory_adjusted',
  TRANSFERRED: 'inventory_transferred',
  LOST: 'inventory_lost',
  PRODUCED: 'inventory_produced',
});

export const VALID_EVENT_TYPES = new Set(Object.values(EVENT_TYPES));

export const VALID_UNITS = new Set([
  'kg', 'g', 'litro', 'ml', 'unidad', 'm2', 'paquete', 'bolsa', 'galon',
]);

export const VALID_RECEIVED_SOURCES = new Set([
  'compra', 'cosecha', 'donacion', 'transferencia_in',
]);

export const VALID_ADJUSTED_REASONS = new Set([
  'error_registro', 'recategorizacion', 'correccion_unidad',
]);

export const VALID_LOST_CAUSES = new Set([
  'derrame', 'plaga', 'vencimiento', 'daño_climatico', 'roedor', 'desconocido',
]);

// ─── Validación ──────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(field, expected, got) {
    super(`Invalid ${field}: expected ${expected}, got ${JSON.stringify(got)}`);
    this.field = field;
    this.expected = expected;
    this.got = got;
  }
}

function assertString(field, value, opts = {}) {
  if (typeof value !== 'string') throw new ValidationError(field, 'string', value);
  if (opts.minLen != null && value.length < opts.minLen) throw new ValidationError(field, `string len ≥ ${opts.minLen}`, value);
  if (opts.maxLen != null && value.length > opts.maxLen) throw new ValidationError(field, `string len ≤ ${opts.maxLen}`, value);
  if (opts.regex && !opts.regex.test(value)) throw new ValidationError(field, `regex ${opts.regex}`, value);
  if (opts.oneOf && !opts.oneOf.has(value)) throw new ValidationError(field, `one of ${[...opts.oneOf].join('|')}`, value);
}

function assertNumber(field, value, opts = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(field, 'finite number', value);
  if (opts.min != null && value < opts.min) throw new ValidationError(field, `number ≥ ${opts.min}`, value);
  if (opts.max != null && value > opts.max) throw new ValidationError(field, `number ≤ ${opts.max}`, value);
  if (opts.integer && !Number.isInteger(value)) throw new ValidationError(field, 'integer', value);
}

function assertNonEmptyArray(field, value) {
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError(field, 'non-empty array', value);
}

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const ISO_DATETIME_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;

// ─── Validador de payload por event_type ─────────────────────────────

function validatePayload(eventType, payload) {
  if (typeof payload !== 'object' || payload == null) {
    throw new ValidationError('payload', 'object', payload);
  }
  switch (eventType) {
    case EVENT_TYPES.RECEIVED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.delta', payload.delta, { min: 0 });
      assertString('payload.unit', payload.unit, { oneOf: VALID_UNITS });
      assertString('payload.source', payload.source, { oneOf: VALID_RECEIVED_SOURCES });
      if (payload.provider_ref != null) assertString('payload.provider_ref', payload.provider_ref, { maxLen: 200 });
      break;

    case EVENT_TYPES.CONSUMED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.delta', payload.delta, { max: 0 }); // negativo
      assertString('payload.unit', payload.unit, { oneOf: VALID_UNITS });
      if (payload.application_log_ref != null) assertString('payload.application_log_ref', payload.application_log_ref);
      break;

    case EVENT_TYPES.TRANSFORMED:
      assertNonEmptyArray('payload.inputs', payload.inputs);
      assertNonEmptyArray('payload.outputs', payload.outputs);
      payload.inputs.forEach((inp, i) => {
        assertString(`payload.inputs[${i}].item_id`, inp.item_id, { minLen: 1 });
        assertNumber(`payload.inputs[${i}].delta_consumido`, inp.delta_consumido, { min: 0 });
        assertString(`payload.inputs[${i}].unit`, inp.unit, { oneOf: VALID_UNITS });
      });
      payload.outputs.forEach((out, i) => {
        assertString(`payload.outputs[${i}].item_id`, out.item_id, { minLen: 1 });
        assertNumber(`payload.outputs[${i}].delta_producido`, out.delta_producido, { min: 0 });
        assertString(`payload.outputs[${i}].unit`, out.unit, { oneOf: VALID_UNITS });
      });
      if (payload.recipe_id != null) assertString('payload.recipe_id', payload.recipe_id);
      break;

    case EVENT_TYPES.COUNTED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.counted_qty', payload.counted_qty, { min: 0 });
      assertString('payload.unit', payload.unit, { oneOf: VALID_UNITS });
      if (payload.notes != null) assertString('payload.notes', payload.notes, { maxLen: 500 });
      break;

    case EVENT_TYPES.ADJUSTED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.delta', payload.delta);
      assertString('payload.reason', payload.reason, { oneOf: VALID_ADJUSTED_REASONS });
      break;

    case EVENT_TYPES.TRANSFERRED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertString('payload.from_location_id', payload.from_location_id, { minLen: 1 });
      assertString('payload.to_location_id', payload.to_location_id, { minLen: 1 });
      assertNumber('payload.qty', payload.qty, { min: 0 });
      break;

    case EVENT_TYPES.LOST:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.delta', payload.delta, { max: 0 });
      assertString('payload.cause', payload.cause, { oneOf: VALID_LOST_CAUSES });
      if (payload.evidence_photo_ref != null) assertString('payload.evidence_photo_ref', payload.evidence_photo_ref);
      break;

    case EVENT_TYPES.PRODUCED:
      assertString('payload.item_id', payload.item_id, { minLen: 1 });
      assertNumber('payload.delta', payload.delta, { min: 0 });
      if (payload.production_batch_id != null) assertString('payload.production_batch_id', payload.production_batch_id);
      break;

    default:
      throw new ValidationError('event_type', 'one of EVENT_TYPES', eventType);
  }
}

// ─── Shape principal del log entry ────────────────────────────────────

/**
 * Valida un log entry completo conforme ADR-027.ii.
 * Lanza ValidationError si algo no cumple. Útil ANTES de persistir.
 */
export function validateLogEntry(entry) {
  if (typeof entry !== 'object' || entry == null) throw new ValidationError('entry', 'object', entry);
  assertString('id', entry.id, { regex: ULID_REGEX });
  assertString('event_type', entry.event_type, { oneOf: VALID_EVENT_TYPES });
  assertString('timestamp', entry.timestamp, { regex: ISO_DATETIME_OFFSET_REGEX });
  assertString('device_id_lex_hash', entry.device_id_lex_hash, { minLen: 8, maxLen: 8 });
  assertNumber('sequence_number', entry.sequence_number, { min: 0, integer: true });
  assertString('operator_id_hash', entry.operator_id_hash, { minLen: 64, maxLen: 64 });
  assertString('idempotency_key', entry.idempotency_key, { minLen: 1 });
  if (entry.prev_hash != null) assertString('prev_hash', entry.prev_hash, { minLen: 64, maxLen: 64 });
  validatePayload(entry.event_type, entry.payload);
  if (entry.schema_version !== '1') throw new ValidationError('schema_version', '"1"', entry.schema_version);
  if (entry.notes != null) assertString('notes', entry.notes, { maxLen: 500 });
  return true;
}

// ─── Helpers para identidad del device ────────────────────────────────

const DEVICE_LEX_HASH_KEY = 'chagra:device_id_lex_hash';

async function getOrCreateDeviceLexHash() {
  let hash = localStorage.getItem(DEVICE_LEX_HASH_KEY);
  if (hash) return hash;
  // Genera 8 chars Crockford-Base32 random
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  hash = Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
  localStorage.setItem(DEVICE_LEX_HASH_KEY, hash);
  return hash;
}

const SEQ_NUM_KEY = 'chagra:inventory_seq_num';

function nextSequenceNumber() {
  const cur = parseInt(localStorage.getItem(SEQ_NUM_KEY) || '0', 10);
  const next = cur + 1;
  localStorage.setItem(SEQ_NUM_KEY, String(next));
  return next;
}

// ─── Factory para crear nuevos eventos ────────────────────────────────

/**
 * Crea un log entry completo con id ULID, timestamp, device hash, sequence.
 * El operator_id_hash debe inyectarse desde el authService (no se calcula acá
 * para no requerir importar el HMAC stack).
 *
 * @param {string} eventType - uno de EVENT_TYPES
 * @param {object} payload - payload tipado según eventType
 * @param {object} opts - { operator_id_hash (req), idempotency_key (opt — si no, se calcula),
 *                          prev_hash (opt), notes (opt) }
 * @returns {object} log entry validado, listo para persistir
 */
export async function createInventoryEvent(eventType, payload, opts = {}) {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new ValidationError('eventType', 'one of EVENT_TYPES', eventType);
  }
  if (!opts.operator_id_hash) {
    throw new ValidationError('opts.operator_id_hash', 'required string (HMAC-SHA256)', opts.operator_id_hash);
  }
  const deviceHash = await getOrCreateDeviceLexHash();
  const idempotencyKey = opts.idempotency_key || computeIdempotencyKey(eventType, payload);

  const entry = {
    id: ulid(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    device_id_lex_hash: deviceHash,
    sequence_number: nextSequenceNumber(),
    operator_id_hash: opts.operator_id_hash,
    idempotency_key: idempotencyKey,
    payload,
    schema_version: '1',
  };
  if (opts.prev_hash) entry.prev_hash = opts.prev_hash;
  if (opts.notes) entry.notes = opts.notes;

  validateLogEntry(entry);
  return entry;
}

/**
 * Hash determinista para idempotencia. Best-effort: combina event_type +
 * campos semánticos del payload + día. Dos events con misma key son
 * considerados duplicados al reconciliar (LWW).
 */
function computeIdempotencyKey(eventType, payload) {
  const day = new Date().toISOString().slice(0, 10);
  switch (eventType) {
    case EVENT_TYPES.RECEIVED:
      return `${eventType}:${payload.item_id}:${payload.source}:${payload.provider_ref || '_'}:${day}`;
    case EVENT_TYPES.CONSUMED:
      return `${eventType}:${payload.item_id}:${payload.application_log_ref || ulid()}`;
    case EVENT_TYPES.COUNTED:
      // Conteos son inherentemente únicos por timestamp — agregar nano random
      return `${eventType}:${payload.item_id}:${day}:${ulid().slice(-8)}`;
    case EVENT_TYPES.TRANSFORMED:
      return `${eventType}:${payload.recipe_id || 'adhoc'}:${day}:${ulid().slice(-8)}`;
    default:
      return `${eventType}:${payload.item_id || 'unknown'}:${ulid().slice(-12)}`;
  }
}

export { ValidationError };
