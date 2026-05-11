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
});
