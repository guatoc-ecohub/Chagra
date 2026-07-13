// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba de regresión del registro por voz (Task 12).
 *
 * Cubre el recorrido completo de voz a siembra persistida:
 *   1. extraer entidades crop+quantity+location de transcripcion
 *   2. enriquecer con RAG: compatibles/incompatibles
 *   3. confirmar y guardar
 *
 * No cambia el flujo actual de registro por voz — lo verifica.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks de servicios para entityExtractor ───
vi.mock('../../services/ollamaStream', () => ({
  streamOllama: vi.fn(),
}));

vi.mock('../../core/moduleRegistry', () => ({
  registry: { byCapability: vi.fn(() => []) },
}));

// ─── Mocks de RAG para voiceRagEnricher ───
vi.mock('../../services/ragRetriever', () => ({
  retrieve: vi.fn(),
}));

// ─── Mocks de stores/config para VoiceConfirmation ───
vi.mock('../../store/useAssetStore', () => ({
  default: vi.fn((selector) => {
    const state = {
      structures: [
        { id: 'struct-1', type: 'asset--structure', attributes: { name: 'Invernadero' } },
      ],
      lands: [
        { id: 'land-1', type: 'asset--land', attributes: { name: 'Lote Norte' } },
      ],
      taxonomyTerms: [
        { id: 'term-tomate', type: 'taxonomy_term--plant_type', attributes: { name: 'Tomate' } },
      ],
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../config/taxonomy', () => ({
  CROP_TAXONOMY: {
    hortalizas: {
      label: 'Hortalizas',
      species: [
        { id: 'solanum_lycopersicum', name: 'Tomate (Solanum lycopersicum)' },
      ],
    },
    frutales: {
      label: 'Frutales',
      species: [
        { id: 'fragaria_ananassa', name: 'Fresa (Fragaria × ananassa)' },
      ],
    },
  },
}));

vi.mock('../../config/speciesDefaults', () => ({
  resolveSpeciesDefaults: vi.fn(() => ({ tracking_mode: 'individual' })),
  SPECIES_DEFAULTS: {},
}));

// Mock GuildSuggestions para evitar dependencias profundas
vi.mock('../GuildSuggestions', () => ({
  default: () => <div data-testid="guild-stub" />,
}));

// ─── Imports de servicios (mocados) ───
import { streamOllama } from '../../services/ollamaStream';
import { extractEntities, _resetSystemPromptCache } from '../../services/entityExtractor';
import { retrieve } from '../../services/ragRetriever';
import { enrichEntitiesWithRag, __TEST__ as ragTest } from '../../services/voiceRagEnricher';
import VoiceConfirmation from '../VoiceConfirmation';

beforeEach(() => {
  vi.mocked(streamOllama).mockReset();
  vi.mocked(retrieve).mockReset();
  _resetSystemPromptCache();
  if (ragTest) ragTest._resetDocCache();
});

// ─── Tests ───

describe('Paso 1: Extracción de entidades', () => {
  it('extrae crop+quantity+location de transcripcion valida', async () => {
    vi.mocked(streamOllama).mockResolvedValue(
      '[{"crop":"tomate","quantity":5,"location":"invernadero"}]',
    );
    const result = await extractEntities('Sembré cinco tomates en el invernadero');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      crop: 'tomate',
      quantity: 5,
      location: 'invernadero',
    });
  });

  it('extrae multiples especies separadas por "y"', async () => {
    vi.mocked(streamOllama).mockResolvedValue(
      '[{"crop":"papa","quantity":3,"location":"lote norte"},{"crop":"maiz","quantity":2,"location":"lote norte"}]',
    );
    const result = await extractEntities('Sembré tres papas y dos maíces en el lote norte');
    expect(result).toHaveLength(2);
    expect(result[0].crop).toBe('papa');
    expect(result[0].quantity).toBe(3);
    expect(result[1].crop).toBe('maiz');
    expect(result[1].quantity).toBe(2);
  });

  it('falla con error claro si el modelo no devuelve JSON parseable', async () => {
    vi.mocked(streamOllama).mockResolvedValue('lo siento, no entendí');
    await expect(extractEntities('audio incomprensible')).rejects.toThrow(/no parseable/i);
  });
});

describe('Paso 2: Enriquecimiento RAG', () => {
  it('enriquece entidad con companions y antagonists del catalogo', async () => {
    const fresaDoc = {
      species_slug: 'fresa',
      scientific_name: 'Fragaria × ananassa Duch.',
      category: 'frutales_perennes',
      companions: [
        { especie: 'Caléndula francesa (Tagetes patula)', razon: 'Mata nematodos' },
        { especie: 'Ajo (Allium sativum)', razon: 'Espanta ácaros y pulgones' },
      ],
      antagonistas: [
        { especie: 'Tomate (Solanum lycopersicum)', razon: 'Comparten Verticillium' },
      ],
      biopreparados: [
        { nombre: 'Bocashi', uso: '200 g/planta al trasplante' },
      ],
    };

    globalThis.fetch = /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (vi.fn((url) => {
      if (String(url).includes('/cycle-content/fresa.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(fresaDoc),
        });
      }
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
    })));

    // pickWinningSlug espera h.species (no h.slug) + h.score > 0
    vi.mocked(retrieve).mockResolvedValue([
      { species: 'fresa', score: 0.95, topScore: 0.95 },
    ]);

    const result = await enrichEntitiesWithRag([
      { crop: 'fresa', quantity: 10, location: 'invernadero' },
    ]);

    expect(result.entities).toHaveLength(1);
    const enriched = result.entities[0]._ragInsights;
    expect(enriched).toBeTruthy();
    expect(enriched.companions).toHaveLength(2);
    expect(enriched.companions[0].especie).toContain('Caléndula');
    expect(enriched.antagonists).toHaveLength(1);
    expect(enriched.antagonists[0].especie).toContain('Tomate');
    expect(enriched.biopreparados).toHaveLength(1);
  });

  it('degrada gracefulmente si RAG no tiene cobertura', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);

    const result = await enrichEntitiesWithRag([
      { crop: 'cultivo_raro', quantity: 1, location: 'lote' },
    ]);

    expect(result.entities).toHaveLength(1);
    // Sin cobertura RAG -> _ragInsights NO se adjunta (undefined)
    expect(result.entities[0]._ragInsights).toBeUndefined();
  });
});

