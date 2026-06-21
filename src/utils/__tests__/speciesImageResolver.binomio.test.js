import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSpeciesIdCandidates, findLocalImage, __resetSpeciesImageCache } from '../speciesImageResolver';

describe('buildSpeciesIdCandidates — rescata nombres con autor', () => {
  it('binomio cuando el nombre trae autor (Solanum tuberosum L.)', () => {
    const c = buildSpeciesIdCandidates('solanum_tuberosum_l');
    expect(c).toContain('solanum_tuberosum');
  });
  it('binomio con autor compuesto (Cenchrus clandestinus (Hochst. ex Chiov.) Morrone)', () => {
    const c = buildSpeciesIdCandidates('cenchrus_clandestinus_hochst_ex_chiov_morrone');
    expect(c).toContain('cenchrus_clandestinus');
  });
  it('conserva cultivar exacto como primer candidato (San Marzano)', () => {
    const c = buildSpeciesIdCandidates('solanum_lycopersicum_san_marzano');
    expect(c[0]).toBe('solanum_lycopersicum_san_marzano');
    expect(c).toContain('solanum_lycopersicum');
  });
  it('quita rangos infra (var/subsp) del candidato limpio', () => {
    const c = buildSpeciesIdCandidates('solanum_lycopersicum_var_cerasiforme');
    expect(c).toContain('solanum_lycopersicum_cerasiforme');
    expect(c).toContain('solanum_lycopersicum');
  });
  it('nombre de un solo token o vacío no rompe', () => {
    expect(buildSpeciesIdCandidates('')).toEqual([]);
    expect(buildSpeciesIdCandidates('tomate')).toEqual(['tomate']);
  });
});

describe('findLocalImage — usa los candidatos contra el JSON', () => {
  const JSON_FIX = {
    species: [
      { species_id: 'solanum_tuberosum', scientific_name: 'Solanum tuberosum L.', image_url: 'https://x/papa.jpg' },
      { species_id: 'passiflora_ligularis', scientific_name: 'Passiflora ligularis Juss.', image_url: 'https://x/granadilla.jpg' },
    ],
  };
  beforeEach(() => {
    __resetSpeciesImageCache?.();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(JSON_FIX) }));
  });
  afterEach(() => { vi.unstubAllGlobals(); __resetSpeciesImageCache?.(); });

  it('resuelve "Solanum tuberosum L." (con autor) por binomio', async () => {
    const img = await findLocalImage('Solanum tuberosum L.');
    expect(img?.url).toBe('https://x/papa.jpg');
  });
  it('resuelve "Passiflora ligularis Juss." (con autor) por binomio', async () => {
    const img = await findLocalImage('Passiflora ligularis Juss.');
    expect(img?.url).toBe('https://x/granadilla.jpg');
  });
  it('devuelve null si la especie no está', async () => {
    const img = await findLocalImage('Inexistente planta Fake.');
    expect(img).toBeNull();
  });
});
