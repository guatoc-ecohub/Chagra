import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import SceneFincaOrganismo from '../SceneFincaOrganismo';

/**
 * El CORAZÓN-SEMILLA de la Finca Organismo = botón "Pregunte" (usabilidad
 * campesina #4): con `onPregunte` el corazón es tappable (tap / Enter /
 * Espacio) y abre el agente — el MISMO patrón del potrero→animales. Sin
 * handler queda como arte (sin rol ni foco) y el SVG vuelve a ser imagen.
 */

afterEach(() => cleanup());

describe('SceneFincaOrganismo — el corazón de la escena abre el agente', () => {
  test('con onPregunte, el corazón es un botón enfocable que dispara al tocarlo', () => {
    const onPregunte = vi.fn();
    render(<SceneFincaOrganismo onPregunte={onPregunte} />);
    const corazon = screen.getByTestId('fvo-corazon');
    expect(corazon).toHaveAttribute('role', 'button');
    expect(corazon).toHaveAttribute('tabindex', '0');
    fireEvent.click(corazon);
    expect(onPregunte).toHaveBeenCalledTimes(1);
  });

  test('el corazón responde a Enter y Espacio (accesible por teclado)', () => {
    const onPregunte = vi.fn();
    render(<SceneFincaOrganismo onPregunte={onPregunte} />);
    const corazon = screen.getByTestId('fvo-corazon');
    fireEvent.keyDown(corazon, { key: 'Enter' });
    fireEvent.keyDown(corazon, { key: ' ' });
    expect(onPregunte).toHaveBeenCalledTimes(2);
  });

  test('con el corazón tappable el SVG deja de ser imagen plana (role=group)', () => {
    render(<SceneFincaOrganismo onPregunte={vi.fn()} />);
    expect(screen.getByTestId('fvo-escena')).toHaveAttribute('role', 'group');
  });

  test('sin onPregunte, el corazón queda decorativo y el SVG es imagen', () => {
    render(<SceneFincaOrganismo />);
    expect(screen.getByTestId('fvo-escena')).toHaveAttribute('role', 'img');
    const corazon = screen.getByTestId('fvo-corazon');
    expect(corazon).not.toHaveAttribute('role');
    expect(corazon).not.toHaveAttribute('tabindex');
    expect(corazon).toHaveAttribute('aria-hidden', 'true');
  });

  test('la etiqueta invita a preguntar (sin jerga de laboratorio)', () => {
    render(<SceneFincaOrganismo onPregunte={vi.fn()} />);
    expect(screen.getByTestId('fvo-escena')).toHaveTextContent('toque el corazón y pregúntele a Chagra');
    expect(screen.getByTestId('fvo-escena')).not.toHaveTextContent('micorrízica');
  });
});
