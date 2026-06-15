// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * SeguimientoProcesoScreen.test.jsx — vista de SEGUIMIENTO de un proceso de
 * finca (operador 2026-06-15). Verifica el flujo central:
 *   - vacío → botón "Iniciar"
 *   - el formulario crea un FarmProcess vía createFarmProcess con el
 *     process_type y la etapa inicial correctos
 *   - la guarda de leucaena/mimosina aparece SOLO en cerdos
 */
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest';

let processes = [];
const createFarmProcess = vi.fn(async () => ({}));
const recordFarmEvent = vi.fn(async () => ({}));

vi.mock('../../services/farmEventService', () => ({
  createFarmProcess: (...a) => createFarmProcess(...a),
  recordFarmEvent: (...a) => recordFarmEvent(...a),
}));
vi.mock('../../services/stageConfirmationService', () => ({
  confirmStage: vi.fn(async () => ({})),
}));
vi.mock('../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(async () => processes),
  getFarmEvents: vi.fn(async () => []),
}));
vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ lands: [] }),
}));
// Sub-componentes pesados (voz/cámara) fuera del foco de este test.
vi.mock('../CicloObservacion', () => ({ default: () => <div data-testid="obs" /> }));
vi.mock('../CicloFotos', () => ({ default: () => <div data-testid="fotos" /> }));
vi.mock('../ChagraGrowLoader', () => ({ default: () => <div /> }));

import SeguimientoProcesoScreen from '../SeguimientoProcesoScreen';

afterEach(() => {
  cleanup();
  processes = [];
  createFarmProcess.mockClear();
  recordFarmEvent.mockClear();
});
beforeEach(() => { processes = []; });

describe('SeguimientoProcesoScreen', () => {
  test('vacío muestra el botón para iniciar el proceso', async () => {
    render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Iniciar reforestación')).toBeInTheDocument();
    });
  });

  test('iniciar reforestación crea un FarmProcess restoration en etapa establecimiento', async () => {
    render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar reforestación'));

    // Abrir el formulario.
    fireEvent.click(screen.getByText('Iniciar reforestación'));

    // Diligenciar el "qué".
    const input = await screen.findByPlaceholderText(/Roble/);
    fireEvent.change(input, { target: { value: 'Roble andino' } });

    // Confirmar (hay dos botones con el verbo; el submit es el último).
    const botones = screen.getAllByText('Iniciar reforestación');
    fireEvent.click(botones[botones.length - 1]);

    await waitFor(() => expect(createFarmProcess).toHaveBeenCalledTimes(1));
    const arg = createFarmProcess.mock.calls[0][0];
    expect(arg.type).toBe('farm_process');
    expect(arg.attributes.process_type).toBe('restoration');
    expect(arg.attributes.current_stage).toBe('establecimiento');
    expect(arg.attributes.subject_label).toBe('Roble andino');
    expect(arg.attributes.status).toBe('active');
  });

  test('iniciar cerdos crea un FarmProcess pigs en etapa instalacion', async () => {
    render(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar ciclo'));
    fireEvent.click(screen.getByText('Iniciar ciclo'));
    const input = await screen.findByPlaceholderText(/engorde/);
    fireEvent.change(input, { target: { value: 'Lote engorde 1' } });
    const botones = screen.getAllByText('Iniciar ciclo');
    fireEvent.click(botones[botones.length - 1]);
    await waitFor(() => expect(createFarmProcess).toHaveBeenCalledTimes(1));
    const arg = createFarmProcess.mock.calls[0][0];
    expect(arg.attributes.process_type).toBe('pigs');
    expect(arg.attributes.current_stage).toBe('instalacion');
  });

  test('la guarda de leucaena/mimosina aparece en cerdos pero NO en reforestación', async () => {
    const { unmount } = render(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar ciclo'));
    expect(screen.getByText(/[Ll]eucaena/)).toBeInTheDocument();
    unmount();

    render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar reforestación'));
    expect(screen.queryByText(/[Ll]eucaena/)).not.toBeInTheDocument();
  });
});
