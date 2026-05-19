import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: vi.fn(),
}));

vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

import { getAllSpecies } from '../../db/catalogDB';
import { retrieve } from '../ragRetriever';
import {
  resolveSpecies,
  resolveSpeciesBatch,
  __resetSpeciesResolverCache,
} from '../speciesResolver';

const SPECIES_FIXTURE = [
  {
    slug: 'solanum_lycopersicum_cherry',
    name_es: 'Tomate Cherry',
    name_la: 'Solanum lycopersicum var. cerasiforme',
    nombres_comunes: ['tomatico', 'cherry'],
  },
  {
    slug: 'fragaria_ananassa_monterrey',
    name_es: 'Fresa Monterrey',
    name_la: 'Fragaria × ananassa cv. Monterrey',
  },
  {
    slug: 'annona_muricata',
    name_es: 'Guanábana',
    name_la: 'Annona muricata',
  },
];

beforeEach(() => {
  __resetSpeciesResolverCache();
  getAllSpecies.mockResolvedValue(SPECIES_FIXTURE);
  retrieve.mockResolvedValue([]);
});

describe('resolveSpecies', () => {
  it('matchea exact por slug', async () => {
    const r = await resolveSpecies('solanum_lycopersicum_cherry');
    expect(r?.match).toBe('exact');
    expect(r?.slug).toBe('solanum_lycopersicum_cherry');
    expect(r?.confidence).toBe(1);
  });

  it('matchea exact por name_es (case-insensitive)', async () => {
    const r = await resolveSpecies('Tomate Cherry');
    expect(r?.match).toBe('exact');
    expect(r?.slug).toBe('solanum_lycopersicum_cherry');
  });

  it('matchea exact por name_la', async () => {
    const r = await resolveSpecies('Annona muricata');
    expect(r?.match).toBe('exact');
    expect(r?.slug).toBe('annona_muricata');
  });

  it('matchea por nombre regional', async () => {
    const r = await resolveSpecies('tomatico');
    expect(r?.match).toBe('exact');
    expect(r?.slug).toBe('solanum_lycopersicum_cherry');
  });

  it('folds acentos y normaliza', async () => {
    const r = await resolveSpecies('GUANÁBANA');
    expect(r?.match).toBe('exact');
    expect(r?.slug).toBe('annona_muricata');
  });

  it('skip (null) cuando catálogo y RAG no tienen match', async () => {
    retrieve.mockResolvedValue([]);
    const r = await resolveSpecies('chorcho');
    expect(r).toBeNull();
  });

  it('RAG fuzzy match cuando supera threshold', async () => {
    retrieve.mockResolvedValue([
      { species: 'fragaria_ananassa_monterrey', text: '...', score: 3.5 },
      { species: 'fragaria_ananassa_monterrey', text: '...', score: 1.2 },
      { species: 'solanum_lycopersicum_cherry', text: '...', score: 0.4 },
    ]);
    const r = await resolveSpecies('fresita');
    expect(r?.match).toBe('fuzzy');
    expect(r?.slug).toBe('fragaria_ananassa_monterrey');
    expect(r?.confidence).toBeGreaterThan(0.4);
    expect(r?.confidence).toBeLessThanOrEqual(1);
  });

  it('skip (null) si RAG retorna scores bajo threshold', async () => {
    retrieve.mockResolvedValue([
      { species: 'fragaria_ananassa_monterrey', text: '...', score: 0.5 },
      { species: 'solanum_lycopersicum_cherry', text: '...', score: 0.3 },
    ]);
    const r = await resolveSpecies('cosa-rara');
    expect(r).toBeNull();
  });

  it('string vacío → null', async () => {
    expect(await resolveSpecies('')).toBeNull();
    expect(await resolveSpecies(null)).toBeNull();
  });

  it('NO falla si catalogDB throws — RAG-only fallback', async () => {
    getAllSpecies.mockRejectedValue(new Error('catalog not ready'));
    retrieve.mockResolvedValue([
      { species: 'annona_muricata', text: '...', score: 5.0 },
    ]);
    const r = await resolveSpecies('guanabana sabrosa');
    expect(r?.match).toBe('fuzzy');
    expect(r?.slug).toBe('annona_muricata');
  });
});

describe('resolveSpeciesBatch', () => {
  it('preserva resueltos y reporta skippeados', async () => {
    retrieve.mockResolvedValue([]);
    const { resolved, skipped } = await resolveSpeciesBatch([
      'Tomate Cherry',
      'cosa-inexistente',
      'Guanábana',
    ]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].slug).toBe('solanum_lycopersicum_cherry');
    expect(resolved[1].slug).toBe('annona_muricata');
    expect(skipped).toEqual(['cosa-inexistente']);
  });

  it('batch vacío → {resolved:[], skipped:[]}', async () => {
    const r = await resolveSpeciesBatch([]);
    expect(r).toEqual({ resolved: [], skipped: [] });
  });

  it('no-array → {resolved:[], skipped:[]}', async () => {
    const r = await resolveSpeciesBatch(null);
    expect(r).toEqual({ resolved: [], skipped: [] });
  });
});
