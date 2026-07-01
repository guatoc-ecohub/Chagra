/**
 * scripts/__tests__/scrape-gbif-vernacular.test.mjs
 *
 * Smoke test for GBIF vernacular scraper. Mocks fetch to verify
 * response parsing, filtering (spa/CO), and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUsageKey, getAllVernacularPages } from '../scrape-gbif-vernacular.mjs';

const GBIF_BASE = 'https://api.gbif.org/v1/species';

function mockFetch(responseMap) {
  globalThis.fetch = vi.fn((url) => {
    const entry = responseMap[url];
    if (!entry) {
      return Promise.reject(new Error(`No mock for ${url}`));
    }
    return Promise.resolve({
      ok: entry.ok !== false,
      status: entry.status ?? 200,
      json: () => Promise.resolve(entry.json),
    });
  });
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getUsageKey', () => {
  it('returns usageKey for exact match with high confidence', async () => {
    mockFetch({
      [`${GBIF_BASE}/match?name=Allium%20cepa%20L.`]: {
        json: {
          usageKey: 2857697,
          scientificName: 'Allium cepa L.',
          status: 'ACCEPTED',
          confidence: 100,
          matchType: 'EXACT',
        },
      },
    });
    await expect(getUsageKey('Allium cepa L.')).resolves.toBe(2857697);
  });

  it('returns null for low confidence match', async () => {
    mockFetch({
      [`${GBIF_BASE}/match?name=Foo%20bar`]: {
        json: {
          usageKey: 123,
          status: 'ACCEPTED',
          confidence: 50,
          matchType: 'FUZZY',
        },
      },
    });
    await expect(getUsageKey('Foo bar')).resolves.toBeNull();
  });

  it('returns null for non-ACCEPTED status', async () => {
    mockFetch({
      [`${GBIF_BASE}/match?name=Synonymus%20sp`]: {
        json: {
          usageKey: 456,
          status: 'SYNONYM',
          confidence: 100,
          matchType: 'EXACT',
        },
      },
    });
    await expect(getUsageKey('Synonymus sp')).resolves.toBeNull();
  });

  it('falls back to alternatives if main match is not ACCEPTED', async () => {
    mockFetch({
      [`${GBIF_BASE}/match?name=Beta%20vulgaris`]: {
        json: {
          usageKey: 789,
          status: 'SYNONYM',
          confidence: 100,
          alternatives: [
            { usageKey: 101, scientificName: 'Beta vulgaris L.', status: 'ACCEPTED' },
            { usageKey: 102, scientificName: 'Beta vulgaris subsp. vulgaris', status: 'SYNONYM' },
          ],
        },
      },
    });
    await expect(getUsageKey('Beta vulgaris')).resolves.toBe(101);
  });

  it('throws on HTTP error', async () => {
    mockFetch({
      [`${GBIF_BASE}/match?name=Error`]: {
        ok: false,
        status: 429,
        json: {},
      },
    });
    await expect(getUsageKey('Error')).rejects.toThrow('GBIF 429');
  });
});

describe('getAllVernacularPages', () => {
  it('filters spanish names', async () => {
    mockFetch({
      [`${GBIF_BASE}/2857697/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          limit: 100,
          endOfRecords: true,
          results: [
            { vernacularName: 'Cebolla', language: 'spa', source: 'COL' },
            { vernacularName: 'Onion', language: 'eng', source: 'GB' },
            { vernacularName: 'Oignon', language: 'fra', source: 'FR' },
            { vernacularName: 'Cebolla cabezona', language: 'spa', source: 'COL' },
            { vernacularName: 'Bawang', language: 'ind', source: 'ID' },
          ],
        },
      },
    });
    const names = await getAllVernacularPages(2857697);
    expect(names).toEqual(['Cebolla', 'Cebolla cabezona']);
  });

  it('includes names with country=CO regardless of language', async () => {
    mockFetch({
      [`${GBIF_BASE}/123/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          endOfRecords: true,
          results: [
            { vernacularName: 'Nombre local', language: '', country: 'CO' },
            { vernacularName: 'Cebolla', language: 'spa', country: 'CO' },
            { vernacularName: 'Some name', language: 'eng', country: 'US' },
          ],
        },
      },
    });
    const names = await getAllVernacularPages(123);
    expect(names).toEqual(['Cebolla', 'Nombre local']);
  });

  it('deduplicates repeated names across pages', async () => {
    mockFetch({
      [`${GBIF_BASE}/456/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          endOfRecords: false,
          results: [
            { vernacularName: 'Cebolla', language: 'spa' },
            { vernacularName: 'Cebolla cabezona', language: 'spa' },
          ],
        },
      },
      [`${GBIF_BASE}/456/vernacularNames?offset=100&limit=100`]: {
        json: {
          offset: 100,
          endOfRecords: true,
          results: [
            { vernacularName: 'Cebolla', language: 'spa' },
            { vernacularName: 'Cebolla morada', language: 'spa' },
          ],
        },
      },
    });
    const names = await getAllVernacularPages(456);
    expect(names).toEqual(['Cebolla', 'Cebolla cabezona', 'Cebolla morada']);
  });

  it('handles empty results gracefully', async () => {
    mockFetch({
      [`${GBIF_BASE}/0/vernacularNames?offset=0&limit=100`]: {
        json: { offset: 0, endOfRecords: true, results: [] },
      },
    });
    await expect(getAllVernacularPages(0)).resolves.toEqual([]);
  });

  it('handles HTTP error on a page by returning already collected names', async () => {
    mockFetch({
      [`${GBIF_BASE}/789/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          endOfRecords: false,
          results: [
            { vernacularName: 'Cebolla', language: 'spa' },
          ],
        },
      },
      [`${GBIF_BASE}/789/vernacularNames?offset=100&limit=100`]: {
        ok: false,
        status: 500,
        json: {},
      },
    });
    const names = await getAllVernacularPages(789);
    expect(names).toEqual(['Cebolla']);
  });
});

describe('integration: GBIF response shape matches expected contract', () => {
  it('filters out empty vernacularName', async () => {
    mockFetch({
      [`${GBIF_BASE}/111/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          endOfRecords: true,
          results: [
            { vernacularName: '', language: 'spa' },
            { vernacularName: null, language: 'spa' },
            { vernacularName: undefined, language: 'spa' },
            { vernacularName: 'Cebolla válida', language: 'spa' },
          ],
        },
      },
    });
    const names = await getAllVernacularPages(111);
    expect(names).toEqual(['Cebolla válida']);
  });

  it('handles no matching filter criteria', async () => {
    mockFetch({
      [`${GBIF_BASE}/222/vernacularNames?offset=0&limit=100`]: {
        json: {
          offset: 0,
          endOfRecords: true,
          results: [
            { vernacularName: 'Onion', language: 'eng' },
            { vernacularName: 'Zwiebel', language: 'deu' },
          ],
        },
      },
    });
    const names = await getAllVernacularPages(222);
    expect(names).toEqual([]);
  });
});
