// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const DAY_MS = 86400000;
const NOW = Date.now();

const mockGeo = { lat: 4.53, lng: -73.92, elevation: 1950, municipio: 'Choachí', precision: 'exact' };
const mockSnapshot = {
  enso_status: { phase: 'neutral' },
  openmeteo: {
    available: true,
    forecast_7d: [{ date: new Date(NOW).toISOString().slice(0, 10), temp_max_c: 17, temp_min_c: 6, precip_mm: 0 }],
  },
};
const mockSky = {
  current: { cloud_cover_pct: 90, weather_code: 3, precip_mm: 0, is_day: true },
  daily: [],
};

vi.mock('../../../services/climaService', () => ({
  resolveClimaLocation: vi.fn(() => mockGeo),
  getCachedClimaSnapshot: vi.fn(() => mockSnapshot),
  fetchClimaSnapshot: vi.fn(() => Promise.resolve(mockSnapshot)),
}));

vi.mock('../../../services/skyConditionService', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    getCachedSkyConditions: vi.fn(() => mockSky),
    fetchSkyConditions: vi.fn(() => Promise.resolve(mockSky)),
  };
});

vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(() => Promise.resolve([{
    process_id: 'p-papa',
    attributes: {
      subject_slug: 'solanum_tuberosum',
      subject_label: 'Papa',
      status: 'active',
      current_stage: 'vegetative',
      created_at: NOW - 45 * DAY_MS,
    },
  }])),
}));

import HoyEnFincaStrip from '../HoyEnFincaStrip';
import { resetAlertStore } from '../../../store/useAlertStore';

describe('HoyEnFincaStrip', () => {
  beforeEach(() => resetAlertStore());

  it('muestra clima honesto del día + contador de tareas', async () => {
    render(<HoyEnFincaStrip onNavigate={vi.fn()} />);
    const strip = screen.getByTestId('hoy-en-finca-strip');
    await waitFor(() => {
      expect(strip.textContent).toMatch(/nublado/i);
    });
    expect(strip.textContent).toContain('17°');
  });

  it('toque → navega a la vista hoy_finca', () => {
    const onNavigate = vi.fn();
    render(<HoyEnFincaStrip onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('hoy-en-finca-strip'));
    expect(onNavigate).toHaveBeenCalledWith('hoy_finca');
  });
});
