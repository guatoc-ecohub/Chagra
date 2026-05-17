import { describe, it, expect, beforeEach } from 'vitest';
import { useFincaActiveStore } from '../fincaActiveStore';

describe('fincaActiveStore', () => {
    beforeEach(() => {
        useFincaActiveStore.setState({
            activeFincaSlug: 'guatoc',
            fincas: [
                { slug: 'guatoc', farmos_endpoint: 'https://guatoc.farmos.net', nombre: 'Guatoc' },
                { slug: 'naranjalia', farmos_endpoint: null, nombre: 'Naranjalia' }
            ]
        });
    });

    it('should set the active finca slug', () => {
        useFincaActiveStore.getState().setActiveFinca('naranjalia');
        expect(useFincaActiveStore.getState().activeFincaSlug).toBe('naranjalia');
    });

    it('should resolve the correct endpoint for the active finca', () => {
        expect(useFincaActiveStore.getState().getActiveEndpoint()).toBe('https://guatoc.farmos.net');

        useFincaActiveStore.getState().setActiveFinca('naranjalia');
        // If endpoint is null, it should return the default (Guatoc) in Phase 1
        expect(useFincaActiveStore.getState().getActiveEndpoint()).toBe('https://guatoc.farmos.net');
    });

    it('should return the active finca object', () => {
        const finca = useFincaActiveStore.getState().getActiveFinca();
        expect(finca.slug).toBe('guatoc');
        expect(finca.nombre).toBe('Guatoc');
    });

    // 062.3 GPS auto-detect vs manual override (demo Tuesday path)
    it('GPS detect changes finca without setting gpsOverride flag', () => {
        useFincaActiveStore.getState().setActiveFincaFromGps('naranjalia');
        expect(useFincaActiveStore.getState().activeFincaSlug).toBe('naranjalia');
        expect(useFincaActiveStore.getState().gpsOverride).toBe(false);
    });

    it('manual selection sets gpsOverride flag, clearGpsOverride resets', () => {
        useFincaActiveStore.getState().setActiveFincaManual('naranjalia');
        expect(useFincaActiveStore.getState().gpsOverride).toBe(true);
        useFincaActiveStore.getState().clearGpsOverride();
        expect(useFincaActiveStore.getState().gpsOverride).toBe(false);
        // Slug debe persistir tras clearGpsOverride
        expect(useFincaActiveStore.getState().activeFincaSlug).toBe('naranjalia');
    });

    // Edge: empty fincas[] (boot inicial antes de fetch fincas-publicas.json)
    it('returns sane defaults when fincas list is empty', () => {
        useFincaActiveStore.setState({ activeFincaSlug: 'guatoc', fincas: [] });
        const finca = useFincaActiveStore.getState().getActiveFinca();
        expect(finca.slug).toBe('guatoc'); // fallback hardcoded
        expect(finca.biocultural_zone).toBe('andino_alto_páramo');
        // Endpoint vacío esperado (sin fincas[] no hay donde buscar)
        expect(useFincaActiveStore.getState().getActiveEndpoint()).toBe('');
    });
});
