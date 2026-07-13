import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';

let tierState = {
  tierInicial: 'medio',
  presupuesto: { maxCriaturasAmbientales: 3 },
};
let escenaProps = null;

vi.mock('../../visual/mundo3d/usePerformanceMonitor.jsx', () => ({
  useTierPerformance: () => tierState,
}));

vi.mock('../../visual/mundo3d/escenas/EscenaValle.jsx', () => ({
  default: (props) => {
    escenaProps = props;
    return <div data-testid="escena-valle-stub" />;
  },
}));

vi.mock('../../visual/voz', () => ({
  default: () => <div data-testid="iris-voz-stub" />,
}));

import ShellApp3D from '../ShellApp3D';

describe('ShellApp3D', () => {
  beforeEach(() => {
    tierState = {
      tierInicial: 'medio',
      presupuesto: { maxCriaturasAmbientales: 3 },
    };
    escenaProps = null;
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('muestra el dock 3D y enruta agente, voz y mundos', () => {
    const onNavigate = vi.fn();
    const onBack = vi.fn();

    render(<ShellApp3D onNavigate={onNavigate} onBack={onBack} />);

    expect(screen.getByRole('heading', { name: /Valle 3D-first/i })).toBeInTheDocument();
    expect(screen.getByTestId('escena-valle-stub')).toBeInTheDocument();
    expect(screen.getByTestId('iris-voz-stub')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agente' }));
    expect(onNavigate).toHaveBeenCalledWith('agente', null);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir la voz de Chagra' }));
    expect(onNavigate).toHaveBeenCalledWith('voz', null);

    fireEvent.click(screen.getByRole('button', { name: 'Mundos' }));
    expect(onNavigate).toHaveBeenCalledWith('mundo', null);

    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio clásico' }));
    expect(onBack).toHaveBeenCalled();

    expect(typeof escenaProps.onHotspot).toBe('function');
    escenaProps.onHotspot('mundo', { mundoId: 'agua' });
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'agua' });
  });

  test('en tier bajo simplifica el rail secundario pero conserva los controles esenciales', () => {
    tierState = {
      tierInicial: 'bajo',
      presupuesto: { maxCriaturasAmbientales: 1 },
    };

    render(<ShellApp3D onNavigate={() => {}} onBack={() => {}} />);

    expect(screen.getByRole('button', { name: 'Agente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir la voz de Chagra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mundos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mercados' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bodega' })).not.toBeInTheDocument();
  });
});
