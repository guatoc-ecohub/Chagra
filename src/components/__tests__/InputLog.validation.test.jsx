/**
 * InputLog — validacion de campos requeridos: cantidad positiva.
 *
 * Tarea 76: la cantidad debe ser un valor > 0. El form actual valida
 * `!formData.quantity` (falsy), que rechaza vacio/0 pero no negativos.
 * Este test documenta el contrato esperado.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
}));
vi.mock('../../config/defaults', () => ({
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish
  FARM_CONFIG: { LOCATION_ID: 'loc-1', FARM_NAME: 'Finca Test' },
}));

import InputLog from '../InputLog';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe('InputLog — validacion de cantidad positiva', () => {
  it('cantidad vacia produce error de validacion', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<InputLog onBack={onBack} onSave={onSave} />);

    const materialSelect = screen.getByLabelText(/Tipo de Insumo/i);
    fireEvent.change(materialSelect, { target: { value: 'mat-bio' } });

    const saveBtn = screen.getByText(/Registrar Aplicación/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'Completa Ubicación, Tipo de Insumo y Cantidad',
        true
      );
    });
  });

  it('cantidad con valor positivo: guarda exitosamente', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<InputLog onBack={onBack} onSave={onSave} />);

    const materialSelect = screen.getByLabelText(/Tipo de Insumo/i);
    fireEvent.change(materialSelect, { target: { value: 'mat-bio' } });

    const qtyInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(qtyInput, { target: { value: '5' } });

    const saveBtn = screen.getByText(/Registrar Aplicación/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('OK', false);
    });
  });

  it('material vacio produce error de validacion', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(<InputLog onBack={onBack} onSave={onSave} />);

    const qtyInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(qtyInput, { target: { value: '3' } });

    const saveBtn = screen.getByText(/Registrar Aplicación/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'Completa Ubicación, Tipo de Insumo y Cantidad',
        true
      );
    });
  });
});
