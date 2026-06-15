/**
 * AgentHero.demoParity.test.jsx — paridad con los demos de oracle-lab
 * (demo-agente.html / demo-agente-biopunk.html) — integración 2026-06-11.
 *
 * Cubre las 3 integraciones del operador:
 *   1. Comportamiento Ⓐ del demo: enviar con el campo VACÍO abre el menú de
 *      capacidades (en el demo `sendField()` vacío → `openSheet()`), en vez
 *      de no hacer nada.
 *   2. Botón de ALERTAS del demo biopunk (campana 🔔 + badge + panel con
 *      "Alertas ambientales" y "Tareas de campo"), importado al hero y
 *      conectado a datos REALES (useAlertStore + syncManager offline-first).
 *   3. La Ⓐ de HERRAMIENTAS DE CAMPO (iteración recuperada de
 *      Chagra-strategy/ops/icon-explorations/animada-refinada-grunge2.html):
 *      azadón + rastrillo + machete + círculo — es el ícono biopunk.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Mock del store outbox (send durable) ─────────────────────────────────────
const sendMock = vi.fn(async () => 1);
vi.mock('../../../store/useAgentOutboxStore', () => ({
  default: (selector) => selector({ send: sendMock, items: [], inFlight: [], refresh: vi.fn() }),
}));

// ── Mock del recorder de voz ────────────────────────────────────────────────
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

vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({ nivel_respuestas: 'simple' })),
  saveProfile: vi.fn(),
  getProfileMunicipio: vi.fn(() => null),
  getNotificationStyle: vi.fn(() => 'demo'),
  isModuleVisible: vi.fn(() => true),
}));

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'biopunk', setTheme: vi.fn() }),
}));

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [] }),
}));

// ── Alertas reales (1 activa) ───────────────────────────────────────────────
vi.mock('../../../store/useAlertStore', () => ({
  default: (selector) => selector({
    activeAlerts: [
      {
        type: 'frost',
        severity: 'danger',
        title: 'Riesgo de helada esta noche',
        message: 'Temperatura mínima cerca de 2 °C.',
      },
    ],
  }),
}));

// ── Tareas pendientes reales (offline-first vía syncManager) ───────────────
vi.mock('../../../services/syncManager', () => ({
  syncManager: {
    fetchPendingTasksFromFarmOS: vi.fn(async () => [
      { id: 't1', title: 'Riego del lote 2', severity: 'high', deadline: 'Hoy' },
    ]),
  },
}));

vi.mock('../../../data/exampleQuestions', () => ({
  AGENT_HERO_CHIPS: [{ icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué siembro?' }],
}));

vi.mock('../../ChagraAgentAvatar', () => ({
  default: () => <div data-testid="avatar">colibri</div>,
}));

import AgentHero from '../AgentHero';
import { THEME_ICON } from '../themeIcon';

beforeEach(() => {
  sendMock.mockClear();
  window.localStorage.clear();
});

describe('1. Comportamiento Ⓐ del demo', () => {
  test('enviar con el campo vacío abre el menú de capacidades (como el demo)', async () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    // el menú no está abierto
    expect(screen.queryByText('La mano de Chagra')).not.toBeInTheDocument();
    // botón enviar con campo vacío → abre la red (demo: sendField vacío → openSheet)
    fireEvent.click(screen.getByRole('button', { name: /enviar al agente/i }));
    await waitFor(() => {
      expect(screen.getByText('La mano de Chagra')).toBeInTheDocument();
    });
    // y NO mandó nada a la outbox
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('2. Campana de alertas del demo biopunk', () => {
  test('renderiza la campana con badge = alertas + tareas y abre el panel', async () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const bell = await screen.findByRole('button', { name: /alertas y tareas/i });
    // badge: 1 alerta + 1 tarea = 2 (las tareas llegan async)
    await waitFor(() => {
      expect(bell).toHaveTextContent('2');
    });
    fireEvent.click(bell);
    // panel con las dos secciones del demo (scoped: el chip de alerta del
    // hero también muestra el título de la alerta)
    const panel = await screen.findByRole('region', { name: /alertas y tareas de campo/i });
    expect(within(panel).getByText(/alertas ambientales/i)).toBeInTheDocument();
    expect(within(panel).getByText(/tareas de campo/i)).toBeInTheDocument();
    // contenido real
    expect(within(panel).getByText('Riesgo de helada esta noche')).toBeInTheDocument();
    expect(within(panel).getByText('Riego del lote 2')).toBeInTheDocument();
  });

  test('la campana y el menú Ⓐ son mutuamente excluyentes (como el demo)', async () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const bell = await screen.findByRole('button', { name: /alertas y tareas/i });
    fireEvent.click(bell);
    expect(await screen.findByText(/alertas ambientales/i)).toBeInTheDocument();
    // abrir la Ⓐ cierra la campana
    fireEvent.click(screen.getByRole('button', { name: /ver todo lo que puede hacer chagra/i }));
    await waitFor(() => {
      expect(screen.queryByText(/alertas ambientales/i)).not.toBeInTheDocument();
    });
  });
});

describe('3. Ⓐ de herramientas de campo (iteración recuperada)', () => {
  test('el ícono biopunk es la A de azadón + rastrillo + machete', () => {
    const { container } = render(<span>{THEME_ICON.biopunk}</span>);
    expect(container.querySelector('[data-tool="azadon"]')).toBeTruthy();
    expect(container.querySelector('[data-tool="rastrillo"]')).toBeTruthy();
    expect(container.querySelector('[data-tool="machete"]')).toBeTruthy();
    // círculo anarquía presente
    expect(container.querySelector('circle')).toBeTruthy();
  });
});
