/**
 * ChatBubble.semaforo.test.jsx — SEMÁFORO DE CONFIANZA por-respuesta + PANEL
 * DE PROCEDENCIA por-afirmación (lever "moat anti-alucinación visible").
 *
 * Contrato visual:
 *   - Turno con grounding verde y procedencia curada → sello verde "Dato
 *     respaldado"; al toque abre el panel con un renglón por afirmación
 *     (fuente + curaduría + confianza) y link DOI/URL CSP-safe si hay.
 *   - Procedencia claude_draft degrada el verde del sidecar a ámbar.
 *   - Turno abstain → rojo con wording de HONESTIDAD ("de frente"), panel
 *     con el mensaje de "preferimos un no sé honesto".
 *   - Mensajes sin señal de grounding (viejos/offline) NO pintan semáforo.
 *   - El semáforo NO depende del pref showSourceBadges (todas las cuentas).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import usePrefsStore from '../../../store/usePrefsStore';

const baseMsg = (metadata) => ({
  role: 'assistant',
  content: 'El café arabigo se adapta bien entre 1200 y 1900 msnm.',
  timestamp: Date.now(),
  metadata,
});

const renderBubble = (metadata) =>
  render(
    <ChatBubble message={baseMsg(metadata)} onConsentNeeded={() => {}} onRetryOrphan={() => {}} />
  );

describe('ChatBubble — semáforo de confianza por-respuesta', () => {
  it('turno verde (sidecar answer + procedencia curada) pinta el sello verde', () => {
    renderBubble({
      grounding_semaphore: 'verde',
      grounding_policy: 'answer',
      grounding_provenance: [
        { entity_id: 'coffea-arabica', confidence: 0.92, source: 'Agrosavia', validation_level: 'expert_reviewed' },
      ],
    });
    const sello = screen.getByTestId('semaforo-respuesta');
    expect(sello).toHaveAttribute('data-nivel', 'verde');
    expect(sello).toHaveTextContent(/Dato respaldado/i);
  });

  it('procedencia claude_draft DEGRADA el verde del sidecar a ámbar', () => {
    renderBubble({
      grounding_semaphore: 'verde',
      grounding_policy: 'answer',
      grounding_provenance: [
        { entity_id: 'uchuva', confidence: 0.8, source: null, validation_level: 'claude_draft' },
      ],
    });
    expect(screen.getByTestId('semaforo-respuesta')).toHaveAttribute('data-nivel', 'ambar');
  });

  it('turno abstain pinta rojo con wording de honestidad, no de error', () => {
    renderBubble({
      grounding_semaphore: 'rojo',
      grounding_policy: 'abstain',
      grounding_reason: 'sin anclaje en el grafo → no inventar',
      grounding_provenance: [],
    });
    const sello = screen.getByTestId('semaforo-respuesta');
    expect(sello).toHaveAttribute('data-nivel', 'rojo');
    expect(sello).toHaveTextContent(/de frente/i);
  });

  it('mensaje sin señal de grounding NO pinta semáforo (backward compat)', () => {
    renderBubble({ tool_used: 'get_species', grounded: true });
    expect(screen.queryByTestId('semaforo-respuesta')).toBeNull();
  });

  it('el semáforo aparece aunque showSourceBadges esté APAGADO (todas las cuentas)', () => {
    const prev = usePrefsStore.getState().showSourceBadges;
    usePrefsStore.setState({ showSourceBadges: false });
    try {
      renderBubble({
        grounding_semaphore: 'verde',
        grounding_provenance: [
          { entity_id: 'coffea-arabica', confidence: 0.9, source: 'Agrosavia', validation_level: 'expert_reviewed' },
        ],
      });
      expect(screen.getByTestId('semaforo-respuesta')).toBeInTheDocument();
      // Los sellos detallados sí respetan el pref (siguen apagados).
      expect(screen.queryByTestId('source-badge')).toBeNull();
    } finally {
      usePrefsStore.setState({ showSourceBadges: prev });
    }
  });
});

describe('ChatBubble — panel de procedencia por-afirmación', () => {
  beforeEach(() => {
    usePrefsStore.setState({ showSourceBadges: true });
  });

  it('al tocar el sello se abre el panel con un renglón por afirmación', () => {
    renderBubble({
      grounding_semaphore: 'verde',
      grounding_policy: 'answer',
      grounding_provenance: [
        { entity_id: 'coffea-arabica', confidence: 0.92, source: 'Agrosavia', validation_level: 'expert_reviewed' },
        { entity_id: 'hypothenemus-hampei', confidence: 0.85, source: '10.1016/j.cropro.2020.105123', validation_level: 'published' },
      ],
    });
    expect(screen.queryByTestId('panel-procedencia')).toBeNull();

    fireEvent.click(screen.getByTestId('semaforo-respuesta'));

    const panel = screen.getByTestId('panel-procedencia');
    expect(panel).toBeInTheDocument();
    const items = screen.getAllByTestId('procedencia-item');
    expect(items).toHaveLength(2);

    // Renglón 1: entidad humanizada + fuente institucional + curaduría + confianza.
    expect(items[0]).toHaveTextContent(/Coffea arabica/);
    expect(items[0]).toHaveTextContent(/Agrosavia/);
    expect(items[0]).toHaveTextContent(/Revisado por experto/);
    expect(items[0]).toHaveTextContent(/92%/);

    // Renglón 2: el DOI se vuelve link CSP-safe a doi.org (noopener).
    const link = screen.getByTestId('procedencia-fuente-link');
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1016/j.cropro.2020.105123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));

    // Segundo toque: el panel se cierra (toggle).
    fireEvent.click(screen.getByTestId('semaforo-respuesta'));
    expect(screen.queryByTestId('panel-procedencia')).toBeNull();
  });

  it('turno rojo sin procedencia: el panel dice el "no sé" honesto', () => {
    renderBubble({
      grounding_semaphore: 'rojo',
      grounding_policy: 'abstain',
      grounding_provenance: [],
    });
    fireEvent.click(screen.getByTestId('semaforo-respuesta'));
    expect(screen.getByTestId('procedencia-vacia')).toHaveTextContent(/no sé.*honesto/i);
    expect(screen.queryAllByTestId('procedencia-item')).toHaveLength(0);
  });

  it('fuente vacía se muestra como Catálogo Chagra (grafo), sin link', () => {
    renderBubble({
      grounding_semaphore: 'ambar',
      grounding_policy: 'hedge',
      grounding_provenance: [
        { entity_id: 'musa-paradisiaca', confidence: 0.6, source: null, validation_level: 'claude_draft' },
      ],
    });
    fireEvent.click(screen.getByTestId('semaforo-respuesta'));
    expect(screen.getByTestId('procedencia-fuente')).toHaveTextContent(/Catálogo Chagra/);
    expect(screen.queryByTestId('procedencia-fuente-link')).toBeNull();
  });
});
