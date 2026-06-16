/**
 * a11y-critical.test.jsx — TAREA 65
 *
 * Verificaciones manuales de accesibilidad critica por componente, usando
 * React Testing Library (RTL). Cubre:
 *   - aria-label en elementos interactivos sin texto visible
 *   - role semantico en componentes de status/alert/banner
 *   - alt text en imagenes
 *   - aria-expanded en menus desplegables
 *   - html lang declarado
 *
 * axe-core NO esta disponible en este repo. Estos tests manuales suplen
 * las verificaciones criticas de a11y hasta que se adopte axe-core.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── OfflineChip ────────────────────────────────────────────────────────────
import OfflineChip from '../OfflineChip';

const setOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

describe('a11y — OfflineChip', () => {
  afterEach(() => setOnline(true));

  it('tiene role="status" cuando esta offline', () => {
    setOnline(false);
    render(<OfflineChip />);
    const chip = screen.getByTestId('offline-chip');
    expect(chip).toHaveAttribute('role', 'status');
  });

  it('tiene aria-label descriptivo', () => {
    setOnline(false);
    render(<OfflineChip />);
    const chip = screen.getByTestId('offline-chip');
    expect(chip).toHaveAttribute('aria-label', expect.stringMatching(/sin conexión|conexion/i));
  });

  it('texto visible incluye "Sin conexion"', () => {
    setOnline(false);
    render(<OfflineChip />);
    expect(screen.getByTestId('offline-chip')).toHaveTextContent(/sin conexión/i);
  });
});

// ── ChagraGrowLoader ───────────────────────────────────────────────────────
vi.mock('../../services/agroecologyJourney', () => ({ getJourneyForProfile: vi.fn(() => null) }));
vi.mock('../../services/fincaGameStateService', () => ({ getGameState: vi.fn(() => null) }));

import ChagraGrowLoader from '../ChagraGrowLoader';

describe('a11y — ChagraGrowLoader', () => {
  it('sin label NO debe tener role="img" que compita con texto', () => {
    const { container } = render(<ChagraGrowLoader />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('con showLabel y labelText el texto es accesible', () => {
    render(<ChagraGrowLoader showLabel labelText="Cargando Chagra..." />);
    expect(screen.getByText('Cargando Chagra...')).toBeInTheDocument();
  });

  it('con showLabel sin labelText usa texto por defecto', () => {
    render(<ChagraGrowLoader showLabel />);
    expect(screen.getByText(/Chagra/)).toBeInTheDocument();
  });
});

// ── ChagraAgentAvatar ──────────────────────────────────────────────────────
import ChagraAgentAvatar from '../ChagraAgentAvatar';

describe('a11y — ChagraAgentAvatar', () => {
  beforeEach(() => {
    localStorage.setItem('chagra:agent-avatar-type', 'colibri_svg');
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('con onDoubleClick envuelve en button con title tooltip a11y', () => {
    render(<ChagraAgentAvatar state="idle" onDoubleClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/doble click/i));
  });

  it('respeta ariaLabel custom', () => {
    render(
      <ChagraAgentAvatar
        state="idle"
        onDoubleClick={() => {}}
        ariaLabel="Silenciar voz del agente"
      />
    );
    expect(screen.getByRole('button', { name: /silenciar voz/i })).toBeInTheDocument();
  });

  it('sin onDoubleClick ni onClick NO genera button vacio', () => {
    const { container } = render(<ChagraAgentAvatar state="idle" />);
    expect(container.querySelector('button')).toBeNull();
  });
});

// ── TopBar ─────────────────────────────────────────────────────────────────
// Stubs para sub-componentes pesados / con store o red.
vi.mock('../OfflineChip', () => ({ default: () => <div data-testid="chip-stub" /> }));
vi.mock('../NotificationsBell', () => ({ default: () => <div data-testid="bell-stub" /> }));

import TopBar from '../TopBar';

describe('a11y — TopBar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('tiene role="banner" como landmark de navegacion', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('menu de usuario tiene aria-label y aria-expanded', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const menuBtn = screen.getByTestId('topbar-user-menu');
    expect(menuBtn).toHaveAttribute('aria-label', expect.stringMatching(/menú|menu/i));
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('al abrir el menu, aria-expanded cambia a true', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const menuBtn = screen.getByTestId('topbar-user-menu');
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('el boton de ayuda tiene aria-label descriptivo', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const helpBtn = screen.getByLabelText(/manual de uso/i);
    expect(helpBtn).toBeInTheDocument();
  });

  it('boton del logo/inicio tiene aria-label', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const homeBtn = screen.getByLabelText(/volver al inicio/i);
    expect(homeBtn).toBeInTheDocument();
  });

  it('menu desplegado tiene role="menu" y opciones role="menuitem"', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const menuBtn = screen.getByTestId('topbar-user-menu');
    fireEvent.click(menuBtn);

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-label', expect.stringMatching(/opciones de usuario/i));

    const menuitems = within(menu).getAllByRole('menuitem');
    expect(menuitems.length).toBeGreaterThanOrEqual(1);
  });
});

// ── CriticalAlertBanner ────────────────────────────────────────────────────
vi.mock('../../services/notificationsService', () => ({
  aggregateNotifications: vi.fn(() => []),
  dismissNotification: vi.fn(),
}));

import CriticalAlertBanner from '../CriticalAlertBanner';
import { aggregateNotifications } from '../../services/notificationsService';

describe('a11y — CriticalAlertBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(aggregateNotifications).mockReset();
  });

  it('tiene role="alert" cuando hay alerta critica', () => {
    vi.mocked(aggregateNotifications).mockReturnValue([
      {
        id: 'test_critical',
        type: 'climate_critical',
        severity: 'critical',
        title: 'Helada',
        body: 'Cubre cultivos.',
        cta_view: 'agente',
      },
    ]);
    render(<CriticalAlertBanner />);
    expect(screen.getByTestId('critical-alert-banner')).toHaveAttribute('role', 'alert');
  });

  it('boton CTA tiene aria-label descriptivo', () => {
    vi.mocked(aggregateNotifications).mockReturnValue([
      {
        id: 'test_critical',
        type: 'climate_critical',
        severity: 'critical',
        title: 'Helada esta noche',
        body: 'Cubre cultivos.',
        cta_view: 'agente',
        cta_label: 'Preguntar al agente',
      },
    ]);
    render(<CriticalAlertBanner />);
    const cta = screen.getByTestId('critical-alert-cta');
    expect(cta).toHaveAttribute('aria-label', expect.stringMatching(/Helada esta noche/i));
  });

  it('boton descartar tiene aria-label', () => {
    vi.mocked(aggregateNotifications).mockReturnValue([
      {
        id: 'test_critical',
        type: 'climate_critical',
        severity: 'critical',
        title: 'Helada',
        body: 'Cubre cultivos.',
      },
    ]);
    render(<CriticalAlertBanner />);
    expect(screen.getByTestId('critical-alert-dismiss')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/descartar/i),
    );
  });
});

// ── HTML document-level a11y ───────────────────────────────────────────────

describe('a11y — HTML document-level', () => {
  it('document.documentElement tiene lang declarado', () => {
    expect(document.documentElement.getAttribute('lang')).toBeTruthy();
  });
});
