import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="canvas-paramo" />,
  useFrame: () => {},
  useThree: () => ({ camera: {}, invalidate: () => {}, gl: {} }),
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Html: ({ children }) => <>{children}</>,
  OrbitControls: () => null,
}));

vi.mock('../../visual/mundo3d/deviceTier.js', () => ({
  decidirTier: () => ({ tier: 'medio' }),
  perfilDeTier: () => ({ dpr: [1, 1], antialias: false }),
}));

import MundoParamo3D from '../MundoParamo3D.jsx';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('entrada desde la leccion del suelo', () => {
  test('muestra una puerta explicita hacia el mundo de microfauna', () => {
    render(<MundoParamo3D />);

    fireEvent.click(screen.getByRole('button', { name: 'La lección del suelo' }));
    const entrada = screen.getByRole('button', { name: 'Explorar la vida del suelo' });

    fireEvent.click(entrada);
    expect(window.location.hash).toBe('#/mockups/mundo-microfauna-3d');
  });
});
