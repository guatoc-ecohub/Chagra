import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ValleHomeGateway from '../ValleHomeGateway.jsx';
import {
  VALLE_AUTO_DELAY_MS,
  VALLE_TEASER_MS,
} from '../valleHomeGatewayConstants.js';
import { ND_VIAJE_MS } from '../../../visual/mundo3d/TransicionNewDonk.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ValleHomeGateway', () => {
  test('espera 12 segundos y muestra el teaser, luego vuelve al home', () => {
    vi.useFakeTimers();
    render(<ValleHomeGateway onNavigate={vi.fn()} />);

    act(() => vi.advanceTimersByTime(VALLE_AUTO_DELAY_MS - 1));
    expect(screen.queryByTestId('valle-home-teaser')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('valle-home-teaser')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(VALLE_TEASER_MS));
    expect(screen.queryByTestId('valle-home-teaser')).not.toBeInTheDocument();
  });

  test('el teaser o la puerta disparan New Donk y llegan a valle3d', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    render(<ValleHomeGateway onNavigate={onNavigate} />);

    act(() => vi.advanceTimersByTime(VALLE_AUTO_DELAY_MS));
    fireEvent.click(screen.getByTestId('valle-home-teaser'));
    expect(screen.getByTestId('tnd')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(ND_VIAJE_MS));
    expect(onNavigate).toHaveBeenCalledWith('valle3d');
  });
});
