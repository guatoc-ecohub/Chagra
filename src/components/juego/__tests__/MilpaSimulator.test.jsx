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
  const elegirMilpa = () => {
    fireEvent.click(screen.getByRole('button', { name: /Milpa \(Tres Hermanas\)/ }));
  };

  it('arranca en selección y entra a siembra con seis parcelas vacías', () => {
    render(<MilpaSimulator />);
    expect(screen.getByTestId('milpa-simulator')).toBeInTheDocument();
    expect(screen.getByText('¿Qué quieres sembrar hoy?')).toBeInTheDocument();

    elegirMilpa();
    expect(screen.getByTestId('milpa-panel-siembra')).toBeInTheDocument();

    const tablero = screen.getByTestId('milpa-tablero');
    expect(within(tablero).getAllByRole('button')).toHaveLength(6);

    // Sin nada sembrado, no se puede empezar la temporada.
    expect(screen.getByTestId('milpa-iniciar-temporada')).toBeDisabled();
  });

  it('sembrar las tres hermanas llena 4/4 espacios, narra la sinergia y habilita la temporada', () => {
    render(<MilpaSimulator />);
    elegirMilpa();

    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-frijol'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-ahuyama'));

    // La parcela 1 ahora es una milpa completa (insignia visible).
    const parcela1 = screen.getByTestId('milpa-parcela-1');
    expect(within(parcela1).getByText('Milpa (Tres Hermanas)')).toBeInTheDocument();
    expect(within(parcela1).getByText('4/4 espacios')).toBeInTheDocument();

    // Las sinergias reales aparecen narradas y con cifras.
    const sinergias = screen.getByTestId('milpa-sinergias');
    expect(within(sinergias).getByText(/El fríjol trepa por el maíz y fija nitrógeno/)).toBeInTheDocument();
    expect(within(sinergias).getByText('60%')).toBeInTheDocument();
    expect(within(sinergias).getByText(/Descubriste la Milpa/)).toBeInTheDocument();

    // Ya se puede empezar la temporada.
    expect(screen.getByTestId('milpa-iniciar-temporada')).not.toBeDisabled();
  });

  it('flujo completo: siembra → evento → resultado muestra ventaja sobre el monocultivo', () => {
    render(<MilpaSimulator />);
    elegirMilpa();

    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-frijol'));
    fireEvent.click(screen.getByTestId('milpa-sembrar-ahuyama'));

    fireEvent.click(screen.getByTestId('milpa-iniciar-temporada'));
    expect(screen.getByTestId('milpa-panel-evento')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('milpa-ver-resultado'));
    const resultado = screen.getByTestId('milpa-panel-resultado');
    expect(resultado).toBeInTheDocument();
    // La milpa rinde más que el monocultivo equivalente.
    expect(within(resultado).getByText(/más que el monocultivo/)).toBeInTheDocument();
    // Las tres lecciones reales se muestran.
    expect(within(resultado).getByText(/El fríjol alimenta al maíz/)).toBeInTheDocument();
    expect(within(resultado).getByText(/El maíz sostiene al fríjol/)).toBeInTheDocument();
    expect(within(resultado).getByText(/La ahuyama cuida el suelo/)).toBeInTheDocument();
  });

  it('permite pasar a la siguiente temporada con parcelas vacías', () => {
    render(<MilpaSimulator />);
    elegirMilpa();
    fireEvent.click(screen.getByTestId('milpa-sembrar-maiz'));
    fireEvent.click(screen.getByTestId('milpa-iniciar-temporada'));
    fireEvent.click(screen.getByTestId('milpa-ver-resultado'));

    fireEvent.click(screen.getByRole('button', { name: /Siguiente temporada/ }));
    expect(screen.getByTestId('milpa-panel-siembra')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-iniciar-temporada')).toBeDisabled();
  });
});
