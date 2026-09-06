/* La ruta legacy conserva la entrada al clima 2D canónico. */
import React from 'react';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import appSource from '../../App.jsx?raw';
import ClimaAtmosfera from '../ClimaAtmosfera.jsx';
import HomeCampesino from '../HomeCampesino.jsx';

afterEach(() => cleanup());

describe('entrada legacy del clima (mockups/clima-atmosfera)', () => {
  test('redirige al clima canónico sin montar otro mundo', () => {
    const onNavigate = vi.fn();
    const { container } = render(<ClimaAtmosfera onNavigate={onNavigate} />);

    expect(onNavigate).toHaveBeenCalledWith('clima_boletin');
    expect(container).toBeEmptyDOMElement();
  });

  test('App conecta la ruta legacy y entrega su navegador al puente', () => {
    expect(appSource).toContain("'mockups/clima-atmosfera': 'mockup_clima_atmosfera'");
    const route = appSource.split("case 'mockup_clima_atmosfera':")[1].split("case '")[0];
    expect(route).toContain('<ClimaAtmosferaMockup onNavigate={navigate} />');
    expect(appSource).toContain("case 'clima_boletin':");
  });

  test('El tiempo del mockup del home abre el mismo destino', () => {
    const onNavigate = vi.fn();
    render(<HomeCampesino onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /^El tiempo:/ }));
    expect(onNavigate).toHaveBeenCalledWith('clima_boletin');
    expect(appSource).toContain("<HomeCampesinoMockup onBack={() => navigate('dashboard')} onNavigate={navigate} />");
  });
});
