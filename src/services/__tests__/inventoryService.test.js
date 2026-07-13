import { describe, it, expect, vi } from 'vitest';
import { compareEventOrder, projectStock } from '../inventoryService.js';
import { EVENT_TYPES } from '../inventoryEvents.js';

/**
 * Tests del corazón PURO de inventoryService (ADR-027 event sourcing):
 *   - compareEventOrder: orden canónico determinista
 *   - projectStock: proyección de stock desde el log de eventos
 *
 * No tocan IndexedDB: las funciones bajo prueba son puras y deterministas,
 * que es justo la garantía crítica del modelo ("dos máquinas con los mismos
 * eventos producen el MISMO snapshot").
 */

// Factory de eventos: solo los campos que leen las funciones puras.
let seq = 0;
function ev(overrides = {}) {
  seq += 1;
  return {
    id: overrides.id || `e${seq}`,
    timestamp: overrides.timestamp || '2026-01-01T00:00:00.000Z',
    device_id_lex_hash: overrides.device_id_lex_hash || 'dev_a',
    sequence_number: overrides.sequence_number ?? seq,
    event_type: overrides.event_type || EVENT_TYPES.RECEIVED,
    idempotency_key: overrides.idempotency_key ?? null,
    payload: overrides.payload || { item_id: 'maiz', delta: 10, unit: 'kg' },
  };
}

describe('compareEventOrder', () => {
  it('ordena por timestamp ascendente', () => {
    const a = ev({ timestamp: '2026-01-01T00:00:00.000Z' });
    const b = ev({ timestamp: '2026-01-02T00:00:00.000Z' });
    expect(compareEventOrder(a, b)).toBe(-1);
    expect(compareEventOrder(b, a)).toBe(1);
  });

  it('desempata por device_id_lex_hash cuando el timestamp es igual', () => {
    const t = '2026-01-01T00:00:00.000Z';
    const a = ev({ timestamp: t, device_id_lex_hash: 'dev_a' });
    const b = ev({ timestamp: t, device_id_lex_hash: 'dev_b' });
    expect(compareEventOrder(a, b)).toBe(-1);
    expect(compareEventOrder(b, a)).toBe(1);
  });

  it('desempata por sequence_number cuando timestamp y device coinciden', () => {
    const t = '2026-01-01T00:00:00.000Z';
    const a = ev({ timestamp: t, device_id_lex_hash: 'dev_a', sequence_number: 1 });
    const b = ev({ timestamp: t, device_id_lex_hash: 'dev_a', sequence_number: 5 });
    expect(compareEventOrder(a, b)).toBe(-4);
    expect(compareEventOrder(b, a)).toBe(4);
  });

  it('retorna 0 cuando los tres criterios son iguales', () => {
    const base = { timestamp: '2026-01-01T00:00:00.000Z', device_id_lex_hash: 'dev_a', sequence_number: 3 };
    expect(compareEventOrder(ev(base), ev(base))).toBe(0);
  });

  it('produce un orden canónico al usarse como comparador de Array.sort', () => {
    const t1 = '2026-01-01T00:00:00.000Z';
    const t2 = '2026-01-02T00:00:00.000Z';
    const e1 = ev({ id: 'x', timestamp: t2, device_id_lex_hash: 'dev_a', sequence_number: 1 });
    const e2 = ev({ id: 'y', timestamp: t1, device_id_lex_hash: 'dev_b', sequence_number: 1 });
    const e3 = ev({ id: 'z', timestamp: t1, device_id_lex_hash: 'dev_a', sequence_number: 9 });
    const ordered = [e1, e2, e3].sort(compareEventOrder).map((e) => e.id);
    // t1/dev_a antes que t1/dev_b antes que t2
    expect(ordered).toEqual(['z', 'y', 'x']);
  });
});

describe('projectStock — casos base', () => {
  it('retorna un Map vacío para una lista vacía', () => {
    const stock = projectStock([]);
    expect(stock).toBeInstanceOf(Map);
    expect(stock.size).toBe(0);
  });

  it('un RECEIVED proyecta cantidad, unidad y metadatos', () => {
    const e = ev({ id: 'r1', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } });
    const stock = projectStock([e]);
    const maiz = stock.get('maiz');
    expect(maiz.quantity).toBe(10);
    expect(maiz.unit).toBe('kg');
    expect(/** @type {any} */ (maiz).item_id).toBe('maiz');
    expect(/** @type {any} */ (maiz).last_event_id).toBe('r1');
    expect(/** @type {any} */ (maiz).last_updated).toBe(e.timestamp);
  });

  it('suma múltiples RECEIVED del mismo item', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', payload: { item_id: 'maiz', delta: 5, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(15);
  });

  it('PRODUCED se comporta como entrada (suma delta)', () => {
    const e = ev({ event_type: EVENT_TYPES.PRODUCED, payload: { item_id: 'panela', delta: 8, unit: 'kg' } });
    expect(projectStock([e]).get('panela').quantity).toBe(8);
  });

  it('CONSUMED resta (delta negativo)', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', event_type: EVENT_TYPES.CONSUMED, payload: { item_id: 'maiz', delta: -3, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(7);
  });

  it('LOST y ADJUSTED aplican su delta (negativo)', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', event_type: EVENT_TYPES.LOST, payload: { item_id: 'maiz', delta: -2, unit: 'kg' } }),
      ev({ timestamp: '2026-01-03T00:00:00.000Z', event_type: EVENT_TYPES.ADJUSTED, payload: { item_id: 'maiz', delta: -1, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(7);
  });

  it('CONSUMED fija la unidad cuando aún no había unidad', () => {
    const events = [
      ev({ event_type: EVENT_TYPES.CONSUMED, payload: { item_id: 'abono', delta: -4, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('abono').unit).toBe('kg');
  });
});

describe('projectStock — COUNTED reanchora (LWW honesto)', () => {
  it('COUNTED fija la cantidad absoluta, descartando entradas previas', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 3, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(3);
  });

  it('un RECEIVED posterior al COUNTED suma sobre la cantidad contada', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 3, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', payload: { item_id: 'maiz', delta: 4, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(7);
  });

  it('un RECEIVED anterior al último COUNTED se ignora', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 100, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 5, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(5);
  });

  it('con dos COUNTED gana el último y se ignora lo intermedio', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 50, unit: 'kg' } }),
      ev({ timestamp: '2026-01-02T00:00:00.000Z', payload: { item_id: 'maiz', delta: 99, unit: 'kg' } }),
      ev({ timestamp: '2026-01-03T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 7, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(7);
  });
});

