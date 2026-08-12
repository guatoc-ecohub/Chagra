/**
 * CompaiGuiaPantalla.test.jsx — el compAI ELEGIDO explica la pantalla al
 * entrar (Fase 2): burbuja con la explicación, voz local sincronizada, y el
 * botón que abre el agente (respuesta agro real — NO se duplica el motor).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import CompaiGuiaPantalla from '../CompaiGuiaPantalla.jsx';
import usePrefsStore from '../../store/usePrefsStore.js';
import useAngelitaStore from '../../store/useAngelitaStore.js';

vi.mock('../../services/ttsService.js', () => ({
  speakSentences: vi.fn(() => Promise.resolve()),
}));
import { speakSentences } from '../../services/ttsService.js';

const DEMORA = 800;

beforeEach(() => {
  usePrefsStore.setState({ ttsEnabled: true });
  useAngelitaStore.setState({ silenciado: false });
  sessionStorage.clear();
  vi.mocked(speakSentences).mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function avanzar(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('CompaiGuiaPantalla — la guía de entrada por pantalla', () => {
  it('al entrar a una pantalla cubierta, muestra la explicación y la LEE en voz', () => {
    render(<CompaiGuiaPantalla pantalla="activos" onNavigate={() => {}} />);
    expect(screen.queryByRole('region', { name: /Guía de/i })).toBeNull();

    avanzar(DEMORA + 10);
    const guia = screen.getByRole('region', { name: /Guía de/i });
    expect(guia).toBeTruthy();
    // La voz y la burbuja comparten el MISMO texto (burbuja sincronizada).
    expect(speakSentences).toHaveBeenCalledWith(
      'Aquí está todo lo que tiene sembrado y sus animales, contado uno por uno.',
    );
  });

  it('no aparece en pantalla sin explicación', () => {
    render(<CompaiGuiaPantalla pantalla="ruta-que-no-existe" onNavigate={() => {}} />);
    avanzar(DEMORA + 10);
    expect(screen.queryByRole('region', { name: /Guía de/i })).toBeNull();
    expect(speakSentences).not.toHaveBeenCalled();
  });

  it('no aparece con el silencio manual (respeto al «que se quede callado»)', () => {
    useAngelitaStore.setState({ silenciado: true });
    render(<CompaiGuiaPantalla pantalla="activos" onNavigate={() => {}} />);
    avanzar(DEMORA + 10);
    expect(screen.queryByRole('region', { name: /Guía de/i })).toBeNull();
  });

  it('«Preguntarme sobre esto» abre el agente con el contexto de la pantalla', () => {
    const onNavigate = vi.fn();
    render(<CompaiGuiaPantalla pantalla="suelo" onNavigate={onNavigate} />);
    avanzar(DEMORA + 10);

    fireEvent.click(screen.getByRole('button', { name: /Preguntar sobre/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', {
      desdePantalla: 'suelo',
      spatialContext: { pantalla: 'suelo' },
    });
  });

  it('la × cierra la guía', () => {
    render(<CompaiGuiaPantalla pantalla="activos" onNavigate={() => {}} />);
    avanzar(DEMORA + 10);
    expect(screen.getByRole('region', { name: /Guía de/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar la guía/i }));
    expect(screen.queryByRole('region', { name: /Guía de/i })).toBeNull();
  });
});
