/*
 * TransicionMundoKit — contrato temporal del kit de transiciones (three-free).
 *
 * Congela:
 *   · `onMitad` dispara UNA vez a la mitad exacta (pantalla cubierta) y
 *     `onFin` UNA vez al total — cronometrados por timers, no por CSS;
 *   · `activa=false` no monta nada y apagarla a mitad de viaje cancela
 *     los timers pendientes (ni mitad ni fin fantasma);
 *   · reduced-motion = corte simple: rama 'fade' + REDUCIDA_MS, sin adornos;
 *   · tier 'bajo' acorta el viaje (FACTOR_TIER_BAJO) y quita decoraciones;
 *   · variante desconocida cae a 'fade' (nunca revienta);
 *   · los wrappers con nombre fijan su variante.
 */
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import TransicionMundoKit, { TransicionIris } from '../TransicionMundoKit.jsx';
import {
  DURACIONES_MS,
  REDUCIDA_MS,
  FACTOR_TIER_BAJO,
  duracionTransicion,
  mitadTransicion,
} from '../tiemposTransicion.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TransicionMundoKit — contrato temporal', () => {
  test('onMitad a la mitad y onFin al total, cada uno UNA vez', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    render(
      <TransicionMundoKit variante="wipe" activa onMitad={onMitad} onFin={onFin} />,
    );

    const mitad = mitadTransicion('wipe', 'medio', false);
    const total = duracionTransicion('wipe', 'medio', false);
    expect(total).toBe(DURACIONES_MS.wipe);

    act(() => vi.advanceTimersByTime(mitad - 1));
    expect(onMitad).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(total - mitad));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(total * 2));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  test('activa=false no monta nada', () => {
    render(<TransicionMundoKit variante="iris" activa={false} onMitad={() => {}} onFin={() => {}} />);
    expect(screen.queryByTestId('tmk')).not.toBeInTheDocument();
  });

  test('apagar activa a mitad de viaje cancela los timers pendientes', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    const { rerender } = render(
      <TransicionMundoKit variante="zoom" activa onMitad={onMitad} onFin={onFin} />,
    );

    act(() => vi.advanceTimersByTime(mitadTransicion('zoom', 'medio', false) - 10));
    rerender(
      <TransicionMundoKit
        variante="zoom"
        activa={false}
        onMitad={onMitad}
        onFin={onFin}
      />,
    );
    act(() => vi.advanceTimersByTime(DURACIONES_MS.zoom * 3));

    expect(onMitad).not.toHaveBeenCalled();
    expect(onFin).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tmk')).not.toBeInTheDocument();
  });

  test('reduced-motion = corte simple: rama fade, REDUCIDA_MS, sin adornos', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    const { container } = render(
      <TransicionMundoKit
        variante="zoom"
        activa
        reducedMotion
        tier="alto"
        onMitad={onMitad}
        onFin={onFin}
      />,
    );

    const raiz = screen.getByTestId('tmk');
    expect(raiz).toHaveAttribute('data-variante', 'fade');
    expect(raiz).toHaveAttribute('data-reducida', '1');
    expect(container.querySelector('.tmk__aro')).toBeNull();
    expect(duracionTransicion('zoom', 'alto', true)).toBe(REDUCIDA_MS);

    act(() => vi.advanceTimersByTime(REDUCIDA_MS));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  test('tier bajo acorta el viaje y quita decoraciones', () => {
    const { container } = render(
      <TransicionMundoKit variante="wipe" activa tier="bajo" onMitad={() => {}} onFin={() => {}} />,
    );
    expect(container.querySelector('.tmk__ola')).toBeNull();
    expect(container.querySelector('.tmk__wipe-cuerpo')).not.toBeNull();
    expect(duracionTransicion('wipe', 'bajo', false)).toBe(
      Math.round(DURACIONES_MS.wipe * FACTOR_TIER_BAJO),
    );
  });

  test('variante desconocida cae a fade y direccion invalida a entrar', () => {
    render(<TransicionMundoKit variante="explosion" activa direccion="teleport" onMitad={() => {}} onFin={() => {}} />);
    const raiz = screen.getByTestId('tmk');
    expect(raiz).toHaveAttribute('data-variante', 'fade');
    expect(raiz).toHaveAttribute('data-direccion', 'entrar');
  });

  test('los wrappers con nombre fijan su variante y respetan direccion', () => {
    render(<TransicionIris activa direccion="salir" />);
    const raiz = screen.getByTestId('tmk');
    expect(raiz).toHaveAttribute('data-variante', 'iris');
    expect(raiz).toHaveAttribute('data-direccion', 'salir');
  });
});
