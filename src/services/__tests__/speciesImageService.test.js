/**
 * speciesImageService.test.js — cobertura del servicio de imagenes de especies.
 *
 * Cubre:
 *  - isOpenImageLicense: deteccion de licencias abiertas vs cerradas.
 *  - parseCatalogImage: extraccion de URL/licencia desde objeto especie.
 *  - parseGbifImage: extraccion desde occurrence GBIF con filtro de licencia.
 *  - parseGbifOccurrenceSearch: busqueda en array de results.
 *  - parseWikimediaImage: extraccion desde respuesta API Wikimedia.
 *  - normalizeName / cacheKeyFor: helpers puros del cache.
 *  - getSpeciesImage: integracion con resolver local y fallback a GBIF/Wikimedia.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  __TEST__,
  isOpenImageLicense,
  parseCatalogImage,
  parseGbifImage,
  parseGbifOccurrenceSearch,
  parseWikimediaImage,
  getSpeciesImage,
} from '../speciesImageService';

const { normalizeName, cacheKeyFor } = __TEST__;

import { __resetSpeciesImageCache } from '../../utils/speciesImageResolver';

beforeEach(() => {
  vi.restoreAllMocks();
  __resetSpeciesImageCache();
});

// ── normalizeName ─────────────────────────────────────────────────────────

describe('normalizeName', () => {
  it('elimina espacios extras y deja un solo espacio entre palabras', () => {
    expect(normalizeName('  Coffea   arabica  ')).toBe('Coffea arabica');
  });

  it('maneja string vacio', () => {
    expect(normalizeName('')).toBe('');
  });

  it('devuelve string vacio para no-string', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});

// ── cacheKeyFor ───────────────────────────────────────────────────────────

describe('cacheKeyFor', () => {
  it('genera una key consistente para un nombre dado', () => {
    const key = cacheKeyFor('Coffea arabica');
    // encodeURIComponent convierte espacios a %20
    expect(key).toContain('/__chagra/species-image/');
    expect(key).toContain('coffea%20arabica');
  });

  it('es idempotente', () => {
    expect(cacheKeyFor('Coffea arabica')).toBe(cacheKeyFor('Coffea Arabica'));
  });
});

// ── isOpenImageLicense ─────────────────────────────────────────────────────

describe('isOpenImageLicense', () => {
  it('acepta CC0', () => {
    expect(isOpenImageLicense('CC0')).toBe(true);
    expect(isOpenImageLicense('cc0 1.0')).toBe(true);
  });

  it('acepta CC-BY', () => {
    expect(isOpenImageLicense('CC-BY')).toBe(true);
    expect(isOpenImageLicense('cc by 4.0')).toBe(true);
  });

  it('acepta CC-BY-SA', () => {
    expect(isOpenImageLicense('CC-BY-SA 3.0')).toBe(true);
  });

  it('acepta Public Domain', () => {
    expect(isOpenImageLicense('Public Domain')).toBe(true);
    expect(isOpenImageLicense('public domain mark')).toBe(true);
  });

  it('acepta Creative Commons generico', () => {
    expect(isOpenImageLicense('Creative Commons Attribution')).toBe(true);
  });

  it('rechaza All Rights Reserved', () => {
    expect(isOpenImageLicense('All Rights Reserved')).toBe(false);
  });

  it('rechaza Copyright', () => {
    expect(isOpenImageLicense('Copyright © 2024')).toBe(false);
  });

  it('rechaza Proprietary', () => {
    expect(isOpenImageLicense('Proprietary license')).toBe(false);
  });

  it('rechaza No Known License', () => {
    expect(isOpenImageLicense('No known license')).toBe(false);
  });

  it('rechaza string vacio o nulo', () => {
    expect(isOpenImageLicense('')).toBe(false);
    expect(isOpenImageLicense(null)).toBe(false);
    expect(isOpenImageLicense(undefined)).toBe(false);
  });
});

// ── parseCatalogImage ─────────────────────────────────────────────────────

describe('parseCatalogImage', () => {
  it('extrae URL desde campo imagen como string', () => {
    const result = parseCatalogImage({ imagen: 'https://example.com/photo.jpg' });
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/photo.jpg');
    expect(result.thumbUrl).toBe('https://example.com/photo.jpg');
    expect(result.license).toBe('Cat\u00e1logo Chagra');
    expect(result.rightsHolder).toBe('Cat\u00e1logo Chagra');
    expect(result.source).toBe('Cat\u00e1logo Chagra');
  });

  it('extrae URL desde campo image (alternativo)', () => {
    const result = parseCatalogImage({ image: 'https://example.com/alt.jpg' });
    expect(result.url).toBe('https://example.com/alt.jpg');
  });

  it('extrae URL desde media.image (string), usa defaults para el resto', () => {
    // Cuando media.image es un string, el codigo toma la rama string.
    // El campo media.license no se lee porque ya se resolvio como string.
    const result = parseCatalogImage({
      media: { image: 'https://example.com/media.jpg', license: 'CC-BY' },
    });
    expect(result.url).toBe('https://example.com/media.jpg');
    // license no se lee desde media.license; cae en default.
    expect(result.license).toBe('Cat\u00e1logo Chagra');
  });

  it('extrae desde objeto imagen con campos detallados', () => {
    const result = parseCatalogImage({
      imagen: {
        url: 'https://example.com/detailed.jpg',
        thumbUrl: 'https://example.com/thumb.jpg',
        license: 'CC0',
        rightsHolder: 'Fotografo X',
        source: 'Herbario Nacional',
        sourceUrl: 'https://source.org',
      },
    });
    expect(result.url).toBe('https://example.com/detailed.jpg');
    expect(result.thumbUrl).toBe('https://example.com/thumb.jpg');
    expect(result.license).toBe('CC0');
    expect(result.rightsHolder).toBe('Fotografo X');
    expect(result.source).toBe('Herbario Nacional');
    expect(result.sourceUrl).toBe('https://source.org');
  });

  it('extrae desde objeto imagen con campos en espanol', () => {
    const result = parseCatalogImage({
      imagen: {
        url: 'https://example.com/es.jpg',
        licencia: 'CC-BY-SA',
        autor: 'Botanico Y',
        fuente: 'Jardin Botanico',
      },
    });
    expect(result.license).toBe('CC-BY-SA');
    expect(result.rightsHolder).toBe('Botanico Y');
    expect(result.source).toBe('Jardin Botanico');
  });

  it('devuelve null para entrada sin imagen', () => {
    expect(parseCatalogImage(null)).toBeNull();
    expect(parseCatalogImage(undefined)).toBeNull();
    expect(parseCatalogImage({})).toBeNull();
  });

  it('devuelve null cuando el campo imagen existe pero no tiene URL', () => {
    expect(parseCatalogImage({ imagen: {} })).toBeNull();
  });
});

// ── parseGbifImage ────────────────────────────────────────────────────────

const GBIF_OCCURRENCE_OPEN = {
  key: 12345,
  license: 'http://creativecommons.org/licenses/by/4.0/legalcode',
  rightsHolder: 'Test Photographer',
  media: [
    {
      type: 'StillImage',
      identifier: 'https://gbif.example.com/media/12345.jpg',
      license: 'http://creativecommons.org/licenses/by/4.0/',
      rightsHolder: 'Test Photographer',
    },
  ],
};

const GBIF_OCCURRENCE_CLOSED = {
  key: 99999,
  license: 'All Rights Reserved',
  media: [
    {
      type: 'StillImage',
      identifier: 'https://gbif.example.com/media/99999.jpg',
      license: 'All Rights Reserved',
    },
  ],
};

const GBIF_OCCURRENCE_NO_MEDIA = {
  key: 88888,
  license: 'http://creativecommons.org/licenses/by/4.0/',
  media: [],
};

describe('parseGbifImage', () => {
  it('extrae imagen desde occurrence con licencia abierta', () => {
    const result = parseGbifImage(GBIF_OCCURRENCE_OPEN);
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://gbif.example.com/media/12345.jpg');
    expect(result.license).toBe('http://creativecommons.org/licenses/by/4.0/');
    expect(result.rightsHolder).toBe('Test Photographer');
    expect(result.source).toBe('GBIF');
    expect(result.sourceUrl).toBe('https://www.gbif.org/occurrence/12345');
  });

  it('rechaza occurrence con licencia cerrada', () => {
    const result = parseGbifImage(GBIF_OCCURRENCE_CLOSED);
    expect(result).toBeNull();
  });

  it('devuelve null si no hay media', () => {
    const result = parseGbifImage(GBIF_OCCURRENCE_NO_MEDIA);
    expect(result).toBeNull();
  });

  it('devuelve null para entrada nula', () => {
    expect(parseGbifImage(null)).toBeNull();
    expect(parseGbifImage(undefined)).toBeNull();
  });
});

// ── parseGbifOccurrenceSearch ─────────────────────────────────────────────

describe('parseGbifOccurrenceSearch', () => {
  it('encuentra la primera ocurrencia con imagen abierta en results', () => {
    const payload = {
      results: [
        GBIF_OCCURRENCE_CLOSED,
        GBIF_OCCURRENCE_NO_MEDIA,
        GBIF_OCCURRENCE_OPEN,
      ],
    };
    const result = parseGbifOccurrenceSearch(payload);
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://gbif.example.com/media/12345.jpg');
  });

  it('devuelve null si ningun resultado tiene imagen abierta', () => {
    const payload = { results: [GBIF_OCCURRENCE_CLOSED] };
    expect(parseGbifOccurrenceSearch(payload)).toBeNull();
  });

  it('devuelve null para payload sin results', () => {
    expect(parseGbifOccurrenceSearch(null)).toBeNull();
    expect(parseGbifOccurrenceSearch({})).toBeNull();
  });
});

// ── parseWikimediaImage ───────────────────────────────────────────────────

const WIKIMEDIA_RESPONSE_OPEN = {
  query: {
    pages: {
      123: {
        title: 'File:Coffea_arabica.jpg',
        imageinfo: [
          {
            url: 'https://upload.wikimedia.org/wikipedia/commons/coffea.jpg',
            thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb_coffea.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Coffea_arabica.jpg',
            extmetadata: {
              LicenseShortName: { value: 'CC BY 4.0' },
              Artist: { value: 'Photographer Name' },
            },
          },
        ],
      },
    },
  },
};

const WIKIMEDIA_RESPONSE_CLOSED = {
  query: {
    pages: {
      456: {
        title: 'File:Restricted.jpg',
        imageinfo: [
          {
            url: 'https://upload.wikimedia.org/restricted.jpg',
            extmetadata: {
              LicenseShortName: { value: 'All Rights Reserved' },
            },
          },
        ],
      },
    },
  },
};

describe('parseWikimediaImage', () => {
  it('extrae imagen con licencia abierta desde respuesta Wikimedia', () => {
    const result = parseWikimediaImage(WIKIMEDIA_RESPONSE_OPEN);
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://upload.wikimedia.org/wikipedia/commons/coffea.jpg');
    expect(result.thumbUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb_coffea.jpg');
    expect(result.license).toBe('CC BY 4.0');
    expect(result.source).toBe('Wikimedia Commons');
    expect(result.sourceUrl).toContain('File:Coffea_arabica.jpg');
  });

  it('extrae rightsHolder desde Artist metadata', () => {
    const result = parseWikimediaImage(WIKIMEDIA_RESPONSE_OPEN);
    expect(result.rightsHolder).toBe('Photographer Name');
  });

  it('rechaza imagen con licencia cerrada', () => {
    const result = parseWikimediaImage(WIKIMEDIA_RESPONSE_CLOSED);
    expect(result).toBeNull();
  });

  it('devuelve null para respuesta sin pages', () => {
    expect(parseWikimediaImage(null)).toBeNull();
    expect(parseWikimediaImage({ query: {} })).toBeNull();
    expect(parseWikimediaImage({ query: { pages: {} } })).toBeNull();
  });
});

// ── getSpeciesImage (integracion basica) ──────────────────────────────────

describe('getSpeciesImage', () => {
  it('devuelve null para nombre vacio', async () => {
    const result = await getSpeciesImage('');
    expect(result).toBeNull();
  });

  it('devuelve null para nombre nulo', async () => {
    const result = await getSpeciesImage(null);
    expect(result).toBeNull();
  });

  it('resuelve imagen desde el JSON local cuando esta disponible', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/species-images.json' || url.endsWith('/species-images.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              species: [
                {
                  species_id: 'coffea_arabica',
                  scientific_name: 'Coffea arabica L.',
                  image_url: 'https://example.com/coffea-local.jpg',
                  license: 'http://creativecommons.org/licenses/by/4.0/',
                  attribution: 'Richard Jacob',
                },
              ],
            }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });

    // getSpeciesImage llama findLocalImage internamente, que carga el JSON
    // y tambien intenta fetch a GBIF/Wikimedia si no encuentra local.
    // Al mockear fetch global, las llamadas a GBIF/Wikimedia fallaran
    // porque no matchean nuestro mock. Eso es aceptable: el codigo atrapa
    // esos errores y sigue.
    const result = await getSpeciesImage('Coffea arabica');
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://example.com/coffea-local.jpg');
    expect(result.license).toBe('CC-BY');
  });
});
