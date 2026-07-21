import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JourneyGuideCard from '../JourneyGuideCard';

beforeEach(() => { localStorage.clear(); });

describe('JourneyGuideCard', () => {
  it('finca sin procesos → muestra Despertar (etapa 1 de 6) y el siguiente paso', () => {
    render(<JourneyGuideCard processes={[]} onNavigate={() => {}} />);
    expect(screen.getByText('Tu camino agroecológico')).toBeTruthy();
    expect(screen.getByText(/Despertar/)).toBeTruthy();
    expect(screen.getByText(/Etapa 1 de 6/)).toBeTruthy();
    expect(screen.getByText('Tu siguiente paso')).toBeTruthy();
  });

  it('marcar una acción la reemplaza por la siguiente pendiente', () => {
    render(<JourneyGuideCard processes={[]} onNavigate={() => {}} />);
    const botones = screen.getAllByRole('button', { name: /Marcar como hecho/ });
    expect(botones.length).toBeGreaterThan(0);
    const primera = botones[0].textContent;
    fireEvent.click(botones[0]);
    const restantes = screen
      .getAllByRole('button', { name: /Marcar como hecho/ })
      .map((b) => b.textContent);
    expect(restantes).not.toContain(primera);
  });

  it('con procesos activos arranca en Pausa Química (etapa 2)', () => {
    render(<JourneyGuideCard processes={[{ attributes: { status: 'active' } }]} onNavigate={() => {}} />);
    expect(screen.getByText(/Pausa Química/)).toBeTruthy();
    expect(screen.getByText(/Etapa 2 de 6/)).toBeTruthy();
  });
});
