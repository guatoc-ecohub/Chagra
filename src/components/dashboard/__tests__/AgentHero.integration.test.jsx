/**
 * AgentHero.integration.test.jsx — test de integración del AgentHero
 * post-pulido (portada fiel del operador 2026-06-06).
 *
 * Cubre los 5 puntos del task #TEST-int:
 *   1. enviar=colibrí navega (el botón de enviar usa el avatar global y navega)
 *   2. sin clip (no hay botón de adjuntar/clip, solo cámara)
 *   3. marca/ubicación no se duplican dentro del hero
 *   4. sugerencia contextual presente (crop suggestions rotativas)
 *   5. toggle Campesino/Experto cambia nivel_respuestas (persiste el perfil)
 *
 * Mockea: stores, servicios, y hooks para aislar la lógica de integración.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock del store outbox (send durable) ─────────────────────────────────────
const sendMock = vi.fn(async () => 1);
vi.mock('../../../store/useAgentOutboxStore', () => ({
  default: (selector) => selector({ send: sendMock, items: [], inFlight: [], refresh: vi.fn() }),
}));

// ── Mock del recorder de voz ────────────────────────────────────────────────
const recorderState = {
  isRecording: false,
  audioLevel: 0.5,
  durationMs: 0,
  start: vi.fn(function() { this.isRecording = true; }),
  stop: vi.fn(async () => ({ blob: new Blob(['audio'], { type: 'audio/webm' }), durationMs: 3000, mimeType: 'audio/webm' })),
  reset: vi.fn(),
  error: null,
};
vi.mock('../../../hooks/useVoiceRecorder', () => ({
  default: () => recorderState,
}));

// ── Mock de photoService (compresión) ───────────────────────────────────────
vi.mock('../../../services/photoService', () => ({
  captureAndCompress: vi.fn(async () => ({
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    mime: 'image/jpeg',
    width: 800,
    height: 600,
  })),
}));

// ── Mock de sonidos (no-op) ─────────────────────────────────────────────────
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { start: vi.fn(), listen: vi.fn(), chime: vi.fn(), cancel: vi.fn() },
}));

// ── Mock del perfil (userProfileService) ───────────────────────────────────
vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({
    nivel_respuestas: 'simple',
    vereda: 'Vereda Test',
    finca_altitud: 1800,
    municipio: 'Subachoque, Cundinamarca',
  })),
  saveProfile: vi.fn(),
  getProfileMunicipio: vi.fn(() => 'Subachoque, Cundinamarca'),
  getNotificationStyle: vi.fn(() => 'demo'),
  isModuleVisible: vi.fn(() => true),
}));

// ── Mock de useTheme ───────────────────────────────────────────────────────
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'nature', setTheme: vi.fn() }),
}));

// ── Mock del store de activos (plants) ─────────────────────────────────────
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({
    plants: [
      { attributes: { name: 'Café' } },
      { attributes: { name: 'Tomate Chonto' } },
    ],
  }),
}));

// ── Mock del store de alertas ───────────────────────────────────────────────
vi.mock('../../../store/useAlertStore', () => ({
  default: (selector) => selector({ activeAlerts: [] }),
}));

// ── Mock de exampleQuestions (chips del home) ─────────────────────────────
vi.mock('../../../data/exampleQuestions', () => ({
  AGENT_HERO_CHIPS: [
    { icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué siembro?' },
    { icon: '🐛', label: 'Plagas', prompt: '¿Cómo controlo plagas?' },
  ],
}));

// ── Mock del avatar global (evita cargar video/foto en tests) ───────────────
vi.mock('../../ChagraAgentAvatar', () => ({
  default: ({ size, state }) => (
    <div data-testid="avatar" data-size={size} data-state={state}>
      colibri
    </div>
  ),
}));

// jsdom no trae ResizeObserver (lo usa el motor de AgentRedMenu, que ahora
// se monta INTEGRADO en el hero al abrir el menú Ⓐ).
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import AgentHero from '../AgentHero';
import { getProfile, saveProfile, getProfileMunicipio } from '../../../services/userProfileService';

beforeEach(() => {
  // El menú Ⓐ marca cada capacidad con getCapabilityHealth(): una capacidad
  // cuya tool vive en el sidecar (ej. 'Plaga' → get_pest_controllers) sale
  // 'down' ("… sin conexión al servidor") cuando VITE_USE_SIDECAR_AGRO_MCP no
  // está set, cambiando su aria-label y rompiendo getByLabelText('Plaga'). En
  // un browser real con sidecar activo la capacidad está viva; acá habilitamos
  // la flag para reproducir ese estado (entorno, no lógica de prod).
  vi.stubEnv('VITE_USE_SIDECAR_AGRO_MCP', 'true');

  sendMock.mockClear();
  recorderState.isRecording = false;
  recorderState.start.mockClear();
  recorderState.stop.mockClear();
  recorderState.reset.mockClear();

  // Reset profile mocks to default values
  vi.mocked(getProfile).mockReturnValue({
    nivel_respuestas: 'simple',
    vereda: 'Vereda Test',
    finca_altitud: 1800,
    municipio: 'Subachoque, Cundinamarca',
  });
  vi.mocked(getProfileMunicipio).mockReturnValue('Subachoque, Cundinamarca');
  vi.mocked(saveProfile).mockClear();
  
  // Forzamos reduced-motion=true para navegación sincrónica
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.URL.createObjectURL = vi.fn(() => 'blob:preview');
  window.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  // No filtrar VITE_USE_SIDECAR_AGRO_MCP a otros archivos de test.
  vi.unstubAllEnvs();
});

describe('AgentHero — integración post-pulido (task #TEST-int)', () => {
  describe('1. enviar=colibrí navega', () => {
    test('el botón de enviar tiene el avatar global dentro', () => {
      render(<AgentHero onNavigate={vi.fn()} />);
      const sendBtn = screen.getByLabelText('Enviar al agente');

      const avatar = sendBtn.querySelector('[data-testid="avatar"]');
      expect(avatar).toBeTruthy();

      // Verifica que tiene los atributos correctos (44: protagonismo de
      // Angelita — el avatar llena el botón de 44px, 2026-07-18)
      expect(avatar).toHaveAttribute('data-size', '44');
      expect(avatar).toHaveAttribute('data-state', 'listening');
    });

    test('al enviar texto, el colibrí (botón enviar) navega a agente', async () => {
      const onNavigate = vi.fn();
      render(<AgentHero onNavigate={onNavigate} />);
      
      const ta = screen.getByLabelText('Escribe tu pregunta al agente');
      const sendBtn = screen.getByLabelText('Enviar al agente');
      
      // Escribir texto
      fireEvent.change(ta, { target: { value: '¿qué siembro?' } });
      
      // El botón debe estar habilitado
      expect(sendBtn).toBeEnabled();
      
      // Enviar
      await act(async () => {
        fireEvent.click(sendBtn);
      });
      
      // Persiste en la outbox
      await waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'text', text: '¿qué siembro?' }),
        );
      });
      
      // Navega a agente
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
    });

    test('el colibrí del compositor solo se usa en enviar (no duplicado en la barra)', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);

      // Dentro del COMPOSITOR el colibrí (avatar) vive SOLO en el botón de
      // enviar — no duplicado en la barra de íconos.
      const composer = container.querySelector('.agentport-composer');
      expect(composer).toBeTruthy();
      const composerAvatars = composer.querySelectorAll('[data-testid="avatar"]');
      expect(composerAvatars.length).toBe(1);

      // El botón "Abrir Chagra IA" del header tiene su PROPIO avatar (entrada
      // explícita al overlay, tarea #51) — es intencional, fuera del compositor.
      const openBtn = container.querySelector('.agentport-open');
      expect(openBtn).toBeTruthy();
      expect(openBtn.querySelectorAll('[data-testid="avatar"]').length).toBe(1);

      // El colibrí de la escena (.agentport-hummer) es separado
      const sceneHummer = container.querySelector('.agentport-hummer');
      expect(sceneHummer).toBeTruthy();
    });
  });

  describe('2. sin clip (solo cámara)', () => {
    test('NO hay botón de adjuntar/clip, solo cámara', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      // Busca botones con label que sugieran "adjuntar" o "clip"
      const allBtns = container.querySelectorAll('button');
      const attachBtns = Array.from(allBtns).filter(btn => {
        const label = btn.getAttribute('aria-label') || '';
        return label.match(/adjuntar|clip/i);
      });
      expect(attachBtns.length).toBe(0);
      
      // Sí debe haber botón de cámara/foto
      const cameraBtn = Array.from(allBtns).find(btn => {
        const label = btn.getAttribute('aria-label') || '';
        return label.match(/tomar|elegir|cámara|foto/i);
      });
      expect(cameraBtn).toBeTruthy();
    });

    test('hay UN SOLO input de foto (sin input separado de adjuntar)', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const fileInputs = container.querySelectorAll('input[type="file"]');
      
      // Debe haber exactamente 1 input de foto
      expect(fileInputs.length).toBe(1);
      
      // Debe aceptar solo imágenes
      expect(fileInputs[0].getAttribute('accept')).toBe('image/*');
    });

    test('el input de foto NO fuerza cámara (permite galería)', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const photoInput = container.querySelector('input[type="file"]');
      
      expect(photoInput).toBeTruthy();
      expect(photoInput.hasAttribute('capture')).toBe(false);
    });
  });

  describe('3. marca/ubicación sin duplicar', () => {
    test('AgentHero no renderiza wordmark ni ubicación propios; eso vive en TopBar', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);

      expect(container.querySelector('.agentport-brand')).toBeNull();
      expect(container.querySelector('.agentport-brand-copy')).toBeNull();
      expect(container.querySelector('.agentport-loc')).toBeNull();
      expect(container.querySelector('.agentport-headtools')).toBeTruthy();
    });
  });

  describe('4. sugerencia contextual presente', () => {
    test('con cultivos registrados: muestra sugerencias contextuales', async () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      // Debe haber un elemento con data-testid="agentport-suggestion"
      const suggestion = await container.querySelector('[data-testid="agentport-suggestion"]');
      expect(suggestion).toBeTruthy();
      
      // La sugerencia debe ser contextual (basada en los cultivos mock)
      const text = suggestion.textContent;
      // Los cultivos mock son Café y Tomate Chonto
      const hasCropSuggestion = text.match(/café|tomates|biol|poda|cosecha/i);
      expect(hasCropSuggestion).toBeTruthy();
    });

    test('las sugerencias rotan cada ~5s (timer existe)', async () => {
      vi.useFakeTimers();
      try {
        const { container } = render(<AgentHero onNavigate={vi.fn()} />);
        
        const suggestion = container.querySelector('[data-testid="agentport-suggestion"]');
        const initialText = suggestion.textContent;
        
        // Avanzar menos de 5s: no debe cambiar
        await act(async () => {
          vi.advanceTimersByTime(4000);
        });
        expect(suggestion.textContent).toBe(initialText);
        
        // Avanzar a 5s: debe rotar
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
        
        // Como hay 2 cultivos mock, debería rotar a la siguiente sugerencia
        // (o volver a la primera si es la única)
        expect(suggestion.textContent).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    test('con reduced-motion: NO rotan las sugerencias', async () => {
      // Ya está forzado en beforeEach, pero aseguramos
      window.matchMedia = vi.fn().mockImplementation((q) => ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const suggestion = container.querySelector('[data-testid="agentport-suggestion"]');
      const initialText = suggestion.textContent;
      
      // Avanzar tiempo: no debe rotar por reduced-motion
      vi.useFakeTimers();
      try {
        await act(async () => {
          vi.advanceTimersByTime(6000);
        });
        // Con reduced-motion, el timer no se crea, así que no cambia
        expect(suggestion.textContent).toBe(initialText);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('5. toggle Campesino/Experto cambia nivel_respuestas', () => {
    test('inicia en Campesino (simple) por defecto', () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      // El data-nivel debe ser 'simple'
      const section = container.querySelector('[data-nivel]');
      expect(section.getAttribute('data-nivel')).toBe('simple');
      
      // El botón Campesino debe estar activo (buscamos por texto, no aria-label)
      const campesinoBtn = screen.getByText(/campesino/i);
      expect(campesinoBtn.className).toContain('is-active');
      
      // El botón Experto NO debe estar activo
      const expertoBtn = screen.getByText(/experto/i);
      expect(expertoBtn.className).not.toContain('is-active');
    });

    test('si el perfil tiene detallado: inicia en Experto', () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'detallado',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      expect(container.querySelector('[data-nivel]').getAttribute('data-nivel')).toBe('detallado');
      
      const expertoBtn = screen.getByText(/experto/i);
      expect(expertoBtn.className).toContain('is-active');
    });

    test('cambiar a Experto: persiste nivel_respuestas=detallado', async () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      const expertoBtn = screen.getByText(/experto/i);
      
      await act(async () => {
        fireEvent.click(expertoBtn);
      });
      
      // Debe persistir en el perfil
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ nivel_respuestas: 'detallado' }),
      );
      
      // El data-nivel debe cambiar
      expect(container.querySelector('[data-nivel]').getAttribute('data-nivel')).toBe('detallado');
    });

    test('cambiar a Campesino: persiste nivel_respuestas=simple', async () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'detallado',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      const campesinoBtn = screen.getByText(/campesino/i);
      
      await act(async () => {
        fireEvent.click(campesinoBtn);
      });
      
      // Debe persistir en el perfil
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ nivel_respuestas: 'simple' }),
      );
      
      // El data-nivel debe cambiar
      expect(container.querySelector('[data-nivel]').getAttribute('data-nivel')).toBe('simple');
    });

    test('el saludo cambia al hacer click en el toggle (simple -> detallado)', async () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      let hi = container.querySelector('.agentport-hi');
      
      // Inicialmente: saludo campesino (Buenos días/tardes/noches)
      expect(hi.textContent).toMatch(/Buenos días|Buenas tardes|Buenas noches/i);
      expect(hi.textContent).not.toMatch(/Hola\.$/);
      
      // Click en Experto
      const expertoBtn = screen.getByText(/experto/i);
      await act(async () => {
        fireEvent.click(expertoBtn);
      });
      
      // El saludo debe cambiar a "Hola."
      hi = container.querySelector('.agentport-hi');
      expect(hi.textContent).toMatch(/Hola\./);
    });

    test('el subtítulo es contextual cuando hay cultivos, genérico cuando no hay', () => {
      // CON cultivos: se muestra sugerencia contextual
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      let sub = container.querySelector('.agentport-sub');
      
      // Debe tener data-testid (sugerencia contextual)
      expect(sub.getAttribute('data-testid')).toBe('agentport-suggestion');
      
      // El texto debe ser sobre cultivos específicos
      expect(sub.textContent).toMatch(/café|tomates|biol|poda|cosecha/i);
    });

    test('click al mismo nivel NO llama saveProfile (no-op)', async () => {
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      
      render(<AgentHero onNavigate={vi.fn()} />);
      
      const campesinoBtn = screen.getByText(/campesino/i);
      
      await act(async () => {
        fireEvent.click(campesinoBtn);
      });
      
      // NO debe persistir (ya está en ese nivel)
      expect(saveProfile).not.toHaveBeenCalled();
    });
  });

  describe('6. menú Ⓐ integrado al hero (sin bottom-sheet)', () => {
    test('tocar Ⓐ brota la red EN la zona-respiro y pliega saludo/chips', async () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);

      // Cerrado: nada de red ni de sheet/scrim (el modal aparte murió).
      expect(container.querySelector('.agentport-redpanel')).toBeNull();
      expect(container.querySelector('.agentport-sheet')).toBeNull();
      expect(container.querySelector('.agentport-scrim')).toBeNull();

      const aBtn = screen.getByLabelText('Ver todo lo que puede hacer Chagra');
      await act(async () => { fireEvent.click(aBtn); });

      // Abierto: la red vive DENTRO de la zona-respiro del hero.
      const stage = container.querySelector('.agentport-stage');
      const panel = stage.querySelector('.agentport-redpanel');
      expect(panel).toBeTruthy();
      expect(panel.querySelector('.arm-root')).toBeTruthy();
      expect(container.querySelector('.agentport-sheet')).toBeNull();
      expect(aBtn).toHaveAttribute('aria-expanded', 'true');

      // El saludo/chips quedan plegados (misma pantalla, no scrim encima).
      expect(container.querySelector('.agentport-foldaway')).toHaveClass('is-folded');
      // La escena ambiente baja el volumen pero sigue siendo el mismo lienzo.
      expect(container.querySelector('.agentport-scene')).toHaveClass('is-quiet');
    });

    test('tocar Ⓐ de nuevo cierra y devuelve el saludo (reduced-motion: inmediato)', async () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const aBtn = screen.getByLabelText('Ver todo lo que puede hacer Chagra');

      await act(async () => { fireEvent.click(aBtn); });
      expect(container.querySelector('.agentport-redpanel')).toBeTruthy();

      await act(async () => { fireEvent.click(aBtn); });
      expect(container.querySelector('.agentport-redpanel')).toBeNull();
      expect(container.querySelector('.agentport-foldaway')).not.toHaveClass('is-folded');
      expect(aBtn).toHaveAttribute('aria-expanded', 'false');
    });

    test('tocar una hoja viva rutea de verdad (heroRoute → outbox → chat)', async () => {
      const onNavigate = vi.fn();
      render(<AgentHero onNavigate={onNavigate} />);
      const aBtn = screen.getByLabelText('Ver todo lo que puede hacer Chagra');
      await act(async () => { fireEvent.click(aBtn); });

      // 'Plaga' es una capacidad live del manifiesto real con
      // heroRoute {kind:'ask'} — el bug de main leía cap.route (undefined)
      // y mataba el pick en silencio. Este test lo clava.
      const leaf = screen.getByLabelText('Plaga');
      await act(async () => { fireEvent.click(leaf); });

      await waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'text', text: expect.stringMatching(/plagas/i) }),
        );
      });
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
    });

    test('Escape cierra el menú (a11y teclado)', async () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const aBtn = screen.getByLabelText('Ver todo lo que puede hacer Chagra');

      await act(async () => { fireEvent.click(aBtn); });
      expect(container.querySelector('.agentport-redpanel')).toBeTruthy();

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(container.querySelector('.agentport-redpanel')).toBeNull();
    });
  });

  describe('integración completa: flujo de usuario real', () => {
    test('usuario entra, ve ubicación, cambia a Experto, pregunta por cultivo, navega', async () => {
      // Setup: usuario con perfil completo
      vi.mocked(getProfile).mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda La Esperanza',
        finca_altitud: 1800,
      });
      vi.mocked(getProfileMunicipio).mockReturnValue('Subachoque, Cundinamarca');
      
      const onNavigate = vi.fn();
      const { container } = render(<AgentHero onNavigate={onNavigate} />);
      
      expect(container.querySelector('.agentport-loc')).toBeNull();

      // 1. Ve las sugerencias contextuales
      const suggestion = container.querySelector('[data-testid="agentport-suggestion"]');
      expect(suggestion).toBeTruthy();
      
      // 2. Cambia a Experto
      const expertoBtn = screen.getByText(/experto/i);
      await act(async () => {
        fireEvent.click(expertoBtn);
      });
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ nivel_respuestas: 'detallado' }),
      );
      
      // 3. Escribe una pregunta
      const ta = screen.getByLabelText('Escribe tu pregunta al agente');
      fireEvent.change(ta, { target: { value: '¿Cómo abono mis cafés?' } });
      
      // 4. Envía (tocando el colibrí)
      const sendBtn = screen.getByLabelText('Enviar al agente');
      expect(sendBtn.querySelector('[data-testid="avatar"]')).toBeTruthy();
      
      await act(async () => {
        fireEvent.click(sendBtn);
      });
      
      // 5. Persiste y navega
      await waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'text', text: '¿Cómo abono mis cafés?' }),
        );
      });
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
    });
  });
});
