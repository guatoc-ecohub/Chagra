/**
 * ChatBubble.crossCrop.test.jsx — el SELLO ante contaminación cruzada de cultivo.
 *
 * Verifica el cableado visual del AFFECTS-GATE: un turno cuya metadata quedó
 * marcada como cross_crop (la broca, plaga de café, surfaced en una conversación
 * de cacao) NO debe pintar el verde "Catálogo verificado", sino el ámbar
 * explícito "Dato de otro cultivo · verifica". Un turno grounded normal SÍ pinta
 * el verde (control, sin regresión).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Dependencias pesadas del ChatBubble que no aportan al test del sello.
vi.mock('../../ChagraAgentAvatar', () => ({ default: () => <div data-testid="avatar-mock" /> }));
vi.mock('../../FeedbackButtons', () => ({ default: () => <div data-testid="feedback-mock" /> }));
vi.mock('../../AIBetaBadge', () => ({ default: () => <div data-testid="aibeta-mock" /> }));
vi.mock('../../../services/ttsService', () => ({
  speak: vi.fn(), speakKokoro: vi.fn(), stop: vi.fn(),
  isSpeaking: () => false, isKokoroAvailable: async () => false,
}));
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { chime: vi.fn(), cancel: vi.fn() },
}));

import ChatBubble from '../ChatBubble';

describe('ChatBubble — sello ante cross-crop (AFFECTS-GATE)', () => {
  it('turno cross-crop (broca en cacao): NO pinta "Catálogo verificado", pinta "de otro cultivo"', () => {
    const message = {
      role: 'assistant',
      content: 'Para tu cacao, la broca se controla con Beauveria bassiana.',
      timestamp: Date.now(),
      metadata: {
        tool_used: 'get_pest_controllers',
        grounded: false, // degradado por el gate
        cross_crop: true,
        cross_crop_organisms: ['Broca del café'],
        cross_crop_focus: ['theobroma_cacao'],
      },
    };
    render(<ChatBubble message={message} />);

    // El sello verde NO aparece.
    expect(screen.queryByText(/Catálogo verificado/i)).toBeNull();
    // Aparece la marca explícita "de otro cultivo".
    const badge = screen.getByTestId('cross-crop-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Dato de otro cultivo/i);
    // Tampoco el tick esmeralda de grounding.
    expect(screen.queryByTestId('grounded-tick')).toBeNull();
  });

  it('control: turno grounded normal SÍ pinta "Catálogo verificado" (sin regresión)', () => {
    const message = {
      role: 'assistant',
      content: 'El café se controla la broca con Beauveria bassiana.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_pest_controllers', grounded: true },
    };
    render(<ChatBubble message={message} />);

    expect(screen.getByTestId('source-badge')).toHaveTextContent(/Catálogo verificado/i);
    expect(screen.queryByTestId('cross-crop-badge')).toBeNull();
  });
});