describe('projectStock — idempotency LWW dedupe', () => {
  it('con misma idempotency_key solo contribuye el de mayor timestamp', () => {
    const events = [
      ev({ id: 'a', timestamp: '2026-01-01T00:00:00.000Z', idempotency_key: 'k1', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ id: 'b', timestamp: '2026-01-02T00:00:00.000Z', idempotency_key: 'k1', payload: { item_id: 'maiz', delta: 5, unit: 'kg' } }),
    ];
    // NO suma 15: el ganador LWW es 'b' (ts mayor) → 5
    expect(projectStock(events).get('maiz').quantity).toBe(5);
  });

  it('eventos con idempotency_key distinta sí se suman', () => {
    const events = [
      ev({ id: 'a', timestamp: '2026-01-01T00:00:00.000Z', idempotency_key: 'k1', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ id: 'b', timestamp: '2026-01-02T00:00:00.000Z', idempotency_key: 'k2', payload: { item_id: 'maiz', delta: 5, unit: 'kg' } }),
    ];
    expect(projectStock(events).get('maiz').quantity).toBe(15);
  });
});

describe('projectStock — TRANSFORMED y TRANSFERRED', () => {
  it('TRANSFORMED resta inputs y suma outputs', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'cana', delta: 100, unit: 'kg' } }),
      ev({
        timestamp: '2026-01-02T00:00:00.000Z',
        event_type: EVENT_TYPES.TRANSFORMED,
        payload: {
          inputs: [{ item_id: 'cana', delta_consumido: 30, unit: 'kg' }],
          outputs: [{ item_id: 'panela', delta_producido: 5, unit: 'kg' }],
        },
      }),
    ];
    const stock = projectStock(events);
    expect(stock.get('cana').quantity).toBe(70);
    expect(stock.get('panela').quantity).toBe(5);
  });

  it('TRANSFERRED no altera el stock total (no-op en el snapshot)', () => {
    const events = [
      ev({
        event_type: EVENT_TYPES.TRANSFERRED,
        payload: { item_id: 'maiz', delta: 10, unit: 'kg', from_location: 'bodega', to_location: 'campo' },
      }),
    ];
    expect(projectStock(events).size).toBe(0);
  });
});

describe('projectStock — robustez y determinismo', () => {
  it('un event_type desconocido no lanza ni modifica el stock', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const events = [ev({ event_type: 'inventory_teletransportado', payload: { item_id: 'maiz', delta: 10 } })];
    expect(() => projectStock(events)).not.toThrow();
    expect(projectStock(events).size).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('proyecta items independientes sin mezclarlos', () => {
    const events = [
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } }),
      ev({ timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'frijol', delta: 4, unit: 'kg' } }),
    ];
    const stock = projectStock(events);
    expect(stock.get('maiz').quantity).toBe(10);
    expect(stock.get('frijol').quantity).toBe(4);
    expect(stock.size).toBe(2);
  });

  it('es determinista: cualquier orden de entrada produce el mismo snapshot', () => {
    const e1 = ev({ id: 'r1', timestamp: '2026-01-01T00:00:00.000Z', payload: { item_id: 'maiz', delta: 10, unit: 'kg' } });
    const e2 = ev({ id: 'c1', timestamp: '2026-01-02T00:00:00.000Z', event_type: EVENT_TYPES.CONSUMED, payload: { item_id: 'maiz', delta: -3, unit: 'kg' } });
    const e3 = ev({ id: 'k1', timestamp: '2026-01-03T00:00:00.000Z', event_type: EVENT_TYPES.COUNTED, payload: { item_id: 'maiz', counted_qty: 20, unit: 'kg' } });

    const inOrder = projectStock([e1, e2, e3]).get('maiz').quantity;
    const shuffled = projectStock([e3, e1, e2]).get('maiz').quantity;
    const reversed = projectStock([e3, e2, e1]).get('maiz').quantity;

    expect(inOrder).toBe(20); // el COUNTED final reanchora
    expect(shuffled).toBe(inOrder);
    expect(reversed).toBe(inOrder);
  });

  it('no muta el arreglo de entrada (ordena sobre una copia)', () => {
    const events = [
      ev({ id: 'b', timestamp: '2026-01-02T00:00:00.000Z' }),
      ev({ id: 'a', timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const idsBefore = events.map((e) => e.id);
    projectStock(events);
    expect(events.map((e) => e.id)).toEqual(idsBefore);
  });
});
