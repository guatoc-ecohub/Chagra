/*
 * Vitrina #/mockups/mundo3d-clima — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina monta
 * el GEMELO 2D del cielo (three-free): exactamente el camino del device-tiering
 * real en gama baja. Se congela que:
 *   · la página renderiza título + leyenda sin tocar three;
 *   · el gemelo trae los 3 puntos del cielo como botones;
 *   · tocar una puerta cuenta a qué pantalla real de la app lleva (sin sesión
 *     la vitrina NO navega);
 *   · el registro sube el clima al arquetipo 3D nuevo `boveda` (no `null`).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Mundo3DClima from '../Mundo3DClima.jsx';
import { MUNDO } from '../../visual/mundo3d/index.js';

afterEach(() => cleanup());

describe('vitrina del mundo del clima (mockups/mundo3d-clima)', () => {
  test('renderiza el cielo en 2D digno con su leyenda didáctica', () => {
    const { container } = render(<Mundo3DClima />);
    expect(screen.getByRole('heading', { level: 1, name: 'El mundo del clima' })).toBeInTheDocument();
    // jsdom no tiene WebGL → gemelo 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.mundo2d__hotspot').length).toBe(3);
    // la leyenda cuenta el cielo (esperanzadora, no alarmista)
    expect(screen.getByText('El cielo, punto por punto')).toBeInTheDocument();
    expect(screen.getByText('Dos lluvias, dos secas', { selector: 'b' })).toBeInTheDocument();
  });

  test('tocar una puerta del cielo cuenta a qué pantalla real lleva', () => {
    render(<Mundo3DClima />);
    fireEvent.click(screen.getByRole('button', { name: 'Cuándo llueve' }));
    expect(screen.getByRole('status')).toHaveTextContent('«calendario_finca»');
  });

  test('el registro sube el clima al arquetipo nuevo boveda', () => {
    expect(MUNDO.clima.escena).toBe('boveda');
    expect(MUNDO.clima.hotspots.map((h) => h.view)).toEqual([
      'hoy_finca', 'almanaque', 'calendario_finca',
    ]);
  });
});
