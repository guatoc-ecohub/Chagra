import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import VisualLib from '../VisualLib.jsx';
import {
  VISUAL_REGISTRY, VISUAL_CATEGORIES, VISUAL_COUNTS, piezas3D, piezasCapaces3D,
} from '../../visual/registry.js';

afterEach(() => cleanup());

describe('VisualLib storybook', () => {
  test('monta la vitrina completa sin lanzar', () => {
    const { container, getByText } = render(<VisualLib />);
    expect(getByText('Librería visual')).toBeInTheDocument();
    // Una sección por categoría (ancla) y al menos una tarjeta por primitivo.
    VISUAL_CATEGORIES.forEach((k) => {
      expect(container.querySelector(`#${VISUAL_REGISTRY[k].ancla}`)).toBeInTheDocument();
    });
    const cards = container.querySelectorAll('.vlib-card');
    const total = VISUAL_CATEGORIES.reduce((n, k) => n + VISUAL_COUNTS[k], 0);
    expect(cards).toHaveLength(total);
  });

  test('el registro cubre las categorías base + voz + mundos 3D, todas con items', () => {
    // Las 4 base siguen primero; el framework suma voz + mundo3d.
    expect(VISUAL_CATEGORIES.slice(0, 4)).toEqual(['creatures', 'effects', 'laminas', 'scenes']);
    expect(VISUAL_CATEGORIES).toContain('voz');
    expect(VISUAL_CATEGORIES).toContain('mundo3d');
    VISUAL_CATEGORIES.forEach((k) => {
      expect(VISUAL_REGISTRY[k].items.length).toBeGreaterThan(0);
      VISUAL_REGISTRY[k].items.forEach((item) => {
        // Todo item declara metadatos filtrables + su forma de dibujarse.
        expect(item.dim === '2d' || item.dim === '3d').toBe(true);
        expect(typeof item.role).toBe('string');
        expect(typeof item.render).toBe('string');
        expect(Array.isArray(item.variantes)).toBe(true);
        // Los items 2D dibujan un Component directo; los 3D se cargan perezoso.
        if (item.dim === '2d' && item.render === 'component') {
          expect(item.Component).toBeTruthy();
        }
        if (item.dim === '3d') {
          expect(typeof item.cargar3d).toBe('function');
        }
      });
    });
  });

  test('piezas3D() filtra los 5 arquetipos de escena (dim 3d)', () => {
    const tresD = piezas3D();
    expect(tresD.map((p) => p.slug).sort()).toEqual(
      ['cutaway', 'estratos', 'flujo', 'recinto', 'valle'],
    );
    tresD.forEach((p) => expect(p.dim).toBe('3d'));
    // Los 3D-capaces suman la abeja avatar + la voz a los arquetipos.
    const capaces = piezasCapaces3D().map((p) => p.slug);
    expect(capaces).toContain('abeja-angelita');
    expect(capaces).toContain('iris-voz');
  });
});
