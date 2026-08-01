import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getVeredaFromGPS,
  normalizeVeredaName,
  searchVeredasEnMunicipio,
  searchVeredasLocales,
} from '../veredaService.js';
import { reverseGeocode } from '../locationService.js';

vi.mock('../locationService.js', () => ({
  reverseGeocode: vi.fn(),
}));

describe('veredaService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('normaliza nombres con tildes y espacios', () => {
    expect(normalizeVeredaName('  La  Esperánza ')).toBe('la esperanza');
  });

  it('lee vereda desde reverseGeocode normalizado', async () => {
    vi.mocked(reverseGeocode).mockResolvedValue(/** @type {any} */ ({
      vereda: 'Mundo Nuevo',
      municipio: 'La Calera',
      departamento: 'Cundinamarca',
      display: 'Mundo Nuevo, La Calera',
    }));

    await expect(getVeredaFromGPS(4.67, -73.84)).resolves.toMatchObject({
      vereda: 'Mundo Nuevo',
      municipio: 'La Calera',
      departamento: 'Cundinamarca',
      source: 'nominatim',
    });
  });

  it('consulta el dataset local crowdsourced por codigo DIVIPOLA', () => {
    const hits = searchVeredasLocales('Cajicá', 'hato');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      name: 'el hato',
      source: 'local-crowdsourced',
      municipio: 'Cajicá',
    });
  });

  it('usa fallback local cuando Overpass falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const hits = await searchVeredasEnMunicipio('Cajicá', 'hato');
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('el hato');
  });
});
