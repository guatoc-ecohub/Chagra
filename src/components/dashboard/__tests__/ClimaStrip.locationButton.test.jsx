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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ClimaStrip from '../ClimaStrip';

// Mock de climaService para que el componente no haga fetch real al sidecar.
// Default: sin snapshot (Open-Meteo no disponible). Los tests del pronóstico
// real lo sobreescriben con `mockResolvedValueOnce`.
vi.mock('../../../services/climaService', () => ({
    fetchClimaSnapshot: vi.fn(() => Promise.resolve(null)),
    getCachedClimaSnapshot: vi.fn(() => null),
}));
import { fetchClimaSnapshot } from '../../../services/climaService';

// findMunicipio es real (dataset DANE local) salvo donde un test necesite
// controlar el match. Mockeamos para tener coords deterministas y evitar
// acoplar el test a la presencia de un municipio puntual en el dataset.
vi.mock('../../../utils/colombiaLocations', () => ({
    findMunicipio: vi.fn(() => null),
}));
import { findMunicipio } from '../../../utils/colombiaLocations';

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

// Mock del perfil. Default {} (sin municipio) → los tests existentes ven el
// branch "Configurar ubicación". El test del bug fix 2026-05-30 lo sobreescribe.
vi.mock('../../../services/userProfileService', () => {
    const getProfile = vi.fn(() => ({}));
    // ClimaStrip deriva el municipio via getProfileMunicipio (#338): prefiere
    // profile.municipio, con fallback offline a resolver profile.region. El mock
    // refleja esa semántica real (deriva de getProfile().municipio) para que los
    // tests solo necesiten fijar getProfile() y no acoplarse a dos mocks; los
    // tests que quieran probar el fallback de región pueden sobrescribirlo con
    // mockReturnValue/Once.
    const getProfileMunicipio = vi.fn(() => /** @type {any} */ (getProfile())?.municipio ?? null);
    return { getProfile, getProfileMunicipio, isModuleVisible: vi.fn(() => true) };
});
import { getProfile, getProfileMunicipio } from '../../../services/userProfileService';

// Aislamiento entre tests: el mock de fetchClimaSnapshot es de módulo, así que
// su historial de llamadas y su cola de `mockResolvedValueOnce` se acumulan de
// un test al siguiente. Sin esto, los asserts `toHaveBeenCalledWith(...)` ven
// la llamada del render anterior (p.ej. la elevación 2580 del test "coords +
// altitud" se filtra a los tests que esperan la altitud curada del DANE) y los
// snapshots `Once` se consumen fuera de orden. Lo restauramos al default
// (sin snapshot) antes de cada test; cada test fija su propio `Once`.
beforeEach(() => {
    vi.mocked(fetchClimaSnapshot).mockReset();
    vi.mocked(fetchClimaSnapshot).mockResolvedValue(null);
    // Mismo problema con findMunicipio: su cola de `mockReturnValueOnce` y su
    // historial se filtran entre tests (los efectos asíncronos de un render
    // anterior pueden consumir el `Once` del test actual). Lo restauramos al
    // default (sin match DANE) antes de cada test.
    vi.mocked(findMunicipio).mockReset();
    vi.mocked(findMunicipio).mockReturnValue(null);
    // getProfileMunicipio: algunos tests lo fijan con mockReturnValue(...) y eso
    // reemplaza la implementación para TODOS los tests posteriores. Restauramos
    // la semántica real (deriva de getProfile().municipio) antes de cada test;
    // los tests que prueban el fallback de región la sobrescriben localmente.
    vi.mocked(getProfileMunicipio).mockReset();
    vi.mocked(getProfileMunicipio).mockImplementation(() => getProfile()?.municipio ?? null);
});

describe('ClimaStrip — botón "Configurar ubicación" (bug fix Brave 2026-05-28)', () => {
    test('renderiza CTA "Configurar ubicación" cuando no hay municipio', async () => {
        render(<ClimaStrip onNavigate={vi.fn()} />);
        // Promise.resolve().then(setLoading(false)) → esperar al microtask
        const cta = await screen.findByText('Configurar ubicación');
        expect(cta).toBeInTheDocument();
    });

    test('click "Configurar ubicación" invoca onNavigate("ubicacion-detectada")', async () => {
        const onNavigate = vi.fn();
        render(<ClimaStrip onNavigate={onNavigate} />);
        const cta = await screen.findByText('Configurar ubicación');
        fireEvent.click(cta);
        expect(onNavigate).toHaveBeenCalledTimes(1);
        // #201: navega a la pantalla dedicada de ubicación (mini mapa + piso térmico).
        expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
    });

    test('si no hay onNavigate, despacha evento global "chagra:nav"', async () => {
        const eventSpy = vi.fn();
        window.addEventListener('chagra:nav', eventSpy);
        render(<ClimaStrip onNavigate={() => {}} />);
        const cta = await screen.findByText('Configurar ubicación');
        fireEvent.click(cta);
        await waitFor(() => expect(eventSpy).toHaveBeenCalledTimes(1));
        const event = eventSpy.mock.calls[0][0];
        expect(event.detail).toBe('ubicacion-detectada');
        window.removeEventListener('chagra:nav', eventSpy);
    });

    test('el botón tiene type="button" (evita submits implícitos)', async () => {
        render(<ClimaStrip onNavigate={vi.fn()} />);
        const cta = await screen.findByText('Configurar ubicación');
        const btn = cta.closest('button');
        expect(btn).toHaveAttribute('type', 'button');
    });
});

