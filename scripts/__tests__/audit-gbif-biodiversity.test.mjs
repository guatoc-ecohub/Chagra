/**
 * scripts/__tests__/audit-gbif-biodiversity.test.mjs
 *
 * Cobertura unitaria del auditor GBIF. Usa fetch mockeado y fixtures inline,
 * sin llamadas de red en CI.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  classifyMatch,
  parseArgs,
  runAudit,
} from '../audit-gbif-biodiversity.mjs';

const SAMPLE_SPECIES = {
  id: 'sample',
  nombre_comun: 'Muestra',
  nombre_cientifico: 'Sample plantus L.',
  familia_botanica: 'Fabaceae',
  category: 'medicinales_alelopaticas',
};

function makeCatalog(species = [SAMPLE_SPECIES]) {
  return { species };
}

function makeMatch(overrides = {}) {
  return {
    usageKey: 123,
    matchType: 'EXACT',
    confidence: 100,
    rank: 'SPECIES',
    status: 'ACCEPTED',
    kingdom: 'Plantae',
    family: 'Fabaceae',
    ...overrides,
  };
}

function makeResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(),
    async json() {
      return body;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseArgs', () => {
  it('reconoce --limit, --occurrences y --json', () => {
    expect(parseArgs(['--limit', '12', '--occurrences', '--json'])).toEqual({
      limit: 12,
      occurrences: true,
      json: true,
    });
  });

  it('reconoce --limit=60', () => {
    expect(parseArgs(['--limit=60'])).toEqual({
      limit: 60,
      occurrences: false,
      json: false,
    });
  });
});

describe('classifyMatch', () => {
  it('clasifica OK para exacto con alta confianza y reino/familia compatibles', () => {
    expect(classifyMatch(SAMPLE_SPECIES, makeMatch())).toBe('OK');
  });

  it('clasifica FUZZY cuando GBIF devuelve matchType FUZZY', () => {
    expect(classifyMatch(SAMPLE_SPECIES, makeMatch({ matchType: 'FUZZY', confidence: 74 }))).toBe('FUZZY');
  });

  it('clasifica NONE cuando GBIF no reconoce la especie', () => {
    expect(classifyMatch(SAMPLE_SPECIES, { matchType: 'NONE', confidence: 0, usageKey: null })).toBe('NONE');
  });

  it('clasifica KINGDOM_MISMATCH si el reino o la familia no cuadra', () => {
    expect(classifyMatch(SAMPLE_SPECIES, makeMatch({ family: 'Solanaceae' }))).toBe('KINGDOM_MISMATCH');
    expect(classifyMatch(SAMPLE_SPECIES, makeMatch({ kingdom: 'Fungi' }))).toBe('KINGDOM_MISMATCH');
  });
});

describe('runAudit', () => {
  it('genera reporte, escribe JSON y marca NO_CO_OCCURRENCES como bandera suave', async () => {
    const matchBody = makeMatch();

    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/species/match')) {
        return makeResponse(matchBody);
      }
      if (String(url).includes('/occurrence/search')) {
        return makeResponse({ count: 0 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const catalog = makeCatalog([
      SAMPLE_SPECIES,
      { ...SAMPLE_SPECIES, id: 'sample-2', nombre_cientifico: 'Another plantus L.' },
    ]);

    const report = await runAudit(
      { limit: 2, occurrences: true },
      { fetchImpl: fetchMock, catalog },
    );

    expect(report._meta.totals.audited).toBe(2);
    expect(report._meta.counts.OK).toBe(2);
    expect(report._meta.counts.NO_CO_OCCURRENCES).toBe(2);
    expect(report.entries[0].flags).toContain('NO_CO_OCCURRENCES');
    expect(readFileSync(join(process.cwd(), 'catalog/gbif-audit-report.json'), 'utf8')).toContain('"entries"');
  });
});
