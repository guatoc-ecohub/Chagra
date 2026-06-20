import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MilpaSimulator from '../MilpaSimulator';

// TTS: no hay Web Speech en jsdom; mockeamos para que no truene.
vi.mock('../../../services/ttsService', () => ({
  speak: vi.fn(),
  stop: vi.fn(),
  isSupported: () => false,
}));

// Sonido del agente: stub (Web Audio no existe en jsdom).
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { chime: vi.fn(), listen: vi.fn(), start: vi.fn(), error: vi.fn(), cancel: vi.fn() },
  isSoundEnabled: () => false,
  setSoundEnabled: vi.fn(),
}));

describe('MilpaSimulator', () => {
  it('arranca en fase siembra con cuatro parcelas vacías y temporada deshabilitada', () => {
    render(<MilpaSimulator />);
    expect(screen.getByTestId('milpa-simulator')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-panel-siembra')).toBeInTheDocument();

    const tablero = screen.getByTestId('milpa-tablero');
    expect(within(tablero).getAllByRole('button')).toHaveLength(4);

    // Sin nada sembrado, no se puede empezar la temporada.
    expect(screen.getByTestId('milpa-iniciar-temporada')).toBeDisabled();
  });

  it('sembrar las tres hermanas marca la parcela como milpa y habilita la temporada', () => {
    render(<MilpaSimulator />);

    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-frijol'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-ahuyama'));

    // La parcela 1 ahora es una milpa completa (insignia visible).
    const parcela1 = screen.getByTestId('milpa-parcela-1');
    expect(within(parcela1).getByText('¡Milpa!')).toBeInTheDocument();

    // Las sinergias reales aparecen como cumplidas.
    const sinergias = screen.getByTestId('milpa-sinergias');
    expect(within(sinergias).getByText(/El fríjol fija nitrógeno \(60%\)/)).toBeInTheDocument();

    // Ya se puede empezar la temporada.
    expect(screen.getByTestId('milpa-iniciar-temporada')).not.toBeDisabled();
  });

  it('flujo completo: siembra → evento → resultado muestra ventaja sobre el monocultivo', () => {
    render(<MilpaSimulator />);

    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-frijol'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-ahuyama'));

    fireEvent.click(screen.getByTestId('milpa-iniciar-temporada'));
    expect(screen.getByTestId('milpa-panel-evento')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('milpa-ver-resultado'));
    const resultado = screen.getByTestId('milpa-panel-resultado');
    expect(resultado).toBeInTheDocument();
    // La milpa rinde más que el monocultivo equivalente.
    expect(within(resultado).getByText(/más que sembrar cada cultivo solo/)).toBeInTheDocument();
    // Las tres lecciones reales se muestran.
    expect(within(resultado).getByText(/El fríjol alimenta al maíz/)).toBeInTheDocument();
    expect(within(resultado).getByText(/El maíz sostiene al fríjol/)).toBeInTheDocument();
    expect(within(resultado).getByText(/La ahuyama cuida el suelo/)).toBeInTheDocument();
  });

  it('reiniciar vuelve a la fase de siembra con parcelas vacías', () => {
    render(<MilpaSimulator />);
    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-iniciar-temporada'));
    fireEvent.click(screen.getByTestId('milpa-ver-resultado'));

    fireEvent.click(screen.getByTestId('milpa-reiniciar'));
    expect(screen.getByTestId('milpa-panel-siembra')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-iniciar-temporada')).toBeDisabled();
  });
});
