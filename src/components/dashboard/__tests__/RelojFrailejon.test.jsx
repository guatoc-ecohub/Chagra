/**
 * RelojFrailejon — el anillo temporal del pie del árbol es GROUNDED (años
 * reales del fincaClockService), un anillo por año, y NO es decoración
 * huérfana: tocarlo abre "El año de la finca" (vista real ano_finca).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../../services/fincaClockService', () => ({
  getAniosFinca: vi.fn(),
}));

import { getAniosFinca } from '../../../services/fincaClockService';
import RelojFrailejon from '../RelojFrailejon';

afterEach(() => cleanup());
beforeEach(() => vi.mocked(getAniosFinca).mockReset());

const conAnios = (anios, extra = {}) => {
  vi.mocked(getAniosFinca).mockResolvedValue({
    primerAnio: anios[0],
    anioActual: anios[anios.length - 1],
    anios,
    fincaNueva: false,
    fuente: 'registros',
    ...extra,
  });
};

describe('RelojFrailejon — un anillo por año REAL', () => {
  test('finca con historia: un anillo por año y los años marcados', async () => {
    conAnios([2024, 2025, 2026]);
    const { container } = render(<RelojFrailejon onNavigate={vi.fn()} />);
    const reloj = await screen.findByTestId('reloj-frailejon');
    expect(reloj).toBeInTheDocument();
    // 3 años = 3 anillos
    expect(container.querySelectorAll('.adm-reloj-anillo')).toHaveLength(3);
    // los años reales están escritos (marcadores del SVG)
    expect(container.textContent).toContain('2024');
    expect(container.textContent).toContain('2026');
    expect(screen.getByTestId('reloj-frailejon-anios')).toHaveTextContent('3 anillos');
    expect(screen.getByText(/desde 2024/)).toBeInTheDocument();
  });

  test('finca nueva: el año actual es el PRIMER anillo (sin historia inventada)', async () => {
    vi.mocked(getAniosFinca).mockResolvedValue({
      primerAnio: 2026,
      anioActual: 2026,
      anios: [2026],
      fincaNueva: true,
      fuente: 'finca-nueva',
    });
    const { container } = render(<RelojFrailejon onNavigate={vi.fn()} />);
    await screen.findByTestId('reloj-frailejon');
    expect(container.querySelectorAll('.adm-reloj-anillo')).toHaveLength(1);
    expect(screen.getByTestId('reloj-frailejon-anios')).toHaveTextContent('Su primer anillo');
    expect(screen.getByText(/2026: su primer anillo/)).toBeInTheDocument();
  });

  test('no huérfano: tocar el reloj abre "El año de la finca" (ano_finca)', async () => {
    conAnios([2025, 2026]);
    const onNavigate = vi.fn();
    render(<RelojFrailejon onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByTestId('reloj-frailejon'));
    expect(onNavigate).toHaveBeenCalledWith('ano_finca');
  });

  test('servicio sin datos (degradado): no dibuja nada inventado (render null)', async () => {
    // El contrato del servicio es SIEMPRE resolver (sus fuentes fallidas se
    // tragan adentro); si aun así llegara vacío, el reloj no inventa nada.
    vi.mocked(getAniosFinca).mockResolvedValue(null);
    render(<RelojFrailejon onNavigate={vi.fn()} />);
    await waitFor(() => expect(getAniosFinca).toHaveBeenCalled());
    expect(screen.queryByTestId('reloj-frailejon')).not.toBeInTheDocument();
  });
});
