/**
 * ClimaStrip.locationButton.test.jsx — bug fix 2026-05-28.
 *
 * El operador reportó: el botón "Configurar ubicación" del widget de clima
 * en Brave laptop no hace nada al click. Causa: el <button> no tenía
 * onClick definido — Brave shields + CSP strict no era el culpable, el
 * handler simplemente no existía.
 *
 * Esta suite verifica:
 *   1. El botón se renderiza cuando no hay municipio (fallback CTA).
 *   2. El click invoca onNavigate('perfil') si el prop está disponible.
 *   3. Si no hay onNavigate, despacha el evento global 'chagra:nav' para
 *      que App.jsx lo capture (defensa cross-mount).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import ClimaStrip from '../ClimaStrip';

// Mock del sidecar para que el componente no intente fetch real.
vi.mock('../../../services/sidecarClient', () => ({
    getClimaIdeam: vi.fn(() => Promise.resolve(null)),
}));

// Mock del store de finca para forzar el branch "sin municipio".
vi.mock('../../../services/fincaActiveStore', () => {
    const store = {
        activeFincaSlug: 'guatoc',
        fincas: [], // sin fincas con municipio → activeFinca undefined → null
    };
    const useFincaActiveStore = (selector) => selector(store);
    return { default: useFincaActiveStore };
});

// Mock del config defaults para que FARM_CONFIG.MUNICIPIO sea null.
vi.mock('../../../config/defaults', () => ({
    FARM_CONFIG: { MUNICIPIO: null },
}));

describe('ClimaStrip — botón "Configurar ubicación" (bug fix Brave 2026-05-28)', () => {
    test('renderiza CTA "Configurar ubicación" cuando no hay municipio', async () => {
        render(<ClimaStrip onNavigate={vi.fn()} />);
        // Promise.resolve().then(setLoading(false)) → esperar al microtask
        const cta = await screen.findByText('Configurar ubicación');
        expect(cta).toBeInTheDocument();
    });

    test('click "Configurar ubicación" invoca onNavigate("perfil")', async () => {
        const onNavigate = vi.fn();
        render(<ClimaStrip onNavigate={onNavigate} />);
        const cta = await screen.findByText('Configurar ubicación');
        fireEvent.click(cta);
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith('perfil');
    });

    test('si no hay onNavigate, despacha evento global "chagra:nav"', async () => {
        const eventSpy = vi.fn();
        window.addEventListener('chagra:nav', eventSpy);
        render(<ClimaStrip />);
        const cta = await screen.findByText('Configurar ubicación');
        fireEvent.click(cta);
        await waitFor(() => expect(eventSpy).toHaveBeenCalledTimes(1));
        const event = eventSpy.mock.calls[0][0];
        expect(event.detail).toBe('perfil');
        window.removeEventListener('chagra:nav', eventSpy);
    });

    test('el botón tiene type="button" (evita submits implícitos)', async () => {
        render(<ClimaStrip onNavigate={vi.fn()} />);
        const cta = await screen.findByText('Configurar ubicación');
        const btn = cta.closest('button');
        expect(btn).toHaveAttribute('type', 'button');
    });
});
