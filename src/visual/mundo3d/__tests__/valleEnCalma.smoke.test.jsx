/*
 * Smoke del estado vacío de CALMA del valle (ValleEnCalma). En jsdom no hay
 * WebGL, así que se prueba el camino three-free: tier bajo/2d monta el espejo
 * SVG directo (y en tier alto el fallback de Suspense es ese mismo espejo, así
 * que la calma nunca queda en blanco). El diorama 3D (EscenaCalma3D) es chunk
 * perezoso `vendor-three` y se verifica en build/e2e, no aquí.
 */
import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import ValleEnCalma from '../ValleEnCalma.jsx';

afterEach(() => cleanup());

describe('ValleEnCalma — estado vacío sereno del valle', () => {
  test('tier bajo monta el espejo 2D (three-free) con el mensaje por defecto', () => {
    const { container } = render(<ValleEnCalma tier="bajo" />);
    expect(screen.getByText('Hoy su finca está en calma')).toBeInTheDocument();
    expect(
      screen.getByText('Nada urgente que atender. Observar y descansar también es cuidar.'),
    ).toBeInTheDocument();
    // el amanecer SVG está presente; ningún canvas (cero three en jsdom)
    expect(container.querySelector('.vcalma-2d')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('mensaje y detalle son personalizables por props', () => {
    render(<ValleEnCalma tier="2d" mensaje="Todo tranquilo" detalle="Respire hondo." />);
    expect(screen.getByText('Todo tranquilo')).toBeInTheDocument();
    expect(screen.getByText('Respire hondo.')).toBeInTheDocument();
  });

  test('reducedMotion apaga la respiración (clases estáticas en el espejo 2D)', () => {
    const { container } = render(<ValleEnCalma tier="bajo" reducedMotion />);
    expect(container.querySelector('.vcalma-abeja--quieta')).toBeInTheDocument();
    expect(container.querySelector('.vcalma-respira')).toBeNull();
    expect(container.querySelector('.vcalma-deriva')).toBeNull();
  });

  test('el diorama perezoso (EscenaCalma3D) resuelve y exporta componente', async () => {
    // No se renderiza (jsdom no tiene WebGL): solo se valida que el módulo del
    // chunk vendor-three resuelve sus imports y exporta la escena.
    const mod = await import('../escenas/EscenaCalma3D.jsx');
    expect(typeof mod.default).toBe('function');
  });

  test('la carta es un estado accesible (role=status) y la sección lleva aria-label', () => {
    const { container } = render(<ValleEnCalma tier="bajo" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('section[aria-label="Hoy su finca está en calma"]')).toBeInTheDocument();
  });
});
