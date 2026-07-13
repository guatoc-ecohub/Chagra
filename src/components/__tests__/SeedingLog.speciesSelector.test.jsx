import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Bug operador 2026-06-25: "Sembrar" usaba un <input> de texto libre para el
// cultivo → "Fresa - Invernadero #1" no resolvía a ninguna especie y rompía el
// calendario. Estos tests fijan el contrato del fix: selector del catálogo +
// etiqueta de ubicación SEPARADA + id canónico hilado al ciclo.

vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([
    { id: 'fragaria_ananassa', nombre_comun: 'Fresa', nombre_cientifico: 'Fragaria × ananassa', categoria: 'frutal', tracking_mode: 'individual' },
  ]),
}));

const savePayload = vi.fn().mockResolvedValue({ success: true, message: 'ok' });
vi.mock('../../services/payloadService', () => ({
  savePayload: (...args) => savePayload(...args),
}));

vi.mock('../../services/photoService', () => ({
  savePhoto: vi.fn().mockResolvedValue('photo-ref'),
}));

const createFarmProcess = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/farmEventService', () => ({
  createFarmProcess: (...args) => createFarmProcess(...args),
}));

const buildDraftFromSeeding = vi.fn().mockResolvedValue(null);
vi.mock('../../services/buildDraftFromSeeding', () => ({
  buildDraftFromSeeding: (...args) => buildDraftFromSeeding(...args),
}));

// Stub de PhotoCaptureField (no tocar cámara real en jsdom).
vi.mock('../PhotoCaptureField', () => ({
  default: () => <div data-testid="photo-capture-field-stub" />,
}));

import SeedingLog from '../SeedingLog';

const pickFresa = async () => {
  fireEvent.click(screen.getByText('Seleccionar especie…'));
  const input = await screen.findByTestId('species-combobox-input');
  fireEvent.change(input, { target: { value: 'fres' } });
  fireEvent.click(await screen.findByText(/Fresa \(Fragaria × ananassa\)/));
};

describe('SeedingLog — selector de especies del catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePayload.mockResolvedValue({ success: true, message: 'ok' });
    buildDraftFromSeeding.mockResolvedValue(null);
  });

  it('usa el SpeciesCombobox (no un input de texto libre para el cultivo)', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    expect(screen.getByTestId('species-combobox')).toBeInTheDocument();
  });

  it('ofrece un campo de ubicación/etiqueta SEPARADO del nombre del cultivo', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    expect(screen.getByPlaceholderText(/Invernadero #1/i)).toBeInTheDocument();
  });

  it('al elegir Fresa el cultivo queda limpio y la ubicación va aparte', async () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    await pickFresa();

    // Ubicación en su propio campo (no en el nombre de la especie).
    fireEvent.change(screen.getByPlaceholderText(/Invernadero #1/i), {
      target: { value: 'Invernadero #1' },
    });
    // Cantidad.
    const qty = document.querySelector('input[name="quantity"]');
    fireEvent.change(qty, { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Registro/i }));

    await waitFor(() => expect(savePayload).toHaveBeenCalled());

    const [, payload] = savePayload.mock.calls[0];
    // El nombre de la especie NO incluye la ubicación → resuelve limpio.
    expect(payload.data.attributes.name).toBe('Siembra de Fresa - N/A');
    expect(payload.data.attributes.name).not.toMatch(/Invernadero/);
    // La ubicación se persiste en notas, como línea aparte.
    expect(payload.data.attributes.notes.value).toMatch(/Ubicación: Invernadero #1/);
  });

  it('hila el id canónico del catálogo al ciclo (subject_slug grounded)', async () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    await pickFresa();
    const qty = document.querySelector('input[name="quantity"]');
    fireEvent.change(qty, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Registro/i }));

    await waitFor(() => expect(buildDraftFromSeeding).toHaveBeenCalled());
    const [, opts] = buildDraftFromSeeding.mock.calls[0];
    expect(opts).toEqual({ speciesSlug: 'fragaria_ananassa' });
  });
});
