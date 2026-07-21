/**
 * AgentHero.composer.test.jsx — el compositor multimodal REAL del home.
 *
 * Verifica que el AgentHero ya NO es un teaser falso, sino un compositor que:
 *   1. Tiene un <textarea> real (Enter envía, Shift+Enter no).
 *   2. Al enviar texto → persiste en la outbox (store.send) ANTES de navegar.
 *   3. El micrófono graba y, al detener, envía un item de voz con el blob.
 *   4. La cámara/foto procesa la imagen y la deja en staging para enviar.
 *   5. Cada envío navega a 'agente' (onNavigate) — pero SOLO tras persistir.
 *   6. Si la persistencia falla, NO navega (cero pérdida de datos).
 *
 * Mockea: useAgentOutboxStore.send, useVoiceRecorder, photoService, agentSounds.
 * NO toca IndexedDB real — el contrato de durabilidad se prueba en
 * agentOutboxService.test.js. Aquí probamos el cableado del compositor.
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
  start: vi.fn(() => { recorderState.isRecording = true; }),
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

// ── Mock del avatar (evita cargar el wrapper pesado) ────────────────────────
vi.mock('../../ChagraAgentAvatar', () => ({
  default: ({ state }) => <div data-testid="avatar" data-state={state} />,
}));

import AgentHero, { SEND_TRANSITION_MS } from '../AgentHero';

beforeEach(() => {
  sendMock.mockClear();
  recorderState.isRecording = false;
  recorderState.start.mockClear();
  recorderState.stop.mockClear();
  recorderState.reset.mockClear();
  // Sin reduced-motion → la navegación usa setTimeout(280). Forzamos
  // reduced-motion=true en los tests de envío para navegar sincrónicamente.
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

describe('AgentHero — compositor real (no teaser)', () => {
  test('renderiza un <textarea> real, no un div falso', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    expect(ta.tagName).toBe('TEXTAREA');
  });

  test('escribir + Enter → persiste texto en la outbox y navega a agente', async () => {
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: '¿qué siembro?' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text', text: '¿qué siembro?' }),
      );
    });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
  });

  test('Shift+Enter NO envía (nueva línea)', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'línea uno' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('"Abrir Chagra IA" navega al overlay del agente sin enviar ni abrir el menú', async () => {
    // Tarea #51: la portada del home (AgentHero) debe ofrecer una entrada
    // EXPLÍCITA al overlay del agente. Distinta del compositor: no persiste en
    // la outbox y no abre "La mano de Chagra" — navega directo a 'agente'.
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const openBtn = screen.getByLabelText('Abrir Chagra IA');
    fireEvent.click(openBtn);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
    expect(sendMock).not.toHaveBeenCalled();
    expect(screen.queryByText('La mano de Chagra')).not.toBeInTheDocument();
  });

  test('enviar sin texto ni adjunto NO envía: abre el menú didáctico (demo)', () => {
    // Port fiel del demo (2026-06-11): `sendField()` con el campo vacío abre
    // el menú de capacidades en vez de quedar muerto/deshabilitado.
    render(<AgentHero onNavigate={vi.fn()} />);
    const sendBtn = screen.getByLabelText('Enviar al agente');
    expect(sendBtn).toBeEnabled();
    fireEvent.click(sendBtn);
    expect(sendMock).not.toHaveBeenCalled();
    expect(screen.getByText('La mano de Chagra')).toBeInTheDocument();
  });

  test('chip de sugerencia envía su prompt como texto', async () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('Plagas'));
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text', text: expect.stringMatching(/plagas/i) }),
      );
    });
  });

  test('micrófono: grabar y detener envía item de voz con el blob', async () => {
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const micBtn = screen.getByLabelText('Grabar audio');
    fireEvent.click(micBtn);
    expect(recorderState.start).toHaveBeenCalled();

    // Re-render en estado grabando.
    recorderState.isRecording = true;
    render(<AgentHero onNavigate={onNavigate} />);
    const stopBtn = screen.getAllByLabelText('Detener y enviar audio')[0];
    await act(async () => {
      fireEvent.click(stopBtn);
    });
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'voice', blob: expect.any(Blob) }),
      );
    });
  });

  test('foto: seleccionar imagen la deja lista y al enviar va como item photo', async () => {
    const onNavigate = vi.fn();
    const { container } = render(<AgentHero onNavigate={onNavigate} />);
    const file = new File(['img'], 'planta.jpg', { type: 'image/jpeg' });
    const photoInput = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });
    // Aparece el preview de "foto lista".
    await screen.findByText('Foto lista para enviar');
    // Enviar (ya habilitado por el adjunto).
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enviar al agente'));
    });
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'photo', blob: expect.any(Blob), mime: 'image/jpeg' }),
      );
    });
  });

  test('cero pérdida: si send() falla, NO navega y conserva el texto', async () => {
    sendMock.mockRejectedValueOnce(new Error('idb caída'));
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'no me pierdas' } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enviar al agente'));
    });
    await waitFor(() => expect(sendMock).toHaveBeenCalled());
    expect(onNavigate).not.toHaveBeenCalled();
    // El texto sigue en el compositor (no se borró).
    expect(/** @type {HTMLTextAreaElement} */ (ta).value).toBe('no me pierdas');
  });
});

