import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ValleHomeGateway from '../ValleHomeGateway.jsx';
import { VALLE_TEASER_FRAMES } from '../valleHomeGatewayConstants.js';
import { ND_REDUCIDA_MS, ND_VIAJE_MS } from '../../../visual/mundo3d/TransicionNewDonk.jsx';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalMatchMedia) {
    window.matchMedia = originalMatchMedia;
  } else {
    delete window.matchMedia;
  }
});

const renderGateway = (onNavigate = vi.fn()) => render(
  <ValleHomeGateway onNavigate={onNavigate}>
    <div data-testid="finca-frame">Finca animada</div>
  </ValleHomeGateway>,
);

describe('ValleHomeGateway', () => {
  test('no muestra teaser ni navega por el paso del tiempo', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    renderGateway(onNavigate);

    act(() => vi.advanceTimersByTime(120_000));

    expect(screen.queryByTestId('valle-home-teaser')).not.toBeInTheDocument();
    expect(screen.getByTestId('valle-home-gateway')).toHaveAttribute('data-fase', 'reposo');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('hover revela los tres frames reales y la invitación', () => {
    renderGateway();
    const gateway = screen.getByTestId('valle-home-gateway');

    expect(screen.queryByTestId('valle-home-teaser')).not.toBeInTheDocument();
    fireEvent.mouseEnter(gateway);

    expect(screen.getByTestId('valle-home-teaser')).toBeInTheDocument();
    expect(screen.getByTestId('valle-home-invite')).toHaveTextContent('Entre al valle 3D');
    expect(screen.getAllByAltText('')).toHaveLength(VALLE_TEASER_FRAMES.length);
  });

  test('tap revela la invitación, pero solo confirmar inicia New Donk y navega', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    renderGateway(onNavigate);
    const gateway = screen.getByTestId('valle-home-gateway');

    fireEvent.pointerDown(gateway, { pointerType: 'touch' });
    fireEvent.click(screen.getByTestId('valle-home-invite'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Entrar al valle 3D?' })).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.mouseEnter(gateway);
    fireEvent.click(screen.getByTestId('valle-home-invite'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Entre al valle 3D' }));
    expect(screen.getByTestId('tnd')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(ND_VIAJE_MS));
    expect(onNavigate).toHaveBeenCalledWith('valle3d');
  });

  test('pasa reduced-motion a la transición y conserva la confirmación', () => {
    vi.useFakeTimers();
    const matchMedia = vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });
    const onNavigate = vi.fn();
    renderGateway(onNavigate);

    fireEvent.mouseEnter(screen.getByTestId('valle-home-gateway'));
    fireEvent.click(screen.getByTestId('valle-home-invite'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Entre al valle 3D' }));

    act(() => vi.advanceTimersByTime(ND_REDUCIDA_MS));
    expect(onNavigate).toHaveBeenCalledWith('valle3d');
  });
});
