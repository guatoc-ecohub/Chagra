import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, frameloop }) => <div data-testid="canvas" data-frameloop={frameloop}>{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: () => null,
  // El enjambre monta las Angelitas rubber-hose como billboards <Html>.
  Html: ({ children }) => <div data-testid="html-billboard">{children}</div>,
}));

vi.mock('../../visual/mundo3d/ParticulasAmbientales.jsx', () => ({
  ParticulasAmbientales: () => null,
}));

import MundoAbejas3D from '../MundoAbejas3D.jsx';

afterEach(() => cleanup());

describe('MundoAbejas3D', () => {
  test('presenta el diorama y sus tres aprendizajes', () => {
    render(<MundoAbejas3D />);
    expect(screen.getByRole('heading', { name: 'Mundo de las abejas y meliponas' })).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always');
    expect(screen.getByRole('region', { name: 'Diorama 3D de abejas, meliponas y flores meliferas' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Polinizacion que da fruto/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('permite elegir la leccion sobre conservacion de nativas', () => {
    render(<MundoAbejas3D />);
    const nativas = screen.getByRole('button', { name: /Meliponas nativas/ });
    fireEvent.click(nativas);
    expect(nativas).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Polinizacion que da fruto/ })).toHaveAttribute('aria-pressed', 'false');
  });
});
