import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-sierra">{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Html: ({ children }) => <div>{children}</div>,
  OrbitControls: () => null,
}));

import VistaGlobalSierra from '../VistaGlobalSierra.jsx';

afterEach(() => vi.useRealTimers());

describe('VistaGlobalSierra, cableado de pisos térmicos', () => {
  test('monta las bandas y confirma la selección al llegar a destino', () => {
    vi.useFakeTimers();
    const onSeleccionPiso = vi.fn();
    render(<VistaGlobalSierra onSeleccionPiso={onSeleccionPiso} />);

    const bandaCalida = document.querySelector('[data-piso="calido"]');
    expect(bandaCalida).toBeInTheDocument();
    fireEvent.click(bandaCalida);

    expect(screen.getByTestId('tsm')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(750));
    expect(onSeleccionPiso).toHaveBeenCalledWith(expect.objectContaining({ id: 'calido' }));

    act(() => vi.advanceTimersByTime(750));
    expect(screen.queryByTestId('tsm')).not.toBeInTheDocument();
  });
});
