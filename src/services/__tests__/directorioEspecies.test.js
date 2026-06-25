import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de las fuentes de datos: catálogo SQLite, grafo offline e imágenes.
vi.mock('../../db/catalogDB.js', () => ({
  getAllSpecies: vi.fn(),
  getSpeciesById: vi.fn(),
  getAllBiopreparados: vi.fn(),
}));
vi.mock('../grafoRelations.js', () => ({
  getRelationsForSpecies: vi.fn(),
}));
vi.mock('../../utils/speciesImageResolver.js', () => ({
  findLocalImage: vi.fn(),
}));

import {
  getAllSpecies,
  getSpeciesById,
  getAllBiopreparados,
} from '../../db/catalogDB.js';
import { getRelationsForSpecies } from '../grafoRelations.js';
import { findLocalImage } from '../../utils/speciesImageResolver.js';
import {
  searchSpecies,
  buildSpeciesFicha,
  altitudToPct,
  __resetDirectorioCache,
} from '../directorioEspecies.js';

const FRIJOL = {
  id: 'phaseolus_vulgaris',
  nombre_comun: 'Frijol arbustivo / voluble',
  nombre_cientifico: 'Phaseolus vulgaris L.',
  nombre_comunes_regionales: ['Frijol cargamanto', 'Bola roja'],
  familia_botanica: 'Fabaceae',
  thermal_zones: ['frio', 'templado', 'calido'],
  altitud_msnm: { min_absoluto: 0, optimo_min: 1500, optimo_max: 2400, max_absoluto: 2800 },
  temperatura_c: { helada_letal: 0, optimo_min: 16, optimo_max: 24, max_tolerable: 30 },
  agua: 'medio',
  estrato: 'medio',
  plagas_criticas: ['Empoasca kraemeri', 'Bemisia tabaci'],
  enfermedades_criticas: ['Uromyces appendiculatus'],
  companions: ['zea_mays', 'cucurbita_maxima'],
  antagonists: ['allium_cepa'],
  valor_pedagogico: 'El frijol común fija nitrógeno con Rhizobium.',
  source_ids: ['agrosavia-manual', 'gbif'],
};
const MAIZ = { id: 'zea_mays', nombre_comun: 'Maíz criollo', nombre_cientifico: 'Zea mays L.', familia_botanica: 'Poaceae' };
const CALABAZA = { id: 'cucurbita_maxima', nombre_comun: 'Zapallo', nombre_cientifico: 'Cucurbita maxima Duchesne' };
const CEBOLLA = { id: 'allium_cepa', nombre_comun: 'Cebolla cabezona', nombre_cientifico: 'Allium cepa L.' };

const CATALOG = [FRIJOL, MAIZ, CALABAZA, CEBOLLA];

beforeEach(() => {
  vi.clearAllMocks();
  __resetDirectorioCache();
  getAllSpecies.mockResolvedValue(CATALOG);
  getSpeciesById.mockImplementation(async (id) => CATALOG.find((s) => s.id === id) || null);
  getAllBiopreparados.mockResolvedValue([]);
  getRelationsForSpecies.mockResolvedValue(null);
  findLocalImage.mockResolvedValue(null);
});

describe('searchSpecies', () => {
  it('encuentra por nombre común exacto', async () => {
    const res = await searchSpecies('Zapallo');
    expect(res[0].id).toBe('cucurbita_maxima');
    expect(res[0].match).toBe('exact');
  });

  it('encuentra por nombre regional', async () => {
    const res = await searchSpecies('Frijol cargamanto');
    expect(res.some((r) => r.id === 'phaseolus_vulgaris')).toBe(true);
  });

  it('resuelve alias curado (frijol → phaseolus_vulgaris) sin ambigüedad', async () => {
    const res = await searchSpecies('frijol');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('phaseolus_vulgaris');
    expect(res[0].match).toBe('alias');
  });

  it('lista varios candidatos por palabra completa', async () => {
    const res = await searchSpecies('cebolla');
    expect(res.some((r) => r.id === 'allium_cepa')).toBe(true);
  });

  it('devuelve [] para consultas demasiado cortas', async () => {
    expect(await searchSpecies('a')).toEqual([]);
    expect(await searchSpecies('')).toEqual([]);
  });

  it('no cruza géneros (sin coincidencias = lista vacía)', async () => {
    const res = await searchSpecies('orquídea galáctica');
    expect(res).toEqual([]);
  });

  it('degrada a [] si el catálogo no carga', async () => {
    getAllSpecies.mockRejectedValueOnce(new Error('db down'));
    expect(await searchSpecies('frijol')).toEqual([]);
  });
});

