// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * SeguimientoCards.test.jsx — las 4 tarjetas de SEGUIMIENTO de procesos de
 * finca en el home (operador 2026-06-15): Reforestación · Silvopastoreo ·
 * Páramo · Cerdos. Verifica que se rendericen las 4, que el contador refleje
 * los procesos activos y que el tap navegue a la ruta 'seguimiento_<key>'.
 */
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest';

// Mock del store (las cards de seguimiento no lo usan, pero FincaCards lo importa).
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));

// Mock del cache: controlamos qué procesos "activos" hay.
let activeProcesses = [];
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(async () => activeProcesses),
}));

import { SeguimientoCards } from '../FincaCards';

afterEach(() => {
  cleanup();
  activeProcesses = [];
});

beforeEach(() => {
  activeProcesses = [];
});

describe('SeguimientoCards — tarjetas de seguimiento en el home', () => {
  test('renderiza las 4 tarjetas pedidas por el operador', async () => {
    render(<SeguimientoCards onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Reforestación')).toBeInTheDocument();
    });
    expect(screen.getByText('Silvopastoreo')).toBeInTheDocument();
    expect(screen.getByText('Páramo')).toBeInTheDocument();
    expect(screen.getByText('Cerdos')).toBeInTheDocument();
  });

  test('el contador refleja los procesos activos por tipo', async () => {
    activeProcesses = [
      { attributes: { process_type: 'restoration', status: 'active' } },
      { attributes: { process_type: 'restoration', status: 'active' } },
      { attributes: { process_type: 'pigs', status: 'active' } },
    ];
    render(<SeguimientoCards onNavigate={vi.fn()} />);
    // Las cards muestran el conteo en el badge data-testid="finca-card-count".
    await waitFor(() => {
      const counts = screen.getAllByTestId('finca-card-count');
      // 4 cards → 4 badges (incluye los 0).
      expect(counts.length).toBe(4);
    });
    const counts = screen.getAllByTestId('finca-card-count').map((n) => n.textContent);
    // Reforestación = 2, cerdos = 1, silvopastoreo/páramo = 0.
    expect(counts).toContain('2');
    expect(counts).toContain('1');
  });

  test('tocar Reforestación navega a su vista de seguimiento', async () => {
    const onNavigate = vi.fn();
    render(<SeguimientoCards onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Reforestación')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Reforestación'));
    expect(onNavigate).toHaveBeenCalledWith('seguimiento_reforestacion');
  });
});
