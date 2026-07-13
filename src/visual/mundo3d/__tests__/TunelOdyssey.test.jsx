import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { IrisOdyssey } from '../TunelOdyssey.jsx';
import { ODYSSEY_IRIS_MS, useTunelOdyssey } from '../useTunelOdyssey.js';

afterEach(() => vi.useRealTimers());

function Sonda({ reducedMotion = false, sinCanvas = false }) {
  const tunel = useTunelOdyssey({ reducedMotion, sinCanvas });
  return (
    <div>
      <output data-testid="fase">{tunel.fase}</output>
      <output data-testid="capas">{`${tunel.mostrar3d}-${tunel.mostrar2d}-${tunel.mostrarPortada}`}</output>
      <button type="button" onClick={tunel.entrar}>entrar</button>
      <button type="button" onClick={tunel.salir}>salir</button>
      <button type="button" onClick={() => tunel.alLlegarCamara('acercando')}>llego-entrada</button>
      <button type="button" onClick={() => tunel.alLlegarCamara('saliendo')}>llego-salida</button>
    </div>
  );
}

describe('useTunelOdyssey', () => {
  test('conserva el ciclo 3D, iris, plano 2D y regreso', () => {
    vi.useFakeTimers();
    render(<Sonda />);
    expect(screen.getByTestId('fase')).toHaveTextContent('valle3d');
    expect(screen.getByTestId('capas')).toHaveTextContent('true-false-false');

    fireEvent.click(screen.getByText('entrar'));
    expect(screen.getByTestId('fase')).toHaveTextContent('acercando');
    fireEvent.click(screen.getByText('llego-entrada'));
    expect(screen.getByTestId('fase')).toHaveTextContent('iris-abre');
    expect(screen.getByTestId('capas')).toHaveTextContent('true-true-false');
    act(() => vi.advanceTimersByTime(ODYSSEY_IRIS_MS + 40));
    expect(screen.getByTestId('fase')).toHaveTextContent('juego2d');
    expect(screen.getByTestId('capas')).toHaveTextContent('false-true-false');

    fireEvent.click(screen.getByText('salir'));
    expect(screen.getByTestId('fase')).toHaveTextContent('iris-cierra');
    act(() => vi.advanceTimersByTime(ODYSSEY_IRIS_MS + 40));
    expect(screen.getByTestId('fase')).toHaveTextContent('saliendo');
    fireEvent.click(screen.getByText('llego-salida'));
    expect(screen.getByTestId('fase')).toHaveTextContent('valle3d');
  });

  test('reduce movimiento y equipos sin Canvas sin romper el intercambio', () => {
    const { rerender } = render(<Sonda reducedMotion />);
    fireEvent.click(screen.getByText('entrar'));
    expect(screen.getByTestId('fase')).toHaveTextContent('juego2d');
    fireEvent.click(screen.getByText('salir'));
    expect(screen.getByTestId('fase')).toHaveTextContent('valle3d');

    vi.useFakeTimers();
    rerender(<Sonda sinCanvas />);
    fireEvent.click(screen.getByText('entrar'));
    expect(screen.getByTestId('fase')).toHaveTextContent('iris-abre');
    act(() => vi.advanceTimersByTime(ODYSSEY_IRIS_MS + 40));
    fireEvent.click(screen.getByText('salir'));
    act(() => vi.advanceTimersByTime(ODYSSEY_IRIS_MS + 40));
    expect(screen.getByTestId('fase')).toHaveTextContent('valle3d');
    expect(screen.getByTestId('capas')).toHaveTextContent('false-false-true');
  });
});

test('IrisOdyssey aplica la fase de apertura sin conocer el destino', () => {
  render(<IrisOdyssey fase="iris-abre"><p>Destino</p></IrisOdyssey>);
  expect(screen.getByText('Destino').parentElement).toHaveAttribute('data-iris', 'abre');
});
