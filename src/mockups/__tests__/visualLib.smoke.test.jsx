import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import VisualLib from '../VisualLib.jsx';
import { VISUAL_REGISTRY, VISUAL_CATEGORIES, VISUAL_COUNTS } from '../../visual/registry.js';

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

  test('el registro consolidado cubre las 4 categorías con items', () => {
    expect(VISUAL_CATEGORIES).toEqual(['creatures', 'effects', 'laminas', 'scenes']);
    VISUAL_CATEGORIES.forEach((k) => {
      expect(VISUAL_REGISTRY[k].items.length).toBeGreaterThan(0);
      VISUAL_REGISTRY[k].items.forEach((item) => {
        expect(item.Component).toBeTruthy();
        expect(Array.isArray(item.variantes)).toBe(true);
      });
    });
  });
});
