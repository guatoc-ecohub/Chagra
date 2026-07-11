/*
 * Vitrina #/mockups/mundo3d-cafe — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina monta
 * el GEMELO 2D del beneficio (three-free): exactamente el camino del
 * device-tiering real en gama baja. Se congela que:
 *   · la página renderiza título + leyenda + la lámina del cafeto sin tocar three;
 *   · el gemelo trae los 4 puntos del beneficio como botones;
 *   · tocar una puerta cuenta a qué pantalla real de la app lleva (sin sesión la
 *     vitrina NO navega).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Mundo3DCafe from '../Mundo3DCafe.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo del café (mockups/mundo3d-cafe)', () => {
  test('renderiza el mundo en 2D digno con su leyenda y la lámina del cafeto', () => {
    const { container } = render(<Mundo3DCafe />);
    expect(screen.getByRole('heading', { level: 1, name: 'El mundo del café' })).toBeInTheDocument();
    // jsdom no tiene WebGL → gemelo 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.mundo2d__hotspot').length).toBe(4);
    // la leyenda cuenta el beneficio paso por paso (esperanzadora, no alarmista)
    expect(screen.getByText('El beneficio, paso por paso')).toBeInTheDocument();
    expect(screen.getByText('A la sombra del guamo', { selector: 'b' })).toBeInTheDocument();
    // REUSA LaminaCafeto: la mata dibujada en SVG propio, sin imágenes externas
    expect(container.querySelector('[data-testid="lamina-cafeto"]')).toBeInTheDocument();
  });

  test('tocar una puerta del beneficio cuenta a qué pantalla real lleva', () => {
    render(<Mundo3DCafe />);
    fireEvent.click(screen.getByRole('button', { name: 'Broca sin veneno' }));
    expect(screen.getByRole('status')).toHaveTextContent('«biopreparados»');
  });
});
