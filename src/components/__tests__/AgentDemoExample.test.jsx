/**
 * Tests UX-4 (#285) — AgentDemoExample.
 *
 * Verifica que el componente:
 *   1. Renderiza inmediatamente la burbuja simulada del usuario con el
 *      prompt curado.
 *   2. Muestra estado "Pensando…" mientras transcurre el delay (1s).
 *   3. Tras avanzar timers ~1s aparece la respuesta del agente con
 *      AIBetaBadge + disclaimer demostrativo.
 *   4. El botón "Cerrar ejemplo" dispara onClose si está provisto.
 *
 * Foco unit-puro: NO renderea el AgentScreen completo — eso requeriría
 * stub de ~25 servicios y trae fragilidad. Es el mismo patrón usado por
 * los demás smoke tests del directorio (AIBetaBadge, etc.).
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import AgentDemoExample from '../AgentDemoExample';

describe('AgentDemoExample — demo simulada del agente (UX-4 #285)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renderiza la burbuja del usuario con el prompt curado al montar', () => {
    render(<AgentDemoExample />);
    const userBubble = screen.getByTestId('agent-demo-user-bubble');
    expect(userBubble).toBeInTheDocument();
    expect(userBubble.textContent).toMatch(/gulupa/i);
    expect(userBubble.textContent).toMatch(/mancha amarilla/i);
  });

  test('muestra estado "Pensando…" antes del delay', () => {
    render(<AgentDemoExample />);
    expect(screen.getByTestId('agent-demo-thinking')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-demo-agent-bubble')).not.toBeInTheDocument();
  });

  test('tras 1s aparece la respuesta del agente con badge beta y disclaimer', () => {
    render(<AgentDemoExample />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const reply = screen.getByTestId('agent-demo-agent-bubble');
    expect(reply).toBeInTheDocument();
    expect(reply.textContent).toMatch(/Septoria passiflorae/);
    expect(reply.textContent).toMatch(/cola de caballo/);
    // Badge "beta" UX-1 (#284) presente.
    expect(screen.getByTestId('ai-beta-badge')).toBeInTheDocument();
    // Disclaimer demostrativo visible.
    const disclaimer = screen.getByTestId('agent-demo-disclaimer');
    expect(disclaimer.textContent).toMatch(/Ejemplo demostrativo/i);
    expect(disclaimer.textContent).toMatch(/situación real/i);
  });

  test('el botón "Cerrar ejemplo" dispara onClose cuando está provisto', () => {
    const onClose = vi.fn();
    render(<AgentDemoExample onClose={onClose} />);
    const closeBtn = screen.getByTestId('agent-demo-close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('sin prop onClose el botón cerrar no se renderiza', () => {
    render(<AgentDemoExample />);
    expect(screen.queryByTestId('agent-demo-close')).not.toBeInTheDocument();
  });

  test('autoStart=false mantiene el estado "Pensando…" indefinido hasta avanzar timers manualmente', () => {
    render(<AgentDemoExample autoStart={false} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('agent-demo-thinking')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-demo-agent-bubble')).not.toBeInTheDocument();
  });
});
