import { describe, it, expect } from 'vitest';
import { reconcileInventory } from '../inventoryReconcile';

describe('inventoryReconcile', () => {
    it('debería calcular el stock correctamente con una serie de eventos', () => {
        const events = [
            { id: '1', timestamp: 100, event_type: 'audit', payload: { quantity: { value: 10 } } },
            { id: '2', timestamp: 200, event_type: 'input', payload: { quantity: { value: 2 } } },
            { id: '3', timestamp: 300, event_type: 'refill', payload: { quantity: { value: 5 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.currentStock).toBe(13); // 10 - 2 + 5
        expect(result.history.length).toBe(3);
    });

    it('debería detectar stock negativo', () => {
        const events = [
            { id: '1', timestamp: 100, event_type: 'audit', payload: { quantity: { value: 5 } } },
            { id: '2', timestamp: 200, event_type: 'input', payload: { quantity: { value: 10 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.currentStock).toBe(-5);
        expect(result.issues.some(i => i.type === 'NEGATIVE_STOCK')).toBe(true);
    });

    it('debería detectar gaps de tiempo mayores a 7 días', () => {
        const day = 24 * 60 * 60;
        const events = [
            { id: '1', timestamp: 1000, event_type: 'audit', payload: { quantity: { value: 5 } } },
            { id: '2', timestamp: 1000 + (8 * day), event_type: 'input', payload: { quantity: { value: 1 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.issues.some(i => i.type === 'SEQUENCE_GAP')).toBe(true);
        expect(result.issues.find(i => i.type === 'SEQUENCE_GAP').gapDays).toBe(8);
    });

    it('debería manejar eventos desordenados por timestamp', () => {
        const events = [
            { id: '2', timestamp: 200, event_type: 'input', payload: { quantity: { value: 2 } } },
            { id: '1', timestamp: 100, event_type: 'audit', payload: { quantity: { value: 10 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.currentStock).toBe(8);
    });

    it('debería resetear base con evento audit', () => {
        const events = [
            { id: '1', timestamp: 100, event_type: 'refill', payload: { quantity: { value: 100 } } },
            { id: '2', timestamp: 200, event_type: 'audit', payload: { quantity: { value: 10 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.currentStock).toBe(10);
    });

    it('debería manejar errores de redondeo de punto flotante', () => {
        const events = [
            { id: '1', timestamp: 100, event_type: 'audit', payload: { quantity: { value: 0.1 } } },
            { id: '2', timestamp: 200, event_type: 'refill', payload: { quantity: { value: 0.2 } } },
        ];
        const result = reconcileInventory(events);
        expect(result.currentStock).toBe(0.3); // Sin redondeo esto podría ser 0.30000000000000004
    });
});