describe('Paso 3: Confirmacion visual', () => {
  it('renderiza resumen con transcripcion, cultivo resuelto y cantidad', () => {
    const entities = [
      {
        crop: 'tomate', quantity: 5, location: 'invernadero',
        _ragInsights: {
          sourceSlug: 'solanum_lycopersicum',
          companions: [{ especie: 'Albahaca', razon: 'Mejora sabor' }],
          antagonists: [{ especie: 'Papa', razon: 'Compiten' }],
          biopreparados: [],
          invasive: false, warnings: [], hitCount: 1,
        },
      },
    ];

    render(
      <VoiceConfirmation
        transcription="Sembré cinco tomates en el invernadero"
        initialEntities={entities}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByText(/"Sembré cinco tomates en el invernadero"/)).toBeInTheDocument();
    // Crop se resuelve a "Tomate" (con mayúscula, del catalogo)
    expect(screen.getByDisplayValue('Tomate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('muestra compatibles e incompatibles cuando hay datos RAG', () => {
    render(
      <VoiceConfirmation
        transcription="Sembré tomates"
        initialEntities={[{
          crop: 'tomate', quantity: 5, location: 'invernadero',
          _ragInsights: {
            sourceSlug: 'solanum_lycopersicum',
            companions: [{ especie: 'Albahaca', razon: 'Mejora sabor' }],
            antagonists: [{ especie: 'Papa', razon: 'Compiten' }],
            biopreparados: [{ nombre: 'Caldo bordelés', uso: '0.5%' }],
            invasive: false, warnings: [], hitCount: 1,
          },
        }]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/Va bien con/i)).toBeInTheDocument();
    expect(screen.getByText(/Albahaca/)).toBeInTheDocument();
    expect(screen.getByText(/Evitar junto a/i)).toBeInTheDocument();
    expect(screen.getByText(/Papa/)).toBeInTheDocument();
  });

  it('permite editar cantidad antes de confirmar', () => {
    render(
      <VoiceConfirmation
        transcription="Sembré tomates"
        initialEntities={[{
          crop: 'tomate', quantity: 5, location: 'invernadero', _ragInsights: null,
        }]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const qtyInput = screen.getByDisplayValue('5');
    fireEvent.change(qtyInput, { target: { value: '20' } });
    expect(/** @type {HTMLInputElement} */ (qtyInput).value).toBe('20');
  });

  it('NO permite confirmar con entidades vacias', () => {
    render(
      <VoiceConfirmation
        transcription=""
        initialEntities={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/No alcancé a identificar/i)).toBeInTheDocument();
  });
});

describe('Paso 4: Confirmacion ante de guardar', () => {
  it('onConfirm recibe entidades con structure correcta al hacer click', () => {
    const onConfirm = vi.fn();

    render(
      <VoiceConfirmation
        transcription="Sembré cinco tomates en el invernadero"
        initialEntities={[{
          crop: 'tomate', quantity: 5, location: 'invernadero', _ragInsights: null,
        }]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /guardar/i });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      crop: 'Tomate',
      quantity: 5,
      location: { id: 'struct-1', type: 'asset--structure' },
    });
    expect(payload[0].cropSlug).toBe('solanum_lycopersicum');
  });

  it('permite editar cantidad y la correccion se refleja en confirmacion', () => {
    const onConfirm = vi.fn();

    render(
      <VoiceConfirmation
        transcription="Sembré tomates"
        initialEntities={[{
          crop: 'tomate', quantity: 5, location: 'invernadero', _ragInsights: null,
        }]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0][0].quantity).toBe(20);
  });

  it('cancelar no guarda ni llama onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceConfirmation
        transcription="Sembré tomates"
        initialEntities={[{
          crop: 'tomate', quantity: 5, location: 'invernadero', _ragInsights: null,
        }]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
