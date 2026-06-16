import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetActiveTenantId = vi.fn();

vi.mock('../config/glaciarAccess', () => ({
  esOperadorActual: () => {
    const id = mockGetActiveTenantId();
    return id === 'admin';
  },
}));

vi.mock('../db/dbCore', () => ({
  openDB: vi.fn(),
  STORES: {
    VOICE_TELEMETRY: 'voice_telemetry',
    LLM_TELEMETRY: 'llm_telemetry',
    RAG_TELEMETRY: 'rag_telemetry',
  },
}));

const makeMockStore = (records = []) => ({
  getAll: () => ({
    result: records,
    onsuccess: null,
    onerror: null,
  }),
});

describe('PilotTelemetryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function loadComponent() {
    const mod = await import('./PilotTelemetryPanel');
    return mod.default;
  }

  test('muestra acceso restringido para no-operador', async () => {
    mockGetActiveTenantId.mockReturnValue('usuario_normal');
    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);
    expect(screen.getByTestId('pilot-telemetry-unauthorized')).toBeInTheDocument();
    expect(screen.getByText(/Acceso restringido al operador/i)).toBeInTheDocument();
  });

  test('renderiza para operador con datos vacios', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const { openDB } = await import('./db/dbCore');
    openDB.mockResolvedValue({
      objectStoreNames: {
        contains: () => true,
      },
      transaction: () => ({
        objectStore: () => makeMockStore([]),
      }),
    });

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('pilot-telemetry-panel')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sin eventos registrados/i)).toBeInTheDocument();
  });

  test('muestra conteo de eventos por tipo', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const mockEvents = [
      { id: '1', event_type: 'onboarding_complete', flujo: 'onboarding', created_at: '2026-06-01T00:00:00Z', _source: 'voice_telemetry' },
      { id: '2', event_type: 'modulo_activos', flujo: 'modulo', created_at: '2026-06-02T00:00:00Z', _source: 'llm_telemetry' },
      { id: '3', event_type: 'feedback_positivo', flujo: 'feedback', created_at: '2026-06-03T00:00:00Z', _source: 'rag_telemetry' },
    ];

    const { openDB } = await import('./db/dbCore');
    openDB.mockResolvedValue({
      objectStoreNames: {
        contains: () => true,
      },
      transaction: (storeName) => ({
        objectStore: () => {
          if (storeName === 'voice_telemetry') return makeMockStore([mockEvents[0]]);
          if (storeName === 'llm_telemetry') return makeMockStore([mockEvents[1]]);
          return makeMockStore([mockEvents[2]]);
        },
      }),
    });

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('pilot-telemetry-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('count-onboarding').textContent).toBe('1');
    expect(screen.getByTestId('count-modulo').textContent).toBe('1');
    expect(screen.getByTestId('count-feedback').textContent).toBe('1');
    expect(screen.getByTestId('count-pregunta').textContent).toBe('0');
    expect(screen.getByTestId('count-sync').textContent).toBe('0');
  });

  test('muestra tabla de eventos recientes', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const mockEvents = [
      { id: 'e1', event_type: 'ask_agente', flujo: 'chat', created_at: '2026-06-10T10:00:00Z', _source: 'llm_telemetry' },
      { id: 'e2', event_type: 'sync_complete', flujo: 'sync', created_at: '2026-06-09T09:00:00Z', _source: 'voice_telemetry' },
    ];

    const { openDB } = await import('./db/dbCore');
    openDB.mockResolvedValue({
      objectStoreNames: {
        contains: () => true,
      },
      transaction: (storeName) => ({
        objectStore: () => {
          if (storeName === 'llm_telemetry') return makeMockStore([mockEvents[0]]);
          return makeMockStore([mockEvents[1]]);
        },
      }),
    });

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('events-table')).toBeInTheDocument();
    });

    const rows = screen.getByTestId('events-table').querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('pregunta');
    expect(rows[1].textContent).toContain('sync');
  });

  test('maneja error de DB mostrando mensaje', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const { openDB } = await import('./db/dbCore');
    openDB.mockRejectedValue(new Error('DB no disponible'));

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar telemetria/i)).toBeInTheDocument();
    });
  });

  test('maneja gracefully cuando DB no tiene los stores', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const { openDB } = await import('./db/dbCore');
    openDB.mockResolvedValue({
      objectStoreNames: {
        contains: () => false,
      },
    });

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('pilot-telemetry-panel')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sin eventos registrados/i)).toBeInTheDocument();
  });

  test('no muestra PII en la tabla de eventos', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const mockEvents = [
      { id: 'e1', event_type: 'ask_agente', flujo: 'chat', created_at: '2026-06-10T10:00:00Z', user_id: 'user123', email: 'test@test.com', prompt: 'texto sensible', _source: 'llm_telemetry' },
    ];

    const { openDB } = await import('./db/dbCore');
    openDB.mockResolvedValue({
      objectStoreNames: {
        contains: () => true,
      },
      transaction: () => ({
        objectStore: () => makeMockStore(mockEvents),
      }),
    });

    const PilotTelemetryPanel = await loadComponent();
    render(<PilotTelemetryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('events-table')).toBeInTheDocument();
    });

    const tableText = screen.getByTestId('events-table').textContent;
    expect(tableText).not.toContain('user123');
    expect(tableText).not.toContain('test@test.com');
    expect(tableText).not.toContain('texto sensible');
  });
});
