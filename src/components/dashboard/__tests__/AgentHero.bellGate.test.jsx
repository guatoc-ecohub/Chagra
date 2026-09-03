// @ts-nocheck
/**
 * AgentHero.bellGate.test.jsx — UNA sola campana de notificación (bug
 * operador 2026-06-11: "salen dos botones de notificación arriba").
 *
 * Contrato:
 *  - estilo 'demo' (default) → la campana de la portada (agentport-bell)
 *    SE renderiza (es LA campana única; el TopBar esconde la suya).
 *  - estilo 'actual' → la campana de la portada NO se renderiza (la única
 *    es la campanita clásica del TopBar).
 *  - el cambio de preferencia en Perfil (evento chagra:notif-style-changed)
 *    se refleja EN VIVO sin recargar.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn(async () => 1);
vi.mock('../../../store/useAgentOutboxStore', () => ({
  default: (selector) => selector({ send: sendMock, items: [], inFlight: [], refresh: vi.fn() }),
}));

vi.mock('../../../hooks/useVoiceRecorder', () => ({
  default: () => ({
    isRecording: false,
    audioLevel: 0,
    durationMs: 0,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    error: null,
  }),
}));

vi.mock('../../../services/photoService', () => ({
  captureAndCompress: vi.fn(async () => ({ blob: new Blob(), mime: 'image/jpeg' })),
}));

vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { start: vi.fn(), listen: vi.fn(), chime: vi.fn(), cancel: vi.fn() },
}));

// Preferencia de estilo CONTROLABLE por test.
const notifStyleMock = vi.fn(() => 'demo');
vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({ nivel_respuestas: 'simple' })),
  saveProfile: vi.fn(),
  getProfileMunicipio: vi.fn(() => null),
  getNotificationStyle: (...args) => notifStyleMock(...args),
  isModuleVisible: vi.fn(() => true),
}));

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'nature', setTheme: vi.fn() }),
}));

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [] }),
}));

vi.mock('../../../store/useAlertStore', () => ({
  default: (selector) => selector({ activeAlerts: [] }),
}));

vi.mock('../../../data/exampleQuestions', () => ({
  AGENT_HERO_CHIPS: [{ icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué siembro?' }],
}));

vi.mock('../../ChagraAgentAvatar', () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock('../../../services/syncManager', () => ({
  syncManager: {
    fetchPendingTasksFromFarmOS: vi.fn(async () => []),
    getFailedTransactions: vi.fn(async () => []),
  },
}));

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import AgentHero from '../AgentHero';

const BELL_LABEL = /alertas y tareas pendientes/i;

describe('AgentHero — campana única según estilo_notificacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifStyleMock.mockReturnValue('demo');
  });

  test("estilo 'demo' (default): la campana de la portada SÍ se renderiza", () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: BELL_LABEL })).toBeInTheDocument();
  });

  test("estilo 'actual': la campana de la portada NO se renderiza (la única es la del TopBar)", () => {
    notifStyleMock.mockReturnValue('actual');
    render(<AgentHero onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: BELL_LABEL })).toBeNull();
  });

  test('cambio en vivo: chagra:notif-style-changed re-lee la preferencia', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: BELL_LABEL })).toBeInTheDocument();

    notifStyleMock.mockReturnValue('actual');
    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:notif-style-changed', { detail: { style: 'actual' } }));
    });
    expect(screen.queryByRole('button', { name: BELL_LABEL })).toBeNull();
  });
});
