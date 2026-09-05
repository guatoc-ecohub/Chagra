/**
 * El panel de datos reales por piso de la Sierra (VistaGlobalSierra):
 * al activar un piso (banda o `?viaje=`), muestra las especies documentadas
 * con el número del catálogo; los pisos sin especies documentadas dicen
 * "Sin datos para este piso". Sin piso activo, no hay panel.
 *
 * Números verificables en el DOM (los mismos del JSON commiteado, que a su
 * vez salen del catálogo y del grafo): calido 277 · templado 357 · frio 297 ·
 * paramo 62 (con sus 6 nativas, frailejón incluido) · superparamo/nival 0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-sierra">{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Billboard: ({ children }) => <div>{children}</div>,
  Html: ({ children }) => <div>{children}</div>,
  OrbitControls: () => null,
}));

import VistaGlobalSierra from '../../src/visual/mundo3d/VistaGlobalSierra.jsx';

afterEach(() => vi.useRealTimers());

describe('Panel de datos por piso de la Sierra', () => {
  const activarPiso = (id) => {
    const banda = document.querySelector(`[data-piso="${id}"]`);
    expect(banda).toBeInTheDocument();
    fireEvent.click(banda);
  };

  test('sin piso activo no hay panel', () => {
    render(<VistaGlobalSierra />);
    expect(screen.queryByTestId('panel-datos-piso')).not.toBeInTheDocument();
  });

  test('activar el piso frío muestra el número real del catálogo (297) y representativos', () => {
    vi.useFakeTimers();
    render(<VistaGlobalSierra />);
    act(() => activarPiso('frio'));
    const panel = screen.getByTestId('panel-datos-piso');
    expect(panel).toHaveTextContent('297');
    expect(panel).toHaveTextContent('Papa criolla'); // representativo curado del grafo
    expect(panel).not.toHaveTextContent('Sin datos para este piso');
  });

  test('el páramo documenta sus nativas (frailejón) aunque no sea tierra de cultivo', () => {
    render(<VistaGlobalSierra />);
    act(() => activarPiso('paramo'));
    const panel = screen.getByTestId('panel-datos-piso');
    expect(panel).toHaveTextContent('62');
    expect(panel).toHaveTextContent('Frailejón');
    expect(panel).not.toHaveTextContent('Sin datos para este piso');
  });

  test('superpáramo y nival: "Sin datos para este piso", sin número inventado', () => {
    render(<VistaGlobalSierra />);
    act(() => activarPiso('superparamo'));
    expect(screen.getByTestId('panel-datos-piso')).toHaveTextContent('Sin datos para este piso');
    act(() => activarPiso('nival'));
    expect(screen.getByTestId('panel-datos-piso')).toHaveTextContent('Sin datos para este piso');
  });
});