import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../speciesResolver', () => ({
  resolveSpecies: vi.fn(),
}));

import { resolveSpecies } from '../speciesResolver';
import { loadCaseStudyDemos } from '../caseStudyDemoLoader';

/** @returns {typeof fetch} */
function makeFetchMock(manifest, cases) {
  return /** @type {typeof fetch} */ (/** @type {unknown} */ (vi.fn((url) => {
    if (url.endsWith('/manifest.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) });
    }
    const file = url.split('/').pop();
    const found = cases.find((c) => `${c.id}.json` === file);
    if (found) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(found) });
    }
    return Promise.resolve({ ok: false });
  })));
}

function makeStore() {
  let lastCalled = null;
  return {
    getState: () => ({
      hydrateDemoCases: (cases) => {
        lastCalled = cases;
        return cases.length;
      },
    }),
    _lastCalled: () => lastCalled,
  };
}

beforeEach(() => {
  vi.mocked(resolveSpecies).mockReset();
});

describe('loadCaseStudyDemos — wiring speciesResolver', () => {
  it('preserva species_ids resueltos (exact match)', async () => {
    vi.mocked(resolveSpecies).mockImplementation((id) =>
      /** @type {any} */ (Promise.resolve({ slug: id, match: 'exact', confidence: 1 }))
    );
    const manifest = { cases: ['case1.json'] };
    const cases = [
      { id: 'case1', subject: { species_ids: ['tomate_cherry', 'guanabana'] } },
    ];
    const store = makeStore();
    const r = await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    expect(r.attempted).toBe(1);
    const persisted = store._lastCalled();
    expect(persisted[0].subject.species_ids).toEqual(['tomate_cherry', 'guanabana']);
  });

  it('reemplaza por fuzzy slug cuando confidence ≥ 0.6', async () => {
    vi.mocked(resolveSpecies).mockImplementation((id) => {
      if (id === 'tomatico_extraño') {
        return Promise.resolve({ slug: 'solanum_lycopersicum_cherry', match: 'fuzzy', confidence: 0.8 });
      }
      return Promise.resolve(null);
    });
    const manifest = { cases: ['c.json'] };
    const cases = [{ id: 'c', subject: { species_ids: ['tomatico_extraño'] } }];
    const store = makeStore();
    await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    expect(store._lastCalled()[0].subject.species_ids).toEqual(['solanum_lycopersicum_cherry']);
  });

  it('dropea species sin match (skip silencioso) sin afectar el caso', async () => {
    vi.mocked(resolveSpecies).mockImplementation((id) => {
      if (id === 'valid') return Promise.resolve({ slug: 'valid', match: 'exact', confidence: 1 });
      return Promise.resolve(null);
    });
    const manifest = { cases: ['c.json'] };
    const cases = [{ id: 'c', subject: { species_ids: ['valid', 'inexistente'] } }];
    const store = makeStore();
    await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    const persisted = store._lastCalled();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].subject.species_ids).toEqual(['valid']);
  });

  it('dropea fuzzy con confidence < 0.6', async () => {
    vi.mocked(resolveSpecies).mockImplementation(() =>
      /** @type {any} */ (Promise.resolve({ slug: 'algo', match: 'fuzzy', confidence: 0.4 }))
    );
    const manifest = { cases: ['c.json'] };
    const cases = [{ id: 'c', subject: { species_ids: ['rasguñoso'] } }];
    const store = makeStore();
    await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    expect(store._lastCalled()[0].subject.species_ids).toEqual([]);
  });

  it('caso sin subject.species_ids pasa intacto', async () => {
    const manifest = { cases: ['c.json'] };
    const cases = [{ id: 'c', subject: {} }];
    const store = makeStore();
    const r = await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    expect(r.attempted).toBe(1);
  });

  it('si resolveSpecies throws, NO falla el caso (defensivo)', async () => {
    vi.mocked(resolveSpecies).mockImplementation(() => Promise.reject(new Error('boom')));
    const manifest = { cases: ['c.json'] };
    const cases = [{ id: 'c', subject: { species_ids: ['x'] } }];
    const store = makeStore();
    const r = await loadCaseStudyDemos(store, { fetchImpl: makeFetchMock(manifest, cases) });
    expect(r.attempted).toBe(1);
  });
});
