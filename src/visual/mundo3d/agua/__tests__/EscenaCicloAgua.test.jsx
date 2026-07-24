import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children: _children, onCreated: _onCreated, frameloop, ...props }) => (
    <div data-frameloop={frameloop} data-testid="lienzo-agua" {...props} />
  ),
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: () => null,
}));

vi.mock('../../deviceTier.js', () => ({
  decidirTier: () => ({ tier: 'bajo', reducedMotion: false }),
  perfilDeTier: () => ({ dpr: 1, antialias: false }),
}));

vi.mock('../../atmosfera/index.js', () => ({
  AtmosferaViva: () => null,
  useAtmosferaViva: () => ({ preset: { calina: 0, cargado: 1 } }),
}));

import EscenaCicloAgua from '../EscenaCicloAgua.jsx';

afterEach(cleanup);

describe('EscenaCicloAgua', () => {
  it('mantiene la escena congelada cuando se reduce el movimiento', () => {
    const { getByTestId } = render(
      <EscenaCicloAgua tier="bajo" reducedMotion fase={0.4} hora={8} temporada="lluvia" />,
    );

    expect(getByTestId('lienzo-agua')).toHaveAttribute('data-frameloop', 'demand');
  });

  it('mantiene el ciclo animado en movimiento normal', () => {
    const { getByTestId } = render(
      <EscenaCicloAgua tier="bajo" reducedMotion={false} fase={0.4} hora={8} temporada="lluvia" />,
    );

    expect(getByTestId('lienzo-agua')).toHaveAttribute('data-frameloop', 'always');
  });
});
