// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Render del paso de confirmación del botón único de voz (#23). Verifica que el
 * árbol monta (geo utils, useGeolocation, store), que prefill los campos
 * extraídos, y que al confirmar entrega el registro editado + contexto.
 *
 * Bug 1b (operador 2026-06-25): el campo "Cultivo o especie" era un <input> de
 * TEXTO LIBRE → riesgo de no-resolución a un slug del catálogo. El fix usa el
 * MISMO SpeciesCombobox de SeedingLog (#1879): precargado con lo que la voz
 * extrajo, pero resolviendo al slug canónico del catálogo.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ lands: [{ id: 'land-1', attributes: { name: 'Lote Norte' } }] }),
}));
// useGeolocation es un export NOMBRADO (export function useGeolocation). El mock
// debe proveerlo con ese nombre (vitest 4.x valida los exports nombrados).
vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: null, loading: false, error: null, request: vi.fn() }),
}));
// Catálogo controlado para el SpeciesCombobox (shape de getAllSpecies()).
vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([
    { id: 'prunus_persica', nombre_comun: 'Durazno', nombre_cientifico: 'Prunus persica', categoria: 'frutal' },
    { id: 'rubus_glaucus', nombre_comun: 'Mora de Castilla', nombre_cientifico: 'Rubus glaucus', categoria: 'frutal' },
  ]),
}));

import RegistroVozConfirm from '../RegistroVozConfirm';
import { classifyAndExtractLocal } from '../../services/voiceFieldExtractor';

const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);

describe('RegistroVozConfirm', () => {
  it('prefill la especie del catálogo y confirma con el registro editado', () => {
    const record = classifyAndExtractLocal(
      'aquí tengo un durazno que tiene como dos metros de alto y está floriado',
      { now: NOW },
    );
    const onConfirm = vi.fn();
    render(<RegistroVozConfirm record={record} onConfirm={onConfirm} onCancel={vi.fn()} isSaving={false} />);

    // Especie prefilled desde el catálogo (el combobox la muestra como valor).
    expect(screen.getByText('Durazno')).toBeInTheDocument();
    // Altura extraída prefilled.
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Guardar registro/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [edited, ctx] = onConfirm.mock.calls[0];
    expect(edited.intent).toBe('registrar_planta');
    expect(edited.species[0].slug).toBe('prunus_persica');
    expect(ctx).toHaveProperty('locationAssetId');
    expect(ctx).toHaveProperty('wkt');
  });

  it('Bug 1b: el combobox precarga la especie de la voz GROUNDED al slug del catálogo', () => {
    const record = classifyAndExtractLocal(
      'al lado tengo un durazno que tiene como dos metros de ancho',
      { now: NOW },
    );
    // La voz ya resolvió la especie al slug del catálogo.
    expect(record.species[0].slug).toBe('prunus_persica');

    render(<RegistroVozConfirm record={record} onConfirm={vi.fn()} onCancel={vi.fn()} isSaving={false} />);

    // Es un SpeciesCombobox (no un input de texto libre) y marca el valor como
    // grounded (resuelve a slug del catálogo), no como texto libre.
    expect(screen.getByTestId('species-combobox')).toBeInTheDocument();
    expect(screen.getByTestId('species-grounded-ok')).toBeInTheDocument();
    expect(screen.queryByTestId('species-freetext-warn')).toBeNull();
  });

  it('Bug 1b: cambiar la especie desde el catálogo re-resuelve el slug al confirmar', async () => {
    const record = classifyAndExtractLocal('aquí tengo un durazno', { now: NOW });
    const onConfirm = vi.fn();
    render(<RegistroVozConfirm record={record} onConfirm={onConfirm} onCancel={vi.fn()} isSaving={false} />);

    // El usuario abre el combobox y elige OTRA especie del catálogo (mora).
    fireEvent.click(screen.getByText('Durazno'));
    const input = await screen.findByTestId('species-combobox-input');
    fireEvent.change(input, { target: { value: 'mora' } });
    fireEvent.click(await screen.findByText(/Mora de Castilla \(Rubus glaucus\)/));

    fireEvent.click(screen.getByRole('button', { name: /Guardar registro/i }));
    const [edited] = onConfirm.mock.calls[0];
    // El slug se re-resolvió a la especie elegida (no queda el durazno viejo).
    expect(edited.species[0].slug).toBe('rubus_glaucus');
    expect(edited.species[0].common).toBe('Mora de Castilla');
  });

  it('la georreferencia sigue a la intención EDITADA, no a la clasificada', () => {
    // Cosecha (georef:false) → sin sección GPS. Al corregir a Planta debe
    // aparecer. (regresión: meta derivaba del prop, no del estado editable.)
    const record = classifyAndExtractLocal('cogí tres arrobas de mora', { now: NOW });
    expect(record.intent).toBe('registrar_cosecha');
    render(<RegistroVozConfirm record={record} onConfirm={vi.fn()} onCancel={vi.fn()} isSaving={false} />);

    expect(screen.queryByText(/Usar mi ubicación/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Planta/i }));
    expect(screen.getByText(/Usar mi ubicación/i)).toBeInTheDocument();
  });
});
