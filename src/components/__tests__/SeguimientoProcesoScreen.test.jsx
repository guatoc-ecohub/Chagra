// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * SeguimientoProcesoScreen.test.jsx — vista de SEGUIMIENTO de un proceso de
 * finca (operador 2026-06-15). Verifica el flujo central de los 4 procesos:
 *   - Reforestacion: formulario create, etapa establecimiento, especie nativa.
 *   - Silvopastoreo: formulario create, etapa establecimiento (comparte seq).
 *   - Paramo: formulario create, etapa delimitacion (high-altitude).
 *   - Cerdos: formulario create, etapa instalacion, cochera/lote/evento.
 *   - Edge: switching entre procesos no crashea.
 *   - Guarda de leucaena/mimosina aparece SOLO en cerdos.
 */
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest';

let processes = [];
const createFarmProcess = vi.fn(async () => ({}));
const recordFarmEvent = vi.fn(async () => ({}));
const putFarmProcess = vi.fn(async () => ({}));

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
  putFarmProcess: (...a) => putFarmProcess(...a),
}));
vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ lands: [] }),
}));
// Sub-componentes pesados (voz/cámara/carbono) fuera del foco de este test.
vi.mock('../CicloObservacion', () => ({ default: () => <div data-testid="obs" /> }));
vi.mock('../CicloFotos', () => ({ default: () => <div data-testid="fotos" /> }));
vi.mock('../ChagraGrowLoader', () => ({ default: () => <div /> }));
vi.mock('../CarbonoPsaSubvista', () => ({ default: () => <div data-testid="carbono" /> }));
vi.mock('../../services/fincaActiveStore', () => ({
  default: (selector) => selector({ getActiveFinca: () => ({}) }),
}));
vi.mock('../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({})),
}));

import SeguimientoProcesoScreen from '../SeguimientoProcesoScreen';

