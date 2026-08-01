import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import ChatBubble from '../ChatBubble';

// El avatar y servicios de voz traen assets/animaciones que no aportan al test
// del render de markdown. Los mockeamos para aislar la burbuja.
vi.mock('../../ChagraAgentAvatar', () => ({ default: () => <div data-testid="avatar-mock" /> }));
vi.mock('../../../services/ttsService', () => ({
  speak: vi.fn(), speakKokoro: vi.fn(), stop: vi.fn(),
  isSpeaking: () => false, isKokoroAvailable: async () => false,
}));
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { chime: vi.fn(), cancel: vi.fn() },
}));
vi.mock('../../FeedbackButtons', () => ({ default: () => <div data-testid="feedback-mock" /> }));
vi.mock('../../AIBetaBadge', () => ({ default: () => <div data-testid="beta-mock" /> }));

// ChatBubble tipa onConsentNeeded/onRetryOrphan como requeridos (feedback y
// recuperación de huérfanos, ninguno relevante para el render de markdown) —
// no-ops que solo satisfacen el contrato de props.
const noop = () => {};

/**
 * Task #58: la burbuja del AGENTE debe renderizar markdown limpio (negritas,
 * viñetas), NO mostrar `**`/`###` crudos al campesino/niña. El texto del USUARIO
 * y el streaming en curso siguen como texto plano.
 */
describe('ChatBubble — render de markdown del agente (#58)', () => {
  it('respuesta del agente: **negrita** se renderiza como <strong>, sin asteriscos', () => {
    render(
      <ChatBubble
        message={{ role: 'assistant', content: 'Aplica **caldo bordelés** por la mañana.' }}
        isStreaming={false}
        onConsentNeeded={noop}
        onRetryOrphan={noop}
      />,
    );
    const strong = screen.getByText('caldo bordelés');
    expect(strong.tagName).toBe('STRONG');
    // Ningún asterisco crudo visible en la burbuja.
    expect(document.body.textContent).not.toContain('**');
  });

  it('respuesta del agente: viñetas markdown → lista real <li>', () => {
    render(
      <ChatBubble
        message={{ role: 'assistant', content: 'Compañeras:\n* Caléndula\n* Albahaca' }}
        isStreaming={false}
        onConsentNeeded={noop}
        onRetryOrphan={noop}
      />,
    );
    expect(screen.getByText('Caléndula').tagName).toBe('LI');
    expect(screen.getByText('Albahaca').tagName).toBe('LI');
    expect(document.body.textContent).not.toContain('* ');
  });

  it('mensaje del USUARIO se muestra como texto plano (no se interpreta markdown)', () => {
    render(
      <ChatBubble
        message={{ role: 'user', content: 'tengo **plaga** en el tomate' }}
        isStreaming={false}
        onConsentNeeded={noop}
        onRetryOrphan={noop}
      />,
    );
    // El texto del usuario conserva sus asteriscos literales (no es markdown).
    expect(screen.getByText('tengo **plaga** en el tomate')).toBeInTheDocument();
  });

  it('streaming en curso: texto plano (evita parpadeo por ** sin cerrar)', () => {
    render(
      <ChatBubble
        message={{ role: 'assistant', content: 'Voy a explicarte **cómo' }}
        isStreaming={true}
        onConsentNeeded={noop}
        onRetryOrphan={noop}
      />,
    );
    // Durante streaming no rompemos el render con markdown a medias.
    expect(screen.getByText(/Voy a explicarte/)).toBeInTheDocument();
  });

  it('respuesta vacía del agente: muestra fallback, no burbuja en blanco', () => {
    render(
      <ChatBubble
        message={{ role: 'assistant', content: '' }}
        isStreaming={false}
        onConsentNeeded={noop}
        onRetryOrphan={noop}
      />,
    );
    expect(screen.getByText(/No recibí respuesta/)).toBeInTheDocument();
  });
});
