/**
 * @vitest-environment jsdom
 */

/* eslint-disable no-undef */

/**
 * Tests del threading de `edges` en el payload de feedback (A-15 #248).
 *
 * El feedback 👍👎 debe llevar las aristas del grafo AGE usadas en el turno
 * ({species_id, edge_type, target_id}) para que el motor E3 del sidecar mapee
 * la señal a aristas reales. Verifica: inclusión, sanitización (drop de
 * entradas malformadas), dedup, default [] (sin regresión) y back-compat
 * cuando el caller no pasa edges.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { fetchWithAuthRetry } = vi.hoisted(() => ({
  fetchWithAuthRetry: vi.fn((...args) => (/** @type {any} */ (globalThis)).fetch(...args)),
}));

vi.mock('../apiService.js', () => ({
  fetchWithAuthRetry,
}));

import { sendFeedback } from '../feedbackService';

describe('feedbackService — edges (A-15 #248)', () => {
  const originalLocalStorage = /** @type {any} */ (globalThis).localStorage;
  const originalFetch = /** @type {any} */ (globalThis).fetch;

  beforeEach(() => {
    /** @type {any} */ (globalThis).localStorage = { getItem: vi.fn(), setItem: vi.fn() };
    /** @type {any} */ (globalThis).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    fetchWithAuthRetry.mockClear();
    fetchWithAuthRetry.mockImplementation((...args) => (/** @type {any} */ (globalThis)).fetch(...args));
  });

  afterEach(() => {
    /** @type {any} */ (globalThis).localStorage = originalLocalStorage;
    /** @type {any} */ (globalThis).fetch = originalFetch;
  });

  function sentBody() {
    return JSON.parse(/** @type {string} */ (vi.mocked(/** @type {any} */ (globalThis).fetch).mock.calls[0][1].body));
  }

  it('incluye edges válidos en el payload', async () => {
    await sendFeedback({
      prompt: '¿compañeros del café?',
      response: 'guamo, plátano',
      thumb: 'up',
      edges: [
        { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
      ],
    });
    expect(sentBody().edges).toEqual([
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
    ]);
  });

  it('default [] cuando el caller no pasa edges (back-compat)', async () => {
    await sendFeedback({ prompt: 'x', response: 'y', thumb: 'up' });
    expect(sentBody().edges).toEqual([]);
  });

  it('sanitiza: descarta entradas malformadas y conserva las válidas', async () => {
    await sendFeedback({
      prompt: 'x',
      response: 'y',
      thumb: 'down',
      edges: /** @type {any} */ ([
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' }, // válido
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH' },                  // falta target_id
        { species_id: '', edge_type: 'CONTROLS', target_id: 'p' },          // species vacío
        { species_id: 'c', edge_type: 'CONTROLS', target_id: 5 },           // target no string
        null,                                                              // no objeto
        'nope',                                                            // no objeto
      ]),
    });
    expect(sentBody().edges).toEqual([
      { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' },
    ]);
  });

  it('deduplica edges repetidos', async () => {
    await sendFeedback({
      prompt: 'x',
      response: 'y',
      thumb: 'up',
      edges: [
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' },
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' },
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'c' },
      ],
    });
    expect(sentBody().edges).toEqual([
      { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' },
      { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'c' },
    ]);
  });

  it('edges no-array → [] (defensivo)', async () => {
    await sendFeedback({ prompt: 'x', response: 'y', thumb: 'up', edges: /** @type {any} */ ('oops') });
    expect(sentBody().edges).toEqual([]);
  });

  it('drops extra keys de cada edge — solo el shape canónico viaja', async () => {
    await sendFeedback({
      prompt: 'x',
      response: 'y',
      thumb: 'up',
      edges: /** @type {any} */ ([
        { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b', confidence: 0.9, extra: 'x' },
      ]),
    });
    expect(sentBody().edges).toEqual([
      { species_id: 'a', edge_type: 'COMPATIBLE_WITH', target_id: 'b' },
    ]);
  });
});
