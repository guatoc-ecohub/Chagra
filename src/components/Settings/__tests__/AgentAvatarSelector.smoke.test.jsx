import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentAvatarSelector from '../AgentAvatarSelector';

describe('AgentAvatarSelector smoke', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renderiza 3 opciones angelita + colibri-svg + maiz', () => {
        render(<AgentAvatarSelector />);
        expect(screen.getByText('Angelita, la abeja', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Colibrí ilustrado')).toBeInTheDocument();
        expect(screen.getByText('Planta de maíz')).toBeInTheDocument();
    });

    it('angelita (slug historico colibri) seleccionada por default', () => {
        render(<AgentAvatarSelector />);
        const colibriBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(colibriBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('click en maiz cambia la preferencia y persiste en localStorage', () => {
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        fireEvent.click(maizBtn);
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('maiz');
        const colibriBtn = screen.getByText('Angelita, la abeja', { selector: 'p' }).closest('button');
        expect(colibriBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('click en colibri-svg cambia la preferencia y persiste', () => {
        render(<AgentAvatarSelector />);
        const svgBtn = screen.getByText('Colibrí ilustrado').closest('button');
        fireEvent.click(svgBtn);
        expect(svgBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('colibri_svg');
    });

    it('localStorage maiz preselecciona maiz al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'maiz');
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('localStorage colibri_svg preselecciona el ilustrado al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'colibri_svg');
        render(<AgentAvatarSelector />);
        const svgBtn = screen.getByText('Colibrí ilustrado').closest('button');
        expect(svgBtn).toHaveAttribute('aria-pressed', 'true');
    });
});
