/**
 * ValleMarcoScreen — contrato del recableado task #42 (2026-08-14):
 *
 *   1. El iframe SIEMPRE lleva `?compai=<slug>` en el src, leído de
 *      leerCompanero() (canonical, compai/nucleo/elenco.js) — el mismo
 *      valor que la PWA ya escribió al elegir compañero.
 *   2. `apagaMarco3dAlSalir` gobierna si salir apaga la preferencia
 *      `marco3d`: default false (la puerta `valle3d` no debe tocarla),
 *      true reproduce el comportamiento histórico de la puerta `dashboard`.
 *   3. `onExit` siempre se llama al salir, sin importar el flag anterior.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const setMarco3DPreference = vi.fn();
vi.mock('../../services/userProfileService', () => ({
  setMarco3DPreference: (...args) => setMarco3DPreference(...args),
}));

import ValleMarcoScreen from '../ValleMarcoScreen.jsx';

beforeEach(() => {
  setMarco3DPreference.mockClear();
  localStorage.clear();
});

describe('ValleMarcoScreen', () => {
  test('el iframe lleva ?compai=<slug> por defecto (sin elección guardada)', () => {
    render(<ValleMarcoScreen onExit={() => {}} />);
    const iframe = screen.getByTitle('Valle 3D de Guatoc');
    expect(iframe).toHaveAttribute('src', '/valle/index.html?compai=angelita');
  });

  test('el iframe lleva el compai elegido de verdad (leerCompanero canónico)', () => {
    localStorage.setItem('compai:companero', 'oso-baston');
    render(<ValleMarcoScreen onExit={() => {}} />);
    const iframe = screen.getByTitle('Valle 3D de Guatoc');
    expect(iframe).toHaveAttribute('src', '/valle/index.html?compai=oso-baston');
  });

  test('sin apagaMarco3dAlSalir (puerta valle3d): salir NO toca la preferencia marco3d', () => {
    const onExit = vi.fn();
    render(<ValleMarcoScreen onExit={onExit} />);
    fireEvent.click(screen.getByTestId('valle-marco-salir'));
    expect(setMarco3DPreference).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test('con apagaMarco3dAlSalir (puerta dashboard): salir apaga marco3d y llama onExit', () => {
    const onExit = vi.fn();
    render(<ValleMarcoScreen onExit={onExit} apagaMarco3dAlSalir />);
    fireEvent.click(screen.getByTestId('valle-marco-salir'));
    expect(setMarco3DPreference).toHaveBeenCalledWith(false);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
