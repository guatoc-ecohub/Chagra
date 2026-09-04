import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ValleHoverConfirm from '../ValleHoverConfirm.jsx';

vi.mock('../../../visual/mundo3d/index.js', () => ({
  TransicionNewDonk: ({ onFin, reducedMotion }) => (
    <button type="button" data-testid="new-donk" data-reduced={String(reducedMotion)} onClick={onFin}>
      Terminar transición
    </button>
  ),
}));

afterEach(cleanup);

describe('ValleHoverConfirm', () => {
  test('permanece ausente hasta que el hover o toque activa la invitación', () => {
    const { rerender } = render(<ValleHoverConfirm active={false} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('valle-hover-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('valle-confirm-dialog')).not.toBeInTheDocument();

    rerender(<ValleHoverConfirm active onNavigate={vi.fn()} />);
    expect(screen.getByTestId('valle-hover-confirm')).toBeInTheDocument();
    expect(screen.getAllByAltText('')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Entrá al valle 3D' })).toBeInTheDocument();
  });

  test('invita, confirma y solo entonces navega al valle3d sin depender del reloj', () => {
    const onNavigate = vi.fn();
    render(<ValleHoverConfirm active onNavigate={onNavigate} />);

    fireEvent.click(screen.getByTestId('valle-hover-invite'));
    expect(screen.getByRole('dialog', { name: '¿Entrar al valle 3D?' })).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Entrar al valle 3D' }));
    expect(screen.getByTestId('new-donk')).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('new-donk'));
    expect(onNavigate).toHaveBeenCalledWith('valle3d');
  });

  test('cancelar cierra el diálogo y vuelve a la finca', () => {
    const onDismiss = vi.fn();
    render(<ValleHoverConfirm active onDismiss={onDismiss} onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByTestId('valle-hover-invite'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('valle-confirm-dialog')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
