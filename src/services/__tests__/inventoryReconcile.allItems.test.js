import { describe, it, expect } from 'vitest';
import { reconcileAllItems } from '../inventoryReconcile';

const ev = (id, timestamp, event_type, itemId, value) => ({
    id,
    timestamp,
    event_type,
    payload: {
        ...(itemId !== undefined ? { item_id: itemId } : {}),
        quantity: { value },
    },
});

describe('reconcileAllItems', () => {
    it('debería reconciliar cada ítem de forma independiente con su propio resultado', () => {
        const events = [
            // Ítem A: 10 - 2 + 5 = 13
            ev('a1', 100, 'audit', 'item-a', 10),
            ev('a2', 200, 'input', 'item-a', 2),
            ev('a3', 300, 'refill', 'item-a', 5),
            // Ítem B: 3 - 8 = -5 (stock negativo)
            ev('b1', 150, 'audit', 'item-b', 3),
            ev('b2', 250, 'input', 'item-b', 8),
        ];

        const results = reconcileAllItems(events);

        expect(Object.keys(results).sort()).toEqual(['item-a', 'item-b']);

        // Cada ítem tiene su propia forma { currentStock, history, issues }
        expect(results['item-a'].currentStock).toBe(13);
        expect(results['item-a'].history).toHaveLength(3);
        expect(results['item-a'].issues).toEqual([]);

        expect(results['item-b'].currentStock).toBe(-5);
        expect(results['item-b'].history).toHaveLength(2);
        expect(results['item-b'].issues.some(i => i.type === 'NEGATIVE_STOCK')).toBe(true);

        // El historial de un ítem no contiene eventos de otro ítem
        expect(results['item-a'].history.every(h => h.payload.item_id === 'item-a')).toBe(true);
        expect(results['item-b'].history.every(h => h.payload.item_id === 'item-b')).toBe(true);
    });

    it('debería saltar eventos sin item_id', () => {
        const events = [
            ev('a1', 100, 'audit', 'item-a', 10),
            ev('x1', 200, 'refill', undefined, 999), // sin item_id -> ignorado
            { id: 'x2', timestamp: 300, event_type: 'refill', payload: null }, // sin payload -> ignorado
        ];

        const results = reconcileAllItems(events);

        expect(Object.keys(results)).toEqual(['item-a']);
        expect(results['item-a'].currentStock).toBe(10);
        expect(results['item-a'].history).toHaveLength(1);
    });

    it('debería retornar objeto vacío para input vacío', () => {
        expect(reconcileAllItems([])).toEqual({});
    });

    it('un audit debería resetear la base solo del ítem propio, sin cruzar ítems', () => {
        const events = [
            // Ítem A acumula 100 y luego un audit lo resetea a 10
            ev('a1', 100, 'refill', 'item-a', 100),
            ev('a2', 200, 'audit', 'item-a', 10),
            // Ítem B solo acumula, no lo toca el audit de A
            ev('b1', 100, 'refill', 'item-b', 50),
            ev('b2', 300, 'refill', 'item-b', 25),
        ];

        const results = reconcileAllItems(events);

        expect(results['item-a'].currentStock).toBe(10);
        expect(results['item-a'].history.find(h => h.id === 'a2').isAudit).toBe(true);

        // Ítem B conserva su suma independiente (50 + 25), sin verse afectado
        expect(results['item-b'].currentStock).toBe(75);
        expect(results['item-b'].history.every(h => h.isAudit === false)).toBe(true);
    });
});
