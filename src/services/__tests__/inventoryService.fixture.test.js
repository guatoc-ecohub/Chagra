/**
 * inventoryService — tests fixture de la proyección pura.
 *
 * Verifica las garantías de ADR-027 Alt E:
 *   1. Determinismo: dos runs sobre los mismos events producen el mismo stock.
 *   2. Conteo manual reanchora correctamente (LWW honesto).
 *   3. Idempotency dedupe: events duplicados no doblan el stock.
 *   4. Orden canónico (timestamp + device + sequence) consistente.
 *
 * Estos tests NO requieren IndexedDB — son sobre la función pura projectStock().
 * Para integration tests con IndexedDB, ver e2e Playwright tests.
 */

import { describe, it, expect } from 'vitest';
import { projectStock, compareEventOrder } from '../inventoryService.js';
import { EVENT_TYPES } from '../inventoryEvents.js';

// Helper — construye un event con defaults sanos
function evt(eventType, payload, opts = {}) {
  return {
    id: opts.id || crypto.randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase(),
    event_type: eventType,
    timestamp: opts.timestamp || new Date().toISOString(),
    device_id_lex_hash: opts.device || 'AAAA0000',
    sequence_number: opts.seq ?? 1,
    operator_id_hash: 'a'.repeat(64),
    idempotency_key: opts.idempotency_key || `${eventType}:${payload.item_id || 'x'}:${Math.random()}`,
    payload,
    schema_version: '1',
  };
}

describe('projectStock — determinismo', () => {
  it('un solo received → stock igual al delta', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(50);
    expect(stock.get('compost-A').unit).toBe('kg');
  });

  it('received + consumed → suma correcta', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00' }),
      evt(EVENT_TYPES.CONSUMED, { item_id: 'compost-A', delta: -15, unit: 'kg' },
        { timestamp: '2026-04-29T10:00:00-05:00' }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(35);
  });

  it('orden de input no afecta el output (insertion-order independence)', () => {
    const e1 = evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' },
      { timestamp: '2026-04-29T08:00:00-05:00', seq: 1 });
    const e2 = evt(EVENT_TYPES.CONSUMED, { item_id: 'compost-A', delta: -15, unit: 'kg' },
      { timestamp: '2026-04-29T10:00:00-05:00', seq: 2 });
    const e3 = evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 30, unit: 'kg', source: 'cosecha' },
      { timestamp: '2026-04-29T12:00:00-05:00', seq: 3 });

    const order1 = projectStock([e1, e2, e3]);
    const order2 = projectStock([e3, e1, e2]);
    const order3 = projectStock([e2, e3, e1]);

    expect(order1.get('compost-A').quantity).toBe(65);
    expect(order2.get('compost-A').quantity).toBe(65);
    expect(order3.get('compost-A').quantity).toBe(65);
  });
});

