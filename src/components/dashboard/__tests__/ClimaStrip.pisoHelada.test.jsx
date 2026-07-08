/**
 * ClimaStrip.pisoHelada.test.jsx — enriquecimiento visual del clima (2026-07).
 *
 * Cubre las tres piezas nuevas de grounding visual del strip:
 *   1. Chip de PISO TÉRMICO por altitud GUARDADA del perfil (nunca geo en
 *      vivo): refuerza el grounding térmico correcto. Sin altitud → "dato en
 *      camino" (cero invención).
 *   2. Aviso de HELADA BIEN CALIBRADO: banner solo con mínima ≤ 0 °C (helada
 *      REAL). Mínimas frías por encima de 0 °C pero bajo el umbral de
 *      vigilancia del piso (FORECAST_THRESHOLDS.HELADA_MIN_C, el mismo del
 *      alertEngine) → nota de "noches frías", nunca "helada".
 *   3. Chip ENSO en lenguaje llano SOLO si el snapshot trae la fase.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ClimaStrip from '../ClimaStrip';

// Mock de climaService: cada test arma su snapshot. describePhase pasa la
// fase a texto llano (versión mínima del real — el componente lo guarda con
// typeof por los tests que mockean el módulo sin este export).
vi.mock('../../../services/climaService', () => ({
    fetchClimaSnapshot: vi.fn(() => Promise.resolve(null)),
    getCachedClimaSnapshot: vi.fn(() => null),
    describePhase: vi.fn((phase) => (
        phase === 'nina_moderada' ? 'La Niña moderada — mas lluvia de lo normal' : 'Estado del clima desconocido'
    )),
}));
import { fetchClimaSnapshot } from '../../../services/climaService';

vi.mock('../../../utils/colombiaLocations', () => ({
    findMunicipio: vi.fn(() => null),
}));

vi.mock('../../../services/fincaActiveStore', () => {
    const store = { activeFincaSlug: 'guatoc', fincas: [] };
    const useFincaActiveStore = (selector) => selector(store);
    return { default: useFincaActiveStore };
});

vi.mock('../../../config/defaults', () => ({
    FARM_CONFIG: { MUNICIPIO: null },
}));

// Perfil con ubicación GUARDADA completa (coords + altitud de finca fría).
vi.mock('../../../services/userProfileService', () => {
    const getProfile = vi.fn(() => /** @type {Record<string, any>} */ ({}));
    const getProfileMunicipio = vi.fn(() => getProfile()?.municipio ?? null);
    return { getProfile, getProfileMunicipio, isModuleVisible: vi.fn(() => true) };
});
import { getProfile } from '../../../services/userProfileService';

const PERFIL_FRIO = {
    municipio: 'Choachí, Cundinamarca',
    ubicacion_lat: 4.53,
    ubicacion_lng: -73.92,
    finca_altitud: 2580, // piso frío (2000-3000) → umbral de vigilancia 4 °C
};

/** Snapshot Open-Meteo con la mínima del día 2 parametrizable. */
function snapshotConMinima(minDia2, extra = {}) {
    const base = new Date();
    const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
        return {
            date: d.toISOString().slice(0, 10),
            temp_max_c: 18,
            temp_min_c: i === 1 ? minDia2 : 8,
            precip_mm: i === 2 ? 6.4 : 0,
        };
    });
    return {
        openmeteo: { available: true, forecast_7d: dias },
        ...extra,
    };
}

beforeEach(() => {
    vi.mocked(fetchClimaSnapshot).mockReset();
    vi.mocked(fetchClimaSnapshot).mockResolvedValue(null);
    vi.mocked(getProfile).mockReturnValue(PERFIL_FRIO);
    localStorage.clear();
});

describe('ClimaStrip — piso térmico por altitud guardada', () => {
    test('muestra el chip de piso frío con la altitud del perfil', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(snapshotConMinima(8));
        render(<ClimaStrip onNavigate={() => {}} />);
        const chip = await screen.findByTestId('clima-piso-termico');
        expect(chip).toHaveTextContent(/piso frío/i);
        expect(chip).toHaveTextContent('2580 msnm');
    });

    test('sin altitud ni match DANE → "dato en camino", jamás un piso inventado', async () => {
        vi.mocked(getProfile).mockReturnValue({
            municipio: 'Choachí, Cundinamarca',
            ubicacion_lat: 4.53,
            ubicacion_lng: -73.92,
            // sin finca_altitud/altitud (findMunicipio mockeado → null)
        });
        render(<ClimaStrip onNavigate={() => {}} />);
        expect(await screen.findByTestId('clima-piso-pendiente')).toHaveTextContent(/dato en camino/i);
        expect(screen.queryByTestId('clima-piso-termico')).not.toBeInTheDocument();
    });
});

describe('ClimaStrip — aviso de helada calibrado (helada real = ≤ 0 °C)', () => {
    test('mínima de -1 °C → banner de helada con la calibración explícita', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(snapshotConMinima(-1));
        render(<ClimaStrip onNavigate={() => {}} />);
        const aviso = await screen.findByTestId('clima-helada-aviso');
        expect(aviso).toHaveTextContent(/helada en el pronóstico/i);
        expect(aviso).toHaveTextContent(/0 °C o menos/i);
    });

    test('mínima de 3 °C en piso frío → NO es helada; nota de noches frías', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(snapshotConMinima(3));
        render(<ClimaStrip onNavigate={() => {}} />);
        const nota = await screen.findByTestId('clima-noche-fria');
        expect(nota).toHaveTextContent(/noches frías/i);
        expect(nota).toHaveTextContent(/0 °C o menos/i);
        expect(screen.queryByTestId('clima-helada-aviso')).not.toBeInTheDocument();
    });

    test('mínima de 8 °C → ni banner de helada ni nota de noches frías', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(snapshotConMinima(8));
        render(<ClimaStrip onNavigate={() => {}} />);
        await screen.findByTestId('clima-piso-termico');
        expect(screen.queryByTestId('clima-helada-aviso')).not.toBeInTheDocument();
        expect(screen.queryByTestId('clima-noche-fria')).not.toBeInTheDocument();
    });
});

describe('ClimaStrip — ENSO solo con dato real', () => {
    test('snapshot con fase ENSO → chip en lenguaje llano', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(
            snapshotConMinima(8, { enso_status: { phase: 'nina_moderada' } }),
        );
        render(<ClimaStrip onNavigate={() => {}} />);
        const chip = await screen.findByTestId('clima-enso');
        expect(chip).toHaveTextContent(/la niña moderada/i);
    });

    test('snapshot sin enso_status → no hay chip ENSO (cero fabricación)', async () => {
        vi.mocked(fetchClimaSnapshot).mockResolvedValue(snapshotConMinima(8));
        render(<ClimaStrip onNavigate={() => {}} />);
        await screen.findByTestId('clima-piso-termico');
        expect(screen.queryByTestId('clima-enso')).not.toBeInTheDocument();
    });
});
