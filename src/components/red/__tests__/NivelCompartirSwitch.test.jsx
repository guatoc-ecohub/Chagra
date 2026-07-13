/**
 * NivelCompartirSwitch — la compuerta opt-in de 3 niveles.
 *
 * Contrato cubierto (anti-extractivo, services/red/README.md):
 *   - Los 3 niveles se ven; "Saber comunitario" (canonizado) está deshabilitado
 *     en el MVP (lo activa un sabedor, no un botón).
 *   - Cambiar de nivel dispara onChange con el SHARE_LEVEL correcto.
 *   - En "Con los vecinos" se muestra la promesa: nada privado cruza, el
 *     comprador se anonimiza, el saber no se vende.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NivelCompartirSwitch from '../NivelCompartirSwitch';
import { SHARE_LEVEL } from '../../../services/red';

afterEach(() => cleanup());

describe('NivelCompartirSwitch', () => {
  it('muestra los 3 niveles como radiogroup, con canonizado deshabilitado', () => {
    render(<NivelCompartirSwitch value={SHARE_LEVEL.PRIVADO} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByTestId(`nivel-compartir-${SHARE_LEVEL.PRIVADO}`).getAttribute('aria-checked')).toBe('true');
    // Nivel 3: se modela pero no se ejecuta — lo canoniza un sabedor.
    expect(screen.getByTestId(`nivel-compartir-${SHARE_LEVEL.CANONIZADO}`).disabled).toBe(true);
  });

  it('cambiar a "Con los vecinos" dispara onChange(PARES)', () => {
    const onChange = vi.fn();
    render(<NivelCompartirSwitch value={SHARE_LEVEL.PRIVADO} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`nivel-compartir-${SHARE_LEVEL.PARES}`));
    expect(onChange).toHaveBeenCalledWith(SHARE_LEVEL.PARES);
  });

  it('el nivel canonizado deshabilitado NO dispara onChange', () => {
    const onChange = vi.fn();
    render(<NivelCompartirSwitch value={SHARE_LEVEL.PRIVADO} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`nivel-compartir-${SHARE_LEVEL.CANONIZADO}`));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explica el nivel elegido en las palabras de la compuerta (privado)', () => {
    render(<NivelCompartirSwitch value={SHARE_LEVEL.PRIVADO} onChange={() => {}} />);
    expect(screen.getByTestId('nivel-compartir-explica').textContent)
      .toMatch(/se queda solo en su teléfono/i);
  });

  it('en PARES muestra la promesa anti-extractiva: nada privado cruza, el saber no se vende', () => {
    render(<NivelCompartirSwitch value={SHARE_LEVEL.PARES} onChange={() => {}} />);
    expect(screen.getByText(/nunca/i)).toBeTruthy();
    expect(screen.getByText(/El nombre del comprador y sus notas privadas/i)).toBeTruthy();
    expect(screen.getByText(/Este saber no se vende/i)).toBeTruthy();
  });
});
