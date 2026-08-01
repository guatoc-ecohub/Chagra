// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/* i18n (ADR-050): labels en español en aserciones de UI; regla soft (warn)
 * desactivada a nivel de archivo (mismo criterio que la pantalla).
 * NOTA: Este test verifica placeholders y valores de data que están en español
 * porque corresponden a la UI real en español Colombia (ADR-050). */

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
/** @type {import('vitest').Mock} */
const createFarmProcess = vi.fn(async () => ({}));
/** @type {import('vitest').Mock} */
const recordFarmEvent = vi.fn(async () => ({}));
/** @type {import('vitest').Mock} */
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

  test('cerdos muestra grounding porcino, clima y alertas sanitarias', async () => {
    processes = [{
      process_id: 'proc-cerdos-2',
      type: 'farm_process',
      attributes: {
        process_type: 'pigs',
        subject_kind: 'aggregate',
        subject_label: 'Lote de cerdos en clima frio',
        quantity: 4,
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
    await waitFor(() => screen.getByText('Lote de cerdos en clima frio'));
    fireEvent.click(screen.getByText('Lote de cerdos en clima frio'));

    expect(screen.getByText('Guía de manejo del cerdo')).toBeInTheDocument();
    expect(screen.getByText('Alertas sanitarias')).toBeInTheDocument();
    expect(screen.getAllByText('Clima frio o templado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/yuca cocida/i)).toBeInTheDocument();
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

  test('el campo de raza de cerdo tiene un datalist con razas comunes y acepta texto libre', async () => {
    processes = [{
      process_id: 'proc-cerdos-3',
      type: 'farm_process',
      attributes: {
        process_type: 'pigs',
        subject_kind: 'aggregate',
        subject_label: 'Lote de engorde',
        quantity: 10,
        unit: 'animales',
        status: 'active',
        current_stage: 'instalacion',
        created_at: Date.now(),
        updated_at: Date.now(),
        pig_cochera: { nombre: 'Cochera Test', ubicacion: 'Test', capacidad: 20, cama_profunda: 'cascarilla_de_arroz' },
        pig_lotes: [],
      },
    }];

    const { container } = render(<SeguimientoProcesoScreen procesoKey="cerdos" onBack={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => screen.getByText('Lote de engorde'));
    fireEvent.click(screen.getByText('Lote de engorde'));

    // Verificar que existe el datalist con las razas esperadas
    const datalist = container.querySelector('#razas-cerdos');
    expect(datalist).toBeInTheDocument();

    const options = datalist.querySelectorAll('option');
    expect(options.length).toBe(10);

    const razasEsperadas = [
      'Yorkshire (Large White)',
      'Landrace',
      'Duroc',
      'Pietrain',
      'Hampshire',
      'Criollo Zungo costeño',
      'San Pedreño',
      'Casco de Mula',
      'Yorkshire x Landrace',
      'Landrace x Duroc',
    ];

    options.forEach((option, i) => {
      expect(option.getAttribute('value')).toBe(razasEsperadas[i]);
    });

    // Verificar que el input acepta texto libre (razas no listadas)
    const inputRaza = /** @type {HTMLInputElement} */ (screen.getByPlaceholderText('Raza'));
    expect(inputRaza).toBeInTheDocument();

    // Simular selección de una raza del datalist
    fireEvent.change(inputRaza, { target: { value: 'Landrace' } });
    expect(inputRaza.value).toBe('Landrace');

    // Simular entrada de una raza personalizada (texto libre)
    fireEvent.change(inputRaza, { target: { value: 'Raza custom no listada' } });
    expect(inputRaza.value).toBe('Raza custom no listada');
  });
});
