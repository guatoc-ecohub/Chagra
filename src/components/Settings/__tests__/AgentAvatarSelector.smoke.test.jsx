import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentAvatarSelector from '../AgentAvatarSelector';

describe('AgentAvatarSelector smoke', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renderiza 3 opciones: angelita + maiz + zarigüeya (el colibrí jubiló)', () => {
        render(<AgentAvatarSelector />);
        expect(screen.getByText('Angelita, la abeja', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Planta de maíz')).toBeInTheDocument();
        expect(screen.getByText('Zarigüeya', { selector: 'p' })).toBeInTheDocument();
        expect(screen.queryByText(/colibrí/i)).toBeNull();
    });

    it('click en zarigüeya cambia la preferencia y persiste en localStorage', () => {
        render(<AgentAvatarSelector />);
        const zariguyaBtn = screen.getByText('Zarigüeya', { selector: 'p' }).closest('button');
        fireEvent.click(zariguyaBtn);
        expect(zariguyaBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('zariguya');
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('localStorage zariguya preselecciona zarigüeya al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'zariguya');
        render(<AgentAvatarSelector />);
        const zariguyaBtn = screen.getByText('Zarigüeya', { selector: 'p' }).closest('button');
        expect(zariguyaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('angelita seleccionada por default', () => {
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('click en maiz cambia la preferencia y persiste en localStorage', () => {
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        fireEvent.click(maizBtn);
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('maiz');
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('localStorage maiz preselecciona maiz al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'maiz');
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('slug legacy colibri_svg en localStorage migra a angelita seleccionada', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'colibri_svg');
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('slug legacy colibri en localStorage migra a angelita seleccionada', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'colibri');
        render(<AgentAvatarSelector />);
        const angelitaBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(angelitaBtn).toHaveAttribute('aria-pressed', 'true');
    });
});
