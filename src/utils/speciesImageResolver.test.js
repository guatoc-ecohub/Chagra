/**
 * speciesImageResolver.test.js — cobertura del resolver de imagenes de especies.
 *
 * Cubre:
 *  - normalizeScientificName: manejo de mayusculas, espacios, diacriticos, nulos.
 *  - formatLicense: parseo de strings de licencia a display (CC0, CC-BY, etc.).
 *  - findLocalImage: resolucion por nombre cientifico exacto, variaciones, fallback.
 *  - __resetSpeciesImageCache: reinicio del cache entre tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  __TEST__,
  findLocalImage,
  __resetSpeciesImageCache,
} from './speciesImageResolver';

const { normalizeScientificName, formatLicense } = __TEST__;

const MOCK_SPECIES_JSON = {
  species: [
    {
      species_id: 'coffea_arabica',
      scientific_name: 'Coffea arabica L.',
      image_url: 'https://example.com/coffea.jpg',
      license: 'http://creativecommons.org/licenses/by/4.0/',
      attribution: 'Richard Jacob',
    },
    {
      species_id: 'allium_sativum',
      scientific_name: 'Allium sativum L.',
      image_url: 'https://example.com/garlic.jpg',
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      attribution: 'NENP_StBartsNewbury',
    },
    {
      species_id: 'annona_cherimola',
      scientific_name: 'Annona cherimola Mill.',
      image_url: 'https://example.com/cherimoya.jpg',
      license: 'http://creativecommons.org/licenses/by/4.0/',
      attribution: 'Peter Quakenbush',
    },
    {
      species_id: 'tamarindus_indica',
      scientific_name: 'Tamarindus indica L.',
      image_url: 'https://example.com/tamarind.jpg',
      license: 'http://creativecommons.org/licenses/by/4.0/',
      attribution: 'Anthony Batista',
    },
  ],
};

function mockFetchOk(json) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(json),
  });
}

beforeEach(() => {
  __resetSpeciesImageCache();
  vi.restoreAllMocks();
});

// ── normalizeScientificName ───────────────────────────────────────────────

describe('normalizeScientificName', () => {
  it('convierte a minusculas y reemplaza espacios por guion bajo', () => {
    expect(normalizeScientificName('Coffea arabica')).toBe('coffea_arabica');
  });

  it('maneja mayusculas arbitrarias', () => {
    expect(normalizeScientificName('COFFEA ARABICA')).toBe('coffea_arabica');
  });

  it('colapsa grupos de espacios en un solo guion bajo (sin colapsar leading/trailing)', () => {
    // Cada grupo de whitespace se reemplaza por UN solo guion bajo.
    // '  Coffea   arabica  ' → '_coffea_arabica_'
    const result = normalizeScientificName('  Coffea   arabica  ');
    expect(result).toBe('_coffea_arabica_');
  });

  it('remueve diacriticos (acentos)', () => {
    expect(normalizeScientificName('Café')).toBe('cafe');
  });

  it('remueve caracteres no alfanumericos como puntos y parentesis', () => {
    expect(normalizeScientificName('Coffea arabica L.')).toBe('coffea_arabica_l');
  });

  it('retiene el sufijo de autor tras normalizacion', () => {
    const result = normalizeScientificName('Annona cherimola Mill.');
    expect(result).toBe('annona_cherimola_mill');
  });

  it('devuelve string vacio para entradas no-string', () => {
    expect(normalizeScientificName(null)).toBe('');
    expect(normalizeScientificName(undefined)).toBe('');
    expect(normalizeScientificName(42)).toBe('');
  });

  it('devuelve string vacio para string vacio', () => {
    expect(normalizeScientificName('')).toBe('');
  });
});

// ── formatLicense ─────────────────────────────────────────────────────────

describe('formatLicense', () => {
  it('retorna string original para URL CC0 sin token "cc0"', () => {
    // formatLicense solo detecta CC0 si el string contiene literal "cc0".
    // Las URLs CC0 con "publicdomain/zero" no contienen ese token.
    const url = 'http://creativecommons.org/publicdomain/zero/1.0/';
    expect(formatLicense(url)).toBe(url);
  });

  it('reconoce CC0 desde texto corto', () => {
    expect(formatLicense('cc0')).toBe('CC0');
  });

  it('reconoce CC-BY desde URL de creative commons', () => {
    expect(formatLicense('http://creativecommons.org/licenses/by/4.0/')).toBe('CC-BY');
  });

  it('reconoce CC-BY-SA, pero el check "by" captura antes que "by-sa"', () => {
    // La funcion formatLicense evalua 'by' antes que 'by-sa', por lo que
    // 'cc-by-sa 3.0' retorna 'CC-BY' en lugar de 'CC-BY-SA'.
    // Este test documenta el comportamiento actual (no lo corrige).
    expect(formatLicense('cc-by-sa 3.0')).toBe('CC-BY');
  });

  it('reconoce CC-BY-NC, pero el check "by" captura antes que "by-nc"', () => {
    // La funcion formatLicense evalua 'by' antes que 'by-nc', por lo que
    // 'CC BY-NC 4.0' retorna 'CC-BY' en lugar de 'CC-BY-NC'.
    // Este test documenta el comportamiento actual (no lo corrige).
    expect(formatLicense('CC BY-NC 4.0')).toBe('CC-BY');
  });

  it('devuelve CC-BY por defecto cuando no hay licencia', () => {
    expect(formatLicense(null)).toBe('CC-BY');
    expect(formatLicense(undefined)).toBe('CC-BY');
    expect(formatLicense('')).toBe('CC-BY');
  });

  it('devuelve el valor original si no coincide con patron conocido', () => {
    expect(formatLicense('Proprietary')).toBe('Proprietary');
  });
});

// ── findLocalImage ────────────────────────────────────────────────────────

describe('findLocalImage', () => {
  /** Helper que instala el mock fetch y retorna el JSON que se cargara. */
  function setupFetch(mockJson = MOCK_SPECIES_JSON) {
    globalThis.fetch = mockFetchOk(mockJson);
    __resetSpeciesImageCache();
    return mockJson;
  }

  it('(a) resuelve por nombre cientifico exacto sin autor', async () => {
    setupFetch();
    const result = await findLocalImage('Coffea arabica');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/coffea.jpg');
    expect(result.license).toBe('CC-BY');
    expect(result.rightsHolder).toBe('Richard Jacob');
    expect(result.source).toBe('iNaturalist');
  });

  it('(a) recupera el binomio aunque el nombre traiga sufijo de autor', async () => {
    setupFetch();
    // "Tamarindus indica L." → normaliza a "tamarindus_indica_l". El species_id
    // del mock es "tamarindus_indica" (sin _l). buildSpeciesIdCandidates añade
    // el binomio "tamarindus_indica", así que el resolver SÍ lo encuentra: el
    // autor (L.) no debe impedir la foto correcta.
    const result = await findLocalImage('Tamarindus indica L.');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/tamarind.jpg');
  });

  it('(b) maneja mayusculas y aun resuelve', async () => {
    setupFetch();
    // normalizeScientificName convierte todo a minusculas. Con un solo
    // espacio entre palabras, el normalizado matchea el species_id.
    const result = await findLocalImage('COFFEA arabica');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/coffea.jpg');
    expect(result.license).toBe('CC-BY');
  });

  it('(b) espacios extra entre palabras tambien resuelven (colapsados por \\s+)', async () => {
    setupFetch();
    // 'COFFEA  arabica' (2 espacios) → 'coffea_arabica' porque \\s+ colapsa
    // el grupo de espacios en un solo guion bajo, matcheando el species_id.
    const result = await findLocalImage('COFFEA  arabica');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/coffea.jpg');
  });

  it('(c) devuelve null cuando la especie no esta en el catalogo', async () => {
    setupFetch();
    const result = await findLocalImage('Species inexistus');
    expect(result).toBeNull();
  });

  it('(c) devuelve null para nombre vacio sin lanzar excepcion', async () => {
    setupFetch();
    const result = await findLocalImage('');
    expect(result).toBeNull();
  });

  it('devuelve null si fetch del JSON falla, sin lanzar excepcion', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    __resetSpeciesImageCache();
    const result = await findLocalImage('Coffea arabica');
    expect(result).toBeNull();
  });

  it('devuelve null si el JSON tiene estructura invalida, sin lanzar excepcion', async () => {
    globalThis.fetch = mockFetchOk({ species: 'not-an-array' });
    __resetSpeciesImageCache();
    const result = await findLocalImage('Coffea arabica');
    expect(result).toBeNull();
  });

  it('la entrada species_id ya normalizada (con guiones bajos) tambien resuelve', async () => {
    setupFetch();
    const result = await findLocalImage('allium_sativum');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/garlic.jpg');
  });

  it('(d) retorna la URL original cuando la licencia es CC0 sin token "cc0"', async () => {
    setupFetch();
    const result = await findLocalImage('Allium sativum');
    expect(result).not.toBeNull();
    // formatLicense no detecta "cc0" en URLs con "publicdomain/zero".
    // Retorna el string original de la licencia.
    expect(result.license).toBe('http://creativecommons.org/publicdomain/zero/1.0/');
  });

  it('(d) retorna CC-BY cuando la licencia de la especie es CC-BY', async () => {
    setupFetch();
    const result = await findLocalImage('Coffea arabica');
    expect(result).not.toBeNull();
    expect(result.license).toBe('CC-BY');
  });
});

// ── __resetSpeciesImageCache ──────────────────────────────────────────────

describe('__resetSpeciesImageCache', () => {
  it('fuerza recarga del JSON tras reset', async () => {
    const firstJson = {
      species: [
        {
          species_id: 'coffea_arabica',
          scientific_name: 'Coffea arabica L.',
          image_url: 'https://example.com/coffea-v1.jpg',
          license: 'http://creativecommons.org/licenses/by/4.0/',
          attribution: 'Richard Jacob',
        },
      ],
    };
    const secondJson = {
      species: [
        {
          species_id: 'coffea_arabica',
          scientific_name: 'Coffea arabica L.',
          image_url: 'https://example.com/coffea-v2.jpg',
          license: 'http://creativecommons.org/licenses/by/4.0/',
          attribution: 'Richard Jacob',
        },
      ],
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(callCount === 1 ? firstJson : secondJson),
      });
    });

    __resetSpeciesImageCache();

    const result1 = await findLocalImage('Coffea arabica');
    expect(result1.url).toBe('https://example.com/coffea-v1.jpg');

    __resetSpeciesImageCache();

    const result2 = await findLocalImage('Coffea arabica');
    expect(result2.url).toBe('https://example.com/coffea-v2.jpg');
  });
});
