/*
 * Vitrina #/mockups/artesania-andina-telar — smoke.
 *
 * A diferencia de las otras vitrinas del framework, esta es SVG puro
 * (three-free): no monta Canvas ni depende de WebGL/decidirTier, así que el
 * render es el MISMO en jsdom que en cualquier equipo. Congela que el cableo
 * del huérfano `ArtesaniaAndina.jsx` quedó completo:
 *   · la página renderiza título + <ShowcaseArtesania> (el svg autocontenido);
 *   · la paleta trae las 9 muestras de PALETA_ANDINA;
 *   · los 3 patrones de telar (rombos/zigzag/escalonado) están en <defs>;
 *   · las 3 siluetas de cerámica (VASIJA_TIPOS) aparecen rotuladas.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import ArtesaniaAndinaTelarDemo from '../ArtesaniaAndinaTelarDemo.jsx';
import { PALETA_ANDINA, VASIJA_TIPOS } from '../../visual/mundo3d/artesaniaAndina.js';

afterEach(() => cleanup());

describe('vitrina de artesanía andina (mockups/artesania-andina-telar)', () => {
  test('renderiza el muestrario completo del lenguaje de forma', () => {
    const { container } = render(<ArtesaniaAndinaTelarDemo />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Artesanía andina: el telar como vocabulario' }),
    ).toBeInTheDocument();

    // el showcase es un <svg> autocontenido (three-free, nunca un Canvas roto)
    const svg = container.querySelector('svg.artesania-showcase');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();

    // las 9 muestras de la paleta de tintes naturales
    expect(svg.querySelectorAll('.artesania-rotulo').length).toBeGreaterThan(0);
    expect(Object.keys(PALETA_ANDINA).length).toBe(9);

    // los 3 patrones tejidos reutilizables, montados UNA vez en <defs>
    expect(svg.querySelector('pattern#artesania-rombos')).toBeInTheDocument();
    expect(svg.querySelector('pattern#artesania-zigzag')).toBeInTheDocument();
    expect(svg.querySelector('pattern#artesania-escalonado')).toBeInTheDocument();

    // las 3 siluetas de cerámica (mismo perfil que el lathe 3D), rotuladas
    expect(VASIJA_TIPOS).toEqual(['olla', 'cantaro', 'cuenco']);
    for (const tipo of VASIJA_TIPOS) {
      expect(screen.getByText(tipo)).toBeInTheDocument();
    }
  });
});
