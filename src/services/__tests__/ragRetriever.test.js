/**
 * ragRetriever.test.js
 *
 * Cobertura del retrieve BM25 sobre el corpus `public/cycle-content/*.json`,
 * con foco en las secciones agregadas tras audit deep finding #9:
 *
 *   - `feeding_plan_text`  (### Plan de alimentación)
 *   - `companions_text`    (### Especies asociadas favorables)
 *   - `antagonists_text`   (### Antagonistas (no asociar))
 *
 * Mockea `fetch` para servir un mini-corpus en memoria (manifest + 2 docs)
 * y verifica que las queries del usuario rankean los passages correctos.
 *
 * No corre tests que requieran red ni el catálogo real — ese loop full ya
 * lo cubre el ETL + validator (`scripts/build-cycle-content-from-catalog.mjs`
 * + `scripts/validate-cycle-content.mjs`).
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Importamos lazy para poder resetear el module cache entre tests (el
// `corpusCache` interno es module-level).
async function importFresh() {
  vi.resetModules();
  return await import('../ragRetriever.js');
}

const FRESA_DOC = {
  species_slug: 'fragaria_ananassa_monterrey',
  scientific_name: 'Fragaria × ananassa cv. Monterrey',
  common_names: ['Fresa Monterrey'],
  family: 'Rosaceae',
  category: 'frutales_perennes',
  cultivable: true,
  thermal_zones: ['frio', 'templado'],
  roles_in_guild: ['crop', 'ground_cover'],
  companions: ['lupinus_mutabilis', 'trifolium_repens'],
  antagonists: ['brassica_oleracea_italica'],
  valor_pedagogico:
    'La fresa Monterrey es una rosácea perenne híbrida productiva (day-neutral) muy adoptada en cultivos comerciales colombianos. Manejo: cama elevada con MO abundante, mulch plástico o paja, fertilización con biol foliar y bocashi al fondo.',
  feeding_plan_text:
    '### Plan de alimentación\n- Fuente: Agrosavia - Manual Fresa\n- D+0: compost, bocashi, dosis 500 ml — Establecimiento\n- D+30: biofertilizer, biol, dosis 250 ml — Crecimiento vegetativo\n- D+60: biofertilizer, purin_ortiga, dosis 250 ml — Floración',
  companions_text:
    '### Especies asociadas favorables (companions)\n- lupinus_mutabilis — Chocho / Tarwi (Lupinus mutabilis Sweet)\n- trifolium_repens — Trébol blanco (Trifolium repens L.)',
  antagonists_text:
    '### Antagonistas (no asociar)\n- brassica_oleracea_italica — Brócoli (Brassica oleracea var. italica)',
  _generated_by: 'scripts/build-cycle-content-from-catalog.mjs',
};

const ALNUS_DOC = {
  species_slug: 'alnus_acuminata',
  scientific_name: 'Alnus acuminata Kunth',
  common_names: ['Aliso andino'],
  family: 'Betulaceae',
  category: 'abonos_verdes_coberturas',
  thermal_zones: ['frio'],
  roles_in_guild: ['nitrogen_fixer', 'living_fence', 'windbreak'],
  companions: ['coffea_arabica', 'erythrina_edulis'],
  antagonists: [],
  valor_pedagogico:
    'El aliso andino (Alnus acuminata Kunth) es una betulácea árbol nativo de los Andes con capacidad fijadora de nitrógeno mediante simbiosis con Frankia. Asocio con café y chachafruto en sistemas agroforestales.',
  companions_text:
    '### Especies asociadas favorables (companions)\n- coffea_arabica — Café (Coffea arabica L.)\n- erythrina_edulis — Chachafruto (Erythrina edulis Triana ex Micheli)',
  _generated_by: 'scripts/build-cycle-content-from-catalog.mjs',
};

const CORPUS = {
  manifest: {
    generated_at: '2026-05-18T00:00:00.000Z',
    slugs: ['fragaria_ananassa_monterrey', 'alnus_acuminata'],
  },
  fragaria_ananassa_monterrey: FRESA_DOC,
  alnus_acuminata: ALNUS_DOC,
};

function makeFetchMock() {
  return vi.fn(async (url) => {
    if (typeof url !== 'string') {
      return { ok: false, headers: { get: () => '' }, json: async () => ({}) };
    }
    const jsonHeaders = { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : '') };

    if (url.endsWith('/cycle-content/manifest.json')) {
      return { ok: true, headers: jsonHeaders, json: async () => CORPUS.manifest };
    }
    const m = url.match(/\/cycle-content\/([^/]+)\.json$/);
    if (m && CORPUS[m[1]]) {
      return { ok: true, headers: jsonHeaders, json: async () => CORPUS[m[1]] };
    }
    return { ok: false, headers: { get: () => '' }, json: async () => ({}) };
  });
}

describe('ragRetriever — corpus con feeding_plan + companions + antagonists', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchMock());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('retrieve("plan alimentación fresa") devuelve el passage feeding_plan_text', async () => {
    const { retrieve } = await importFresh();
    const results = await retrieve('plan alimentacion fresa bocashi', 5);

    expect(results.length).toBeGreaterThan(0);
    // El top-1 debe ser el feeding_plan_text de la fresa (es donde mejor
    // matchean los términos "plan", "alimentación", "bocashi").
    const top = results[0];
    expect(top.species).toBe('fragaria_ananassa_monterrey');
    expect(top.text).toContain('### Plan de alimentación');
    expect(top.text).toContain('D+0');
    expect(top.text).toContain('bocashi');
  });

  test('retrieve("companions fresa chocho") devuelve passage companions_text', async () => {
    const { retrieve } = await importFresh();
    const results = await retrieve('companions fresa chocho tarwi', 5);

    expect(results.length).toBeGreaterThan(0);
    const fresaCompanions = results.find(
      (r) => r.species === 'fragaria_ananassa_monterrey' && r.text.includes('### Especies asociadas favorables')
    );
    expect(fresaCompanions).toBeDefined();
    expect(fresaCompanions.text).toContain('lupinus_mutabilis');
    expect(fresaCompanions.text).toContain('trifolium_repens');
  });

  test('retrieve("antagonistas fresa brocoli") devuelve passage antagonists_text', async () => {
    const { retrieve } = await importFresh();
    const results = await retrieve('antagonistas fresa brocoli no asociar', 5);

    expect(results.length).toBeGreaterThan(0);
    const fresaAnt = results.find(
      (r) => r.species === 'fragaria_ananassa_monterrey' && r.text.includes('### Antagonistas')
    );
    expect(fresaAnt).toBeDefined();
    expect(fresaAnt.text).toContain('brassica_oleracea_italica');
  });

  test('species sin antagonistas no genera ruido (alnus tiene antagonists=[])', async () => {
    const { retrieve } = await importFresh();
    const results = await retrieve('antagonistas aliso', 5);

    // No debe haber un passage `### Antagonistas` para alnus, ya que el
    // ETL omite la sección cuando antagonists está vacío.
    const alnusAnt = results.find(
      (r) => r.species === 'alnus_acuminata' && r.text.includes('### Antagonistas')
    );
    expect(alnusAnt).toBeUndefined();
  });

  test('retrieve cae a [] cuando manifest no devuelve content-type json', async () => {
    // Re-stub con un fetch que sirve manifest HTML (caso 404 fallback SPA).
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => 'text/html' },
        json: async () => ({}),
      }))
    );
    const { retrieve } = await importFresh();
    const results = await retrieve('cualquier query', 3);
    // Sin corpus → array vacío (loader iteró fallback CROP_TAXONOMY pero
    // todos los fetches fallaron también, así que docs queda [].)
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});
