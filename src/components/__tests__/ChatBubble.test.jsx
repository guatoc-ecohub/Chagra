import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatBubbleRaw from '../AgentScreen/ChatBubble';
/** @type {any} */
const ChatBubble = ChatBubbleRaw;
import usePrefsStore from '../../store/usePrefsStore';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mocks de servicios pesados (TTS, audio) que ChatBubble importa para el
// handler de doble-click. No los ejercitamos en estos tests — el foco está
// en el badge de "fuente". Evitamos que jsdom intente speechSynthesis.
vi.mock('../../services/ttsService', () => ({
  onConsentNeeded: vi.fn(),
  onRetryOrphan: vi.fn(),
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

  // FIX 2 (2026-05-31): el post-validate devuelve `hallucinated[]` con binomios
  // 100% INVENTADOS (no existen en AGE ni en la realidad, ej. "Neolepidopteron
  // daquila"). Antes el PWA solo consumía `suspect` → el nombre inventado se
  // detectaba y se TIRABA en silencio. Ahora se surfacéa: badge warning +
  // tooltip con los nombres no verificados.
  test('FIX 2 — renderiza badge de nombre científico INVENTADO cuando metadata.hallucinated_names tiene datos', () => {
    const message = {
      role: 'assistant',
      content: 'Para esa plaga, el Neolepidopteron daquila es el principal controlador.',
      timestamp: Date.now(),
      metadata: {
        tool_used: 'get_pest_controllers',
        grounded: true,
        hallucinated_names: ['Neolepidopteron daquila'],
      },
    };
    render(<ChatBubble message={message} />);
    const badge = screen.getByTestId('hallucinated-name-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-source', 'hallucinated-scientific-name');
    // Señal clara de "nombre no verificado / inventado".
    expect(badge).toHaveTextContent(/nombre científico/i);
    // El binomio inventado va en el tooltip (no satura la burbuja).
    expect(badge).toHaveAttribute('title', expect.stringContaining('Neolepidopteron daquila'));
    // Español colombiano, sin voseo argentino.
    expect(badge.textContent).not.toMatch(/verificá/i);
    // Cero hype.
    expect(badge.textContent).not.toMatch(/garantizado|perfecto|100%/i);
  });

  test('FIX 2 — el badge de inventado tiene prioridad sobre suspect y sobre la fuente (es la señal más fuerte)', () => {
    const message = {
      role: 'assistant',
      content: 'El Neolepidopteron daquila controla la plaga.',
      timestamp: Date.now(),
      metadata: {
        tool_used: 'get_species',
        grounded: true,
        suspect_names: ['Solanum lycopersicum'],
        hallucinated_names: ['Neolepidopteron daquila'],
      },
    };
    render(<ChatBubble message={message} />);
    // Cuando hay un nombre inventado, ese badge gana (riesgo mayor que suspect).
    expect(screen.getByTestId('hallucinated-name-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('suspect-name-badge')).not.toBeInTheDocument();
  });

  test('FIX 2 — el badge de inventado NO aparece cuando hallucinated_names está vacío o ausente', () => {
    const message = {
      role: 'assistant',
      content: 'El aguacate Hass tiene buenas compañeras.',
      timestamp: Date.now(),
      metadata: { tool_used: 'get_companions', grounded: true, hallucinated_names: [] },
    };
    render(<ChatBubble message={message} />);
    expect(screen.queryByTestId('hallucinated-name-badge')).not.toBeInTheDocument();
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

  // Bug 2026-05-31: la foto del compositor del home no llegaba al chat — solo
  // el texto. Ahora la burbuja de usuario con `imageUrl` la renderiza.
  describe('foto en la burbuja (compositor multimodal)', () => {
    test('Renderiza la imagen cuando el mensaje de usuario trae imageUrl', () => {
      const message = {
        role: 'user',
        content: '📷 Foto enviada para análisis',
        timestamp: Date.now(),
        imageUrl: 'blob:http://localhost/abc-123',
      };
      render(<ChatBubble message={message} />);
      const img = screen.getByTestId('chat-bubble-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:http://localhost/abc-123');
      // alt accesible por defecto.
      expect(img).toHaveAttribute('alt', expect.stringMatching(/foto/i));
      // El caption sigue visible bajo la imagen.
      expect(screen.getByText(/Foto enviada para análisis/i)).toBeInTheDocument();
    });

    test('Sin imageUrl no renderiza ninguna imagen', () => {
      const message = {
        role: 'user',
        content: '¿Qué le pasa a mi planta?',
        timestamp: Date.now(),
      };
      render(<ChatBubble message={message} />);
      expect(screen.queryByTestId('chat-bubble-image')).not.toBeInTheDocument();
    });

    test('imageAlt personalizado se respeta', () => {
      const message = {
        role: 'user',
        content: '',
        timestamp: Date.now(),
        imageUrl: 'blob:http://localhost/xyz',
        imageAlt: 'Hoja de tomate con manchas',
      };
      render(<ChatBubble message={message} />);
      expect(screen.getByTestId('chat-bubble-image')).toHaveAttribute('alt', 'Hoja de tomate con manchas');
    });
  });
});


describe('ChatBubble — badges anti-alucinación (#18 fuente · #19 auto-corregida · #20 confianza)', () => {
  let storeState;

  beforeEach(() => {
    storeState = { showSourceBadges: true };
    usePrefsStore.mockImplementation((selector) => selector(storeState));
  });

  const base = (metadata) => ({
    role: 'assistant',
    content: 'El caldo bordelés se aplica 1-2 L por planta, foliar.',
    timestamp: Date.now(),
    metadata,
  });

  // ── #18: fuente verificable clickeable ──
  test('#18 renderiza link a fuente_url con label (CSP-safe: <a href>, sin onclick)', () => {
    render(
      <ChatBubble
        message={base({
          tool_used: 'get_biopreparados',
          grounded: true,
          fuente: 'Agrosavia',
          fuente_url: 'https://repository.agrosavia.co/doc/download',
        })}
      />,
    );
    const link = screen.getByTestId('fuente-badge');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://repository.agrosavia.co/doc/download');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveTextContent(/Fuente verificable/i);
    expect(link).toHaveTextContent(/Agrosavia/);
    // CSP-safe: jamás un handler inline.
    expect(link).not.toHaveAttribute('onclick');
  });

  test('#18 sin fuente_url ni fuente_texto → NO renderiza el badge de fuente', () => {
    render(<ChatBubble message={base({ tool_used: 'get_species', grounded: true })} />);
    expect(screen.queryByTestId('fuente-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fuente-badge-text')).not.toBeInTheDocument();
  });

  test('#18 fuente_url no http(s) → NO renderiza link (no inyección)', () => {
    render(
      <ChatBubble
        message={base({ tool_used: 'get_biopreparados', grounded: true, fuente_url: 'javascript:alert(1)' })}
      />,
    );
    expect(screen.queryByTestId('fuente-badge')).not.toBeInTheDocument();
  });

  // ── refinamiento 2026-06-03: fuente sin recurso puntual → TEXTO PLANO ──
  test('fuente_texto:true (sin URL) → renderiza "Fuente: X" como TEXTO, NO un <a>', () => {
    render(
      <ChatBubble
        message={base({ tool_used: 'get_clima_ideam', grounded: true, fuente: 'IDEAM', fuente_texto: true })}
      />,
    );
    // No hay link de homepage.
    expect(screen.queryByTestId('fuente-badge')).not.toBeInTheDocument();
    // Sí hay una referencia de texto.
    const text = screen.getByTestId('fuente-badge-text');
    expect(text).toBeInTheDocument();
    expect(text.tagName).not.toBe('A'); // <span>, jamás <a>
    expect(text.querySelector('a')).toBeNull();
    expect(text).not.toHaveAttribute('href');
    expect(text).toHaveTextContent(/Fuente:\s*IDEAM/i);
  });

  test('fuente_texto NUNCA produce un link a la homepage de la institución', () => {
    render(
      <ChatBubble
        message={base({ tool_used: 'get_clima_ideam', grounded: true, fuente: 'IDEAM', fuente_texto: true })}
      />,
    );
    // Aserción central del operador: ningún <a> apunta al HOST institucional.
    // Comparamos por hostname parseado (no substring de regex) para no caer en
    // el anti-patrón de regex sin anclar (js/regex/missing-regexp-anchor).
    const institutionalHosts = ['ideam.gov.co', 'www.ideam.gov.co'];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      let host = '';
      try {
        host = new URL(href, 'https://chagra.app').hostname;
      } catch {
        host = '';
      }
      expect(institutionalHosts).not.toContain(host);
    }
  });

  test('fuente_url presente gana sobre fuente_texto (link, no texto)', () => {
    render(
      <ChatBubble
        message={base({
          tool_used: 'get_biopreparados',
          grounded: true,
          fuente: 'Agrosavia',
          fuente_url: 'https://repository.agrosavia.co/search?query=lulo',
          fuente_texto: true,
        })}
      />,
    );
    expect(screen.getByTestId('fuente-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('fuente-badge-text')).not.toBeInTheDocument();
  });

  // ── #19: auto-corregida ──
  test('#19 renderiza badge "Respuesta auto-corregida" cuando auto_corrected === true', () => {
    render(<ChatBubble message={base({ tool_used: null, grounded: false, auto_corrected: true })} />);
    const badge = screen.getByTestId('auto-corrected-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/auto-corregida/i);
  });

  test('#19 sin auto_corrected (o false) → NO renderiza el badge', () => {
    render(<ChatBubble message={base({ tool_used: null, grounded: false, auto_corrected: false })} />);
    expect(screen.queryByTestId('auto-corrected-badge')).not.toBeInTheDocument();
    render(<ChatBubble message={base({ tool_used: null, grounded: false })} />);
    expect(screen.queryByTestId('auto-corrected-badge')).not.toBeInTheDocument();
  });

  // ── #20: confianza del dato (alta=verde / media=ámbar / baja=gris) ──
  test('#20 confianza alta → badge verde (emerald)', () => {
    render(<ChatBubble message={base({ tool_used: 'get_biopreparados', grounded: true, confianza: 'alta' })} />);
    const badge = screen.getByTestId('confianza-badge');
    expect(badge).toHaveAttribute('data-confianza', 'alta');
    expect(badge).toHaveTextContent(/Confianza alta/i);
    expect(badge.className).toMatch(/emerald/);
  });

  test('#20 confianza media → badge ámbar (amber)', () => {
    render(<ChatBubble message={base({ tool_used: 'get_biopreparados', grounded: true, confianza: 'media' })} />);
    const badge = screen.getByTestId('confianza-badge');
    expect(badge).toHaveAttribute('data-confianza', 'media');
    expect(badge.className).toMatch(/amber/);
  });

  test('#20 confianza baja → badge gris (slate)', () => {
    render(<ChatBubble message={base({ tool_used: 'get_biopreparados', grounded: true, confianza: 'baja' })} />);
    const badge = screen.getByTestId('confianza-badge');
    expect(badge).toHaveAttribute('data-confianza', 'baja');
    expect(badge.className).toMatch(/slate/);
  });

  test('#20 sin confianza → NO renderiza el badge', () => {
    render(<ChatBubble message={base({ tool_used: 'get_species', grounded: true })} />);
    expect(screen.queryByTestId('confianza-badge')).not.toBeInTheDocument();
  });

  // ── coexistencia: todos conviven con SourceBadge sin romperse ──
  test('los nuevos badges conviven con SourceBadge en el mismo turno', () => {
    render(
      <ChatBubble
        message={base({
          tool_used: 'get_biopreparados',
          grounded: true,
          fuente: 'Agrosavia',
          fuente_url: 'https://agrosavia.co/x',
          confianza: 'alta',
          auto_corrected: true,
        })}
      />,
    );
    expect(screen.getByTestId('source-badge')).toBeInTheDocument();
    expect(screen.getByTestId('fuente-badge')).toBeInTheDocument();
    expect(screen.getByTestId('confianza-badge')).toBeInTheDocument();
    expect(screen.getByTestId('auto-corrected-badge')).toBeInTheDocument();
  });

  test('con showSourceBadges OFF no se renderiza ninguno de los nuevos badges', () => {
    storeState = { showSourceBadges: false };
    usePrefsStore.mockImplementation((selector) => selector(storeState));
    render(
      <ChatBubble
        message={base({ fuente_url: 'https://agrosavia.co/x', confianza: 'alta', auto_corrected: true })}
      />,
    );
    expect(screen.queryByTestId('fuente-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confianza-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-corrected-badge')).not.toBeInTheDocument();
  });
});


// #2074 — Semáforo de confianza científica por-respuesta.
describe('ChatBubble — #2074 semáforo de confianza (verde/ámbar/rojo)', () => {
  let storeState;

  beforeEach(() => {
    storeState = { showSourceBadges: true };
    usePrefsStore.mockImplementation((selector) => selector(storeState));
  });

  const base = (metadata) => ({
    role: 'assistant',
    content: 'La gulupa se siembra sobre los 1700 msnm.',
    timestamp: Date.now(),
    metadata,
  });

  test('grounding_semaphore="verde" → chip verde "Verificado"', () => {
    render(<ChatBubble message={base({ grounding_semaphore: 'verde', grounded: true })} />);
    const badge = screen.getByTestId('semaphore-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-semaphore', 'verde');
    expect(badge).toHaveTextContent(/Verificado/i);
    // Origen explícito del sidecar (no derivado en cliente).
    expect(badge).not.toHaveAttribute('data-derived');
    expect(badge.className).toMatch(/emerald/);
  });

  test('grounding_semaphore="ambar" → chip ámbar "Una fuente"', () => {
    render(<ChatBubble message={base({ grounding_semaphore: 'ambar', grounded: true })} />);
    const badge = screen.getByTestId('semaphore-badge');
    expect(badge).toHaveAttribute('data-semaphore', 'ambar');
    expect(badge).toHaveTextContent(/Una fuente/i);
    expect(badge.className).toMatch(/amber/);
  });

  test('grounding_semaphore="rojo" → chip rojo "Sin verificar"', () => {
    render(<ChatBubble message={base({ grounding_semaphore: 'rojo', grounded: false })} />);
    const badge = screen.getByTestId('semaphore-badge');
    expect(badge).toHaveAttribute('data-semaphore', 'rojo');
    expect(badge).toHaveTextContent(/Sin verificar/i);
    expect(badge.className).toMatch(/red/);
  });

  test('normaliza sinónimos del sidecar (green/amber/red) al color canónico', () => {
    const { rerender } = render(<ChatBubble message={base({ grounding_semaphore: 'green' })} />);
    expect(screen.getByTestId('semaphore-badge')).toHaveAttribute('data-semaphore', 'verde');
    rerender(<ChatBubble message={base({ grounding_semaphore: 'amber' })} />);
    expect(screen.getByTestId('semaphore-badge')).toHaveAttribute('data-semaphore', 'ambar');
    rerender(<ChatBubble message={base({ grounding_semaphore: 'abstain' })} />);
    expect(screen.getByTestId('semaphore-badge')).toHaveAttribute('data-semaphore', 'rojo');
  });

  test('al tocar el chip despliega grounding_reason + procedencia (source/DOI)', () => {
    render(
      <ChatBubble
        message={base({
          grounding_semaphore: 'verde',
          grounded: true,
          grounding_reason: 'Dos fuentes concordantes en el catálogo curado.',
          fuente: 'Agrosavia',
          fuente_url: 'https://repository.agrosavia.co/doc/123',
          doi: '10.1234/abcd',
        })}
      />,
    );
    // Colapsado: el detalle no está visible.
    expect(screen.queryByTestId('semaphore-detail')).not.toBeInTheDocument();
    const badge = screen.getByTestId('semaphore-badge');
    expect(badge).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(badge);

    expect(badge).toHaveAttribute('aria-expanded', 'true');
    const detail = screen.getByTestId('semaphore-detail');
    expect(detail).toBeInTheDocument();
    expect(screen.getByTestId('semaphore-reason')).toHaveTextContent(
      /Dos fuentes concordantes en el catálogo curado\./i,
    );
    const prov = screen.getByTestId('semaphore-provenance');
    expect(prov).toHaveTextContent(/Fuente:\s*Agrosavia/i);
    // DOI: enlace a doi.org construido desde el binomio bare.
    const doiLink = screen.getByText(/DOI:\s*10\.1234\/abcd/i).closest('a');
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/abcd');
    expect(doiLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('degradación suave: sin grounding_reason usa el motivo por defecto del color', () => {
    render(<ChatBubble message={base({ grounding_semaphore: 'rojo', grounded: false })} />);
    fireEvent.click(screen.getByTestId('semaphore-badge'));
    expect(screen.getByTestId('semaphore-reason')).toHaveTextContent(/Sin fuente verificable|disputa/i);
  });

  test('deriva VERDE cuando no hay semáforo explícito pero grounded + confianza alta', () => {
    render(<ChatBubble message={base({ grounded: true, confianza: 'alta' })} />);
    const badge = screen.getByTestId('semaphore-badge');
    expect(badge).toHaveAttribute('data-semaphore', 'verde');
    // Marca de derivado-en-cliente para QA/telemetría.
    expect(badge).toHaveAttribute('data-derived', 'true');
  });

  test('deriva ROJO cuando el dato está en disputa (disputed=true)', () => {
    render(<ChatBubble message={base({ grounded: true, disputed: true })} />);
    expect(screen.getByTestId('semaphore-badge')).toHaveAttribute('data-semaphore', 'rojo');
  });

  test('NO renderiza semáforo en turno generativo puro sin señal (evita falsa alarma)', () => {
    render(<ChatBubble message={base({ tool_used: null, grounded: false })} />);
    expect(screen.queryByTestId('semaphore-badge')).not.toBeInTheDocument();
    // El badge de fuente normal SÍ sigue apareciendo.
    expect(screen.getByTestId('source-badge')).toBeInTheDocument();
  });

  test('respeta showSourceBadges OFF (no aparece el semáforo)', () => {
    storeState = { showSourceBadges: false };
    usePrefsStore.mockImplementation((selector) => selector(storeState));
    render(<ChatBubble message={base({ grounding_semaphore: 'verde', grounded: true })} />);
    expect(screen.queryByTestId('semaphore-badge')).not.toBeInTheDocument();
  });

  test('backward compat: metadata=null no rompe el render ni muestra semáforo', () => {
    render(<ChatBubble message={{ role: 'assistant', content: 'Legacy.', timestamp: Date.now(), metadata: null }} />);
    expect(screen.queryByTestId('semaphore-badge')).not.toBeInTheDocument();
  });

  test('wording sin voseo argentino ni hype', () => {
    render(
      <ChatBubble
        message={base({ grounding_semaphore: 'rojo', grounded: false, grounding_reason: 'Verifica con un técnico.' })}
      />,
    );
    fireEvent.click(screen.getByTestId('semaphore-badge'));
    const detail = screen.getByTestId('semaphore-detail');
    expect(detail.textContent).not.toMatch(/verificá|aplicá|tenés/i);
    expect(detail.textContent).not.toMatch(/garantizado|perfecto|100%/i);
  });
});
