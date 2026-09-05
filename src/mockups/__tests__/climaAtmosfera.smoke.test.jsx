/*
 * Vitrina #/mockups/clima-atmosfera — smoke.
 *
 * La ruta legacy (la que embebe el mundo `el-tiempo` de 3d.guatoc.co) renderiza
 * la PÁGINA DEL TIEMPO canónica con su escena atmosférica detrás (spec
 * 2026-09-06-unificar-2d-clima, CA-11). Debe seguir exponiendo el regreso al
 * shell y no puede caer en 404 ni en pantalla vacía.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ClimaAtmosfera from '../ClimaAtmosfera.jsx';

vi.mock('../../services/climaService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchClimaSnapshot: vi.fn(async () => null) };
});
vi.mock('../../services/agroMeteoService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchAgroMeteo: vi.fn(async () => null), fetchNormales: vi.fn(async () => null) };
});

afterEach(() => cleanup());

describe('vitrina legacy del clima (mockups/clima-atmosfera)', () => {
  test('monta la página del tiempo canónica con la escena y conserva el retorno al shell', () => {
    const onBack = vi.fn();
    render(<ClimaAtmosfera onBack={onBack} />);

    expect(screen.getByTestId('clima-boletin-screen')).toBeInTheDocument();
    expect(screen.getByTestId('escena-atmosfera')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-hoy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
