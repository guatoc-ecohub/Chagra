/*
 * Vitrina #/mockups/mundo3d-agua — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta el GEMELO 2D del recorrido (three-free): exactamente el camino del
 * device-tiering real en gama baja. Se congela que:
 *   · la página renderiza título + leyenda sin tocar three;
 *   · el gemelo trae los 6 puntos del recorrido como botones;
 *   · tocar una puerta cuenta a qué pantalla real de la app lleva (sin sesión
 *     la vitrina NO navega).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Mundo3DAgua from '../Mundo3DAgua.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo del agua (mockups/mundo3d-agua)', () => {
  test('renderiza el mundo en 2D digno con su leyenda didáctica', () => {
    const { container } = render(<Mundo3DAgua />);
    expect(screen.getByRole('heading', { level: 1, name: 'El mundo del agua' })).toBeInTheDocument();
    // jsdom no tiene WebGL → gemelo 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.mundo2d__hotspot').length).toBe(6);
    // la leyenda cuenta el recorrido punto por punto (esperanzadora, no alarmista)
    expect(screen.getByText('El recorrido, punto por punto')).toBeInTheDocument();
    expect(screen.getByText('La ronda que lo protege', { selector: 'b' })).toBeInTheDocument();
  });

  test('tocar una puerta del recorrido cuenta a qué pantalla real lleva', () => {
    render(<Mundo3DAgua />);
    fireEvent.click(screen.getByRole('button', { name: 'La quebrada viva' }));
    expect(screen.getByRole('status')).toHaveTextContent('«biodiversidad»');
  });
});