describe('projectStock — counted reanchora', () => {
  it('counted descarta contribuciones anteriores y reancla', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', seq: 1 }),
      evt(EVENT_TYPES.CONSUMED, { item_id: 'compost-A', delta: -15, unit: 'kg' },
        { timestamp: '2026-04-29T10:00:00-05:00', seq: 2 }),
      // Operador cuenta físicamente: solo hay 30 kg (debió haber 35)
      evt(EVENT_TYPES.COUNTED, { item_id: 'compost-A', counted_qty: 30, unit: 'kg', notes: 'recount post deterioro' },
        { timestamp: '2026-04-29T14:00:00-05:00', seq: 3 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(30);
  });

  it('counted seguido de consumed → counted gana hasta el counted, después acumula', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', seq: 1 }),
      evt(EVENT_TYPES.COUNTED, { item_id: 'compost-A', counted_qty: 40, unit: 'kg' },
        { timestamp: '2026-04-29T10:00:00-05:00', seq: 2 }),
      evt(EVENT_TYPES.CONSUMED, { item_id: 'compost-A', delta: -10, unit: 'kg' },
        { timestamp: '2026-04-29T12:00:00-05:00', seq: 3 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(30);
  });
});

describe('projectStock — idempotency dedupe', () => {
  it('events duplicados con misma idempotency_key NO doblan el stock', () => {
    const sharedKey = 'inventory_received:compost-A:compra:proveedor-X:2026-04-29';
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra', provider_ref: 'proveedor-X' },
        { timestamp: '2026-04-29T08:00:00-05:00', idempotency_key: sharedKey, seq: 1 }),
      // Mismo event re-enviado por sync retry — debe ser dedupe
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra', provider_ref: 'proveedor-X' },
        { timestamp: '2026-04-29T08:00:00-05:00', idempotency_key: sharedKey, seq: 2 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(50); // NO 100
  });

  it('events con diferente idempotency_key SÍ se acumulan (compras distintas)', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 50, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', idempotency_key: 'k-1', seq: 1 }),
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost-A', delta: 30, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T09:00:00-05:00', idempotency_key: 'k-2', seq: 2 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost-A').quantity).toBe(80);
  });
});

describe('projectStock — transformed (compost, biopreparados)', () => {
  it('transformed resta inputs y suma outputs', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'gallinaza', delta: 40, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', seq: 1 }),
      evt(EVENT_TYPES.RECEIVED, { item_id: 'cascarilla-arroz', delta: 40, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:30:00-05:00', seq: 2 }),
      evt(EVENT_TYPES.RECEIVED, { item_id: 'melaza', delta: 4, unit: 'litro', source: 'compra' },
        { timestamp: '2026-04-29T09:00:00-05:00', seq: 3 }),
      // Bocashi — transformación atómica
      evt(EVENT_TYPES.TRANSFORMED, {
        inputs: [
          { item_id: 'gallinaza', delta_consumido: 40, unit: 'kg' },
          { item_id: 'cascarilla-arroz', delta_consumido: 40, unit: 'kg' },
          { item_id: 'melaza', delta_consumido: 4, unit: 'litro' },
        ],
        outputs: [
          { item_id: 'bocashi', delta_producido: 80, unit: 'kg' },
        ],
        recipe_id: 'recipe-bocashi-v1',
      }, { timestamp: '2026-04-29T10:00:00-05:00', seq: 4 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('gallinaza').quantity).toBe(0);
    expect(stock.get('cascarilla-arroz').quantity).toBe(0);
    expect(stock.get('melaza').quantity).toBe(0);
    expect(stock.get('bocashi').quantity).toBe(80);
  });
});

describe('projectStock — orden canónico (timestamp + device + sequence)', () => {
  it('mismo timestamp pero distinto device → orden lexicográfico', () => {
    const events = [
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost', delta: 10, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', device: 'BBBB1111', seq: 1 }),
      evt(EVENT_TYPES.RECEIVED, { item_id: 'compost', delta: 5, unit: 'kg', source: 'compra' },
        { timestamp: '2026-04-29T08:00:00-05:00', device: 'AAAA0000', seq: 1 }),
    ];
    const stock = projectStock(events);
    expect(stock.get('compost').quantity).toBe(15);
    // El orden canónico debe ser determinista — A antes que B
    expect(stock.get('compost').last_event_id).toBe(events[0].id); // timestamp ties → device 'BBBB1111' is later
  });

  it('compareEventOrder es determinista', () => {
    const a = evt(EVENT_TYPES.RECEIVED, { item_id: 'x', delta: 1, unit: 'kg', source: 'compra' },
      { timestamp: '2026-04-29T08:00:00-05:00', device: 'AAAA0000', seq: 1 });
    const b = evt(EVENT_TYPES.RECEIVED, { item_id: 'x', delta: 1, unit: 'kg', source: 'compra' },
      { timestamp: '2026-04-29T08:00:00-05:00', device: 'AAAA0000', seq: 2 });
    expect(compareEventOrder(a, b)).toBeLessThan(0);
    expect(compareEventOrder(b, a)).toBeGreaterThan(0);
    expect(compareEventOrder(a, a)).toBe(0);
  });
});
