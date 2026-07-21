// @ts-nocheck
/**
// @ts-nocheck
 * voiceRagEnricher.test.js — cobertura unitaria del módulo de enriquecimiento
 * RAG post-extracción de entidades de voz (audit 2026-05-18).
 *
 * Estrategia:
 *   - Mock de `ragRetriever.retrieve` para simular hits BM25 (vía vi.mock).
 *   - Mock de `fetch` global para servir docs species en
 *     /cycle-content/<slug>.json sin tocar disco.
 *   - Casos cubiertos:
 *       1. Species válida con companions+antagonists+biopreparados → enriched.
 *       2. Species invasora → warnings + flag invasive.
 *       3. Species sin cobertura en RAG (retrieve devuelve []) → null.
 *       4. Fetch de doc falla → null.
 *       5. Pure helpers (detectInvasive, normalize*).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

import { retrieve } from '../ragRetriever';
import { enrichEntity, enrichEntitiesWithRag, __TEST__ } from '../voiceRagEnricher';

const FRESA_DOC = {
  species_slug: 'fresa',
  scientific_name: 'Fragaria × ananassa Duch.',
  category: 'frutales_perennes',
  conservation_status: 'cultivo_comun',
  companions: [
    { especie: 'Caléndula francesa (Tagetes patula)', razon: 'Mata nematodos' },
    { especie: 'Ajo (Allium sativum)', razon: 'Espanta ácaros y pulgones' },
  ],
  antagonistas: [
    { especie: 'Tomate (Solanum lycopersicum)', razon: 'Comparten Verticillium' },
    { especie: 'Repollo y brócoli (Brassica oleracea)', razon: 'Compiten por nitrógeno' },
  ],
  biopreparados: [
    { nombre: 'Bocashi', uso: '200 g/planta al trasplante' },
    { nombre: 'Caldo bordelés', uso: '0.5% aspersión, EVITAR en floración' },
  ],
};

const RETAMO_DOC = {
  species_slug: 'ulex_europaeus',
  scientific_name: 'Ulex europaeus L.',
  category: 'especies_invasoras',
  conservation_status: 'invasor',
  roles_in_guild: ['invasive'],
  antagonists: [],
  companions: [],
  biopreparados: [],
  especies_nativas_sustitutas: ['alnus_acuminata', 'escallonia_paniculata', 'weinmannia_tomentosa'],
};

// Mock de fetch para servir docs species. Las llamadas a retrieve están
// mockeadas independientemente; aquí solo manejamos /cycle-content/<slug>.json.
function setupFetchMock(map) {
  globalThis.fetch = /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (vi.fn((url) => {
    const match = String(url).match(/\/cycle-content\/([^.]+)\.json/);
    if (!match) {
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
    }
    const slug = match[1];
    const doc = map[slug];
    if (!doc) {
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => 'text/html' } });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
      json: () => Promise.resolve(doc),
    });
  })));
}

describe('voiceRagEnricher', () => {
  beforeEach(() => {
    __TEST__._resetDocCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  describe('helpers puros', () => {
    it('detectInvasive cubre los tres campos del esquema', () => {
      expect(__TEST__.detectInvasive({ category: 'especies_invasoras' })).toBe(true);
      expect(__TEST__.detectInvasive({ conservation_status: 'invasor' })).toBe(true);
      expect(__TEST__.detectInvasive({ roles_in_guild: ['invasive'] })).toBe(true);
      expect(__TEST__.detectInvasive({ category: 'frutales_perennes' })).toBe(false);
      expect(__TEST__.detectInvasive(null)).toBe(false);
      expect(__TEST__.detectInvasive({})).toBe(false);
    });

    it('normalizeCompanions soporta strings y objetos mixtos', () => {
      const out = __TEST__.normalizeCompanions([
        'Caléndula',
        { especie: 'Ajo', razon: 'Repelente' },
        { species: 'Menta', reason: 'Confunde plagas' },
        null,
        { razon: 'sin especie' },
      ]);
      expect(out).toHaveLength(3);
      expect(out[0]).toEqual({ especie: 'Caléndula', razon: '' });
      expect(out[1]).toEqual({ especie: 'Ajo', razon: 'Repelente' });
      expect(out[2]).toEqual({ especie: 'Menta', razon: 'Confunde plagas' });
    });

    it('normalizeBiopreparados soporta strings y objetos', () => {
      const out = __TEST__.normalizeBiopreparados([
        'Bocashi',
        { nombre: 'Biol', uso: 'Foliar 5%' },
        { name: 'Caldo bordelés', usage: 'Preventivo' },
        null,
      ]);
      expect(out).toHaveLength(3);
      expect(out[0]).toEqual({ nombre: 'Bocashi', uso: '' });
      expect(out[1]).toEqual({ nombre: 'Biol', uso: 'Foliar 5%' });
      expect(out[2]).toEqual({ nombre: 'Caldo bordelés', uso: 'Preventivo' });
    });

    it('pickWinningSlug elige por topScore, desempate por totalScore', () => {
      const hits = [
        { species: 'fresa', score: 5.2 },
        { species: 'fresa', score: 3.1 },
        { species: 'tomate', score: 4.8 },
        { species: 'tomate', score: 4.5 },
        { species: 'tomate', score: 0 },
      ];
      expect(__TEST__.pickWinningSlug(hits)).toBe('fresa');
    });

    it('pickWinningSlug devuelve null si no hay hits con score>0', () => {
      expect(__TEST__.pickWinningSlug([])).toBe(null);
      expect(__TEST__.pickWinningSlug([{ species: 'x', score: 0 }])).toBe(null);
      expect(__TEST__.pickWinningSlug(null)).toBe(null);
    });
  });

  describe('enrichEntity', () => {
    it('species válida → enriched con companions, antagonists, biopreparados', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([
        { species: 'fresa', score: 8.2, text: 'companions caléndula ajo' },
        { species: 'fresa', score: 6.1, text: 'biopreparados bocashi caldo bordelés' },
      ]);
      setupFetchMock({ fresa: FRESA_DOC });

      const result = await enrichEntity({ crop: 'fresa', quantity: 50, location: 'tunel' });

      expect(result).not.toBeNull();
      expect(result.sourceSlug).toBe('fresa');
      expect(result.invasive).toBe(false);
      expect(result.warnings).toEqual([]);
      expect(result.companions).toHaveLength(2);
      expect(result.companions[0].especie).toContain('Caléndula');
      expect(result.antagonists).toHaveLength(2);
      expect(result.antagonists.map((a) => a.especie).some((s) => s.includes('Repollo'))).toBe(true);
      expect(result.biopreparados).toHaveLength(2);
      expect(result.biopreparados[0].nombre).toBe('Bocashi');
      expect(result.hitCount).toBe(2);
    });

    it('species invasora → flag + warnings con sustitutas nativas', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([
        { species: 'ulex_europaeus', score: 7.5, text: 'retamo espinoso invasor' },
      ]);
      setupFetchMock({ ulex_europaeus: RETAMO_DOC });

      const result = await enrichEntity({ crop: 'retamo', quantity: 10, location: '' });

      expect(result).not.toBeNull();
      expect(result.invasive).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('invasora');
      expect(result.warnings[0]).toContain('alnus_acuminata');
      expect(result.sourceSlug).toBe('ulex_europaeus');
    });

    it('sin hits del RAG → null (degrade)', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([]);
      setupFetchMock({});

      const result = await enrichEntity({ crop: 'unobtanium', quantity: 1, location: '' });
      expect(result).toBeNull();
    });

    it('fetch del doc falla (404) → null', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([
        { species: 'fake_slug', score: 3.0, text: 'something' },
      ]);
      setupFetchMock({});  // map vacío → 404 para cualquier slug

      const result = await enrichEntity({ crop: 'fake', quantity: 1, location: '' });
      expect(result).toBeNull();
    });

    it('doc sin companions/biopreparados/warnings útiles → null', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([
        { species: 'minimal', score: 2.0, text: 'x' },
      ]);
      setupFetchMock({
        minimal: {
          species_slug: 'minimal',
          companions: [],
          antagonistas: [],
          biopreparados: [],
        },
      });

      const result = await enrichEntity({ crop: 'minimal', quantity: 1, location: '' });
      expect(result).toBeNull();
    });

    it('retrieve lanza error → null (no propaga)', async () => {
      vi.mocked(retrieve).mockRejectedValueOnce(new Error('corpus cold'));

      const result = await enrichEntity({ crop: 'fresa', quantity: 1, location: '' });
      expect(result).toBeNull();
    });

    it('entity inválida o crop vacío → null sin tocar retrieve', async () => {
      expect(await enrichEntity(null)).toBeNull();
      expect(await enrichEntity({})).toBeNull();
      expect(await enrichEntity(/** @type {any} */ ({ crop: '   ', quantity: 1 }))).toBeNull();
      expect(retrieve).not.toHaveBeenCalled();
    });
  });

  describe('enrichEntitiesWithRag', () => {
    it('procesa array completo y devuelve summary correcto', async () => {
      vi.mocked(retrieve)
        .mockResolvedValueOnce([{ species: 'fresa', score: 8.0 }])
        .mockResolvedValueOnce([{ species: 'ulex_europaeus', score: 5.0 }])
        .mockResolvedValueOnce([]);  // tercera entidad sin hit
      setupFetchMock({ fresa: FRESA_DOC, ulex_europaeus: RETAMO_DOC });

      const input = [
        { crop: 'fresa', quantity: 50, location: 'tunel' },
        { crop: 'retamo', quantity: 5, location: '' },
        { crop: 'desconocida', quantity: 2, location: '' },
      ];
      const { entities, summary } = await enrichEntitiesWithRag(input);

      expect(entities).toHaveLength(3);
      expect(entities[0]._ragInsights).not.toBeNull();
      expect(entities[0]._ragInsights.sourceSlug).toBe('fresa');
      expect(entities[1]._ragInsights.invasive).toBe(true);
      expect(entities[2]._ragInsights).toBeUndefined();  // no enriched

      expect(summary.enriched).toBe(2);
      expect(summary.total).toBe(3);
      expect(summary.slugs).toEqual(expect.arrayContaining(['fresa', 'ulex_europaeus']));
    });

    it('array vacío → summary zero, sin llamadas a retrieve', async () => {
      const { entities, summary } = await enrichEntitiesWithRag([]);
      expect(entities).toEqual([]);
      expect(summary).toEqual({ enriched: 0, total: 0, slugs: [] });
      expect(retrieve).not.toHaveBeenCalled();
    });

    it('input no-array → tratado como vacío', async () => {
      const { entities, summary } = await enrichEntitiesWithRag(null);
      expect(entities).toEqual([]);
      expect(summary.total).toBe(0);
    });

    it('preserva campos originales de cada entidad', async () => {
      vi.mocked(retrieve).mockResolvedValueOnce([{ species: 'fresa', score: 8.0 }]);
      setupFetchMock({ fresa: FRESA_DOC });

      const input = [{ crop: 'fresa', quantity: 50, location: 'tunel' }];
      const { entities } = await enrichEntitiesWithRag(input);

      expect(entities[0]).toMatchObject({
        crop: 'fresa',
        quantity: 50,
        location: 'tunel',
      });
      expect(entities[0]._ragInsights).toBeTruthy();
    });
  });
});
