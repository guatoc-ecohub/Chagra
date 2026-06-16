import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineChip from '../OfflineChip';

/**
 * Smoke tests para OfflineChip (UX-2 / #286).
 *
 * El componente debe:
 *   1. NO renderizar nada cuando navigator.onLine === true.
 *   2. Renderizar el chip "Sin conexión" cuando navigator.onLine === false.
 *   3. Reaccionar al evento 'offline' del window mostrándose dinámicamente.
 *   4. Reaccionar al evento 'online' del window ocultándose dinámicamente.
 */

// Helper para forzar navigator.onLine sin tocar el global descriptor real.
const setOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

describe('OfflineChip', () => {
  beforeEach(() => {
    setOnline(true);
  });
  afterEach(() => {
    setOnline(true);
  });

  it('no renderiza nada cuando hay conexión', () => {
    setOnline(true);
    const { container } = render(<OfflineChip />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('offline-chip')).toBeNull();
  });

  it('renderiza el chip "Sin conexión" cuando está offline', () => {
    setOnline(false);
    render(<OfflineChip />);
    const chip = screen.getByTestId('offline-chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('role', 'status');
    expect(chip).toHaveAttribute('aria-label', 'Sin conexión a internet');
  });

  it('aparece cuando se dispara el evento offline', () => {
    setOnline(true);
    render(<OfflineChip />);
    expect(screen.queryByTestId('offline-chip')).toBeNull();
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-chip')).toBeInTheDocument();
  });

  it('desaparece cuando se dispara el evento online', () => {
    setOnline(false);
    render(<OfflineChip />);
    expect(screen.getByTestId('offline-chip')).toBeInTheDocument();
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByTestId('offline-chip')).toBeNull();
  });
});
