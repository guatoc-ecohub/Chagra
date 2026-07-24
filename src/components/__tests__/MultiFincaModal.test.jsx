import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setActiveFincaManual = vi.fn();
const setFincas = vi.fn();
const storeState = {
  fincas: [
    {
      slug: 'guatoc',
      nombre: 'Guatoc',
      operador: 'Familia Chagra',
      estado: 'activo',
      farmos_endpoint: 'https://guatoc.farmos.net',
    },
    {
      slug: 'la-ceiba',
      nombre: 'La Ceiba',
      operador: 'Asociación Ceiba Viva',
      estado: 'piloto',
      farmos_endpoint: null,
    },
  ],
  setFincas,
  setActiveFincaManual,
};

vi.mock('../MultiFincaGlobe', () => ({
  default: () => <div data-testid="multifinca-globe-stub" />,
}));

vi.mock('../FarmOSSetupModal', () => ({
  default: ({ finca, onClose }) => (
    <div data-testid="onboarding-modal-stub">
      <span>{finca?.nombre}</span>
      <button onClick={onClose}>Cerrar onboarding</button>
    </div>
  ),
}));

vi.mock('../../services/fincaActiveStore', () => ({
  useFincaActiveStore: () => storeState,
}));

describe('MultiFincaModal', () => {
  beforeEach(() => {
    setActiveFincaManual.mockClear();
    setFincas.mockClear();
    storeState.fincas = [
      {
        slug: 'guatoc',
        nombre: 'Guatoc',
        operador: 'Familia Chagra',
        estado: 'activo',
        farmos_endpoint: 'https://guatoc.farmos.net',
      },
      {
        slug: 'la-ceiba',
        nombre: 'La Ceiba',
        operador: 'Asociación Ceiba Viva',
        estado: 'piloto',
        farmos_endpoint: null,
      },
    ];
    vi.stubGlobal('fetch', vi.fn());
  });

  it('hidrata fincas desde fincas-publicas.json cuando el store viene vacío', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    storeState.fincas = [];
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => storeState.fincas,
    });
    vi.stubGlobal('fetch', fetchSpy);
    const { default: MultiFincaModal } = await import('../MultiFincaModal');

    render(<MultiFincaModal onClose={onClose} />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/fincas-publicas.json'));
    expect(setFincas).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('multifinca-globe-stub')).toBeTruthy();

    await user.click(screen.getByTestId('multifinca-view-grid'));
    expect(screen.getByText(/No hay fincas registradas/i)).toBeTruthy();
  });

  it('permite cambiar a vista cards y entrar a una finca con endpoint', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { default: MultiFincaModal } = await import('../MultiFincaModal');

    render(<MultiFincaModal onClose={onClose} />);

    expect(screen.getByTestId('multifinca-globe-stub')).toBeTruthy();

    await user.click(screen.getByTestId('multifinca-view-grid'));
    expect(screen.getByTestId('multifinca-footer')).toBeTruthy();

    await user.click(screen.getByTestId('multifinca-enter-guatoc'));
    expect(setActiveFincaManual).toHaveBeenCalledWith('guatoc');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('abre onboarding cuando la finca no tiene endpoint', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { default: MultiFincaModal } = await import('../MultiFincaModal');

    render(<MultiFincaModal onClose={onClose} />);

    await user.click(screen.getByTestId('multifinca-view-grid'));
    await user.click(screen.getByTestId('multifinca-configure-la-ceiba'));

    expect(screen.getByTestId('onboarding-modal-stub')).toBeTruthy();
    expect(screen.getByTestId('onboarding-modal-stub')).toHaveTextContent('La Ceiba');
    expect(setActiveFincaManual).not.toHaveBeenCalledWith('la-ceiba');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('no vuelve a fetchear fincas si el store ya tiene datos', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { default: MultiFincaModal } = await import('../MultiFincaModal');

    render(<MultiFincaModal onClose={onClose} />);

    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('multifinca-view-grid'));
    expect(screen.getByTestId('multifinca-card-guatoc')).toBeTruthy();
  });
});
