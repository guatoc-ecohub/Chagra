/**
 * ClimaStrip.coarseConfidence.test.jsx — confianza de ubicación en el widget de
 * clima (mitad geo de #364, 2026-06-03).
 *
 * Problema del operador: el clima usa la ubicación GUARDADA del perfil. En
 * Brave los Shields difuminaron el GPS durante el onboarding y se grabó la
 * cabecera del municipio grande/caliente (no su vereda). El widget afirmaba
 * "Clima en {municipio}" con plena confianza aunque esa zona esté equivocada.
 *
 * Esta suite verifica que:
 *   (a) ubicación guardada GRUESA → el widget NO afirma el municipio con
 *       confianza: muestra un aviso "Confirme su ubicación para un clima
 *       exacto" con CTA al mini-mapa (ubicacion-detectada).
 *   (b) ubicación PRECISA o confirmada por el usuario → NO molesta (sin aviso).
 *   (c) cuando hay municipio, SIEMPRE hay una vía prominente para corregir la
 *       ubicación (re-pin) que navega a ubicacion-detectada.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ClimaStrip from '../ClimaStrip';

vi.mock('../../../services/climaService', () => ({
    fetchClimaSnapshot: vi.fn(() => Promise.resolve(null)),
    getCachedClimaSnapshot: vi.fn(() => null),
}));
import { fetchClimaSnapshot } from '../../../services/climaService';

vi.mock('../../../utils/colombiaLocations', () => ({
    findMunicipio: vi.fn(() => null),
}));
import { findMunicipio } from '../../../utils/colombiaLocations';

vi.mock('../../../services/fincaActiveStore', () => {
    const store = { activeFincaSlug: 'guatoc', fincas: [] };
    const useFincaActiveStore = (selector) => selector(store);
    return { default: useFincaActiveStore };
});

vi.mock('../../../config/defaults', () => ({
    FARM_CONFIG: { MUNICIPIO: null },
}));

vi.mock('../../../services/userProfileService', () => {
    const getProfile = vi.fn(() => ({}));
    const getProfileMunicipio = vi.fn(() => /** @type {any} */ (getProfile())?.municipio ?? null);
    return { getProfile, getProfileMunicipio, isModuleVisible: vi.fn(() => true) };
});
import { getProfile, getProfileMunicipio } from '../../../services/userProfileService';

beforeEach(() => {
    vi.mocked(fetchClimaSnapshot).mockReset();
    vi.mocked(fetchClimaSnapshot).mockResolvedValue(null);
    vi.mocked(findMunicipio).mockReset();
    vi.mocked(findMunicipio).mockReturnValue(null);
    vi.mocked(getProfile).mockReset();
    vi.mocked(getProfile).mockReturnValue({});
    vi.mocked(getProfileMunicipio).mockReset();
    vi.mocked(getProfileMunicipio).mockImplementation(() => getProfile()?.municipio ?? null);
});

describe('ClimaStrip — degradación de confianza con ubicación guardada gruesa', () => {
    test('ubicación guardada GRUESA → muestra aviso "Confirme su ubicación" (no afirma el municipio)', async () => {
        // Perfil del operador: coords + municipio guardados, PERO la lectura fue
        // gruesa (accuracy 12 km, Brave) y nunca corrigió la altitud a mano.
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Bogotá',
            ubicacion_lat: 4.61,
            ubicacion_lng: -74.08,
            ubicacion_accuracy: 12000,
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Bogotá');
        render(<ClimaStrip onNavigate={vi.fn()} />);

        const warning = await screen.findByTestId('clima-coarse-warning');
        expect(warning).toHaveTextContent(/confirme su ubicación/i);
    });

    test('aviso gruesa → CTA navega a ubicacion-detectada (mini-mapa)', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Bogotá',
            ubicacion_lat: 4.61,
            ubicacion_lng: -74.08,
            ubicacion_accuracy: 12000,
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Bogotá');
        const onNavigate = vi.fn();
        render(<ClimaStrip onNavigate={onNavigate} />);

        const cta = await screen.findByTestId('clima-coarse-cta');
        fireEvent.click(cta);
        expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
    });

    test('ubicación PRECISA (accuracy fino) → NO muestra el aviso de confianza', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            ubicacion_accuracy: 35,
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Choachí');
        render(<ClimaStrip onNavigate={vi.fn()} />);

        await screen.findByText(/Clima en/i);
        expect(screen.queryByTestId('clima-coarse-warning')).not.toBeInTheDocument();
    });

    test('ubicación gruesa pero altitud confirmada a mano → NO molesta', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            ubicacion_accuracy: 12000,
            altitud_source: 'manual',
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Choachí');
        render(<ClimaStrip onNavigate={vi.fn()} />);

        await screen.findByText(/Clima en/i);
        expect(screen.queryByTestId('clima-coarse-warning')).not.toBeInTheDocument();
    });
});

describe('ClimaStrip — re-fijar ubicación siempre alcanzable (re-pin)', () => {
    test('con municipio, hay un botón prominente para corregir la ubicación → ubicacion-detectada', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            ubicacion_accuracy: 35,
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Choachí');
        const onNavigate = vi.fn();
        render(<ClimaStrip onNavigate={onNavigate} />);

        const repin = await screen.findByTestId('clima-repin');
        fireEvent.click(repin);
        expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
    });

    test('sin onNavigate, el re-pin despacha el evento global chagra:nav', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            ubicacion_accuracy: 35,
        });
        vi.mocked(getProfileMunicipio).mockReturnValue('Choachí');
        const eventSpy = vi.fn();
        window.addEventListener('chagra:nav', eventSpy);
        render(<ClimaStrip onNavigate={() => {}} />);

        const repin = await screen.findByTestId('clima-repin');
        fireEvent.click(repin);
        await waitFor(() => expect(eventSpy).toHaveBeenCalledTimes(1));
        expect(eventSpy.mock.calls[0][0].detail).toBe('ubicacion-detectada');
        window.removeEventListener('chagra:nav', eventSpy);
    });
});