/**
 * Bug fix 2026-05-30 — el operador reportó: tras confirmar la ubicación en
 * LocationDetectedScreen y volver al home, el menú "Configurar ubicación"
 * SEGUÍA apareciendo "como si no lo hubiera hecho". Causa: handleConfirm
 * guardaba el municipio en el perfil (userProfileService) pero ClimaStrip
 * derivaba su municipio SOLO de fincaActiveStore/FARM_CONFIG → nunca veía la
 * confirmación. Fix: ClimaStrip lee también getProfileMunicipio() (#338).
 */
describe('ClimaStrip — municipio desde perfil (bug fix store mismatch 2026-05-30)', () => {
    test('NO muestra "Configurar ubicación" si el perfil tiene municipio', async () => {
        vi.mocked(getProfile).mockReturnValue({ municipio: 'Choachí' });
        vi.mocked(getProfileMunicipio).mockReturnValueOnce('Choachí');
        render(<ClimaStrip onNavigate={vi.fn()} />);
        // Esperar a que el efecto de carga resuelva (fetchClimaSnapshot mock → null).
        await waitFor(() =>
            expect(screen.queryByText('Configurar ubicación')).not.toBeInTheDocument(),
        );
        vi.mocked(getProfile).mockReturnValue({});
    });

    test('refresca al recibir el evento "chagra:location-updated"', async () => {
        // Arranca sin municipio → muestra el CTA.
        vi.mocked(getProfileMunicipio).mockReturnValue(null);
        render(<ClimaStrip onNavigate={vi.fn()} />);
        expect(await screen.findByText('Configurar ubicación')).toBeInTheDocument();
        // El usuario confirma ubicación: el perfil ahora tiene municipio y se
        // dispara el evento. El card debe dejar de mostrar el CTA.
        vi.mocked(getProfileMunicipio).mockReturnValue('Une');
        fireEvent(window, new CustomEvent('chagra:location-updated', { detail: { municipio: 'Une' } }));
        await waitFor(() =>
            expect(screen.queryByText('Configurar ubicación')).not.toBeInTheDocument(),
        );
        vi.mocked(getProfileMunicipio).mockReturnValue(null);
    });
});

/**
 * Bug fix 2026-05-30 — el operador reportó que el widget de clima "no funciona"
 * (no mostraba datos reales). Causa: ClimaStrip pedía `get_clima_ideam('monthly_avg')`,
 * que es climatología histórica y devolvía VACÍO (la ingesta IDEAM nunca se
 * pobló). Fix: reapuntar a Open-Meteo (`fetchClimaSnapshot` →
 * `openmeteo.forecast_7d`), pronóstico real de 7 días por lat/lon.
 */
