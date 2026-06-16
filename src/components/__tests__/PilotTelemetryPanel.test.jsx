import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetActiveTenantId = vi.fn();

vi.mock('../config/glaciarAccess', () => ({
  esOperadorActual: () => mockGetActiveTenantId() === 'admin',
}));

vi.mock('../db/dbCore', () => ({
  openDB: vi.fn(),
  STORES: { VOICE_TELEMETRY: 'voice_telemetry', LLM_TELEMETRY: 'llm_telemetry', RAG_TELEMETRY: 'rag_telemetry' },
}));

const makeMockStore = (records = []) => ({
  getAll: () => ({ result: records, onsuccess: null, onerror: null }),
});

async function loadComponent() {
  const mod = await import('../PilotTelemetryPanel');
  return mod.default;
}

describe('PilotTelemetryPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  test('muestra acceso restringido para no-operador', async () => {
    mockGetActiveTenantId.mockReturnValue('usuario_normal');
    const Panel = await loadComponent();
    render(<Panel />);
    expect(screen.getByTestId('pilot-telemetry-unauthorized')).toBeInTheDocument();
  });

  test('renderiza para operador con datos vacios', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const { openDB } = await import('../db/dbCore');
    openDB.mockResolvedValue({ objectStoreNames: { contains: () => true }, transaction: () => ({ objectStore: () => makeMockStore([]) }) });
    const Panel = await loadComponent();
    render(<Panel />);
    await waitFor(() => { expect(screen.getByTestId('pilot-telemetry-panel')).toBeInTheDocument(); });
    expect(screen.getByText(/Sin eventos registrados/i)).toBeInTheDocument();
  });

  test('muestra conteo de eventos por tipo', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const mockEvents = [
      { id: '1', event_type: 'onboarding_complete', flujo: 'onboarding', created_at: '2026-06-01T00:00:00Z', _source: 'voice_telemetry' },
      { id: '2', event_type: 'modulo_activos', flujo: 'modulo', created_at: '2026-06-02T00:00:00Z', _source: 'llm_telemetry' },
      { id: '3', event_type: 'feedback_positivo', flujo: 'feedback', created_at: '2026-06-03T00:00:00Z', _source: 'rag_telemetry' },
    ];
    const { openDB } = await import('../db/dbCore');
    openDB.mockResolvedValue({ objectStoreNames: { contains: () => true }, transaction: (sn) => ({ objectStore: () => sn === 'voice_telemetry' ? makeMockStore([mockEvents[0]]) : sn === 'llm_telemetry' ? makeMockStore([mockEvents[1]]) : makeMockStore([mockEvents[2]]) }) });
    const Panel = await loadComponent();
    render(<Panel />);
    await waitFor(() => { expect(screen.getByTestId('pilot-telemetry-panel')).toBeInTheDocument(); });
    expect(screen.getByTestId('count-onboarding').textContent).toBe('1');
    expect(screen.getByTestId('count-feedback').textContent).toBe('1');
  });

  test('no muestra PII en la tabla', async () => {
    mockGetActiveTenantId.mockReturnValue('admin');
    const { openDB } = await import('../db/dbCore');
    openDB.mockResolvedValue({ objectStoreNames: { contains: () => true }, transaction: () => ({ objectStore: () => makeMockStore([{ id: 'e1', event_type: 'ask', flujo: 'chat', created_at: '2026-06-10T10:00:00Z', user_id: 'user123', email: 'test@test.com', _source: 'llm_telemetry' }]) }) });
    const Panel = await loadComponent();
    render(<Panel />);
    await waitFor(() => { expect(screen.getByTestId('events-table')).toBeInTheDocument(); });
    expect(screen.getByTestId('events-table').textContent).not.toContain('user123');
  });
});
