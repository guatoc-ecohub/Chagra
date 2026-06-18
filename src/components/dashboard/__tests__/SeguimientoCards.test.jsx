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
    // Las cards CON procesos muestran el conteo en la pastilla
    // data-testid="finca-card-count" (refinamiento visual 2026-06-18).
    await waitFor(() => {
      const counts = screen.getAllByTestId('finca-card-count');
      // Reforestación (2) y Cerdos (1) → 2 pastillas de conteo.
      expect(counts.length).toBe(2);
    });
    const counts = screen.getAllByTestId('finca-card-count').map((n) => n.textContent);
    // Reforestación = 2, cerdos = 1.
    expect(counts).toContain('2');
    expect(counts).toContain('1');
  });

  test('una tarjeta en cero muestra invitación amable, no un "0" pelado', async () => {
    // Estado vacío amable (refinamiento 2026-06-18): en vez de un "0" triste,
    // la pastilla "Empieza" + la invitación cálida del proceso.
    activeProcesses = []; // las 4 en cero
    render(<SeguimientoCards onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getAllByTestId('finca-card-empty').length).toBe(4);
    });
    // No debe quedar ninguna pastilla con el conteo "0".
    expect(screen.queryAllByTestId('finca-card-count').length).toBe(0);
    // La invitación por proceso aparece (copy de seguimientoProcesos.emptyHint).
    expect(screen.getByText('Siembra tus primeros árboles')).toBeInTheDocument();
    expect(screen.getByText('Arranca tu primer lote')).toBeInTheDocument();
  });

  test('tocar Reforestación navega a su vista de seguimiento', async () => {
    const onNavigate = vi.fn();
    render(<SeguimientoCards onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Reforestación')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Reforestación'));
    expect(onNavigate).toHaveBeenCalledWith('seguimiento_reforestacion');
  });
});
