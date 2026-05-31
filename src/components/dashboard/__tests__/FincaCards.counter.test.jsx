/**
 * FincaCards.counter.test.jsx — contador prominente (feedback operador 2026-05-30).
 *
 * El operador pidió que el conteo de plantas/zonas se vea GRANDE y legible de
 * un vistazo: es la información más importante de cada card del dashboard.
 * Antes el badge era text-[11px] minúsculo en la esquina. Esta suite verifica
 * que el valor:
 *   1. Se renderiza con el conteo real del store.
 *   2. Usa tipografía grande (text-lg / text-xl) — no el text-[11px] viejo.
 *   3. Aplica a TODAS las cards con conteo (PlantasCard, ZonasCard, …) por
 *      compartir el mismo componente base.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

// Store mock: controla plants/lands/materials + isHydrated por test.
let storeState = { plants: [], lands: [], materials: [], isHydrated: true };
vi.mock('../../../store/useAssetStore', () => ({
    default: (selector) => selector(storeState),
}));

import { PlantasCard, ZonasCard, InsumosCard } from '../FincaCards';

afterEach(() => {
    cleanup();
    storeState = { plants: [], lands: [], materials: [], isHydrated: true };
});

describe('FincaCards — contador prominente (variant grid)', () => {
    test('PlantasCard muestra el conteo real en el badge', () => {
        storeState = { ...storeState, plants: new Array(42).fill({}), isHydrated: true };
        render(<PlantasCard variant="grid" onNavigate={vi.fn()} />);
        const count = screen.getByTestId('finca-card-count');
        expect(count).toHaveTextContent('42');
    });

    test('el contador usa tipografía GRANDE (text-lg/xl), no el text-[11px] viejo', () => {
        storeState = { ...storeState, plants: new Array(7).fill({}), isHydrated: true };
        render(<PlantasCard variant="grid" onNavigate={vi.fn()} />);
        const count = screen.getByTestId('finca-card-count');
        // Debe ser legible de un vistazo: text-lg o text-xl, font-black.
        expect(count.className).toMatch(/text-(lg|xl)/);
        expect(count.className).toContain('font-black');
        // Regresión: el badge minúsculo previo NO debe volver.
        expect(count.className).not.toContain('text-[11px]');
    });

    test('ZonasCard también muestra el conteo grande (mismo componente base)', () => {
        storeState = { ...storeState, lands: new Array(5).fill({}), isHydrated: true };
        render(<ZonasCard variant="grid" onNavigate={vi.fn()} />);
        const count = screen.getByTestId('finca-card-count');
        expect(count).toHaveTextContent('5');
        expect(count.className).toMatch(/text-(lg|xl)/);
    });

    test('InsumosCard muestra el conteo grande', () => {
        storeState = { ...storeState, materials: new Array(13).fill({}), isHydrated: true };
        render(<InsumosCard variant="grid" onNavigate={vi.fn()} />);
        const count = screen.getByTestId('finca-card-count');
        expect(count).toHaveTextContent('13');
        expect(count.className).toMatch(/text-(lg|xl)/);
    });

    test('mientras no hidrata no muestra contador (skeleton en su lugar)', () => {
        storeState = { ...storeState, plants: new Array(9).fill({}), isHydrated: false };
        render(<PlantasCard variant="grid" onNavigate={vi.fn()} />);
        expect(screen.queryByTestId('finca-card-count')).toBeNull();
    });
});
