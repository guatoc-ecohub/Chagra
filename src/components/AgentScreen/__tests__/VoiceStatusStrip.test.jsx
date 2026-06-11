/**
 * Tests para VoiceStatusStrip (TIER 2 #5 — voz punta-a-punta).
 *
 * El strip es la superficie de estado de voz para baja alfabetización:
 * estados visuales evidentes con ícono+animación, no solo texto:
 *   - listening → "Chagra te escucha"
 *   - thinking  → "Chagra está pensando"
 *   - speaking  → "Chagra está hablando" + botón Parar
 *   - idle + canRepeat → botón GRANDE "Volver a oír"
 *   - notice    → aviso amable de degradación (STT/TTS caído) + cerrar
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceStatusStrip from '../VoiceStatusStrip.jsx';

describe('VoiceStatusStrip — estados de voz para baja alfabetización', () => {
  it('phase=listening muestra "Chagra te escucha" con aria-live', () => {
    render(<VoiceStatusStrip phase="listening" />);
    const strip = screen.getByTestId('voice-status-strip');
    expect(strip).toBeTruthy();
    expect(screen.getByText(/Chagra te escucha/i)).toBeTruthy();
    const label = screen.getByTestId('voice-state-label');
    expect(label.getAttribute('aria-live')).toBe('polite');
  });

  it('phase=thinking muestra "Chagra está pensando"', () => {
    render(<VoiceStatusStrip phase="thinking" />);
    expect(screen.getByText(/Chagra está pensando/i)).toBeTruthy();
  });

  it('phase=speaking muestra "Chagra está hablando" + botón Parar que dispara onStopSpeaking', () => {
    const onStop = vi.fn();
    render(<VoiceStatusStrip phase="speaking" onStopSpeaking={onStop} />);
    expect(screen.getByText(/Chagra está hablando/i)).toBeTruthy();
    const btn = screen.getByTestId('voice-stop-btn');
    fireEvent.click(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('phase=idle + canRepeat muestra botón "Volver a oír" que dispara onRepeat', () => {
    const onRepeat = vi.fn();
    render(<VoiceStatusStrip phase="idle" canRepeat onRepeat={onRepeat} />);
    const btn = screen.getByTestId('voice-repeat-btn');
    expect(btn.textContent).toMatch(/Volver a oír/i);
    fireEvent.click(btn);
    expect(onRepeat).toHaveBeenCalledTimes(1);
  });

  it('phase=idle sin canRepeat ni notice no renderiza nada', () => {
    const { container } = render(<VoiceStatusStrip phase="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('notice muestra el aviso amable y el botón de cierre dispara onDismissNotice', () => {
    const onDismiss = vi.fn();
    render(
      <VoiceStatusStrip
        phase="idle"
        notice="No pude escucharte esta vez. Escribe tu pregunta abajo o intenta de nuevo."
        onDismissNotice={onDismiss}
      />
    );
    expect(screen.getByTestId('voice-notice').textContent).toMatch(/No pude escucharte/i);
    fireEvent.click(screen.getByTestId('voice-notice-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('mientras habla NO muestra el botón Volver a oír (evita doble audio)', () => {
    render(<VoiceStatusStrip phase="speaking" canRepeat onRepeat={() => {}} onStopSpeaking={() => {}} />);
    expect(screen.queryByTestId('voice-repeat-btn')).toBeNull();
  });
});