describe('buildSpeciesFicha', () => {
  it('null si la especie no existe', async () => {
    getSpeciesById.mockResolvedValueOnce(null);
    expect(await buildSpeciesFicha('inexistente')).toBeNull();
  });

  it('construye identidad + piso térmico desde el catálogo', async () => {
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f.comun).toBe('Frijol arbustivo / voluble');
    expect(f.cientifico).toBe('Phaseolus vulgaris L.');
    expect(f.familia).toBe('Fabaceae');
    expect(f.pisoTermico.thermalZones).toEqual(['frio', 'templado', 'calido']);
    expect(f.pisoTermico.altitud.optimo_min).toBe(1500);
    expect(f.pisoTermico.temperatura.optimo_max).toBe(24);
  });

  it('resuelve nombres de asociaciones contra el catálogo', async () => {
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    const compat = f.asociaciones.compatibles;
    const maiz = compat.find((c) => c.id === 'zea_mays');
    expect(maiz.comun).toBe('Maíz criollo');
    expect(maiz.enCatalogo).toBe(true);
    expect(f.asociaciones.antagonistas.find((a) => a.id === 'allium_cepa').comun).toBe('Cebolla cabezona');
  });

  it('biopreparados vacíos cuando el grafo no tiene datos (deflección)', async () => {
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f.biopreparados).toEqual([]);
  });

  it('une plagas del catálogo con controladores del grafo', async () => {
    getRelationsForSpecies.mockResolvedValueOnce({
      compatible_with: ['zea_mays'],
      antagonist_of: [],
      biopreparados: [{ id: 'beauveria_bassiana', nombre: 'Beauveria bassiana' }],
      pest_controllers: [
        { plaga: 'Bemisia tabaci', controladores: ['Encarsia formosa', 'Trampa amarilla'] },
      ],
    });
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    const bemisia = f.amenazas.find((a) => a.nombre.toLowerCase().includes('bemisia'));
    expect(bemisia.controladores).toContain('Encarsia formosa');
    expect(f.biopreparados[0].nombre).toBe('Beauveria bassiana');
  });

  it('enriquece biopreparado con dosis del catálogo si el id coincide', async () => {
    getAllBiopreparados.mockResolvedValueOnce([
      {
        id: 'caldo_bordeles',
        nombre: 'Caldo bordelés',
        data: JSON.stringify({ tipo: 'caldo', dosis: '1%', uso: 'Foliar preventivo', ingredientes: ['sulfato de cobre', 'cal'] }),
      },
    ]);
    getRelationsForSpecies.mockResolvedValueOnce({
      biopreparados: [{ id: 'caldo_bordeles', nombre: 'Caldo bordelés' }],
      pest_controllers: [],
    });
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f.biopreparados[0].dosis).toBe('1%');
    expect(f.biopreparados[0].enCatalogo).toBe(true);
    expect(f.biopreparados[0].ingredientes).toContain('sulfato de cobre');
  });

  it('expone la imagen cuando el resolver la encuentra', async () => {
    findLocalImage.mockResolvedValueOnce({
      url: 'https://x/img.jpg', thumbUrl: 'https://x/thumb.jpg',
      license: 'CC-BY', rightsHolder: 'Foto', source: 'iNaturalist', sourceUrl: 'https://x',
    });
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f.imagen.url).toBe('https://x/img.jpg');
  });

  it('imagen null cuando no hay foto (la UI usa fallback)', async () => {
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f.imagen).toBeNull();
  });

  it('no lanza si el grafo cae; degrada secciones a vacío', async () => {
    getRelationsForSpecies.mockRejectedValueOnce(new Error('grafo offline'));
    const f = await buildSpeciesFicha('phaseolus_vulgaris');
    expect(f).toBeTruthy();
    expect(f.biopreparados).toEqual([]);
  });
});

describe('altitudToPct', () => {
  it('mapea altitud a porcentaje sobre la franja', () => {
    expect(altitudToPct(0)).toBe(0);
    expect(altitudToPct(2100)).toBe(50);
    expect(altitudToPct(4200)).toBe(100);
    expect(altitudToPct(9999)).toBe(100); // clamp
    expect(altitudToPct('x')).toBeNull();
  });
});
