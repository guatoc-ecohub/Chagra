/*
 * Arte original "El clima como atmósfera viva" — smoke.
 *
 * Ruta hermana #/mockups/clima-atmosfera-arte: conserva el arte de Fable
 * (datos de muestra) sin tocar el puente al mundo real de la ruta canónica
 * (#2833). En jsdom solo se verifica la mecánica de UI: selector de 5 estados,
 * re-tinte vía data-clima y retorno al shell.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ClimaAtmosferaArte from '../ClimaAtmosferaArte.jsx';

afterEach(() => cleanup());

describe('arte clima como atmósfera viva (mockups/clima-atmosfera-arte)', () => {
  test('monta la escena con el estado inicial (niebla) y el selector de 5 estados', () => {
    const onBack = vi.fn();
    const { container } = render(<ClimaAtmosferaArte onBack={onBack} />);

    const root = container.querySelector('.ca-root');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-clima', 'niebla');

    const selector = screen.getByRole('radiogroup', { name: /estado del clima/i });
    expect(selector).toBeInTheDocument();
    expect(selector.querySelectorAll('[role="radio"]')).toHaveLength(5);
  });

  test('re-tiñe la escena vía data-clima al elegir otro estado', () => {
    const { container } = render(<ClimaAtmosferaArte onBack={() => {}} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Noche' }));
    expect(container.querySelector('.ca-root')).toHaveAttribute('data-clima', 'noche');

    fireEvent.click(screen.getByRole('radio', { name: 'Soleado' }));
    expect(container.querySelector('.ca-root')).toHaveAttribute('data-clima', 'soleado');
  });

  test('conserva el retorno al shell', () => {
    const onBack = vi.fn();
    render(<ClimaAtmosferaArte onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '← Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('el puente canónico (#2833) sigue intacto en la ruta canónica', () => {
    // Las dos intenciones viven: el arte NO reemplazó al puente.
    return import('../ClimaAtmosfera.jsx').then((mod) => {
      const Puente = mod.default;
      const onBack = vi.fn();
      const { container } = render(<Puente onBack={onBack} />);
      expect(screen.getByRole('heading', { level: 1, name: 'El mundo del clima' })).toBeInTheDocument();
      expect(container.querySelector('.ca-root')).not.toBeInTheDocument();
    });
  });
});
