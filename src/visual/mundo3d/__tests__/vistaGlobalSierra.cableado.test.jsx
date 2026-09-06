import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-sierra">{children}</div>,
  useFrame: () => {},
}));

// Stub del surface de drei que ESTE componente usa. `Billboard` entra aquí
// porque las nubes de niebla pasaron de esferas a planos billboard (Paso 2):
// el mock debe reflejar los imports reales del componente, o el render revienta
// con "Element type is invalid" antes de montar una sola banda.
vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  Billboard: ({ children }) => <div>{children}</div>,
  Html: ({ children }) => <div>{children}</div>,
  OrbitControls: () => null,
}));

import VistaGlobalSierra from '../VistaGlobalSierra.jsx';
import MapaDeNivel from '../sierra/MapaDeNivel.jsx';

beforeEach(() => sessionStorage.clear());
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
    act(() => vi.advanceTimersByTime(1500));
    expect(onSeleccionPiso).not.toHaveBeenCalled();
    expect(screen.getByTestId('tsm-t0')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1600));
    fireEvent.click(screen.getByText('Continuar al piso'));
    expect(onSeleccionPiso).toHaveBeenCalledWith(expect.objectContaining({ id: 'calido' }));
    expect(screen.queryByTestId('tsm')).not.toBeInTheDocument();
  });
});

test.each([null, 0, -1, undefined])('sin altitud confirmada (%s) no marca una finca representativa', (msnm) => {
  render(<VistaGlobalSierra pisoUsuario="frio" msnm={msnm} />);
  expect(document.querySelector('.vsierra-finca')).toBeNull();
  expect(document.querySelector('.vsierra-aqui')).toBeNull();
});

test('la curva rotula la altitud real de la finca', () => {
  render(<VistaGlobalSierra msnm={2200} />);
  expect(document.querySelectorAll('.vsierra-finca')).toHaveLength(1);
  expect(document.querySelector('.vsierra-finca')).toHaveTextContent('2.200 m · a la altura de su finca');
});


test('la ayuda sin ubicación aparece una sola vez por sesión', () => {
  const { unmount } = render(<VistaGlobalSierra />);
  expect(screen.getByText('Confirme su finca y la montaña le muestra su clima.')).toBeInTheDocument();
  unmount();
  render(<VistaGlobalSierra />);
  expect(screen.queryByText('Confirme su finca y la montaña le muestra su clima.')).toBeNull();
});


test('el aterrizaje reutiliza una sola curva, sin las curvas de escala', () => {
  const { rerender } = render(<MapaDeNivel segmentos={48} msnm={2200} soloFinca />);
  expect(document.querySelectorAll('mesh[name="curva-cota-finca"]')).toHaveLength(1);
  expect(document.querySelectorAll('mesh')).toHaveLength(1);
  rerender(<MapaDeNivel segmentos={48} msnm={null} soloFinca />);
  expect(document.querySelectorAll('mesh')).toHaveLength(0);
});
