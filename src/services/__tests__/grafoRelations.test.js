import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test del loader OFFLINE de relaciones del grafo (grafoRelations.js).
// Verifica el SLICE funcional (pest_controllers, compatible_with,
// antagonist_of, nombres_comunes) cargando online y degradando limpio offline.
// El fixture usa datos REALES del export del grafo de conocimiento — no
// inventados: maracuyá/café/chachafruto con sus aristas verificadas.

const FIXTURE = {
  _meta: { schema_version: 1, species_count: 2 },
  species: {
    passiflora_edulis_flavicarpa: {
      nombre_comun: 'Maracuyá',
      nombre_cientifico: 'Passiflora edulis f. flavicarpa Deg.',
      nombres_comunes: ['parcha'],
      conservation_status: 'cultivo_comun',
      pest_controllers: [
        {
          plaga: 'pulgón del algodón',
          controladores: ['Crisopa / león de áfidos', 'Mariquita roja'],
        },
      ],
    },
    coffea_arabica: {
      nombre_comun: 'Café caturra / Castillo / Cenicafé 1',
      nombre_cientifico: 'Coffea arabica L.',
      establishment_means: 'introducido',
      threat_status: 'ENDANGERED',
      compatible_with: ['erythrina_edulis', 'inga_edulis', 'musa_paradisiaca'],
      antagonist_of: ['foeniculum_vulgare'],
      biopreparados: [{ id: 'caldo_bordeles', nombre: 'Caldo bordelés' }],
    },
  },
};

function mockJsonResponse(body) {
  return {
    ok: true,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(body),
  };
}

describe('grafoRelations — loader offline del grafo', () => {
  let mod;

  beforeEach(async () => {
    vi.resetModules();
    mod = await import('../grafoRelations.js');
    mod.__resetGrafoRelationsCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carga /grafo-relations.json y devuelve el mapa de especies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE));
    vi.stubGlobal('fetch', fetchMock);

    const species = await mod.loadGrafoRelations();
    expect(species).not.toBeNull();
    expect(Object.keys(species)).toContain('coffea_arabica');
    expect(fetchMock).toHaveBeenCalledWith('/grafo-relations.json');
  });

  it('SLICE pest_controllers: devuelve plaga → controladores reales', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    const pc = await mod.getPestControllers('passiflora_edulis_flavicarpa');
    expect(pc).toHaveLength(1);
    expect(pc[0].plaga).toBe('pulgón del algodón');
    expect(pc[0].controladores).toContain('Mariquita roja');
  });

  it('SLICE compatible_with / antagonist_of: asociaciones de café', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    const comp = await mod.getCompatibleWith('coffea_arabica');
    expect(comp).toContain('erythrina_edulis');
    expect(comp).toContain('inga_edulis');

    const ant = await mod.getAntagonistOf('coffea_arabica');
    expect(ant).toEqual(['foeniculum_vulgare']);
  });

  it('SLICE nombres_comunes: vernáculos regionales', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    const nombres = await mod.getNombresComunesRegionales('passiflora_edulis_flavicarpa');
    expect(nombres).toEqual(['parcha']);
  });

  it('especie sin relaciones de un tipo → array vacío (no lanza)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    // café no tiene pest_controllers en el fixture
    const pc = await mod.getPestControllers('coffea_arabica');
    expect(pc).toEqual([]);
  });

  it('especie desconocida → null / vacío sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    expect(await mod.getRelationsForSpecies('no_existe_xyz')).toBeNull();
    expect(await mod.getCompatibleWith('no_existe_xyz')).toEqual([]);
  });

  it('OFFLINE (fetch rechaza) → degrada a null / [] sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caida')));

    expect(await mod.loadGrafoRelations()).toBeNull();
    expect(await mod.getPestControllers('passiflora_edulis_flavicarpa')).toEqual([]);
    expect(await mod.getCompatibleWith('coffea_arabica')).toEqual([]);
  });

  it('respuesta no-OK (504 offline sin caché) → null sin lanzar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 504, headers: { get: () => null } }),
    );

    expect(await mod.loadGrafoRelations()).toBeNull();
  });

  it('coalesce: dos cargas concurrentes hacen un solo fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([mod.loadGrafoRelations(), mod.loadGrafoRelations()]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
