/*
 * Vitrina #/mockups/clima-atmosfera — smoke.
 *
 * La ruta legacy quedo como puente al mundo del clima real. En jsdom no hay
 * WebGL, asi que el host debe caer al gemelo 2D del mundo y seguir exponiendo
 * el boton de regreso para el shell.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ClimaAtmosfera from '../ClimaAtmosfera.jsx';

afterEach(() => cleanup());

describe('vitrina legacy del clima (mockups/clima-atmosfera)', () => {
  test('monta el mundo climatico real y conserva el retorno al shell', () => {
    const onBack = vi.fn();
    const { container } = render(<ClimaAtmosfera onBack={onBack} />);

    expect(screen.getByRole('heading', { level: 1, name: 'El mundo del clima' })).toBeInTheDocument();
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
