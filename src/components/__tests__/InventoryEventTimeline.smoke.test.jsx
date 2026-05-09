import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InventoryEventTimeline from '../InventoryEventTimeline';

// Mock de dbCore para evitar errores de IndexedDB en entorno JSDOM
vi.mock('../../db/dbCore', () => ({
    openDB: vi.fn().mockResolvedValue({
        transaction: () => ({
            objectStore: () => ({
                index: () => ({
                    getAll: () => ({
                        onsuccess: null,
                        onerror: null
                    })
                }),
                getAll: () => ({
                    onsuccess: null,
                    onerror: null
                })
            })
        })
    }),
    STORES: {
        INVENTORY_EVENTS: 'inventory_events'
    }
}));

describe('InventoryEventTimeline Smoke Test', () => {
    it('debería renderizar sin explotar', () => {
        // Rendereamos el componente. Debería mostrar carga inicialmente.
        render(<InventoryEventTimeline itemId="test-item" />);

        // Verificamos que al menos el texto de carga o el contenedor principal exista
        expect(screen.getByText(/Inventario/i) || screen.getByText(/Cargando/i)).toBeDefined();
    });
});
