import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MundoMercado3D from '../MundoMercado3D.jsx';

const decidirTier = vi.fn();

vi.mock('../../visual/mundo3d/deviceTier.js', () => ({
  decidirTier: () => decidirTier(),
  perfilDeTier: () => ({ dpr: [1, 1.3], antialias: false, fog: true }),
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ frameloop, children: _children, ...props }) => (
    <div data-testid="canvas-mercado" data-frameloop={frameloop} data-dpr={String(props.dpr)} />
  ),
}));

vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }));
vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({ ParticulasAmbientales: () => null }));

describe('MundoMercado3D', () => {
  beforeEach(() => {
    decidirTier.mockReturnValue({ tier: 'medio', reducedMotion: false, motivo: 'ok' });
  });

  it('presenta la cadena corta y permite recorrer sus acuerdos', () => {
    render(<MundoMercado3D />);

    expect(screen.getByRole('heading', { name: 'La plaza donde el campo vale' })).toBeInTheDocument();
    expect(screen.getByLabelText('Plaza de mercado campesina en tres dimensiones')).toBeInTheDocument();
    expect(screen.getByText(/Finca, cosecha, plaza, mesa/)).toBeInTheDocument();
    expect(screen.getByTestId('canvas-mercado')).toHaveAttribute('data-frameloop', 'always');

    fireEvent.click(screen.getByRole('button', { name: /Venta directa o trueque/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Menos intermediación permite conversar');
    expect(screen.getByRole('button', { name: /Venta directa o trueque/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('respeta menos movimiento con render bajo demanda', () => {
    decidirTier.mockReturnValue({ tier: 'alto', reducedMotion: true, motivo: 'calma' });
    render(<MundoMercado3D />);

    expect(screen.getByTestId('canvas-mercado')).toHaveAttribute('data-frameloop', 'demand');
    expect(screen.getByText('Escena quieta')).toBeInTheDocument();
  });
});
