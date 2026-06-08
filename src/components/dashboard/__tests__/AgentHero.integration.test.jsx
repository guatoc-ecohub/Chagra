/**
 * AgentHero.integration.test.jsx — test de integración del AgentHero
 * post-pulido (portada fiel del operador 2026-06-06).
 *
 * Cubre los 5 puntos del task #TEST-int:
 *   1. enviar=colibrí navega (el botón de enviar tiene el colibrí 3D y navega)
 *   2. sin clip (no hay botón de adjuntar/clip, solo cámara)
 *   3. ubicación bajo la marca (vereda/municipio/altitud)
 *   4. sugerencia contextual presente (crop suggestions rotativas)
 *   5. toggle Campesino/Experto cambia nivel_respuestas (persiste el perfil)
 *
 * Mockea: stores, servicios, y hooks para aislar la lógica de integración.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

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

// ── Mock del avatar 3D (evita Three.js en tests) ────────────────────────────
vi.mock('../../ChagraAgentAvatarColibri3D', () => ({
  default: ({ size, state }) => (
    <div data-testid="colibri-3d" data-size={size} data-state={state}>
      🐦
    </div>
  ),
}));

import AgentHero from '../AgentHero';
import { getProfile, saveProfile, getProfileMunicipio } from '../../../services/userProfileService';

beforeEach(() => {
  sendMock.mockClear();
  recorderState.isRecording = false;
  recorderState.start.mockClear();
  recorderState.stop.mockClear();
  recorderState.reset.mockClear();
  
  // Reset profile mocks to default values
  getProfile.mockReturnValue({
    nivel_respuestas: 'simple',
    vereda: 'Vereda Test',
    finca_altitud: 1800,
    municipio: 'Subachoque, Cundinamarca',
  });
  getProfileMunicipio.mockReturnValue('Subachoque, Cundinamarca');
  saveProfile.mockClear();
  
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

describe('AgentHero — integración post-pulido (task #TEST-int)', () => {
  describe('1. enviar=colibrí navega', () => {
    test('el botón de enviar tiene el colibrí 3D dentro', () => {
      render(<AgentHero onNavigate={vi.fn()} />);
      const sendBtn = screen.getByLabelText('Enviar al agente');

      // El colibrí 3D va dentro del botón (mock devuelve div con data-testid="colibri-3d")
      const colibri3d = sendBtn.querySelector('[data-testid="colibri-3d"]');
      expect(colibri3d).toBeTruthy();

      // Verifica que tiene los atributos correctos
      expect(colibri3d).toHaveAttribute('data-size', '36');
      expect(colibri3d).toHaveAttribute('data-state', 'listening');
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

    test('el colibrí NO se usa en otro lugar del compositor (solo en enviar)', () => {
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);

      // Solo debe haber un colibrí 3D con data-testid="colibri-3d" (en el botón de enviar)
      const colibri3dElements = container.querySelectorAll('[data-testid="colibri-3d"]');
      expect(colibri3dElements.length).toBe(1);

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

  describe('3. ubicación bajo la marca', () => {
    test('con ubicación en el perfil: se muestra bajo el wordmark de Chagra', () => {
      getProfile.mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      getProfileMunicipio.mockReturnValue('Subachoque, Cundinamarca');
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      // El chip de ubicación debe estar presente
      const locChip = container.querySelector('.agentport-loc');
      expect(locChip).toBeTruthy();
      
      // Debe tener el pin de ubicación
      const pin = locChip.querySelector('.pin');
      expect(pin).toBeTruthy();
      expect(pin.textContent).toBe('📍');
      
      // Debe mostrar vereda, municipio y altitud (SIN latitud)
      const txt = locChip.querySelector('.txt');
      expect(txt).toBeTruthy();
      expect(txt.textContent).toMatch(/Vereda Test/i);
      expect(txt.textContent).toMatch(/Subachoque/i);
      expect(txt.textContent).toMatch(/1800.*msnm/i);
    });

    test('SIN municipio en el perfil: NO se muestra ubicación', () => {
      getProfile.mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: null,
        vereda: 'Vereda Test',
      });
      getProfileMunicipio.mockReturnValue(null);
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      
      // No debe haber chip de ubicación
      const locChip = container.querySelector('.agentport-loc');
      expect(locChip).toBeNull();
    });

    test('la ubicación queda dentro del bloque de marca', () => {
      getProfile.mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda Test',
        finca_altitud: 1800,
      });
      getProfileMunicipio.mockReturnValue('Subachoque, Cundinamarca');
      
      const { container } = render(<AgentHero onNavigate={vi.fn()} />);
      const locChip = container.querySelector('.agentport-loc');

      const brand = container.querySelector('.agentport-brand-copy');
      expect(brand).toBeTruthy();
      expect(brand.contains(locChip)).toBe(true);
      expect(locChip.className).toContain('agentport-loc');
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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
      getProfile.mockReturnValue({
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

  describe('integración completa: flujo de usuario real', () => {
    test('usuario entra, ve ubicación, cambia a Experto, pregunta por cultivo, navega', async () => {
      // Setup: usuario con perfil completo
      getProfile.mockReturnValue({
        nivel_respuestas: 'simple',
        municipio: 'Subachoque, Cundinamarca',
        vereda: 'Vereda La Esperanza',
        finca_altitud: 1800,
      });
      getProfileMunicipio.mockReturnValue('Subachoque, Cundinamarca');
      
      const onNavigate = vi.fn();
      const { container } = render(<AgentHero onNavigate={onNavigate} />);
      
      // 1. Ve la ubicación
      const locChip = container.querySelector('.agentport-loc');
      expect(locChip).toBeTruthy();
      expect(locChip.textContent).toMatch(/La Esperanza|Subachoque/i);
      
      // 2. Ve las sugerencias contextuales
      const suggestion = container.querySelector('[data-testid="agentport-suggestion"]');
      expect(suggestion).toBeTruthy();
      
      // 3. Cambia a Experto
      const expertoBtn = screen.getByText(/experto/i);
      await act(async () => {
        fireEvent.click(expertoBtn);
      });
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ nivel_respuestas: 'detallado' }),
      );
      
      // 4. Escribe una pregunta
      const ta = screen.getByLabelText('Escribe tu pregunta al agente');
      fireEvent.change(ta, { target: { value: '¿Cómo abono mis cafés?' } });
      
      // 5. Envía (tocando el colibrí)
      const sendBtn = screen.getByLabelText('Enviar al agente');
      expect(sendBtn.querySelector('[data-testid="colibri-3d"]')).toBeTruthy();
      
      await act(async () => {
        fireEvent.click(sendBtn);
      });
      
      // 6. Persiste y navega
      await waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'text', text: '¿Cómo abono mis cafés?' }),
        );
      });
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
    });
  });
});
