import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * NotificationsBell — pasada visual (bandeja priorizada, leído/no-leído,
 * acciones rápidas, EmptyState). Solo asserts de capa visual: la agregación
 * (notificationsService) se mockea de forma determinística.
 */

vi.mock('../../services/notificationsService', () => ({
  aggregateNotifications: vi.fn(() => []),
  dismissNotification: vi.fn(),
  resolveCalendarMonth: vi.fn(() => null),
}));

vi.mock('../../store/useAssetStore', () => ({
  default: (sel) => sel({ plants: [] }),
}));

vi.mock('../../store/useAlertStore', () => ({
  default: (sel) => sel({ activeAlerts: [] }),
}));

vi.mock('../../services/fincaActiveStore', () => ({
  default: (sel) => sel({ activeFincaSlug: null, fincas: [] }),
}));

vi.mock('../../store/useLogStore', () => ({
  useLogStore: {
    getState: () => ({ getPendingTasks: () => Promise.resolve([]) }),
  },
}));

vi.mock('../../services/syncManager', () => ({
  syncManager: { getFailedTransactions: () => Promise.resolve([]) },
}));

vi.mock('../../services/climaService', () => ({
  getCachedClimaSnapshot: () => null,
  fetchClimaSnapshot: () => Promise.resolve(null),
  phaseBadgeColor: () => 'emerald',
  describePhase: () => 'Neutral',
}));

vi.mock('../../services/skyConditionService', () => ({
  skyForDay: () => ({ condition: 'parcial', label: 'Parcialmente nublado' }),
  getCachedSkyConditions: () => null,
}));

import NotificationsBell from '../NotificationsBell';
import { aggregateNotifications, dismissNotification } from '../../services/notificationsService';

const HELADA = {
  id: 'demo_helada_critical',
  type: 'climate_critical',
  severity: 'critical',
  title: 'Helada esta noche',
  body: 'Cubra cultivos sensibles antes de las 7 PM.',
  cta_view: 'agente',
  cta_label: 'Preguntar al agente',
  created_at: Date.now(),
};

const TAREAS = {
  id: 'tasks_overdue',
  type: 'tasks_pending',
  severity: 'warning',
  title: '2 tareas vencidas',
  body: 'Tiene tareas atrasadas en su finca.',
  cta_view: 'task_log',
  cta_label: 'Revisar',
  created_at: Date.now(),
};

const CALENDARIO = {
  id: 'calendar_month_julio',
  type: 'calendar_month',
  severity: 'info',
  title: 'Este mes puede sembrar',
  body: 'Para su piso térmico: papa, arveja…',
  cta_view: 'agente',
  cta_label: 'Más info',
  created_at: Date.now(),
};

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
}

describe('NotificationsBell — pasada visual', () => {
  beforeEach(() => {
    localStorage.clear();
    aggregateNotifications.mockReset();
    aggregateNotifications.mockReturnValue([]);
    dismissNotification.mockReset();
  });

  it('bandeja vacía muestra el EmptyState en usted', async () => {
    render(<NotificationsBell />);
    openPanel();
    expect(await screen.findByTestId('notif-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Todo en orden por ahora/)).toBeInTheDocument();
    expect(screen.getByText(/Le avisaremos aquí/)).toBeInTheDocument();
  });

  it('agrupa la lista por prioridad con encabezados legibles', async () => {
    aggregateNotifications.mockReturnValue([HELADA, TAREAS, CALENDARIO]);
    render(<NotificationsBell />);
    openPanel();
    expect(await screen.findByText('Urgente')).toBeInTheDocument();
    expect(screen.getByText('Requiere atención')).toBeInTheDocument();
    expect(screen.getByText('Para tener en cuenta')).toBeInTheDocument();
  });

  it('marca como no-leídas las notificaciones nuevas y como leídas al reabrir', async () => {
    aggregateNotifications.mockReturnValue([TAREAS]);
    const { container } = render(<NotificationsBell />);

    openPanel();
    await screen.findByText('2 tareas vencidas');
    expect(container.querySelector('li[data-unread="true"]')).not.toBeNull();

    // cerrar persiste lo visto; al reabrir se pinta atenuada (leída)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    openPanel();
    await screen.findByText('2 tareas vencidas');
    expect(container.querySelector('li[data-unread="false"]')).not.toBeNull();
    expect(container.querySelector('li[data-unread="true"]')).toBeNull();
  });

  it('"Descartar no urgentes" descarta warning/info pero NUNCA las críticas', async () => {
    aggregateNotifications.mockReturnValue([HELADA, TAREAS, CALENDARIO]);
    render(<NotificationsBell />);
    openPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Descartar todas las notificaciones no urgentes/ }));
    expect(dismissNotification).toHaveBeenCalledWith('tasks_overdue');
    expect(dismissNotification).toHaveBeenCalledWith('calendar_month_julio');
    expect(dismissNotification).not.toHaveBeenCalledWith('demo_helada_critical');
  });

  it('sin críticas, el encabezado anuncia cuántas hay nuevas', async () => {
    aggregateNotifications.mockReturnValue([TAREAS, CALENDARIO]);
    render(<NotificationsBell />);
    openPanel();
    expect(await screen.findByText('2 nuevas')).toBeInTheDocument();
  });

  it('pestaña Clima sin datos muestra EmptyState offline con reintento', async () => {
    render(<NotificationsBell />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: /Clima/ }));
    await waitFor(() => {
      expect(screen.getByTestId('clima-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/Clima no disponible por ahora/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
