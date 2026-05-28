import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentAvatarSelector from '../AgentAvatarSelector';

describe('AgentAvatarSelector smoke', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renderiza 2 opciones colibri + maiz', () => {
        render(<AgentAvatarSelector />);
        expect(screen.getByText('Colibrí libando')).toBeInTheDocument();
        expect(screen.getByText('Planta de maíz')).toBeInTheDocument();
    });

    it('colibri seleccionado por default', () => {
        render(<AgentAvatarSelector />);
        const colibriBtn = screen.getByText('Colibrí libando').closest('button');
        expect(colibriBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('click en maiz cambia la preferencia y persiste en localStorage', () => {
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        fireEvent.click(maizBtn);
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('chagra:agent-avatar-type')).toBe('maiz');
        const colibriBtn = screen.getByText('Colibrí libando').closest('button');
        expect(colibriBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('localStorage maiz preselecciona maiz al montar', () => {
        localStorage.setItem('chagra:agent-avatar-type', 'maiz');
        render(<AgentAvatarSelector />);
        const maizBtn = screen.getByText('Planta de maíz').closest('button');
        expect(maizBtn).toHaveAttribute('aria-pressed', 'true');
    });
});