afterEach(() => {
  cleanup();
  processes = [];
  createFarmProcess.mockClear();
  recordFarmEvent.mockClear();
  putFarmProcess.mockClear();
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

  test('cerdos permite guardar cochera, registrar lote y evento sanitario', async () => {
    processes = [{
      process_id: 'proc-cerdos-1',
      type: 'farm_process',
      attributes: {
        process_type: 'pigs',
        subject_kind: 'aggregate',
        subject_label: 'Lote de engorde',
        quantity: 8,
        unit: 'animales',
        status: 'active',
        current_stage: 'instalacion',
        created_at: Date.now(),
        updated_at: Date.now(),
        pig_cochera: { nombre: '', ubicacion: '', capacidad: '', cama_profunda: 'cascarilla_de_arroz' },
        pig_lotes: [],
      },
    }];

    render(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Lote de engorde'));
    fireEvent.click(screen.getByText('Lote de engorde'));

    fireEvent.change(screen.getByPlaceholderText('Ej: Cochera El Mango'), { target: { value: 'Cochera La Palma' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Junto al corral de servicio'), { target: { value: 'Bajo la sombra del patio' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cochera' }));

    await waitFor(() => expect(putFarmProcess).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Raza'), { target: { value: 'Zungo' } });
    fireEvent.change(screen.getByPlaceholderText('Cantidad'), { target: { value: '6' } });
    fireEvent.change(screen.getByPlaceholderText('Peso inicial kg'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar lote' }));

    await waitFor(() => expect(recordFarmEvent).toHaveBeenCalled());

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'sanidad' } });
    const sanitario = await screen.findByPlaceholderText('Ej: vacuna, desparasitación, observación sanitaria');
    fireEvent.change(sanitario, {
      target: { value: 'Vacuna y desparasitación' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));

    await waitFor(() => expect(recordFarmEvent).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Cochera guardada|Lote registrado|Evento guardado/)).toBeInTheDocument();
  });

  test('iniciar silvopastoreo crea un FarmProcess silvopasture en etapa establecimiento', async () => {
    render(<SeguimientoProcesoScreen procesoKey="silvopastoreo" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar silvopastoreo'));
    fireEvent.click(screen.getByText('Iniciar silvopastoreo'));
    const input = await screen.findByPlaceholderText(/Leucaena/);
    fireEvent.change(input, { target: { value: 'Leucaena y botón de oro' } });
    const botones = screen.getAllByText('Iniciar silvopastoreo');
    fireEvent.click(botones[botones.length - 1]);
    await waitFor(() => expect(createFarmProcess).toHaveBeenCalledTimes(1));
    const arg = createFarmProcess.mock.calls[0][0];
    expect(arg.attributes.process_type).toBe('silvopasture');
    expect(arg.attributes.current_stage).toBe('establecimiento');
    expect(arg.attributes.subject_label).toBe('Leucaena y botón de oro');
  });

  test('iniciar páramo crea un FarmProcess paramo en etapa delimitacion (high-altitude)', async () => {
    render(<SeguimientoProcesoScreen procesoKey="paramo" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar conservación'));
    fireEvent.click(screen.getByText('Iniciar conservación'));
    const input = await screen.findByPlaceholderText(/frailejonal/);
    fireEvent.change(input, { target: { value: 'Nacimiento Quebrada Honda' } });
    const botones = screen.getAllByText('Iniciar conservación');
    fireEvent.click(botones[botones.length - 1]);
    await waitFor(() => expect(createFarmProcess).toHaveBeenCalledTimes(1));
    const arg = createFarmProcess.mock.calls[0][0];
    expect(arg.attributes.process_type).toBe('paramo');
    expect(arg.attributes.current_stage).toBe('delimitacion');
    expect(arg.attributes.subject_label).toBe('Nacimiento Quebrada Honda');
  });

  test('reforestación tiene placeholder de especie nativa y crea restoration', async () => {
    render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar reforestación'));
    fireEvent.click(screen.getByText('Iniciar reforestación'));

    // Verifica que el placeholder menciona especies nativas (Roble, Aliso, Cativo).
    const input = await screen.findByPlaceholderText(/Roble|Aliso|Cativo/);
    expect(input).toBeInTheDocument();
  });

  test('silvopastoreo tiene placeholder de forrajeras y árboles', async () => {
    render(<SeguimientoProcesoScreen procesoKey="silvopastoreo" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar silvopastoreo'));
    fireEvent.click(screen.getByText('Iniciar silvopastoreo'));
    const input = await screen.findByPlaceholderText(/Leucaena|Botón|Nacedero/);
    expect(input).toBeInTheDocument();
  });

  test('páramo tiene placeholder de conservación hídrica y frailejón', async () => {
    render(<SeguimientoProcesoScreen procesoKey="paramo" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar conservación'));
    fireEvent.click(screen.getByText('Iniciar conservación'));
    const input = await screen.findByPlaceholderText(/agua|frailejonal/i);
    expect(input).toBeInTheDocument();
  });

  test('switching entre procesos no crashea: reforestación → cerdos → páramo', async () => {
    const { rerender } = render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar reforestación'));

    // Switch a cerdos.
    rerender(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar ciclo'));

    // Switch a páramo.
    rerender(<SeguimientoProcesoScreen procesoKey="paramo" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar conservación'));

    // Switch a silvopastoreo.
    rerender(<SeguimientoProcesoScreen procesoKey="silvopastoreo" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Iniciar silvopastoreo'));

    // No crasheó: llegamos acá.
    expect(screen.getByText('Iniciar silvopastoreo')).toBeInTheDocument();
  });

  test('switching entre procesos mantiene el estado correcto (no mezcla labels)', async () => {
    const { rerender } = render(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Cerdos'));

    rerender(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Reforestación'));

    // El título de cerdos NO debe persistir tras el switch.
    expect(screen.getByText('Reforestación')).toBeInTheDocument();
    // Cerdos (el header) ya no debe estar.
    expect(screen.queryByRole('heading', { name: 'Cerdos' })).not.toBeInTheDocument();
  });

  test('switching desde vista detalle a otro proceso no crashea', async () => {
    processes = [{
      process_id: 'proc-rest-1',
      type: 'farm_process',
      attributes: {
        process_type: 'restoration',
        subject_kind: 'aggregate',
        subject_label: 'Bosque nativo',
        quantity: 80,
        unit: 'árboles',
        status: 'active',
        current_stage: 'establecimiento',
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    }];

    const { rerender } = render(<SeguimientoProcesoScreen procesoKey="reforestacion" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Bosque nativo'));
    fireEvent.click(screen.getByText('Bosque nativo'));

    // Ahora en detalle de reforestacion (muestra CarbonoPsaSubvista mock).
    await waitFor(() => screen.getByTestId('carbono'));

    // Switch a cerdos sin volver atrás.
    rerender(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('Cerdos'));

    expect(screen.getByText('Cerdos')).toBeInTheDocument();
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
