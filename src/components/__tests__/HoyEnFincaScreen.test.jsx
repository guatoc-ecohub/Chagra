// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ScreenShell trae NotificationsBell (fetch clima, IDB…) — passthrough simple.
vi.mock('../common/ScreenShell', () => ({
  ScreenShell: ({ title, children }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const DAY_MS = 86400000;
const NOW = Date.now();

const mockGeo = {
  lat: 4.53, lng: -73.92, elevation: 1950, municipio: 'Choachí', precision: 'exact',
};

const mockSnapshot = {
  enso_status: { phase: 'nina_moderada' },
  openmeteo: {
    available: true,
    forecast_7d: [
      { date: new Date(NOW).toISOString().slice(0, 10), temp_max_c: 18, temp_min_c: 7, precip_mm: 2 },
    ],
  },
};

const mockSky = {
  current: { cloud_cover_pct: 88, weather_code: 3, precip_mm: 0, is_day: true },
  daily: [{ date: new Date(NOW).toISOString().slice(0, 10), cloud_cover_mean_pct: 88, weather_code: 3, precip_mm: 2 }],
};

const mockProcesses = [
  {
    process_id: 'p-papa',
    type: 'farm_process',
    attributes: {
      process_type: 'sowing',
      subject_slug: 'solanum_tuberosum',
      subject_label: 'Papa pastusa',
      status: 'active',
      current_stage: 'vegetative',
      created_at: NOW - 45 * DAY_MS,
    },
  },
];

vi.mock('../../services/climaService', () => ({
  resolveClimaLocation: vi.fn(() => mockGeo),
  getCachedClimaSnapshot: vi.fn(() => mockSnapshot),
  fetchClimaSnapshot: vi.fn(() => Promise.resolve(mockSnapshot)),
  describePhase: vi.fn(() => 'La Niña moderada — mas lluvia de lo normal'),
}));

vi.mock('../../services/skyConditionService', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    getCachedSkyConditions: vi.fn(() => mockSky),
    fetchSkyConditions: vi.fn(() => Promise.resolve(mockSky)),
  };
});

vi.mock('../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(() => Promise.resolve(mockProcesses)),
}));

vi.mock('../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({ municipio: 'Choachí', finca_altitud: 1950 })),
}));

import HoyEnFincaScreen from '../hoy/HoyEnFincaScreen';
import useAlertStore, { resetAlertStore } from '../../store/useAlertStore';
import { resolveClimaLocation } from '../../services/climaService';

describe('HoyEnFincaScreen', () => {
  beforeEach(() => {
    resetAlertStore();
    sessionStorage.clear();
    vi.mocked(resolveClimaLocation).mockReturnValue(mockGeo);
  });

  it('muestra el clima HONESTO de hoy (nublado real, no sol optimista)', async () => {
    render(<HoyEnFincaScreen onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('clima-hoy-label').textContent).toMatch(/nublado/i);
    });
    // Temperaturas reales del forecast
    expect(screen.getByTestId('clima-hoy-card').textContent).toContain('18°');
    // ENSO en lenguaje llano, no jerga
    expect(screen.getByTestId('enso-llano').textContent).toMatch(/lluvia de lo normal/);
    // Fuente citada
    expect(screen.getByTestId('clima-hoy-card').textContent).toMatch(/Open-Meteo/);
  });

  it('toque del clima rutea al agente con prompt pre-cargado', async () => {
    const onNavigate = vi.fn();
    render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    await waitFor(() => screen.getByTestId('clima-hoy-label'));
    fireEvent.click(screen.getByTestId('clima-hoy-card'));
    expect(onNavigate).toHaveBeenCalledWith('agente');
    expect(sessionStorage.getItem('chagra:agent:prefilled')).toMatch(/¿Qué me recomiendas hacer hoy/);
  });

  it('sin alertas: mensaje tranquilo; con alertas: lista accionable → agente', async () => {
    const onNavigate = vi.fn();
    const { unmount } = render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    expect(screen.getByTestId('sin-alertas')).toBeTruthy();
    unmount();

    useAlertStore.setState({
      activeAlerts: [{
        type: 'helada', severity: 'danger', title: 'Riesgo de helada',
        message: 'Mínima de -1°C esta madrugada', prefilled_prompt: 'Hay alerta de helada, ¿qué hago?',
      }],
    });
    render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    const alerta = screen.getByRole('button', { name: /Riesgo de helada/ });
    fireEvent.click(alerta);
    expect(onNavigate).toHaveBeenCalledWith('agente');
    expect(sessionStorage.getItem('chagra:agent:prefilled')).toBe('Hay alerta de helada, ¿qué hago?');
  });

  it('tareas de la semana del ciclo real; toque → vista ciclo', async () => {
    const onNavigate = vi.fn();
    render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    const grupo = await screen.findByRole('button', { name: /Papa pastusa en etapa/ });
    expect(grupo.textContent).toMatch(/Riego|Monitoreo|drenajes|caldo/i);
    fireEvent.click(grupo);
    expect(onNavigate).toHaveBeenCalledWith('ciclo');
  });

  it('accesos rápidos rutean a su módulo', async () => {
    const onNavigate = vi.fn();
    render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Plagas/ }));
    expect(onNavigate).toHaveBeenCalledWith('reportar_invasora');
    fireEvent.click(screen.getByRole('button', { name: /Preguntar/ }));
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  it('agenda campesina presente con toggle Semana/Mes', async () => {
    render(<HoyEnFincaScreen onNavigate={vi.fn()} />);
    await screen.findByTestId('agenda-semana');
    fireEvent.click(screen.getByRole('tab', { name: /Mes/ }));
    expect(screen.getByTestId('agenda-mes')).toBeTruthy();
    expect(screen.getByText('Esta semana')).toBeTruthy();
  });

  it('sin ubicación guardada: CTA al mini-mapa (no clima inventado)', async () => {
    vi.mocked(resolveClimaLocation).mockReturnValue(null);
    const onNavigate = vi.fn();
    render(<HoyEnFincaScreen onNavigate={onNavigate} />);
    const cta = screen.getByRole('button', { name: /Configurar ubicación/ });
    expect(screen.queryByTestId('clima-hoy-card')).toBeNull();
    fireEvent.click(cta);
    expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
  });
});
