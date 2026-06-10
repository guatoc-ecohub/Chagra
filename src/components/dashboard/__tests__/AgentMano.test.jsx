/**
 * AgentMano — "La mano de Chagra": componente único de capacidades compartido
 * por el bottom-sheet Ⓐ (AgentHero) y el panel inline (AgentAraña).
 *
 * Contrato cubierto:
 *   - Renderiza el emblema (SVG de la mano) + la lista agrupada de capacidades.
 *   - Las capacidades `live` son tappables y llaman onPick con el cap completo.
 *   - Las capacidades `soon` salen opacas, deshabilitadas y rotuladas
 *     "Por lanzarse" (requisito operador: mostrar lo pendiente, levemente opaco).
 *   - showEmblem=false omite el emblema (para usos compactos).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AgentMano from '../AgentMano';

afterEach(() => cleanup());

describe('AgentMano — la mano de Chagra', () => {
  it('renderiza el emblema de la mano y la lista de capacidades', () => {
    const { container } = render(<AgentMano onPick={() => {}} />);
    expect(container.querySelector('svg.mano-emblema')).toBeTruthy();
    expect(container.querySelector('.mano-hand')).toBeTruthy();
    // Al menos una tarjeta de capacidad.
    expect(container.querySelectorAll('button.mano-cap').length).toBeGreaterThan(3);
  });

  it('showEmblem=false omite el emblema pero conserva la lista', () => {
    const { container } = render(<AgentMano onPick={() => {}} showEmblem={false} />);
    expect(container.querySelector('svg.mano-emblema')).toBeNull();
    expect(container.querySelectorAll('button.mano-cap').length).toBeGreaterThan(3);
  });

  it('una capacidad live es tappable y llama onPick con el cap', () => {
    const onPick = vi.fn();
    const { container } = render(<AgentMano onPick={onPick} />);
    const live = Array.from(container.querySelectorAll('button.mano-cap')).find(
      (b) => !b.classList.contains('is-soon')
    );
    expect(live).toBeTruthy();
    fireEvent.click(live);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toHaveProperty('id');
  });

  it('muestra capacidades "por lanzarse" opacas, deshabilitadas y rotuladas', () => {
    const onPick = vi.fn();
    const { container } = render(<AgentMano onPick={onPick} />);
    const soon = container.querySelector('button.mano-cap.is-soon');
    expect(soon).toBeTruthy();
    expect(soon.disabled).toBe(true);
    // No rutea al hacer click.
    fireEvent.click(soon);
    expect(onPick).not.toHaveBeenCalled();
    // Etiqueta "Por lanzarse" presente.
    expect(screen.getAllByText(/Por lanzarse/i).length).toBeGreaterThan(0);
  });
});
