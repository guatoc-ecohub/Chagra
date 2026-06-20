import { describe, expect, it } from 'vitest';
import { __TEST__, isOpenImageLicense } from '../speciesImageService';

describe('speciesImageService', () => {
  it('acepta licencias CC, dominio público y CC0', () => {
    expect(isOpenImageLicense('https://creativecommons.org/licenses/by/4.0/')).toBe(true);
    expect(isOpenImageLicense('CC BY-SA 4.0')).toBe(true);
    expect(isOpenImageLicense('CC0 1.0')).toBe(true);
    expect(isOpenImageLicense('Public Domain')).toBe(true);
  });

  it('rechaza licencias cerradas o ambiguas', () => {
    expect(isOpenImageLicense('All rights reserved')).toBe(false);
    expect(isOpenImageLicense('copyright')).toBe(false);
    expect(isOpenImageLicense('')).toBe(false);
    expect(isOpenImageLicense(null)).toBe(false);
  });

  it('parsea la primera imagen GBIF con licencia abierta', () => {
    const result = __TEST__.parseGbifOccurrenceSearch({
      results: [
        {
          key: 123,
          media: [{ identifier: 'https://example.test/closed.jpg', license: 'All rights reserved' }],
        },
        {
          key: 456,
          recordedBy: 'SiB Colombia',
          media: [{ identifier: 'https://example.test/open.jpg', license: 'CC_BY_4_0' }],
        },
      ],
    });

    expect(result).toEqual({
      url: 'https://example.test/open.jpg',
      thumbUrl: 'https://example.test/open.jpg',
      license: 'CC_BY_4_0',
      rightsHolder: 'SiB Colombia',
      source: 'GBIF',
      sourceUrl: 'https://www.gbif.org/occurrence/456',
    });
  });

  it('parsea fallback Wikimedia con atribución', () => {
    const result = __TEST__.parseWikimediaImage({
      query: {
        pages: {
          1: {
            title: 'File:Trichoderma.jpg',
            imageinfo: [{
              url: 'https://upload.wikimedia.org/file.jpg',
              thumburl: 'https://upload.wikimedia.org/thumb.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Trichoderma.jpg',
              extmetadata: {
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                Artist: { value: '<span>Jane Doe</span>' },
              },
            }],
          },
        },
      },
    });

    expect(result).toMatchObject({
      url: 'https://upload.wikimedia.org/file.jpg',
      thumbUrl: 'https://upload.wikimedia.org/thumb.jpg',
      license: 'CC BY-SA 4.0',
      rightsHolder: 'Jane Doe',
      source: 'Wikimedia Commons',
    });
  });
});
