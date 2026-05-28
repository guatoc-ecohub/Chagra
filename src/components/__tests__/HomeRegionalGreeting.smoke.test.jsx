import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeRegionalGreeting from '../HomeRegionalGreeting';

const fincaActiveMock = vi.hoisted(() => ({
    state: { activeFincaSlug: null, fincas: [] },
}));

vi.mock('../../services/fincaActiveStore', () => ({
    __esModule: true,
    default: (selector) => selector(fincaActiveMock.state),
}));

describe('HomeRegionalGreeting smoke', () => {
    beforeEach(() => {
        localStorage.clear();
        fincaActiveMock.state = { activeFincaSlug: null, fincas: [] };
    });

    it('muestra saludo default cuando no hay finca activa', () => {
        render(<HomeRegionalGreeting />);
        expect(screen.getByRole('banner')).toHaveTextContent('Hola, lo del día en tu chagra');
    });

    it('saludo regional según biocultural_zone andino_alto_páramo', () => {
        fincaActiveMock.state = {
            activeFincaSlug: 'choachi',
            fincas: [{ slug: 'choachi', biocultural_zone: 'andino_alto_páramo' }],
        };
        render(<HomeRegionalGreeting />);
        expect(screen.getByRole('banner')).toHaveTextContent('sumercé');
        expect(screen.getByRole('banner')).toHaveTextContent('Frío de páramo');
    });

    it('saludo regional caribe', () => {
        fincaActiveMock.state = {
            activeFincaSlug: 'barranquilla',
            fincas: [{ slug: 'barranquilla', biocultural_zone: 'caribe' }],
        };
        render(<HomeRegionalGreeting />);
        expect(screen.getByRole('banner')).toHaveTextContent('calor caribe');
    });

    it('dismiss persiste en localStorage y oculta banner', () => {
        const { container } = render(<HomeRegionalGreeting />);
        const btn = screen.getByLabelText('Cerrar saludo');
        fireEvent.click(btn);
        expect(container.querySelector('[role="banner"]')).toBeNull();
        expect(localStorage.getItem('chagra:home-greeting-dismissed:v1')).toBeTruthy();
    });

    it('NO contiene voseo argentino (regla CLAUDE.md)', () => {
        fincaActiveMock.state = {
            activeFincaSlug: 'choachi',
            fincas: [{ slug: 'choachi', biocultural_zone: 'andino_medio' }],
        };
        render(<HomeRegionalGreeting />);
        const text = screen.getByRole('banner').textContent;
        expect(text).not.toMatch(/\btenés\b|\bquerés\b|\belegí\b|\bsumercé\b.*\bvos\b/i);
    });
});
