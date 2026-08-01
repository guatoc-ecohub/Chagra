/*
 * Navegación valle ↔ mundos — la máquina de fases + el viaje (three-free).
 *
 * Congela el contrato del framework:
 *   · el ciclo completo: valle → viajando → mundo → regresando → valle;
 *   · reduced-motion = corte simple (sin fases de viaje, sin overlay);
 *   · un mundo sin escena montable (id no registrado) NO viaja → `pronto`;
 *     (el clima YA es montable: arquetipo `boveda`, así que sí viaja);
 *   · TransicionMundo llama `onFin` UNA vez al cumplirse el viaje.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import { useNavegacionMundos } from '../useNavegacionMundos.js';
import TransicionMundo, { VIAJE_MS } from '../TransicionMundo.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* Sonda mínima: expone la máquina del hook como DOM para poder conducirla. */
function Sonda({ reducedMotion = false, pisoUsuario = null }) {
  const nav = useNavegacionMundos({ reducedMotion, pisoUsuario });
  return (
    <div>
      <output data-testid="fase">{nav.fase}</output>
      <output data-testid="mundo">{nav.mundoId || '-'}</output>
      <output data-testid="pronto">{nav.pronto || '-'}</output>
      <output data-testid="piso">{/** @type {any} */ (nav).catalogoPisos?.pisoUsuarioId || '-'}</output>
      <button type="button" onClick={() => nav.viajarAlMundo('agua')}>ir-agua</button>
      <button type="button" onClick={() => nav.viajarAlMundo('clima')}>ir-clima</button>
      <button type="button" onClick={() => nav.viajarAlMundo('__fantasma__')}>ir-fantasma</button>
      <button type="button" onClick={() => nav.volverAlValle()}>volver</button>
      <button type="button" onClick={() => nav.completarViaje()}>completar</button>
    </div>
  );
}

const fase = () => screen.getByTestId('fase').textContent;

describe('useNavegacionMundos — la máquina valle ↔ mundo', () => {
  test('ciclo completo: valle → viajando → mundo → regresando → valle', () => {
    render(<Sonda />);
    expect(fase()).toBe('valle');

    fireEvent.click(screen.getByText('ir-agua'));
    expect(fase()).toBe('viajando');
    expect(screen.getByTestId('mundo')).toHaveTextContent('agua');

    fireEvent.click(screen.getByText('completar'));
    expect(fase()).toBe('mundo');

    fireEvent.click(screen.getByText('volver'));
    expect(fase()).toBe('regresando');
    // saliendo, el mundo SIGUE montado debajo del velo
    expect(screen.getByTestId('mundo')).toHaveTextContent('agua');

    fireEvent.click(screen.getByText('completar'));
    expect(fase()).toBe('valle');
    expect(screen.getByTestId('mundo')).toHaveTextContent('-');
  });

  test('reduced-motion = corte simple: sin fases de viaje', () => {
    render(<Sonda reducedMotion />);
    fireEvent.click(screen.getByText('ir-agua'));
    expect(fase()).toBe('mundo'); // directo, sin 'viajando'
    fireEvent.click(screen.getByText('volver'));
    expect(fase()).toBe('valle'); // directo, sin 'regresando'
  });

  test('el clima YA es montable (arquetipo boveda): sí viaja', () => {
    render(<Sonda />);
    fireEvent.click(screen.getByText('ir-clima'));
    expect(fase()).toBe('viajando'); // viajó como cualquier mundo con escena
    expect(screen.getByTestId('mundo')).toHaveTextContent('clima');
  });

  test('mundo sin escena montable (id no registrado) degrada: no viaja y marca `pronto`', () => {
    render(<Sonda />);
    fireEvent.click(screen.getByText('ir-fantasma'));
    expect(fase()).toBe('valle'); // no viajó
    expect(screen.getByTestId('pronto')).toHaveTextContent('__fantasma__');
  });

  test('volverAlValle en el valle es inofensivo (no cambia de fase)', () => {
    render(<Sonda />);
    fireEvent.click(screen.getByText('volver'));
    expect(fase()).toBe('valle');
  });

  test('expone el catalogo termico para el host de la Sierra', () => {
    render(<Sonda pisoUsuario="templado" />);
    expect(screen.getByTestId('piso')).toHaveTextContent('templado');
  });
});

describe('TransicionMundo — el viaje guiado por Angelita', () => {
  test('anuncia el destino y llama onFin UNA vez al cumplirse el viaje', () => {
    vi.useFakeTimers();
    const onFin = vi.fn();
    render(<TransicionMundo mundoId="agua" sentido="entrar" onFin={onFin} />);
    expect(screen.getByRole('status')).toHaveTextContent('Angelita lo lleva a El agua…');
    expect(onFin).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(VIAJE_MS + 50));
    expect(onFin).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(VIAJE_MS * 2));
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  test('de vuelta anuncia el valle; con reduced-motion no dibuja y corta ya', () => {
    vi.useFakeTimers();
    render(<TransicionMundo mundoId="suelo" sentido="volver" onFin={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('De vuelta al valle…');
    cleanup();

    const onFin = vi.fn();
    const { container } = render(
      <TransicionMundo mundoId="suelo" sentido="entrar" reducedMotion onFin={onFin} />,
    );
    expect(container).toBeEmptyDOMElement(); // corte simple: nada que animar
    act(() => vi.advanceTimersByTime(1));
    expect(onFin).toHaveBeenCalledTimes(1);
  });
});
