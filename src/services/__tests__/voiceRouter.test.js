// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba del orquestador `voiceRouter` (#23): grounded-first con fallback
 * on-device. Verifica que (a) offline/preferLocal no llama al LLM y devuelve
 * la base determinística, (b) el merge del NLU rellena huecos pero NUNCA
 * reemplaza la especie groundeada por el catálogo, (c) un LLM caído degrada a
 * on-device sin romper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ollamaStream', () => ({ streamOllama: vi.fn() }));

import { streamOllama } from '../ollamaStream';
import { classifyAndExtract } from '../voiceRouter';
import { INTENTS } from '../voiceFieldExtractor';

const NOW = Date.UTC(2026, 5, 25, 12, 0, 0);

beforeEach(() => {
  streamOllama.mockReset();
});

describe('preferLocal — no llama al LLM', () => {
  it('resuelve el durazno solo on-device', async () => {
    const r = await classifyAndExtract(
      'aquí tengo un durazno que tiene como dos metros de alto y está floriado',
      { now: NOW, preferLocal: true },
    );
    expect(streamOllama).not.toHaveBeenCalled();
    expect(r.source).toBe('ondevice');
    expect(r.intent).toBe(INTENTS.PLANTA);
    expect(r.species.map((s) => s.slug)).toContain('prunus_persica');
    expect(r.measures.altura_m).toBe(2);
  });
});

describe('merge NLU — rellena huecos sin pisar la especie', () => {
  it('el LLM no puede reescribir la especie groundeada (gulupa≠guayaba)', async () => {
    // El LLM, alucinando, dice "guayaba". El catálogo ya groundeó gulupa.
    streamOllama.mockResolvedValue(JSON.stringify({
      intent: 'registrar_observacion', especie: 'guayaba', altura_m: null,
      ancho_m: null, cantidad: null, unidad: '', fenologia: '', sintomas: [],
      insumo: '', labores: [], lugar: '', tiempo: '',
    }));
    const r = await classifyAndExtract(
      'esta gulupa está reventando en flor pero se le caen las hojas',
      { now: NOW },
    );
    expect(r.source).toBe('sidecar');
    expect(r.species.map((s) => s.slug)).toContain('passiflora_edulis');
    expect(r.species.map((s) => s.slug)).not.toContain('psidium_guajava');
    expect(r.speciesHint).toBe('guayaba'); // solo hint editable
  });

  it('un campo que el on-device no sacó lo rellena el LLM', async () => {
    // Transcripción sin medida parseable; el LLM aporta altura.
    streamOllama.mockResolvedValue(JSON.stringify({
      intent: 'registrar_planta', especie: 'aguacate', altura_m: 4,
      ancho_m: null, cantidad: null, unidad: '', fenologia: '', sintomas: [],
      insumo: '', labores: [], lugar: '', tiempo: '',
    }));
    const r = await classifyAndExtract('tengo un aguacate grandote', { now: NOW });
    expect(r.measures.altura_m).toBe(4);
    expect(r.speciesHint).toBe('aguacate'); // fuera del catálogo → solo hint
    expect(r.species).toHaveLength(0);
  });
});

describe('LLM caído — degrada a on-device', () => {
  it('si streamOllama lanza, queda la base determinística', async () => {
    streamOllama.mockRejectedValue(new Error('Ollama down'));
    const r = await classifyAndExtract('sembré veinte maticas de cebolla larga', { now: NOW });
    expect(r.intent).toBe(INTENTS.SIEMBRA);
    expect(r.species.map((s) => s.slug)).toContain('allium_fistulosum');
    expect(r.measures.cantidad).toBe(20);
  });
});
