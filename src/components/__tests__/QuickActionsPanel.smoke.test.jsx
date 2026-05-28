import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickActionsPanel from '../QuickActionsPanel';

describe('QuickActionsPanel smoke', () => {
    it('renderiza FAB cerrado por default', () => {
        render(<QuickActionsPanel onNavigate={vi.fn()} />);
        const fab = screen.getByLabelText('Abrir acciones rápidas');
        expect(fab).toBeInTheDocument();
        expect(fab).toHaveAttribute('aria-expanded', 'false');
    });

    it('abre menu con 2 acciones', () => {
        render(<QuickActionsPanel onNavigate={vi.fn()} />);
        fireEvent.click(screen.getByLabelText('Abrir acciones rápidas'));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('Agregar planta a mi finca')).toBeInTheDocument();
        expect(screen.getByText('Consultar ayuda')).toBeInTheDocument();
    });

    it('click "Agregar planta" navega a sembrar y cierra', () => {
        const onNavigate = vi.fn();
        render(<QuickActionsPanel onNavigate={onNavigate} />);
        fireEvent.click(screen.getByLabelText('Abrir acciones rápidas'));
        fireEvent.click(screen.getByText('Agregar planta a mi finca'));
        expect(onNavigate).toHaveBeenCalledWith('sembrar');
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('click "Consultar ayuda" navega a help y cierra', () => {
        const onNavigate = vi.fn();
        render(<QuickActionsPanel onNavigate={onNavigate} />);
        fireEvent.click(screen.getByLabelText('Abrir acciones rápidas'));
        fireEvent.click(screen.getByText('Consultar ayuda'));
        expect(onNavigate).toHaveBeenCalledWith('help');
    });

    it('Escape cierra el menu', () => {
        render(<QuickActionsPanel onNavigate={vi.fn()} />);
        fireEvent.click(screen.getByLabelText('Abrir acciones rápidas'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
    });
});
