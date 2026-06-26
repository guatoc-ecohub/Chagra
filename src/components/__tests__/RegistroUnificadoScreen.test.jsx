// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba de la PUERTA ÚNICA "Registrar" (#23, registro unificado).
 *
 * Garantía anti-cáscara: el respaldo MANUAL no es solo visual — al confirmar
 * ESCRIBE de verdad (buildVoicePayload → savePayload) y muestra el estado de
 * guardado. Verifica:
 *   1) arranca en voz con el CTA "a mano" visible (una sola puerta, dos caminos),
 *   2) "a mano" cambia al formulario adaptativo,
 *   3) confirmar llama savePayload con el saveType correcto,
 *   4) éxito → pantalla "guardado".
 *
 * El paso de confirmación (RegistroVozConfirm) se sustituye por un stub que
 * dispara onConfirm con un registro mínimo, para aislar el camino de guardado de
 * la puerta (el confirm real tiene su propia suite).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { savePayload } = vi.hoisted(() => ({ savePayload: vi.fn() }));
vi.mock('../../services/payloadService', () => ({ savePayload }));

// El confirm real se prueba aparte; aquí un stub que confirma un registro
// de cosecha en blanco editado a mano, para ejercer el camino de guardado.
vi.mock('../RegistroVozConfirm', () => ({
  default: ({ onConfirm }) => (
    <button
      type="button"
      data-testid="stub-confirm"
      onClick={() =>
        onConfirm(
          {
            intent: 'registrar_cosecha',
            source: 'manual',
            transcription: '',
            species: [{ common: 'Mora', slug: 'rubus_glaucus' }],
            measures: { cantidad: 3, unidad: 'arroba' },
            phenology: [], symptoms: [], labors: [], input: null, pest: null,
            position: { raw: '' }, timestampMs: Date.now(),
          },
          { locationAssetId: null, wkt: null },
        )
      }
    >
      confirmar
    </button>
  ),
}));

// Evita montar el árbol pesado de voz (recorder/whisper) en el modo voz.
vi.mock('../RegistroVozScreen', () => ({
  default: ({ onManual }) => (
    <div data-testid="voz-stub">
      <button type="button" data-testid="registro-manual-cta" onClick={onManual}>
        O escríbelo a mano
      </button>
    </div>
  ),
}));

import RegistroUnificadoScreen from '../RegistroUnificadoScreen';

beforeEach(() => {
  savePayload.mockReset();
});

describe('RegistroUnificadoScreen — puerta única', () => {
  it('arranca en voz con el CTA "a mano" visible', () => {
    render(<RegistroUnificadoScreen onBack={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByTestId('voz-stub')).toBeInTheDocument();
    expect(screen.getByTestId('registro-manual-cta')).toBeInTheDocument();
  });

  it('a mano → formulario; confirmar ESCRIBE (savePayload) y muestra guardado', async () => {
    savePayload.mockResolvedValue({ success: true, message: 'Guardado y sincronizado con servidor' });
    const onSave = vi.fn();
    render(<RegistroUnificadoScreen onBack={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('registro-manual-cta'));
    expect(screen.getByTestId('registro-unificado-manual')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('stub-confirm'));

    await waitFor(() => expect(savePayload).toHaveBeenCalledTimes(1));
    // Escribe con el saveType correcto (cosecha → harvest), no un shell.
    expect(savePayload).toHaveBeenCalledWith('harvest', expect.objectContaining({ data: expect.any(Object) }));
    expect(onSave).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('registro-unificado-done')).toBeInTheDocument());
  });

  it('si el guardado queda local (offline), igual confirma con aviso de Cuaderno', async () => {
    savePayload.mockResolvedValue({ success: false, message: 'Guardado local. Pendiente de sincronización' });
    render(<RegistroUnificadoScreen onBack={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByTestId('registro-manual-cta'));
    fireEvent.click(screen.getByTestId('stub-confirm'));

    await waitFor(() => expect(screen.getByTestId('registro-unificado-done')).toBeInTheDocument());
    expect(screen.getByText(/Cuaderno de campo/i)).toBeInTheDocument();
  });
});