describe('AgentHero — transición de envío premium (bug 2026-05-31)', () => {
  test('SEND_TRANSITION_MS está en el rango premium pedido (450–600ms)', () => {
    expect(SEND_TRANSITION_MS).toBeGreaterThanOrEqual(450);
    expect(SEND_TRANSITION_MS).toBeLessThanOrEqual(600);
  });

  test('sin reduced-motion: la navegación se difiere SEND_TRANSITION_MS (no instantánea/brusca)', async () => {
    vi.useFakeTimers();
    try {
      // reduced-motion OFF → debe esperar el retardo de la animación.
      window.matchMedia = vi.fn().mockImplementation((q) => ({
        matches: false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      const onNavigate = vi.fn();
      render(<AgentHero onNavigate={onNavigate} />);
      const ta = screen.getByLabelText('Escribe tu pregunta al agente');
      fireEvent.change(ta, { target: { value: '¿qué siembro?' } });

      // El send es async (persiste en outbox) → dejamos resolver el microtask
      // de sendMock antes de avanzar el timer de navegación.
      await act(async () => {
        fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });
      });

      // Justo ANTES del umbral: aún NO navegó (transición en curso, se siente).
      await act(async () => { vi.advanceTimersByTime(SEND_TRANSITION_MS - 1); });
      expect(onNavigate).not.toHaveBeenCalled();

      // Al cumplirse el retardo: navega.
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(onNavigate).toHaveBeenCalledWith('agente');
    } finally {
      vi.useRealTimers();
    }
  });

  test('con reduced-motion: navega de inmediato (sin retardo de animación)', async () => {
    // matchMedia ya devuelve matches=true para 'reduce' (beforeEach).
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'directo' } });
    await act(async () => {
      fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });
    });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
  });

  test('al enviar, el compositor entra en fase sending (clases shimmer + lift)', async () => {
    // reduced-motion OFF para que se aplique la clase de animación.
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'mira esto' } });
    await act(async () => {
      fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });
    });
    await waitFor(() => {
      expect(container.querySelector('.chagra-composer-shimmer.chagra-composer-sending')).toBeTruthy();
    });
  });
});

describe('AgentHero — foto: cámara O galería, solo imágenes (B2, 2026-06-06)', () => {
  test('el input de foto acepta solo imágenes (accept="image/*")', () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    // Operador 2026-06-06: un solo input de foto (se quitó el botón de adjuntar
    // clip). Sigue restringido a imágenes — el agente solo "ve" fotos vía visión.
    const inputs = Array.from(container.querySelectorAll('input[type="file"]'));
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    for (const input of inputs) {
      expect(input.getAttribute('accept')).toBe('image/*');
    }
  });

  test('el input de foto NO fuerza la cámara (sin capture) → permite galería', () => {
    // Operador 2026-06-06: se quitó capture="environment" para que el usuario
    // pueda TOMAR foto O ELEGIR de la galería (antes forzaba la cámara).
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const photoInput = container.querySelector('input[type="file"]');
    expect(photoInput).toBeTruthy();
    expect(photoInput.getAttribute('accept')).toBe('image/*');
    expect(photoInput.hasAttribute('capture')).toBe(false);
  });

  test('si se cuela un no-imagen (PDF): NO lo deja en staging y avisa claro', async () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const file = new File(['%PDF-1.4'], 'hoja-de-vida.pdf', { type: 'application/pdf' });
    // Aunque el input tenga accept="image/*", algunos OS dejan elegir cualquier
    // archivo desde la galería → el guard de pick lo rechaza.
    const photoInput = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });
    // No se crea preview de adjunto.
    expect(screen.queryByText('Foto lista para enviar')).toBeNull();
    expect(screen.queryByText('hoja-de-vida.pdf')).toBeNull();
    // Mensaje claro en castellano colombiano.
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/solo puedo ver fotos|solo.*fotos/i);
    // Sin adjunto válido ni texto, tocar enviar NO manda nada a la outbox
    // (abre el menú didáctico — comportamiento del demo).
    fireEvent.click(screen.getByLabelText('Enviar al agente'));
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('el aviso de no-imagen no usa voseo argentino', async () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const file = new File(['x'], 'audio.mp3', { type: 'audio/mpeg' });
    const photoInput = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });
    const alert = await screen.findByRole('alert');
    const t = alert.textContent || '';
    expect(t).not.toMatch(/mandá|contame|elegí|tenés|podés|querés|enviá|mostrá/i);
  });

  test('una imagen válida sí queda en staging (el guard no bloquea fotos)', async () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const file = new File(['img'], 'planta.jpg', { type: 'image/jpeg' });
    const photoInput = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });
    await screen.findByText('Foto lista para enviar');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('AgentHero — colibrí = enviar + botón de perfil (operador 2026-06-06)', () => {
  test('el botón de enviar lleva el mismo avatar colibrí del FAB global', () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const sendBtn = screen.getByLabelText('Enviar al agente');
    expect(sendBtn.querySelector('[data-testid="avatar"]')).toBeTruthy();
    // Ya no hay un input que fuerce cámara.
    expect(container.querySelector('input[capture]')).toBeNull();
  });

});

describe('AgentHero — voseo (español colombiano)', () => {
  test('los textos visibles usan tú/usted, sin voseo argentino', () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const text = container.textContent || '';
    // Marcadores de voseo prohibidos.
    expect(text).not.toMatch(/\bescribí\b/);
    expect(text).not.toMatch(/\btocá\b/);
    expect(text).not.toMatch(/\benviá\b/);
    expect(text).not.toMatch(/\bpreguntá\b/);
    expect(text).not.toMatch(/\bmostrá\b/);
    expect(text).not.toMatch(/\bcontá\b/);
    expect(text).not.toMatch(/\btenés\b/);
    expect(text).not.toMatch(/\bquerés\b/);
  });

  test('no duplica el wordmark del TopBar dentro del hero — HOME-FIX', () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    expect(container.querySelector('.agentport-name')).toBeNull();
    expect(container.querySelector('.agentport-brand')).toBeNull();
    const text = container.textContent || '';
    expect(text).not.toMatch(/tu mano en el campo/i);
  });
});
