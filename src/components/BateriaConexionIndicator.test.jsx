import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BateriaConexionIndicator from './BateriaConexionIndicator';

/**
 * BateriaConexionIndicator (T45, rescate #2668 → cableado en TopBar).
 *
 * navigator.getBattery() y navigator.connection son APIs no estándar /
 * deprecadas en varios navegadores (jsdom no las implementa por default),
 * así que el contrato central a probar es: sin esas APIs, el componente NO
 * revienta y no renderiza nada (return null) — y cuando SÍ están
 * disponibles, muestra el ícono de batería y las barras de señal.
 */
describe('BateriaConexionIndicator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete navigator.getBattery;
    delete navigator.connection;
  });

  it('no renderiza nada si el navegador no expone Battery ni Network Information API', () => {
    const { container } = render(<BateriaConexionIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el nivel de batería cuando navigator.getBattery está disponible', async () => {
    const listeners = {};
    navigator.getBattery = vi.fn().mockResolvedValue({
      level: 0.42,
      charging: false,
      addEventListener: (evt, fn) => { listeners[evt] = fn; },
    });

    render(<BateriaConexionIndicator />);

    const icon = await screen.findByTitle(/Batería: 42%/);
    expect(icon).toBeInTheDocument();
  });

  it('muestra las barras de señal cuando navigator.connection está disponible', async () => {
    navigator.connection = {
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    render(<BateriaConexionIndicator />);

    const icon = await screen.findByTitle('4g');
    expect(icon).toBeInTheDocument();
  });
});
