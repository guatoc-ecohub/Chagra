import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, beforeEach } from 'vitest';

import PasosMundo from '../PasosMundo.jsx';
import { PASOS_MUNDO } from '../../data/pasosMundo.js';
import { MUNDO } from '../../visual/mundo3d/mundoData.js';
import { resolverMundo } from '../../visual/mundo3d/resolverMundo.js';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

describe('PasosMundo', () => {
  test('cubre todos los mundos 3D y mantiene 3-4 pasos por pantalla', () => {
    const mundos3D = Object.keys(MUNDO).filter((id) => resolverMundo(id, 'alto').modo === '3d');
    expect(Object.keys(PASOS_MUNDO).sort()).toEqual(mundos3D.sort());
    mundos3D.forEach((id) => {
      const pasos = PASOS_MUNDO[id].pasos;
      expect(pasos.length).toBeGreaterThanOrEqual(3);
      expect(pasos.length).toBeLessThanOrEqual(4);
    });
  });

  test('muestra la tarjeta, se cierra y recuerda el visto al recargar', () => {
    const { rerender } = render(<PasosMundo id="cafe" />);

    expect(screen.getByRole('dialog')).toHaveTextContent('El cafe');
    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver pasos de El cafe' })).toBeInTheDocument();
    expect(localStorage.getItem('chagra:pasosmundo:v1:cafe')).toBe('1');

    rerender(<PasosMundo id="cafe" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver pasos de El cafe' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver pasos de El cafe' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('no monta nada cuando el mundo no tiene pasos', () => {
    const { container } = render(<PasosMundo id="frutales" />);
    expect(container.firstChild).toBeNull();
  });
});
