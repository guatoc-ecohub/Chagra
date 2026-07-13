/**
 * CierreTratoSheet — "¿Se concretó el negocio?", el gesto que alimenta la red.
 *
 * Contrato cubierto:
 *   - Registra el trato con el desenlace elegido (entrega + calidad opcional +
 *     nivel de compartición) delegando en useRedStore.registrarTrato.
 *   - El trato nace PRIVADO por default (compuerta cerrada).
 *   - La calidad es opcional: sin calificar viaja null, nunca se inventa.
 *   - Al registrar muestra confirmación honesta según el nivel elegido.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const registrarTrato = vi.fn();
vi.mock('../../../store/useRedStore', () => ({
  default: (selector) => selector({ registrarTrato }),
}));

import CierreTratoSheet from '../CierreTratoSheet';
import { ENTREGA, SHARE_LEVEL } from '../../../services/red';

afterEach(() => cleanup());
beforeEach(() => {
  registrarTrato.mockReset();
  registrarTrato.mockResolvedValue({ id: 'trato-1' });
});

const OFERTA = { id: 'of-1', producto: 'Mora de Castilla', vereda: 'El Rosal', municipio: 'Choachí' };

describe('CierreTratoSheet', () => {
  it('registra con defaults honestos: entregado, sin calidad, PRIVADO', async () => {
    render(<CierreTratoSheet oferta={OFERTA} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('registrar-trato'));

    await waitFor(() => expect(registrarTrato).toHaveBeenCalledWith({
      oferta: OFERTA,
      entrega: ENTREGA.ENTREGADO,
      calidad: null,
      shareLevel: SHARE_LEVEL.PRIVADO,
    }));
    expect(await screen.findByTestId('trato-registrado')).toBeTruthy();
    // Quedó privado → se le dice, y se le recuerda que puede abrir la compuerta.
    expect(screen.getByText(/Quedó privado en su teléfono/i)).toBeTruthy();
  });

  it('registra entrega parcial + calidad 4 + compartido con los vecinos', async () => {
    const onRegistrado = vi.fn();
    render(<CierreTratoSheet oferta={OFERTA} onClose={() => {}} onRegistrado={onRegistrado} />);

    fireEvent.click(screen.getByTestId(`entrega-${ENTREGA.PARCIAL}`));
    fireEvent.click(screen.getByTestId('calidad-4'));
    fireEvent.click(screen.getByTestId(`nivel-compartir-${SHARE_LEVEL.PARES}`));
    fireEvent.click(screen.getByTestId('registrar-trato'));

    await waitFor(() => expect(registrarTrato).toHaveBeenCalledWith({
      oferta: OFERTA,
      entrega: ENTREGA.PARCIAL,
      calidad: 4,
      shareLevel: SHARE_LEVEL.PARES,
    }));
    expect(onRegistrado).toHaveBeenCalledWith({ id: 'trato-1' });
    expect(await screen.findByText(/ya ayuda a que otro campesino lo encuentre/i)).toBeTruthy();
  });

  it('si el registro falla, muestra error honesto y no pasa a "registrado"', async () => {
    registrarTrato.mockResolvedValue(null);
    render(<CierreTratoSheet oferta={OFERTA} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('registrar-trato'));

    expect(await screen.findByTestId('trato-error')).toBeTruthy();
    expect(screen.queryByTestId('trato-registrado')).toBeNull();
  });

  it('tocar de nuevo la misma estrella des-califica (vuelve a null)', async () => {
    render(<CierreTratoSheet oferta={OFERTA} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('calidad-3'));
    fireEvent.click(screen.getByTestId('calidad-3'));
    fireEvent.click(screen.getByTestId('registrar-trato'));

    await waitFor(() => expect(registrarTrato).toHaveBeenCalledWith(
      expect.objectContaining({ calidad: null }),
    ));
  });
});
