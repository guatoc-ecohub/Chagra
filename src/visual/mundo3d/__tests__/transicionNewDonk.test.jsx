/*
 * TransicionNewDonk — contrato temporal de la entrada New Donk (three-free).
 *
 * Congela lo que el flujo vivo valle→mundo depende:
 *   · `onMitad` dispara UNA vez en ND_MITAD_MS (pantalla cubierta por el
 *     destello) — ahí el host intercambia la escena;
 *   · `onFin` dispara UNA vez en ND_VIAJE_MS (mundo revelado) — ahí se desmonta;
 *   · desmontar a mitad cancela los timers pendientes (ni mitad ni fin fantasma);
 *   · reduced-motion = corte simple: tiempos reducidos + marca `tnd--corte`;
 *   · los callbacks los disparan timers JS, nunca `animationend`.
 */
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import TransicionNewDonk, {
  ND_VIAJE_MS,
  ND_MITAD_MS,
  ND_REDUCIDA_MS,
  ND_MITAD_REDUCIDA_MS,
} from '../TransicionNewDonk.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TransicionNewDonk — contrato temporal', () => {
  test('onMitad en ND_MITAD_MS y onFin en ND_VIAJE_MS, cada uno UNA vez', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    render(<TransicionNewDonk mundoId="suelo" onMitad={onMitad} onFin={onFin} />);

    act(() => vi.advanceTimersByTime(ND_MITAD_MS - 1));
    expect(onMitad).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(ND_VIAJE_MS - ND_MITAD_MS));
    expect(onFin).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(ND_VIAJE_MS * 2));
    expect(onMitad).toHaveBeenCalledTimes(1);
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  test('desmontar a mitad de viaje cancela los timers pendientes', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    const { unmount } = render(
      <TransicionNewDonk mundoId="agua" onMitad={onMitad} onFin={onFin} />,
    );

    act(() => vi.advanceTimersByTime(ND_MITAD_MS - 10));
    unmount();
    act(() => vi.advanceTimersByTime(ND_VIAJE_MS * 2));

    expect(onMitad).not.toHaveBeenCalled();
    expect(onFin).not.toHaveBeenCalled();
  });

  test('reduced-motion: corte simple con tiempos reducidos', () => {
    vi.useFakeTimers();
    const onMitad = vi.fn();
    const onFin = vi.fn();
    render(
      <TransicionNewDonk mundoId="suelo" reducedMotion onMitad={onMitad} onFin={onFin} />,
    );

    expect(screen.getByTestId('tnd')).toHaveClass('tnd--corte');

    act(() => vi.advanceTimersByTime(ND_MITAD_REDUCIDA_MS));
    expect(onMitad).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(ND_REDUCIDA_MS - ND_MITAD_REDUCIDA_MS));
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  test('monta el overlay (data-testid) en modo normal', () => {
    render(<TransicionNewDonk mundoId="bosque" />);
    expect(screen.getByTestId('tnd')).toBeInTheDocument();
    expect(screen.getByTestId('tnd')).not.toHaveClass('tnd--corte');
  });
});
