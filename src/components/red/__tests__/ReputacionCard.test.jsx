/**
 * ReputacionCard — reputación GANADA por cultivo, en hechos contables.
 *
 * Contrato cubierto:
 *   - Verde: semáforo "Entrega cumplida" + los hechos (n tratos, fiabilidad %).
 *   - Nuevo: honesto — "vecino nuevo", sin puntaje inventado.
 *   - Calidad solo se pinta si fue calificada (null → no se inventa).
 *   - Nada privado: la tarjeta habla de "un vecino", nunca de un nombre.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ReputacionCard from '../ReputacionCard';

afterEach(() => cleanup());

const REP_VERDE = {
  productorHash: 'h-abc',
  producto: 'Tomate chonto',
  productoNorm: 'tomate chonto',
  vereda: 'La Unión',
  municipio: 'Choachí',
  nTransacciones: 5,
  nConfirmadas: 4,
  nEntregados: 4,
  fiabilidad: 0.83,
  calidadPromedio: 4.5,
  calidadNorm: 0.875,
  reciente: Date.now(),
  score: 0.7,
  nivel: 'verde',
  motivo: 'entrega_pareja',
};

const REP_NUEVA = {
  ...REP_VERDE,
  nTransacciones: 1,
  nConfirmadas: 0,
  nEntregados: 0,
  fiabilidad: 0.5,
  calidadPromedio: null,
  calidadNorm: null,
  nivel: 'nuevo',
  motivo: 'sin_historial_suficiente',
};

describe('ReputacionCard', () => {
  it('verde: semáforo + hechos contables (tratos confirmados y fiabilidad)', () => {
    render(<ReputacionCard reputacion={REP_VERDE} />);
    expect(screen.getByTestId('reputacion-nivel').textContent).toMatch(/Entrega cumplida/i);
    expect(screen.getByTestId('reputacion-fiabilidad').textContent).toMatch(/4/);
    expect(screen.getByTestId('reputacion-fiabilidad').textContent).toMatch(/83% de fiabilidad/i);
    expect(screen.getByTestId('reputacion-calidad').textContent).toMatch(/4\.5 de 5/);
    expect(screen.getByTestId('reputacion-motivo').textContent).toMatch(/entregado parejo/i);
    // Privacidad: un vecino, no un nombre ni un hash a la vista.
    expect(screen.getByText(/Un vecino de la red/i)).toBeTruthy();
    expect(screen.queryByText(/h-abc/)).toBeNull();
  });

  it('nuevo: honesto, sin historial suficiente y sin puntaje inventado', () => {
    render(<ReputacionCard reputacion={REP_NUEVA} />);
    expect(screen.getByTestId('reputacion-nivel').textContent).toMatch(/Vecino nuevo/i);
    expect(screen.getByTestId('reputacion-sin-historial')).toBeTruthy();
    expect(screen.queryByTestId('reputacion-calidad')).toBeNull();
    expect(screen.getByTestId('reputacion-motivo').textContent).toMatch(/no es malo: es honesto/i);
  });

  it('esUsted cambia el encuadre a "Usted en la red"', () => {
    render(<ReputacionCard reputacion={REP_VERDE} esUsted />);
    expect(screen.getByText(/Usted en la red/i)).toBeTruthy();
  });

  it('sin reputación no pinta nada (graceful)', () => {
    const { container } = render(<ReputacionCard reputacion={null} />);
    expect(container.innerHTML).toBe('');
  });
});
