/*
 * Vitrina #/mockups/restauracion-tiempo-3d — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y
 * `RestauracionEnElTiempo` monta el CORTE SVG `LaderaEnFranjas` (three-free)
 * en vez de `EscenaRestauracion` (Canvas/@react-three): exactamente el camino
 * real del device-tiering en gama baja. Congela que el cableo del huérfano
 * (RestauracionEnElTiempo.jsx / EscenaRestauracion.jsx / AguaQueVuelve.jsx —
 * ninguno tenía consumidor) quedó completo:
 *   · la página renderiza título + el host `RestauracionEnElTiempo`;
 *   · el gemelo 2D (corte de la ladera, SVG puro, cero <canvas>) monta;
 *   · la línea de tiempo (riel + etapas) está viva y responde al arrastre.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import RestauracionTiempo3D from '../RestauracionTiempo3D.jsx';

afterEach(() => cleanup());

describe('vitrina del monte que vuelve (mockups/restauracion-tiempo-3d)', () => {
  test('renderiza el corte 2D digno con la línea de tiempo', () => {
    const { container } = render(<RestauracionTiempo3D />);
    expect(screen.getByRole('heading', { level: 1, name: 'El monte que vuelve' })).toBeInTheDocument();

    // jsdom no tiene WebGL → LaderaEnFranjas (SVG puro), nunca un Canvas roto
    expect(container.querySelector('svg.rest__franjas')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();

    // la línea de tiempo: riel accesible + las etapas del recorrido
    const riel = screen.getByRole('slider', { name: 'Años desde que empezó la restauración' });
    expect(riel).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Véalo pasar/ })).toBeInTheDocument();
  });

  test('arrastrar el riel avanza el año y mueve el corte', () => {
    render(<RestauracionTiempo3D />);
    const riel = screen.getByRole('slider', { name: 'Años desde que empezó la restauración' });

    // año 0: el árbol semilla está solo (aria-label del corte lo confirma)
    expect(screen.getByLabelText('Corte de la ladera en el año 0')).toBeInTheDocument();

    fireEvent.change(riel, { target: { value: '1000' } });

    // el riel al máximo aterriza en el año 50 (tope de ETAPAS/ANIO_MAX)
    expect(screen.getByLabelText(/Corte de la ladera en el año 50/)).toBeInTheDocument();
  });
});
