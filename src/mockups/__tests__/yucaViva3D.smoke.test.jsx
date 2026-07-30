/*
 * Vitrina #/mockups/yuca-viva-3d — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta la FICHA en corte (three-free) en vez de `MundoYuca` (Canvas/
 * @react-three): exactamente el camino real del device-tiering en gama baja.
 * Congela que el cableo del huérfano (YucaViva3D.jsx no tenía entrada en el
 * router de App.jsx) quedó completo:
 *   · la página renderiza título + la ficha didáctica, sin tocar three;
 *   · la ficha trae el tallo anillado y el racimo de raíces (rotulados);
 *   · los 4 saberes del yucal aparecen.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import YucaViva3D from '../YucaViva3D.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo de la yuca (mockups/yuca-viva-3d)', () => {
  test('renderiza la ficha 2D digna con su lección', () => {
    const { container } = render(<YucaViva3D />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'El yucal de clima medio, en el arranque' }),
    ).toBeInTheDocument();

    // jsdom no tiene WebGL → ficha en corte (three-free), nunca un Canvas roto
    expect(container.querySelector('.yviva__ficha')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();

    // los 4 saberes verificados del yucal
    expect(screen.getByText('El tallo lleva la cuenta', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Se siembra de tallo', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('La raíz sale en racimo', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Dulce o amarga, cocida siempre', { selector: 'b' })).toBeInTheDocument();
  });
});
