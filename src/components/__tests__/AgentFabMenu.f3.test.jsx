import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AgentFabMenu from '../AgentFabMenu.jsx';

describe('AgentFabMenu F3', () => {
  it('expone las tres capacidades de voz y fotos al tocar el compai', () => {
    const handlers = {
      onEscuchar: vi.fn(),
      onHablar: vi.fn(),
      onFoto: vi.fn(),
      onFotos: vi.fn(),
      onHoyNo: vi.fn(),
      onCerrar: vi.fn(),
    };
    render(<AgentFabMenu abierto {...handlers} />);

    expect(screen.getByRole('menuitem', { name: 'Escuchar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hablar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ver fotos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Escuchar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ver fotos' }));
    expect(handlers.onEscuchar).toHaveBeenCalledOnce();
    expect(handlers.onFotos).toHaveBeenCalledOnce();
  });
});

