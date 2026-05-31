import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatBubble from '../AgentScreen/ChatBubble';
import usePrefsStore from '../../store/usePrefsStore';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mocks de servicios pesados (TTS, audio) que ChatBubble importa para el
// handler de doble-click. No los ejercitamos en estos tests — el foco está
// en el badge de "fuente". Evitamos que jsdom intente speechSynthesis.
vi.mock('../../services/ttsService', () => ({
  speak: vi.fn(),
  speakKokoro: vi.fn(),
  stop: vi.fn(),
  isSpeaking: vi.fn(() => false),
  isKokoroAvailable: vi.fn(async () => false),
}));

vi.mock('../../services/agentSoundService', () => ({
  agentSounds: {
    chime: vi.fn(),
    cancel: vi.fn(),
  },
}));

// El avatar usa SVG complejo, mockeamos a un placeholder.
vi.mock('../ChagraAgentAvatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-mock" />,
}));

vi.mock('../../store/usePrefsStore');

describe('ChatBubble — badge de fuente (verificado vs generativo)', () => {
  let storeState;

  beforeEach(() => {
    storeState = {
      showSourceBadges: true,
    };
    usePrefsStore.mockImplementation((selector) => selector(storeState));
  });

  test('Renderiza badge verde cuando metadata.grounded === true', () => {
    const message = {
      role: 'assistant',
      content: 'El aguacate Hass tiene como compañeras...',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_companions', grounded: true },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'catalog');
    expect(badge).toHaveTextContent(/Catálogo verificado/i);
    expect(badge).toHaveTextContent(/compañeras/i);
    // Wording cero hype: NO debe aparecer "garantizado", "perfecto", "100%".
    expect(badge.textContent).not.toMatch(/garantizado/i);
    expect(badge.textContent).not.toMatch(/perfecto/i);
    expect(badge.textContent).not.toMatch(/100%/i);
  });

  test('Renderiza badge amber cuando metadata.grounded === false (tool sin match)', () => {
    const message = {
      role: 'assistant',
      content: 'El catálogo Chagra no tiene esa especie documentada.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_species', grounded: false },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'tool-no-match');
    expect(badge).toHaveTextContent(/Tool sin match/i);
    expect(badge).toHaveTextContent(/especie/i);
  });

  test('Renderiza badge gris cuando assistant sin tool_used (generativo)', () => {
    const message = {
      role: 'assistant',
      content: 'Buenos días, ¿en qué te puedo ayudar?',
      timestamp: Date.now(),
      metadata: { tool_used: null, grounded: false },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'generative');
    expect(badge).toHaveTextContent(/Respuesta generativa/i);
  });

  test('Renderiza badge de nombre científico sospechoso cuando metadata.suspect_names tiene datos', () => {
    const message = {
      role: 'assistant',
      content: 'Para el tomate de árbol, Solanum lycopersicum se da en clima frío.',
      timestamp: Date.now(),
      metadata: {
        tool_used: 'get_species',
        grounded: true,
        suspect_names: ['Solanum lycopersicum'],
      },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('suspect-name-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'suspect-scientific-name');
    expect(badge).toHaveTextContent(/nombre científico/i);
    // El binomio sospechoso va en el title (tooltip), no satura la burbuja.
    expect(badge).toHaveAttribute('title', expect.stringContaining('Solanum lycopersicum'));
    // No es voseo: usa "Verifica" (tú/usted colombiano), no "verificá".
    expect(badge.textContent).not.toMatch(/verificá/i);
  });

  test('El badge sospechoso NO aparece cuando suspect_names está vacío o ausente', () => {
    const message = {
      role: 'assistant',
      content: 'El tomate de árbol Solanum betaceum se da bien.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_species', grounded: true, suspect_names: [] },
    };
    render(<ChatBubble message={message} />);
    expect(screen.queryByTestId('suspect-name-badge')).not.toBeInTheDocument();
    // El badge de fuente normal SÍ sigue apareciendo.
    expect(screen.getByTestId('source-badge')).toBeInTheDocument();
  });

  // #339: la burbuja del assistant NUNCA debe quedar en blanco. Si el LLM
  // devuelve contenido vacío (respuesta degradada, stream sin tokens), se
  // muestra un fallback visible en español colombiano en lugar de un <p>
  // vacío. El usuario campesino no debe ver una "respuesta fantasma".
  test('#339 — assistant con content vacío muestra fallback visible (no burbuja en blanco)', () => {
    for (const empty of ['', '   ', undefined, null]) {
      const { unmount } = render(
        <ChatBubble message={{ role: 'assistant', content: empty, timestamp: Date.now() }} />
      );
      expect(
        screen.getByText(/No recibí respuesta del asistente\. Intenta de nuevo\./i)
      ).toBeInTheDocument();
      unmount();
    }
  });

  test('#339 — assistant con content presente NO muestra el fallback', () => {
    render(
      <ChatBubble
        message={{ role: 'assistant', content: 'Siembre la gulupa sobre 1700 msnm.', timestamp: Date.now() }}
      />
    );
    expect(screen.getByText(/Siembre la gulupa sobre 1700 msnm\./)).toBeInTheDocument();
    expect(screen.queryByText(/No recibí respuesta del asistente/i)).not.toBeInTheDocument();
  });

  test('NO renderiza badge si showSourceBadges está OFF', () => {
    storeState.showSourceBadges = false;
    const message = {
      role: 'assistant',
      content: 'Datos del aguacate.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_species', grounded: true },
    };
    render(<ChatBubble message={message} />);
    expect(screen.queryByTestId('source-badge')).not.toBeInTheDocument();
  });

  test('NO renderiza badge en mensajes del usuario', () => {
    const message = {
      role: 'user',
      content: '¿Qué compañeras tiene el aguacate?',
      timestamp: Date.now(),
    };
    render(<ChatBubble message={message} />);
    expect(screen.queryByTestId('source-badge')).not.toBeInTheDocument();
  });

  test('NO renderiza badge mientras isStreaming=true (estado transitorio)', () => {
    const message = {
      role: 'assistant',
      content: 'Generando...',
      metadata: { tool_used: 'get_species', grounded: true },
    };
    render(<ChatBubble message={message} isStreaming />);
    expect(screen.queryByTestId('source-badge')).not.toBeInTheDocument();
  });

  test('NO renderiza badge en mensajes _orphan_recovery (no es respuesta real)', () => {
    const message = {
      role: 'assistant',
      content: 'Tu pregunta anterior no recibió respuesta.',
      timestamp: Date.now(),
      _orphan_recovery: true,
    };
    render(<ChatBubble message={message} />);
    expect(screen.queryByTestId('source-badge')).not.toBeInTheDocument();
  });

  test('Backward compat: mensajes assistant viejos sin metadata renderizan como generativos sin crashear', () => {
    const message = {
      role: 'assistant',
      content: 'Mensaje antiguo persistido antes de la feature de badges.',
      timestamp: Date.now(),
      // sin metadata
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'generative');
    expect(badge).toHaveTextContent(/Respuesta generativa/i);
  });

  test('Backward compat: metadata=null no rompe el render', () => {
    const message = {
      role: 'assistant',
      content: 'Otro mensaje legacy.',
      timestamp: Date.now(),
      metadata: null,
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toHaveAttribute('data-source', 'generative');
  });

  test('Tool sin label en el mapa muestra el nombre técnico (no crashea)', () => {
    const message = {
      role: 'assistant',
      content: 'Resultado de un tool nuevo.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_brand_new_tool', grounded: true },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('source-badge');
    expect(badge).toHaveTextContent(/get_brand_new_tool/);
  });
});