describe('ClimaStrip — pronóstico real Open-Meteo (fix fuente de datos 2026-05-30)', () => {
    const snapshotConForecast = {
        openmeteo: {
            available: true,
            forecast_7d: [
                { date: '2026-05-30', temp_max_c: 22.4, temp_min_c: 11.1, precip_mm: 0 },
                { date: '2026-05-31', temp_max_c: 21.0, temp_min_c: 10.5, precip_mm: 3.2 },
                { date: '2026-06-01', temp_max_c: 19.8, temp_min_c: 9.9, precip_mm: 14.7 },
                { date: '2026-06-02', temp_max_c: 23.1, temp_min_c: 12.0, precip_mm: 0.4 },
                { date: '2026-06-03', temp_max_c: 24.6, temp_min_c: 12.8, precip_mm: 0 },
                { date: '2026-06-04', temp_max_c: 20.2, temp_min_c: 10.1, precip_mm: 6.5 },
                { date: '2026-06-05', temp_max_c: 22.0, temp_min_c: 11.3, precip_mm: 1.1 },
            ],
        },
    };

    test('usa coords + altitud del perfil, pasa elevation y NO geocodifica', async () => {
        // Perfil completo: coords reales de la finca + altitud (2580 msnm). Con
        // la altitud en el perfil, resolveGeo no necesita geocodificar y reenvía
        // elevation para que Open-Meteo corrija la temperatura por gradiente.
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            finca_altitud: '2580',
        });
        vi.mocked(findMunicipio).mockClear();
        vi.mocked(fetchClimaSnapshot).mockResolvedValueOnce(snapshotConForecast);
        render(<ClimaStrip onNavigate={vi.fn()} />);
        await waitFor(() =>
            expect(fetchClimaSnapshot).toHaveBeenCalledWith({ lat: 4.53, lng: -73.92, elevation: 2580 }),
        );
        // Con coords + altitud del perfil NO debe geocodificar el municipio.
        expect(findMunicipio).not.toHaveBeenCalled();
        vi.mocked(getProfile).mockReturnValue({});
    });

    test('con coords pero SIN altitud en el perfil, cae a la curada del municipio (DANE)', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
        });
        vi.mocked(findMunicipio).mockClear();
        vi.mocked(findMunicipio).mockReturnValueOnce(/** @type {any} */ ({ name: 'Choachí', lat: 4.52, lng: -73.92, altitud: 1923 }));
        vi.mocked(fetchClimaSnapshot).mockResolvedValueOnce(snapshotConForecast);
        render(<ClimaStrip onNavigate={vi.fn()} />);
        await waitFor(() =>
            // coords del perfil (no las del municipio) + altitud curada del DANE.
            expect(fetchClimaSnapshot).toHaveBeenCalledWith({ lat: 4.53, lng: -73.92, elevation: 1923 }),
        );
        expect(findMunicipio).toHaveBeenCalled();
        vi.mocked(getProfile).mockReturnValue({});
        vi.mocked(findMunicipio).mockReturnValue(null);
    });

    test('renderiza temperaturas reales (máx/mín) del forecast', async () => {
        vi.mocked(getProfile).mockReturnValue({ municipio: 'Choachí', ubicacion_lat: 4.53, ubicacion_lng: -73.92 });
        vi.mocked(fetchClimaSnapshot).mockResolvedValueOnce(snapshotConForecast);
        render(<ClimaStrip onNavigate={vi.fn()} />);
        // Open-Meteo en el header, NO IDEAM.
        expect(await screen.findByText(/Open-Meteo/i)).toBeInTheDocument();
        // Temp máxima del día 0 redondeada (22.4 → 22) — hay más de un día a 22°.
        await waitFor(() => expect(screen.getAllByText('22°').length).toBeGreaterThan(0));
        // Temp mínima del día 2 redondeada (9.9 → 10).
        expect(screen.getAllByText('10°').length).toBeGreaterThan(0);
        // Día con lluvia fuerte (14.7mm el día 2) → ícono de lluvia presente.
        expect(screen.getByText('25°')).toBeInTheDocument(); // día 4 máx 24.6 → 25
        vi.mocked(getProfile).mockReturnValue({});
    });

    test('geocodifica el municipio si el perfil no tiene coords (con altitud curada)', async () => {
        vi.mocked(getProfile).mockReturnValue({ municipio: 'Une' });
        // Une, Cundinamarca ≈ 1875 msnm en el dataset DANE curado.
        vi.mocked(findMunicipio).mockReturnValueOnce(/** @type {any} */ ({ name: 'Une', lat: 4.40, lng: -73.99, altitud: 1875 }));
        vi.mocked(fetchClimaSnapshot).mockResolvedValueOnce(snapshotConForecast);
        render(<ClimaStrip onNavigate={vi.fn()} />);
        await waitFor(() =>
            expect(fetchClimaSnapshot).toHaveBeenCalledWith({ lat: 4.40, lng: -73.99, elevation: 1875 }),
        );
        vi.mocked(getProfile).mockReturnValue({});
        vi.mocked(findMunicipio).mockReturnValue(null);
    });

    test('degrada limpio (sin romper) si Open-Meteo no está disponible', async () => {
        vi.mocked(getProfile).mockReturnValue({ municipio: 'Choachí', ubicacion_lat: 4.53, ubicacion_lng: -73.92 });
        vi.mocked(fetchClimaSnapshot).mockResolvedValueOnce({ openmeteo: { available: false, reason: 'offline' } });
        render(<ClimaStrip onNavigate={vi.fn()} />);
        // El strip se muestra (header con municipio) con el aviso de carga, sin
        // mostrar el CTA de configuración ni lanzar excepción.
        expect(await screen.findByText(/Clima en/i)).toBeInTheDocument();
        expect(screen.queryByText('Configurar ubicación')).not.toBeInTheDocument();
        expect(screen.getByText(/pronóstico fino aún se está cargando/i)).toBeInTheDocument();
        vi.mocked(getProfile).mockReturnValue({});
    });
});
