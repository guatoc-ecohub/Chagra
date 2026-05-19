/**
 * ragRetriever.test.js — cobertura del corpus RAG extendido (audit
 * deep finding #9, 2026-05-18).
 *
 * Verifica que `retrieve()` recupera passages estructurados nuevos:
 *   - `feeding_plan_markdown` (### Plan de alimentación)
 *   - `companions_markdown` (### Especies asociadas favorables)
 *   - `antagonists_markdown` (### Antagonistas)
 *
 * Estrategia:
 *   - Mock de fetch para servir un manifest.json mínimo + cycle-content
 *     docs sintéticos (sin tocar disco). Los docs incluyen los tres
 *     campos markdown nuevos para confirmar que flattenDoc los expone
 *     como passages indexables por BM25.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MANIFEST = {
  generated_at: '2026-05-18T00:00:00Z',
  slugs: ['fragaria_test', 'coffea_test', 'lechuga_test'],
};

const FRAGARIA_DOC = {
  species_slug: 'fragaria_test',
  scientific_name: 'Fragaria × ananassa Test',
  common_names: ['fresa test'],
  family: 'Rosaceae',
  category: 'frutales_perennes',
  valor_pedagogico:
    'La fresa es una rosácea perenne con propagación por estolones. Requiere mulch para proteger el fruto del contacto con el suelo. Cultivada en clima frío entre 1800 y 2800 msnm en Cundinamarca y Boyacá.',
  feeding_plan_markdown:
    '### Plan de alimentación\n\nFuente: Agrosavia Manual de biopreparados 2015.\n\n- D+0: Aplicar bocashi al hoyo de trasplante · bocashi · 200 g — establece microbiota inicial.\n- D+15: Drench con humus líquido · humus_liquido · 250 ml — mitiga estrés post-trasplante.',
};

const COFFEA_DOC = {
  species_slug: 'coffea_test',
  scientific_name: 'Coffea arabica Test',
  common_names: ['café test'],
  family: 'Rubiaceae',
  category: 'medicinales_alelopaticas',
  valor_pedagogico:
    'El café arábica es el cultivo emblemático colombiano. Requiere sombra parcial y altitud entre 1200 y 2000 msnm. Variedades Caturra, Castillo y Cenicafé 1 son resistentes a roya.',
  companions_markdown:
    '### Especies asociadas favorables\n\nEstas especies favorecen el cultivo cuando se siembran cerca:\n- alnus_acuminata — Aliso andino (Alnus acuminata)\n- erythrina_edulis — Chachafruto (Erythrina edulis)',
  antagonists_markdown:
    '### Antagonistas (no asociar)\n\nEvite sembrar estas especies cerca:\n- foeniculum_vulgare — Hinojo (Foeniculum vulgare)',
};

const LECHUGA_DOC = {
  species_slug: 'lechuga_test',
  scientific_name: 'Lactuca sativa Test',
  common_names: ['lechuga test'],
  family: 'Asteraceae',
  category: 'hortalizas_hoja',
  valor_pedagogico:
    'La lechuga es una hortaliza de hoja de ciclo corto 60-75 días en clima frío. Requiere suelos sueltos ricos en materia orgánica. Hierve en el calor lo cual induce bolting prematuro.',
};

function setupFetchMock() {
  globalThis.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(MANIFEST),
      });
    }
    const match = u.match(/\/cycle-content\/([^.]+)\.json/);
    if (match) {
      const slug = match[1];
      const map = {
        fragaria_test: FRAGARIA_DOC,
        coffea_test: COFFEA_DOC,
        lechuga_test: LECHUGA_DOC,
      };
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
    }
    return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
  });
}

describe('ragRetriever — corpus extendido v2', () => {
  beforeEach(() => {
    vi.resetModules();
    setupFetchMock();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('retrieve("plan alimentación fresa") devuelve passage con "### Plan de alimentación"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('plan alimentación fresa bocashi humus', 5);
    expect(hits.length).toBeGreaterThan(0);
    const planHit = hits.find(
      (h) => h.species === 'fragaria_test' && h.text.includes('### Plan de alimentación'),
    );
    expect(planHit).toBeDefined();
    expect(planHit.text).toContain('bocashi');
    expect(planHit.key).toContain('feeding_plan_markdown');
  });

  it('retrieve("companions café arabica") devuelve passage con "### Especies asociadas favorables"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('asociadas favorables café alnus erythrina', 5);
    expect(hits.length).toBeGreaterThan(0);
    const companionsHit = hits.find(
      (h) => h.species === 'coffea_test' && h.text.includes('### Especies asociadas favorables'),
    );
    expect(companionsHit).toBeDefined();
    expect(companionsHit.text).toContain('alnus_acuminata');
    expect(companionsHit.key).toContain('companions_markdown');
  });

  it('retrieve para antagonistas café devuelve passage con "### Antagonistas"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('antagonistas café hinojo foeniculum no asociar', 5);
    const antagonistsHit = hits.find(
      (h) => h.species === 'coffea_test' && h.text.includes('### Antagonistas'),
    );
    expect(antagonistsHit).toBeDefined();
    expect(antagonistsHit.text).toContain('foeniculum_vulgare');
    expect(antagonistsHit.key).toContain('antagonists_markdown');
  });

  it('docs sin secciones extendidas no rompen el retrieve', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('lechuga hortaliza bolting clima frío', 5);
    expect(hits.length).toBeGreaterThan(0);
    const lechugaHit = hits.find((h) => h.species === 'lechuga_test');
    expect(lechugaHit).toBeDefined();
    // Lechuga no tiene feeding_plan_markdown/companions/antagonists.
    const lechugaPassages = hits.filter((h) => h.species === 'lechuga_test');
    lechugaPassages.forEach((p) => {
      expect(p.key).not.toContain('feeding_plan_markdown');
      expect(p.key).not.toContain('companions_markdown');
      expect(p.key).not.toContain('antagonists_markdown');
    });
  });
});
