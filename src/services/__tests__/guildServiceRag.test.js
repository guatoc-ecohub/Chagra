/**
 * guildServiceRag.test.js — Tests para las funciones RAG-based del L1.9.
 *
 * Cubre `suggestGuildsFor` y `suggestPolyculture` mockando:
 *   - `ragRetriever.retrieve`: devuelve hits sintéticos sin tocar el corpus real.
 *   - `fetch`: devuelve JSONs cycle-content sintéticos sin tocar la red.
 *
 * El motor curado (`getSuggestedCompanions`) tiene sus propios tests en
 * `guildService.test.js`. Acá solo blindamos el path RAG y el fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

import { retrieve } from '../ragRetriever';
import {
  suggestGuildsFor,
  suggestPolyculture,
  parseCompanionsMarkdown,
  _resetGuildCache,
} from '../guildService.js';

// Fixtures: cycle-content JSONs sintéticos con la forma real del corpus.
const FIXTURES = {
  coffea_arabica: {
    species_slug: 'coffea_arabica',
    scientific_name: 'Coffea arabica L.',
    common_names: ['Café arábica'],
    family: 'Rubiaceae',
    roles_in_guild: ['crop', 'understory'],
    antagonists: ['foeniculum_vulgare'],
    companions_markdown:
      '### Especies asociadas favorables\n\n' +
      'Estas especies favorecen el cultivo cuando se siembran cerca:\n' +
      '- alnus_acuminata — Aliso andino (Alnus acuminata)\n' +
      '- erythrina_edulis — Chachafruto (Erythrina edulis)\n',
    antagonists_markdown:
      '### Antagonistas (no asociar)\n\n' +
      '- foeniculum_vulgare — Hinojo (Foeniculum vulgare Mill.)\n',
    requirements: { radiacion: 'sombra_parcial' },
  },
  alnus_acuminata: {
    species_slug: 'alnus_acuminata',
    scientific_name: 'Alnus acuminata Kunth',
    common_names: ['Aliso andino'],
    roles_in_guild: ['canopy', 'nitrogen_fixer'],
    antagonists: [],
    companions_markdown: '',
  },
  erythrina_edulis: {
    species_slug: 'erythrina_edulis',
    common_names: ['Chachafruto'],
    roles_in_guild: ['shrub', 'nitrogen_fixer'],
    antagonists: [],
  },
  foeniculum_vulgare: {
    species_slug: 'foeniculum_vulgare',
    common_names: ['Hinojo'],
    roles_in_guild: ['herb'],
  },
  zea_mays: {
    species_slug: 'zea_mays',
    common_names: ['Maíz'],
    roles_in_guild: ['crop'],
    companions_markdown:
      '- phaseolus_vulgaris — Frijol (Phaseolus vulgaris)\n' +
      '- cucurbita_maxima — Calabaza (Cucurbita maxima)\n',
    antagonists: [],
  },
  phaseolus_vulgaris: {
    species_slug: 'phaseolus_vulgaris',
    common_names: ['Frijol'],
    roles_in_guild: ['groundcover', 'nitrogen_fixer'],
    companions_markdown:
      '- zea_mays — Maíz (Zea mays)\n' +
      '- cucurbita_maxima — Calabaza (Cucurbita maxima)\n',
    antagonists: ['allium_sativum'],
  },
  cucurbita_maxima: {
    species_slug: 'cucurbita_maxima',
    common_names: ['Calabaza'],
    roles_in_guild: ['groundcover'],
    companions_markdown:
      '- zea_mays — Maíz (Zea mays)\n' +
      '- phaseolus_vulgaris — Frijol (Phaseolus vulgaris)\n',
    antagonists: [],
  },
};

function installFetchMock() {
  globalThis.fetch = vi.fn(async (url) => {
    const match = String(url).match(/cycle-content\/([a-z_]+)\.json/);
    const slug = match?.[1];
    if (!slug || !FIXTURES[slug]) {
      return new Response(null, { status: 404 });
    }
    return new Response(JSON.stringify(FIXTURES[slug]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
}

beforeEach(() => {
  _resetGuildCache();
  vi.mocked(retrieve).mockReset();
  installFetchMock();
});

afterEach(() => {
  delete globalThis.fetch;
});

describe('parseCompanionsMarkdown', () => {
  it('extrae slug + name de un bloque well-formed', () => {
    const md =
      '### Especies asociadas favorables\n\n' +
      '- alnus_acuminata — Aliso andino (Alnus acuminata)\n' +
      '- erythrina_edulis — Chachafruto (Erythrina edulis)\n';
    const out = parseCompanionsMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ slug: 'alnus_acuminata', name: 'Aliso andino (Alnus acuminata)' });
    expect(out[1].slug).toBe('erythrina_edulis');
  });

  it('tolera guión simple (-) además del em-dash (—)', () => {
    const md = '- zea_mays - Maíz\n';
    const out = parseCompanionsMarkdown(md);
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('zea_mays');
  });

  it('descarta tokens sin underscore (probablemente no son slugs)', () => {
    const md = '- foo — algún texto\n- valid_slug — Nombre\n';
    const out = parseCompanionsMarkdown(md);
    expect(out.map((c) => c.slug)).toEqual(['valid_slug']);
  });

  it('devuelve [] ante input vacío o no-string', () => {
    expect(parseCompanionsMarkdown(null)).toEqual([]);
    expect(parseCompanionsMarkdown(undefined)).toEqual([]);
    expect(parseCompanionsMarkdown('')).toEqual([]);
    expect(parseCompanionsMarkdown(42)).toEqual([]);
  });
});

describe('suggestGuildsFor (RAG-based)', () => {
  it('devuelve forma { companions, antagonists, strata } con datos del corpus', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { species: 'coffea_arabica', score: 5, text: 'café' },
      { species: 'alnus_acuminata', score: 2, text: 'aliso' },
    ]);

    const result = await suggestGuildsFor('coffea_arabica');

    expect(result).toHaveProperty('companions');
    expect(result).toHaveProperty('antagonists');
    expect(result).toHaveProperty('strata');

    const compSlugs = result.companions.map((c) => c.slug);
    expect(compSlugs).toContain('alnus_acuminata');
    expect(compSlugs).toContain('erythrina_edulis');

    const antSlugs = result.antagonists.map((a) => a.slug);
    expect(antSlugs).toContain('foeniculum_vulgare');
  });

  it('cada companion trae slug + name + reason', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([{ species: 'coffea_arabica', score: 5, text: 't' }]);
    const result = await suggestGuildsFor('coffea_arabica');
    for (const c of result.companions) {
      expect(c.slug).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.reason).toBeTruthy();
    }
  });

  it('strata incluye al target y a los candidatos (cuando hay roles inferibles)', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { species: 'coffea_arabica', score: 5, text: 't' },
      { species: 'alnus_acuminata', score: 2, text: 'a' },
    ]);
    const result = await suggestGuildsFor('coffea_arabica');
    const strataMap = new Map(result.strata.map((s) => [s.species, s.layer]));
    expect(strataMap.has('alnus_acuminata')).toBe(true);
    expect(strataMap.get('alnus_acuminata')).toBe('alto'); // canopy → alto
  });

  it('dedup: un mismo companion no aparece dos veces aunque venga en hits y markdown', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([
      { species: 'coffea_arabica', score: 5, text: 't' },
      { species: 'alnus_acuminata', score: 3, text: 'a' },
      { species: 'alnus_acuminata', score: 2, text: 'b' },
    ]);
    const result = await suggestGuildsFor('coffea_arabica');
    const alnusEntries = result.companions.filter((c) => c.slug === 'alnus_acuminata');
    expect(alnusEntries).toHaveLength(1);
  });

  it('input inválido devuelve listas vacías', async () => {
    const empty = { companions: [], antagonists: [], strata: [] };
    expect(await suggestGuildsFor('')).toEqual(empty);
    expect(await suggestGuildsFor(null)).toEqual(empty);
    expect(await suggestGuildsFor(undefined)).toEqual(empty);
    expect(await suggestGuildsFor(/** @type {any} */ (42))).toEqual(empty);
  });

  it('si retrieve falla, hace fallback al curado en lugar de tirar la UI', async () => {
    vi.mocked(retrieve).mockRejectedValueOnce(new Error('corpus offline'));
    // coffea_arabica está en speciesDefaults (capa 1: zea_mays, phaseolus_vulgaris, psidium_guajava)
    // No tendremos cycle-content tampoco (fetch sintético solo aplica si invocan).
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const result = await suggestGuildsFor('coffea_arabica');
    // El curado debe poblar algo: si está vacío, el fallback no enganchó.
    expect(result.companions.length).toBeGreaterThan(0);
  });

  it('si el corpus no cubre la species ni hay defaults, devuelve listas vacías (no truena)', async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([]);
    const result = await suggestGuildsFor('especie_inexistente_xyz');
    expect(result.companions).toEqual([]);
    expect(result.antagonists).toEqual([]);
  });
});

