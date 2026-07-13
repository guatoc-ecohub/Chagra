import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FarmProcessConfirmCard from '../FarmProcessConfirmCard';
import React from 'react';

const baseDraft = {
  draft_id: '01J8TESTDRAFTID000000000000',
  transcription: 'Sembré cinco cafés en el invernadero',
  process_type: 'sowing',
  subject_slug: 'coffea_arabica',
  subject_label: 'Café',
  quantity: 5,
  unit: 'plantas',
  subject_kind: 'individual',
  location_land_asset_id: 'land-inv-1',
  location_land_label: 'Invernadero',
  companions: [{ especie: 'Plátano', razon: 'Sombra' }],
  antagonists: [],
  biopreparados: [{ nombre: 'Bocashi', uso: 'Al trasplante' }],
  invasive: false,
  warnings: [],
};

const locationOptions = [
  { id: 'land-inv-1', type: 'asset--structure', name: 'Invernadero', label: '🏠 Invernadero' },
  { id: 'land-ln-1', type: 'asset--land', name: 'Lote Norte', label: '🌾 Lote Norte' },
];

describe('FarmProcessConfirmCard', () => {
  it('renderiza el draft con todos los campos', () => {
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Nuevo ciclo de siembra/)).toBeDefined();
    expect(screen.getByDisplayValue('Café')).toBeDefined();
    expect(screen.getByDisplayValue('5')).toBeDefined();
  });

  it('llama onConfirm con draft editado', async () => {
    const onConfirm = vi.fn();
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const speciesInput = screen.getByDisplayValue('Café');
    fireEvent.change(speciesInput, { target: { value: 'Tomate' } });

    const quantityInput = screen.getByDisplayValue('5');
    fireEvent.change(quantityInput, { target: { value: '10' } });

    fireEvent.click(screen.getByText(/Confirmar siembra/));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const call = onConfirm.mock.calls[0][0];
    expect(call.subject_label).toBe('Tomate');
    expect(call.quantity).toBe(10);
  });

  it('llama onCancel al cancelar', () => {
    const onCancel = vi.fn();
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('deshabilita confirmacion si campos requeridos faltan', () => {
    const emptyDraft = { ...baseDraft, subject_label: '', quantity: 0, location_land_asset_id: '' };
    render(
      <FarmProcessConfirmCard
        draft={emptyDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const btn = screen.getByText(/Confirmar siembra/);
    expect(btn.closest('button')).toBeDisabled();
  });

  it('renderiza advertencia si especie es invasora', () => {
    const invasive = { ...baseDraft, invasive: true, warnings: ['Especie invasora en catálogo'] };
    render(
      <FarmProcessConfirmCard
        draft={invasive}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getAllByText(/invasora/)).toHaveLength(2);
  });

  it('renderiza insights RAG si existen', () => {
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Va bien con/)).toBeDefined();
    expect(screen.getByText(/Bocashi/)).toBeDefined();
  });

  it('cambia la fecha al editar', () => {
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
    expect(dateInput).toBeDefined();
    fireEvent.change(dateInput, { target: { value: '2026-07-15' } });
    expect(/** @type {HTMLInputElement} */ (dateInput).value).toBe('2026-07-15');
  });

  it('deshabilita inputs durante isSaving', () => {
    render(
      <FarmProcessConfirmCard
        draft={baseDraft}
        locationOptions={locationOptions}
        isSaving={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Guardando…')).toBeDefined();
    // Los inputs deben estar disabled
    screen.getAllByRole('textbox').forEach((input) => {
      expect(/** @type {HTMLInputElement} */ (input).disabled).toBe(true);
    });
  });

  it('renderiza encabezado de cosecha (harvest)', () => {
    const harvestDraft = { ...baseDraft, process_type: 'harvest', unit: 'kg' };
    render(
      <FarmProcessConfirmCard
        draft={harvestDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Ciclo de cosecha/)).toBeDefined();
  });

  it('renderiza encabezado de post-cosecha (post_harvest)', () => {
    const postDraft = { ...baseDraft, process_type: 'post_harvest', unit: 'kg' };
    render(
      <FarmProcessConfirmCard
        draft={postDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Post-cosecha/)).toBeDefined();
  });

  it('renderiza encabezado de manejo de plagas (pest_management)', () => {
    const pestDraft = { ...baseDraft, process_type: 'pest_management', unit: 'litros' };
    render(
      <FarmProcessConfirmCard
        draft={pestDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Manejo de plagas/)).toBeDefined();
  });

  it('muestra unidad kg y unidades de cosecha en harvest', () => {
    const harvestDraft = { ...baseDraft, process_type: 'harvest', unit: 'kg' };
    render(
      <FarmProcessConfirmCard
        draft={harvestDraft}
        locationOptions={locationOptions}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('kg')).toBeDefined();
  });
});
