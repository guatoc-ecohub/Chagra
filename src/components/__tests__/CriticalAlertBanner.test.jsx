import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mockeamos el canal de notificaciones para controlar las críticas de forma
// determinística (sin depender del flag localStorage del demo-seed de helada).
vi.mock('../../services/notificationsService', () => ({
  aggregateNotifications: vi.fn(() => []),
  dismissNotification: vi.fn(),
}));

import CriticalAlertBanner from '../CriticalAlertBanner';
import { aggregateNotifications, dismissNotification } from '../../services/notificationsService';

const HELADA = {
  id: 'demo_helada_critical',
  type: 'climate_critical',
  severity: 'critical',
  title: '🥶 Helada esta noche · −2 °C',
  body: 'Cubre cultivos sensibles antes de las 7 PM.',
  cta_view: 'agente',
  cta_label: 'Preguntar al agente',
  prefilled_prompt: 'Tengo alerta de helada, ¿qué protejo primero?',
};

describe('CriticalAlertBanner (#315)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    aggregateNotifications.mockReset();
    dismissNotification.mockReset();
  });

  it('no renderiza nada cuando no hay alertas críticas', () => {
    aggregateNotifications.mockReturnValue([
      { id: 'x', severity: 'warning', title: 'Algo menor' },
      { id: 'y', severity: 'info', title: 'Info' },
    ]);
    const { container } = render(<CriticalAlertBanner />);
    expect(screen.queryByTestId('critical-alert-banner')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza el banner cuando hay una crítica (helada)', () => {
    aggregateNotifications.mockReturnValue([HELADA]);
    render(<CriticalAlertBanner />);
    const banner = screen.getByTestId('critical-alert-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'alert');
    expect(screen.getByText(/Helada esta noche/)).toBeInTheDocument();
    expect(screen.getByText(/Cubre cultivos sensibles/)).toBeInTheDocument();
  });

  it('el CTA navega a la vista del agente y pre-carga el prompt', () => {
    aggregateNotifications.mockReturnValue([HELADA]);
    const onNavigate = vi.fn();
    render(<CriticalAlertBanner onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(/Preguntar al agente/));
    expect(onNavigate).toHaveBeenCalledWith('agente');
    expect(sessionStorage.getItem('chagra:agent:prefilled')).toBe(HELADA.prefilled_prompt);
  });

  it('descartar oculta el banner y persiste el id en sessionStorage', () => {
    aggregateNotifications.mockReturnValue([HELADA]);
    render(<CriticalAlertBanner />);
    expect(screen.getByTestId('critical-alert-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('critical-alert-dismiss'));
    expect(screen.queryByTestId('critical-alert-banner')).not.toBeInTheDocument();
    const dismissed = JSON.parse(sessionStorage.getItem('chagra:critical-banner:dismissed') || '[]');
    expect(dismissed).toContain('demo_helada_critical');
  });

  it('muestra "+N más críticas" cuando hay varias', () => {
    aggregateNotifications.mockReturnValue([
      HELADA,
      { id: 'demo_2', severity: 'critical', title: 'Sequía severa' },
      { id: 'demo_3', severity: 'critical', title: 'Granizada' },
    ]);
    render(<CriticalAlertBanner />);
    expect(screen.getByText(/\+2 más crítica/)).toBeInTheDocument();
  });

  it('una crítica del demo (id demo_*) NO llama a dismissNotification del servicio (solo por-sesión)', () => {
    aggregateNotifications.mockReturnValue([HELADA]);
    render(<CriticalAlertBanner />);
    fireEvent.click(screen.getByTestId('critical-alert-dismiss'));
    expect(dismissNotification).not.toHaveBeenCalled();
  });
});
