import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, frameloop }) => <div data-testid="canvas" data-frameloop={frameloop}>{children}</div>,
  useFrame: () => {},
  useThree: (selector) => selector({ size: { width: 390, height: 844 } }),
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
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
    expect(screen.getByRole('button', { name: /Polinización que da fruto/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('permite elegir la leccion sobre conservacion de nativas', () => {
    render(<MundoAbejas3D />);
    const nativas = screen.getByRole('button', { name: /Meliponas nativas/ });
    fireEvent.click(nativas);
    expect(nativas).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Polinización que da fruto/ })).toHaveAttribute('aria-pressed', 'false');
  });

  // Cableado de `seleccion` al 3D: antes la tarjeta activa solo se pintaba a
  // sí misma y el Canvas no se enteraba de cuál estaba tocada.
  describe('cablea la tarjeta activa al Canvas (no solo su propio borde)', () => {
    test('empieza mirando el surco de flores (tarjeta 01)', () => {
      const { container } = render(<MundoAbejas3D />);
      const foco = container.querySelector('group[name="foco-seleccion"]');
      expect(foco).toBeTruthy();
      expect(foco.getAttribute('position')).toBe('0,0.85,1.9');
    });

    test('tocar la tarjeta 02 (miel) lleva el foco al panal/colmenas', () => {
      const { container } = render(<MundoAbejas3D />);
      fireEvent.click(screen.getByRole('button', { name: /Miel, cera y cuidado/ }));
      const foco = container.querySelector('group[name="foco-seleccion"]');
      expect(foco.getAttribute('position')).toBe('-2.0999999999999996,1.05,-1.3');
    });

    test('tocar la tarjeta 03 (nativas) lleva el foco a la caja melipona', () => {
      const { container } = render(<MundoAbejas3D />);
      fireEvent.click(screen.getByRole('button', { name: /Meliponas nativas/ }));
      const foco = container.querySelector('group[name="foco-seleccion"]');
      expect(foco.getAttribute('position')).toBe('1.3,0.8,0.2');
    });
  });
});
