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
  vi.mocked(streamOllama).mockReset();
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
    vi.mocked(streamOllama).mockResolvedValue(JSON.stringify({
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
    vi.mocked(streamOllama).mockResolvedValue(JSON.stringify({
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
    vi.mocked(streamOllama).mockRejectedValue(new Error('Ollama down'));
    const r = await classifyAndExtract('sembré veinte maticas de cebolla larga', { now: NOW });
    expect(r.intent).toBe(INTENTS.SIEMBRA);
    expect(r.species.map((s) => s.slug)).toContain('allium_fistulosum');
    expect(r.measures.cantidad).toBe(20);
  });
});

// ─────────── merge NLU funde lugar + tiempo + variedad (gap voiceRouter:mergeNlu) ───────────
// Antes, mergeNlu DESCARTABA nlu.tiempo y nlu.lugar aunque el LLM los dedujera.
// Ahora los funde SIN pisar lo que el on-device ya sacó, con la misma aritmética
// de tiempo (parseRelativeTime) y recalculando el timestamp contra `now`.
const D = 86400000;

describe('merge NLU — funde lugar, tiempo y variedad cuando la base no los sacó', () => {
  it('el LLM aporta zona "surco", tiempo "hace 3 meses" y variedad "cherry"', async () => {
    // Frase que el on-device NO groundea (aguacate fuera de catálogo, sin zona
    // ni tiempo reconocidos): el LLM rellena los huecos.
    vi.mocked(streamOllama).mockResolvedValue(JSON.stringify({
      intent: 'registrar_siembra', especie: 'aguacate', variedad: 'hass',
      altura_m: null, ancho_m: null, cantidad: null, unidad: '', fenologia: '',
      sintomas: [], insumo: '', labores: [], lugar: 'la loma', tiempo: 'hace 3 meses',
    }));
    const r = await classifyAndExtract('planté un mango por el rincón', { now: NOW });
    expect(r.source).toBe('sidecar');
    expect(r.position.raw).toBe('la loma'); // antes se descartaba
    expect(r.variedad).toBe('hass');
    expect(r.time.offsetDays).toBe(-90); // hace 3 meses
    expect(r.timestampMs).toBe(NOW - 90 * D); // recalculado contra now
  });

  it('el tiempo del on-device MANDA: el LLM no lo pisa', async () => {
    // El on-device ya sacó "hace dos días"; el LLM alucina "hoy" → se ignora.
    vi.mocked(streamOllama).mockResolvedValue(JSON.stringify({
      intent: 'registrar_siembra', especie: 'cebolla larga', variedad: '',
      altura_m: null, ancho_m: null, cantidad: 20, unidad: '', fenologia: '',
      sintomas: [], insumo: '', labores: [], lugar: '', tiempo: 'hoy',
    }));
    const r = await classifyAndExtract(
      'sembré veinte maticas de cebolla larga aquí en la era nueva, hace dos días',
      { now: NOW },
    );
    expect(r.time.offsetDays).toBe(-2); // on-device gana
    expect(r.timestampMs).toBe(NOW - 2 * D);
    expect(r.position.raw).toBe('era nueva'); // on-device ya tenía zona → no la pisa
  });
});
