/**
 * scripts/__tests__/scrape-biodiversidad-vernacular.test.mjs
 *
 * Smoke test del scraper de biodiversidad.co. Mockea fetch y verifica el parseo
 * de la respuesta real de la API, el matching por binomio, el filtrado de
 * nombres comunes (solo "Español", sin ruido) y el manejo de no-match (HTTP 406).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBinomial,
  normalizeSci,
  pickBestMatch,
  recordCanonical,
  extractSpanishCommonNames,
  extractColombianDepartments,
  isPlausibleCommonName,
  searchSpecies,
  fetchCompleteRecord,
} from '../scrape-biodiversidad-vernacular.mjs';

const API_BASE = 'https://api.catalogo.biodiversidad.co';

function mockFetch(responseMap) {
  globalThis.fetch = vi.fn((url) => {
    const entry = responseMap[url];
    if (!entry) {
      return Promise.reject(new Error(`No mock for ${url}`));
    }
    return Promise.resolve({
      ok: entry.ok ?? (entry.status ? entry.status < 400 : true),
      status: entry.status ?? 200,
      json: () => Promise.resolve(entry.json),
    });
  });
}

// Registro con la forma real que devuelve /record_search/search.
function record({ canonical, sci, common = [], id = 'aaaaaaaaaaaa' }) {
  return {
    _id: id,
    scientificNameSimple: sci ?? canonical,
    taxonRecordNameApprovedInUse: {
      taxonRecordName: {
        scientificName: { canonicalName: { simple: canonical } },
      },
    },
    commonNames: common,
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildBinomial', () => {
  it('extrae binomio de un nombre limpio con autor', () => {
    expect(buildBinomial('Solanum tuberosum L.')).toBe('Solanum tuberosum');
    expect(buildBinomial('Eugenia stipitata McVaugh')).toBe('Eugenia stipitata');
  });

  it('descarta rango infraespecífico y autor (variedad)', () => {
    expect(buildBinomial('Beta vulgaris var. cicla L.')).toBe('Beta vulgaris');
  });

  it('descarta comillas de cultivar', () => {
    expect(buildBinomial("Brassica oleracea var. acephala 'Curly'")).toBe('Brassica oleracea');
  });

  it('devuelve null si no hay binomio', () => {
    expect(buildBinomial('Solanum')).toBeNull();
    expect(buildBinomial('')).toBeNull();
    expect(buildBinomial(null)).toBeNull();
  });
});

describe('normalizeSci', () => {
  it('minúsculas, sin diacríticos, sin rangos', () => {
    expect(normalizeSci('Beta vulgaris var. cicla')).toBe('beta vulgaris cicla');
    expect(normalizeSci('Physalis peruviana L.')).toBe('physalis peruviana l');
  });
});

describe('recordCanonical', () => {
  it('prefiere canonicalName.simple', () => {
    expect(recordCanonical(record({ canonical: 'Solanum tuberosum', sci: 'Solanum tuberosum L.' }))).toBe(
      'Solanum tuberosum',
    );
  });

  it('cae a scientificNameSimple si no hay canónico', () => {
    expect(recordCanonical({ scientificNameSimple: 'Persea americana Mill.' })).toBe('Persea americana Mill.');
  });
});

describe('pickBestMatch', () => {
  it('elige el registro cuyo binomio coincide exactamente', () => {
    const results = [
      record({ canonical: 'Solanum tuberosum subsp. andigenum', id: 'sub1' }),
      record({ canonical: 'Solanum tuberosum', id: 'exact1' }),
    ];
    const m = pickBestMatch(results, 'Solanum tuberosum');
    expect(m).not.toBeNull();
    expect(m.matchedName).toBe('Solanum tuberosum subsp. andigenum'); // primer binomio-coincidente
    expect(m.recordId).toBe('sub1');
  });

  it('rechaza resultados de otro género (no inventa)', () => {
    const results = [record({ canonical: 'Solanum lycopersicum' }), record({ canonical: 'Capsicum annuum' })];
    expect(pickBestMatch(results, 'Solanum tuberosum')).toBeNull();
  });

  it('devuelve null con lista vacía', () => {
    expect(pickBestMatch([], 'Solanum tuberosum')).toBeNull();
    expect(pickBestMatch(null, 'Solanum tuberosum')).toBeNull();
  });
});

describe('extractSpanishCommonNames', () => {
  it('toma solo language "Español", deduplica (case-insensitive) y ordena', () => {
    const r = record({
      canonical: 'Theobroma cacao',
      common: [
        { name: '10.1007/BF02859340' }, // DOI en bucket sin idioma -> ignorado
        { language: 'Inglés', name: 'cocoa' },
        { language: 'Alemán', name: 'Kakao' },
        { language: 'Español', name: 'cacaotero' },
        { language: 'Español', name: 'Cacao' },
        { language: 'Español', name: 'cacao' }, // duplicado case-insensitive
        { language: 'Español', name: 'árbol del cacao' },
        { name: 'Papa' }, // sin idioma -> ignorado (no verificado)
      ],
    });
    // Conserva la primera grafía vista ("Cacao") y ordena en locale español.
    expect(extractSpanishCommonNames(r)).toEqual(['árbol del cacao', 'Cacao', 'cacaotero']);
  });

  it('descarta ruido dentro de entradas en español (DOI/URL/números)', () => {
    const r = record({
      canonical: 'X y',
      common: [
        { language: 'Español', name: 'https://ejemplo.com' },
        { language: 'Español', name: '10.1234/abc' },
        { language: 'Español', name: '123456' },
        { language: 'Español', name: 'uchuva' },
      ],
    });
    expect(extractSpanishCommonNames(r)).toEqual(['uchuva']);
  });

  it('devuelve [] si no hay commonNames', () => {
    expect(extractSpanishCommonNames({})).toEqual([]);
    expect(extractSpanishCommonNames(record({ canonical: 'X y', common: [] }))).toEqual([]);
  });
});

describe('isPlausibleCommonName', () => {
  it('acepta nombres reales y rechaza ruido', () => {
    expect(isPlausibleCommonName('Uchuva')).toBe(true);
    expect(isPlausibleCommonName('árbol del pan')).toBe(true);
    expect(isPlausibleCommonName('10.1007/BF02859340')).toBe(false);
    expect(isPlausibleCommonName('http://x.com')).toBe(false);
    expect(isPlausibleCommonName('99999')).toBe(false);
    expect(isPlausibleCommonName('')).toBe(false);
  });
});

describe('extractColombianDepartments', () => {
  it('extrae departamentos de Colombia, únicos y ordenados', () => {
    const complete = {
      distributionApprovedInUse: {
        distribution: [
          {
            distributionAtomized: [
              { country: 'Colombia', stateProvince: 'Córdoba' },
              { country: 'Colombia', stateProvince: 'Antioquia' },
              { country: 'Colombia', stateProvince: 'Antioquia' }, // dup
              { country: 'Perú', stateProvince: 'Cusco' }, // fuera de CO
              { country: 'Colombia', stateProvince: '' }, // vacío
            ],
          },
        ],
      },
    };
    expect(extractColombianDepartments(complete)).toEqual(['Antioquia', 'Córdoba']);
  });

  it('devuelve [] sin distribución', () => {
    expect(extractColombianDepartments(null)).toEqual([]);
    expect(extractColombianDepartments({})).toEqual([]);
  });
});

describe('searchSpecies', () => {
  it('devuelve el arreglo de resultados en 200', async () => {
    const results = [record({ canonical: 'Solanum tuberosum' })];
    mockFetch({
      [`${API_BASE}/record_search/search?q=Solanum%20tuberosum&size=6`]: { json: results },
    });
    await expect(searchSpecies('Solanum tuberosum')).resolves.toEqual(results);
  });

  it('trata HTTP 406 { message } como no-match ([])', async () => {
    mockFetch({
      [`${API_BASE}/record_search/search?q=Beta%20vulgaris&size=6`]: {
        status: 406,
        json: { message: 'Not found results for the simple search: Beta vulgaris' },
      },
    });
    await expect(searchSpecies('Beta vulgaris')).resolves.toEqual([]);
  });

  it('lanza en errores HTTP distintos de 406', async () => {
    mockFetch({
      [`${API_BASE}/record_search/search?q=Foo%20bar&size=6`]: { status: 500, json: {} },
    });
    await expect(searchSpecies('Foo bar')).rejects.toThrow('biodiversidad 500');
  });

  it('rechaza nombres inválidos sin hacer la petición', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no debería llamarse')));
    await expect(searchSpecies('DROP TABLE; --')).resolves.toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('fetchCompleteRecord', () => {
  it('devuelve el registro completo en 200', async () => {
    const complete = { _id: 'abc123abc123', distributionApprovedInUse: {} };
    mockFetch({
      [`${API_BASE}/complete-record/abc123abc123`]: { json: complete },
    });
    await expect(fetchCompleteRecord('abc123abc123')).resolves.toEqual(complete);
  });

  it('devuelve null con id inválido sin hacer la petición', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no debería llamarse')));
    await expect(fetchCompleteRecord('../etc/passwd')).resolves.toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