describe('suggestPolyculture (cross-reference)', () => {
  it('sugiere companions cruzados de un set: milpa zea+frijol+calabaza', async () => {
    // Cada llamada interna a suggestGuildsFor hace su propio retrieve.
    vi.mocked(retrieve)
      .mockResolvedValueOnce([{ species: 'zea_mays', score: 5, text: 't' }])
      .mockResolvedValueOnce([{ species: 'phaseolus_vulgaris', score: 5, text: 't' }])
      .mockResolvedValueOnce([{ species: 'cucurbita_maxima', score: 5, text: 't' }]);

    const result = await suggestPolyculture(['zea_mays']);
    const slugs = result.companions.map((c) => c.slug);
    expect(slugs).toContain('phaseolus_vulgaris');
    expect(slugs).toContain('cucurbita_maxima');
  });

  it('excluye las species ya plantadas', async () => {
    vi.mocked(retrieve)
      .mockResolvedValueOnce([{ species: 'zea_mays', score: 5, text: 't' }])
      .mockResolvedValueOnce([{ species: 'phaseolus_vulgaris', score: 5, text: 't' }]);
    const result = await suggestPolyculture(['zea_mays', 'phaseolus_vulgaris']);
    const slugs = result.companions.map((c) => c.slug);
    expect(slugs).not.toContain('zea_mays');
    expect(slugs).not.toContain('phaseolus_vulgaris');
    // Pero cucurbita debería seguir apareciendo (es companion de ambos).
    expect(slugs).toContain('cucurbita_maxima');
  });

  it('species sugerida por múltiples cultivos pesa más (votes > 1)', async () => {
    vi.mocked(retrieve)
      .mockResolvedValueOnce([{ species: 'zea_mays', score: 5, text: 't' }])
      .mockResolvedValueOnce([{ species: 'phaseolus_vulgaris', score: 5, text: 't' }]);
    const result = await suggestPolyculture(['zea_mays', 'phaseolus_vulgaris']);
    const cucurbita = result.companions.find((c) => c.slug === 'cucurbita_maxima');
    expect(cucurbita).toBeTruthy();
    expect(cucurbita.votes).toBe(2);
    expect(cucurbita.reason).toMatch(/2 cultivos/);
  });

  it('veta companions que son antagonista de alguno (allium_sativum vs phaseolus)', async () => {
    // phaseolus_vulgaris fixture marca allium_sativum como antagonista.
    // Si por error otro cultivo lo sugiriera, debe quedar vetado.
    FIXTURES.solanum_lycopersicum = {
      species_slug: 'solanum_lycopersicum',
      common_names: ['Tomate'],
      roles_in_guild: ['crop'],
      companions_markdown: '- allium_sativum — Ajo (Allium sativum)\n',
      antagonists: [],
    };
    FIXTURES.allium_sativum = {
      species_slug: 'allium_sativum',
      common_names: ['Ajo'],
      roles_in_guild: ['herb'],
    };

    vi.mocked(retrieve)
      .mockResolvedValueOnce([{ species: 'phaseolus_vulgaris', score: 5, text: 't' }])
      .mockResolvedValueOnce([{ species: 'solanum_lycopersicum', score: 5, text: 't' }]);

    const result = await suggestPolyculture(['phaseolus_vulgaris', 'solanum_lycopersicum']);
    const slugs = result.companions.map((c) => c.slug);
    expect(slugs).not.toContain('allium_sativum');

    delete FIXTURES.solanum_lycopersicum;
    delete FIXTURES.allium_sativum;
  });

  it('input inválido devuelve vacío', async () => {
    const empty = { companions: [], antagonists: [], strata: [] };
    expect(await suggestPolyculture([])).toEqual(empty);
    expect(await suggestPolyculture(null)).toEqual(empty);
    expect(await suggestPolyculture(/** @type {any} */ ('zea_mays'))).toEqual(empty);
  });

  it('top-8 cap: nunca devuelve más de 8 companions aunque haya muchos votos', async () => {
    // Inyectamos un fixture grande con muchísimos companions
    const bigCompanions = Array.from({ length: 20 }, (_, i) => `species_x${i}`);
    FIXTURES.test_big = {
      species_slug: 'test_big',
      companions_markdown: bigCompanions.map((s) => `- ${s} — Sp ${s}`).join('\n'),
      antagonists: [],
      roles_in_guild: ['crop'],
    };
    vi.mocked(retrieve).mockResolvedValueOnce([{ species: 'test_big', score: 5, text: 't' }]);

    const result = await suggestPolyculture(['test_big']);
    expect(result.companions.length).toBeLessThanOrEqual(8);

    delete FIXTURES.test_big;
  });
});
