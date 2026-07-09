/**
 * ChatHistory.backButton.test.jsx — botón "Volver" flotante siempre alcanzable.
 *
 * Bug reportado por piloto (2026-06-04): "para devolverme tengo que ir hasta el
 * inicio de la conversación sin importar lo larga que sea". El único botón de
 * volver vivía SOLO en el header; en una conversación larga el operador tenía
 * que hacer scroll completo hasta arriba para salir.
 *
 * Fix: ChatHistory (dueño del contenedor scrollable) expone un botón "Volver"
 * FLOTANTE que aparece cuando el operador hace scroll hacia abajo y se aleja del
 * inicio. Queda fijo respecto al área de chat → alcanzable sin importar el largo.
 *
 * Estos tests cubren el CONTRATO de visibilidad/acción del botón flotante:
 *   - No aparece cuando estamos arriba (el header ya tiene su "Volver").
 *   - Aparece al hacer scroll hacia abajo.
 *   - Al tocarlo, dispara onBack.
 *   - Sin handler onBack, no se renderiza (backward compat / empty state).
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import ChatHistory from '../ChatHistory';

// jsdom no implementa scrollIntoView — ChatHistory lo llama en su efecto de
// auto-scroll al fondo. Lo stubeamos para que el render no reviente.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// El avatar trae assets/animaciones que no aportan a este test.
vi.mock('../../ChagraAgentAvatar', () => ({ default: () => <div data-testid="avatar-mock" /> }));
// ChatBubble importa servicios pesados (TTS/audio); lo simplificamos al texto.
vi.mock('../ChatBubble', () => ({
  default: ({ message }) => <div data-testid="bubble">{message.content}</div>,
}));

const longConversation = Array.from({ length: 20 }).flatMap((_, i) => ([
  { id: `u${i}`, role: 'user', content: `pregunta ${i}` },
  { id: `a${i}`, role: 'assistant', content: `respuesta ${i}` },
]));

/** Empuja el scroll del contenedor scrollable simulando que el usuario bajó. */
function scrollContainerTo(scroller, top) {
  Object.defineProperty(scroller, 'scrollTop', { value: top, configurable: true });
  fireEvent.scroll(scroller);
}

describe('ChatHistory — botón Volver flotante (alcanzable sin scroll al inicio)', () => {
  it('arriba del todo: NO muestra el botón flotante (el header ya lo tiene)', () => {
    render(<ChatHistory messages={longConversation} onBack={vi.fn()} />);
    expect(screen.queryByTestId('chat-floating-back')).toBeNull();
  });

  it('al bajar el scroll: aparece el botón flotante "Volver"', () => {
    const { container } = render(<ChatHistory messages={longConversation} onBack={vi.fn()} />);
    const scroller = container.querySelector('[data-testid="chat-scroll"]');
    expect(scroller).not.toBeNull();
    scrollContainerTo(scroller, 400);
    expect(screen.getByTestId('chat-floating-back')).toBeInTheDocument();
  });

  it('tocar el botón flotante dispara onBack', () => {
    const onBack = vi.fn();
    const { container } = render(<ChatHistory messages={longConversation} onBack={onBack} />);
    const scroller = container.querySelector('[data-testid="chat-scroll"]');
    scrollContainerTo(scroller, 400);
    fireEvent.click(screen.getByTestId('chat-floating-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('sin handler onBack: nunca renderiza el botón flotante', () => {
    const { container } = render(<ChatHistory messages={longConversation} />);
    const scroller = container.querySelector('[data-testid="chat-scroll"]');
    scrollContainerTo(scroller, 400);
    expect(screen.queryByTestId('chat-floating-back')).toBeNull();
  });

  // Bug visual Vi4 (auditoría IA 2026-07-08): el botón flotante tapaba las
  // primeras palabras del mensaje mientras el operador LEÍA. Ahora se
  // auto-oculta tras una pausa sin scroll y reaparece con cualquier scroll.
  describe('auto-ocultado por inactividad (no tapar el texto al leer)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('tras la pausa sin scroll, el botón se esconde solo', () => {
      vi.useFakeTimers();
      const { container } = render(<ChatHistory messages={longConversation} onBack={vi.fn()} onConsentNeeded={vi.fn()} onRetryOrphan={vi.fn()} onCancelDeepResearch={vi.fn()} />);
      const scroller = container.querySelector('[data-testid="chat-scroll"]');
      scrollContainerTo(scroller, 400);
      expect(screen.getByTestId('chat-floating-back')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.queryByTestId('chat-floating-back')).toBeNull();
    });

    it('un scroll nuevo lo trae de vuelta después de esconderse', () => {
      vi.useFakeTimers();
      const { container } = render(<ChatHistory messages={longConversation} onBack={vi.fn()} onConsentNeeded={vi.fn()} onRetryOrphan={vi.fn()} onCancelDeepResearch={vi.fn()} />);
      const scroller = container.querySelector('[data-testid="chat-scroll"]');
      scrollContainerTo(scroller, 400);
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.queryByTestId('chat-floating-back')).toBeNull();
      scrollContainerTo(scroller, 500);
      expect(screen.getByTestId('chat-floating-back')).toBeInTheDocument();
    });

    it('cada evento de scroll reinicia la cuenta (no parpadea mientras scrollea)', () => {
      vi.useFakeTimers();
      const { container } = render(<ChatHistory messages={longConversation} onBack={vi.fn()} onConsentNeeded={vi.fn()} onRetryOrphan={vi.fn()} onCancelDeepResearch={vi.fn()} />);
      const scroller = container.querySelector('[data-testid="chat-scroll"]');
      scrollContainerTo(scroller, 400);
      act(() => vi.advanceTimersByTime(1500));
      scrollContainerTo(scroller, 600); // sigue scrolleando antes del timeout
      act(() => vi.advanceTimersByTime(1500)); // 1.5s desde el ÚLTIMO scroll (< 2.2s)
      expect(screen.getByTestId('chat-floating-back')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1000)); // ya pasó la pausa completa
      expect(screen.queryByTestId('chat-floating-back')).toBeNull();
    });
  });

  it('el contenedor scrollable reserva padding inferior para que el último mensaje no quede tapado por el input fijo', () => {
    const { container } = render(<ChatHistory messages={longConversation} onBack={vi.fn()} />);
    const scroller = container.querySelector('[data-testid="chat-scroll"]');
    // pb-40 (10rem, subido desde pb-28 en tarea #58) reserva sitio bajo el
    // último mensaje para que sus acciones (👍/👎, Reintentar) no queden bajo
    // el footer fijo (input + franja de voz + tip de foto), que crece más que
    // los 7rem previos.
    expect(scroller.className).toMatch(/pb-40/);
  });
});
