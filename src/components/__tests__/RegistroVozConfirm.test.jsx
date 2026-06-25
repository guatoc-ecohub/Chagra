// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Render del paso de confirmación del botón único de voz (#23). Verifica que el
 * árbol monta (geo utils, useGeolocation, store), que prefill los campos
 * extraídos, y que al confirmar entrega el registro editado + contexto.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ lands: [{ id: 'land-1', attributes: { name: 'Lote Norte' } }] }),
}));
vi.mock('../../hooks/useGeolocation', () => ({
  default: () => ({ position: null, loading: false, error: null, request: vi.fn() }),
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

    // Especie prefilled desde el catálogo.
    expect(screen.getByDisplayValue('Durazno')).toBeInTheDocument();
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
