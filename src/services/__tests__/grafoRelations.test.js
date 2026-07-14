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
      biopreparados: [
        {
          id: 'caldo_bordeles',
          nombre: 'Caldo bordelés',
          specificity: {
            score: 0.98,
            label: 'muy alta',
            provenance: 'Late blight and potato-focused manual curation',
          },
        },
      ],
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

  it('filtra relaciones disputed del grounding offline', async () => {
    const FIXTURE_WITH_DISPUTED = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        theobroma_cacao: {
          nombre_comun: 'Cacao',
          nombre_cientifico: 'Theobroma cacao L.',
          conservation_status: 'cultivo_comun',
          pest_controllers: [
            {
              plaga: 'moniliasis del cacao',
              controladores: ['Bacteria antagonista (biofungicida)', 'Hongo antagonista del suelo'],
              disputed: true, // Esta relación está en disputa
            },
            {
              plaga: 'escoba de bruja cacao',
              controladores: ['Bacteria antagonista (biofungicida)'],
              disputed: false, // Esta relación NO está en disputa
            },
          ],
          biopreparados: [
            { id: 'emulsion_nim', nombre: 'Aceite/emulsión de nim (neem)', disputed: false },
            { id: 'biopreparado_disputado', nombre: 'Biopreparado disputado', disputed: true },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE_WITH_DISPUTED)));

    const bloque = await mod.buildOfflineGroundingBlock('theobroma_cacao');

    // Verificar que el bloque NO esté vacío (hay relaciones no disputadas)
    expect(bloque).not.toBe('');
    expect(bloque).toContain('RELACIONES DEL GRAFO (offline) — Cacao:');

    // Verificar que la relación disputada NO aparezca
    expect(bloque).not.toContain('moniliasis del cacao');
    expect(bloque).not.toContain('Biopreparado disputado');

    // Verificar que la relación NO disputada SÍ aparezca
    expect(bloque).toContain('escoba de bruja cacao');
    expect(bloque).toContain('Bacteria antagonista (biofungicida)');
    expect(bloque).toContain('Aceite/emulsión de nim (neem)');
  });

  // (a) buildOfflineGroundingBlock arma bloque completo con pest_controllers,
  // compatible_with, antagonist_of, biopreparados y nombres_comunes.
  it('buildOfflineGroundingBlock arma bloque con todos los campos relacionales presentes', async () => {
    const ALL_FIELDS_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        test_multifield: {
          nombre_comun: 'Especie multifield',
          nombre_cientifico: 'Testus multifieldus',
          nombres_comunes: ['nombre regional uno', 'nombre regional dos'],
          establishment_means: 'nativo',
          threat_status: 'ENDANGERED',
          conservation_status: 'cultivo_comun',
          compatible_with: ['compatible_a', 'compatible_b'],
          antagonist_of: ['antagonista_x'],
          pest_controllers: [
            { plaga: 'plaga uno', controladores: ['ctrl_a', 'ctrl_b'] },
            { plaga: 'plaga dos', controladores: ['ctrl_c'] },
          ],
          biopreparados: [
            { id: 'bp_uno', nombre: 'Biopreparado Uno' },
            { id: 'bp_dos', nombre: 'Biopreparado Dos' },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(ALL_FIELDS_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('test_multifield');

    expect(bloque).not.toBe('');
    expect(bloque).toContain('RELACIONES DEL GRAFO (offline) — Especie multifield:');
    expect(bloque).toContain('Nombres regionales: nombre regional uno, nombre regional dos.');
    expect(bloque).toContain('Compatible con (asociar): compatible_a, compatible_b.');
    expect(bloque).toContain('Antagonista de (NO asociar): antagonista_x.');
    expect(bloque).toContain('Plaga "plaga uno"');
    expect(bloque).toContain('ctrl_a, ctrl_b');
    expect(bloque).toContain('Plaga "plaga dos"');
    expect(bloque).toContain('ctrl_c');
    expect(bloque).toContain('Biopreparados: Biopreparado Uno, Biopreparado Dos.');
  });

  // (a) buildOfflineGroundingBlock: verifica que cada sección sólo aparece si
  // el campo existe realmente en los datos.
  it('buildOfflineGroundingBlock solo incluye secciones con datos presentes', async () => {
    const PARTIAL_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        solo_pest_controllers: {
          nombre_comun: 'Solo PC',
          pest_controllers: [
            { plaga: 'plaga solitaria', controladores: ['ctrl_solo'] },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PARTIAL_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('solo_pest_controllers');

    expect(bloque).toContain('RELACIONES DEL GRAFO (offline) — Solo PC:');
    expect(bloque).toContain('Plaga "plaga solitaria"');
    // No debe incluir secciones de campos ausentes
    expect(bloque).not.toContain('Nombres regionales');
    expect(bloque).not.toContain('Compatible con');
    expect(bloque).not.toContain('Antagonista de');
    expect(bloque).not.toContain('Biopreparados');
  });

  // (b) buildOfflineGroundingBlock para especie sin relaciones devuelve '' sin lanzar.
  it('buildOfflineGroundingBlock para especie sin relaciones devuelve cadena vacía', async () => {
    const MINIMAL_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        solo_header: {
          nombre_comun: 'Solo header',
          conservation_status: 'cultivo_comun',
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(MINIMAL_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('solo_header');
    // La especie existe pero no tiene relaciones → el bloque es solo el encabezado → ''
    expect(bloque).toBe('');

    // Especie desconocida también devuelve ''
    const bloqueDesconocido = await mod.buildOfflineGroundingBlock('no_existe_xyz');
    expect(bloqueDesconocido).toBe('');
  });

  // (b) buildOfflineGroundingBlock para especie con arreglos vacíos explícitos
  // tampoco incluye esas secciones y si todas son vacías devuelve ''.
  it('buildOfflineGroundingBlock ignora arreglos vacíos explícitos', async () => {
    const EMPTY_ARRAYS_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        arrays_vacios: {
          nombre_comun: 'Arrays vacíos',
          compatible_with: [],
          antagonist_of: [],
          pest_controllers: [],
          biopreparados: [],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(EMPTY_ARRAYS_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('arrays_vacios');
    expect(bloque).toBe('');
  });

  it('buildOfflineGroundingBlock ordena biopreparados por especificidad y muestra la etiqueta', async () => {
    const ORDER_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        papa_priorizada: {
          nombre_comun: 'Papa priorizada',
          biopreparados: [
            { id: 'bocashi', nombre: 'Bocashi', specificity: { score: 0.2, label: 'baja' } },
            { id: 'caldo_bordeles', nombre: 'Caldo bordelés', specificity: { score: 0.98, label: 'muy alta' } },
            { id: 'te_compost', nombre: 'Té de compost' },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(ORDER_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('papa_priorizada');
    expect(bloque).toContain('Biopreparados: Caldo bordelés (muy alta), Bocashi (baja), Té de compost.');
  });

  // (b) buildOfflineGroundingBlock con pest_controllers que tienen plaga vacía o null no falla.
  it('buildOfflineGroundingBlock ignora pest_controller sin plaga o sin controladores', async () => {
    const BROKEN_PC_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        pc_roto: {
          nombre_comun: 'PC Roto',
          pest_controllers: [
            { plaga: null, controladores: ['ctrl_a'] },
            { plaga: 'plaga_ok', controladores: [] },
            { plaga: 'plaga_bien', controladores: ['ctrl_b'] },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(BROKEN_PC_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('pc_roto');
    expect(bloque).not.toBe('');
    // Solo plaga_bien debe aparecer; plaga null y controladores vacíos se ignoran
    expect(bloque).toContain('Plaga "plaga_bien"');
    expect(bloque).not.toContain('ctrl_a');
    expect(bloque).not.toContain('plaga_ok');
  });

  // (c) nombres_comunes se exponen correctamente via getNombresComunesRegionales.
  it('getNombresComunesRegionales devuelve arreglo de nombres regionales', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    const nombres = await mod.getNombresComunesRegionales('passiflora_edulis_flavicarpa');
    expect(nombres).toEqual(['parcha']);

    // Especie sin nombres_comunes devuelve []
    const sinNombres = await mod.getNombresComunesRegionales('coffea_arabica');
    expect(sinNombres).toEqual([]);

    // Especie desconocida devuelve []
    const desconocida = await mod.getNombresComunesRegionales('no_existe_xyz');
    expect(desconocida).toEqual([]);
  });

  // (c) establishment_means y threat_status se exponen en el objeto retornado
  // por getRelationsForSpecies.
  it('getRelationsForSpecies expone establishment_means y threat_status del grafo', async () => {
    const STATUS_FIXTURE = {
      _meta: { schema_version: 1, species_count: 2 },
      species: {
        con_estatus: {
          nombre_comun: 'Con estatus',
          nombre_cientifico: 'Statusus completus',
          establishment_means: 'introducido',
          threat_status: 'VULNERABLE',
          conservation_status: 'cultivo_comun',
        },
        sin_estatus: {
          nombre_comun: 'Sin estatus',
          nombre_cientifico: 'Statusus nullus',
          conservation_status: 'cultivo_comun',
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(STATUS_FIXTURE)));

    const conEstatus = await mod.getRelationsForSpecies('con_estatus');
    expect(conEstatus).not.toBeNull();
    expect(conEstatus.establishment_means).toBe('introducido');
    expect(conEstatus.threat_status).toBe('VULNERABLE');

    const sinEstatus = await mod.getRelationsForSpecies('sin_estatus');
    expect(sinEstatus).not.toBeNull();
    expect(sinEstatus.establishment_means).toBeUndefined();
    expect(sinEstatus.threat_status).toBeUndefined();

    const desconocida = await mod.getRelationsForSpecies('no_existe_xyz');
    expect(desconocida).toBeNull();
  });

  // (d) __resetGrafoRelationsCache reinicia el cache y permite re-fetch.
  it('__resetGrafoRelationsCache limpia cache en memoria y permite re-fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE));
    vi.stubGlobal('fetch', fetchMock);

    // Primera carga
    const primera = await mod.loadGrafoRelations();
    expect(primera).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Segunda llamada usa cache, no re-fetch
    const segunda = await mod.loadGrafoRelations();
    expect(segunda).toBe(primera);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Reiniciamos cache
    mod.__resetGrafoRelationsCache();

    // Tercera carga después de reset debe re-fetchear
    const tercera = await mod.loadGrafoRelations();
    expect(tercera).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // (d) __resetGrafoRelationsCache limpia también el coalesce para permitir
  // reintento tras fallo previo.
  it('__resetGrafoRelationsCache permite reintentar carga tras fallo previo', async () => {
    // Primer intento: fetch falla
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caida')));
    const fallida = await mod.loadGrafoRelations();
    expect(fallida).toBeNull();

    // Reset
    mod.__resetGrafoRelationsCache();

    // Segundo intento: fetch funciona
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));
    const exitosa = await mod.loadGrafoRelations();
    expect(exitosa).not.toBeNull();
    expect(Object.keys(exitosa)).toContain('passiflora_edulis_flavicarpa');
  });

  // Edge case: buildOfflineGroundingBlock con biopreparado sin nombre usa id como fallback.
  it('buildOfflineGroundingBlock usa id de biopreparado cuando nombre está ausente', async () => {
    const BP_SIN_NOMBRE_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        bp_solo_id: {
          nombre_comun: 'BP solo ID',
          biopreparados: [
            { id: 'biofungicida_xyz' },
            { id: 'caldo_magico', nombre: 'Caldo Mágico' },
          ],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(BP_SIN_NOMBRE_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('bp_solo_id');
    expect(bloque).toContain('biofungicida_xyz');
    expect(bloque).toContain('Caldo Mágico');
  });

  // Edge case: buildOfflineGroundingBlock usa speciesId como fallback del nombre
  // cuando nombre_comun está ausente.
  it('buildOfflineGroundingBlock usa speciesId cuando nombre_comun no existe', async () => {
    const SIN_NOMBRE_FIXTURE = {
      _meta: { schema_version: 1, species_count: 1 },
      species: {
        species_sin_nombre: {
          nombre_cientifico: 'Anonymous spp.',
          compatible_with: ['aliado_x'],
        },
      },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(SIN_NOMBRE_FIXTURE)));

    const bloque = await mod.buildOfflineGroundingBlock('species_sin_nombre');
    expect(bloque).toContain('RELACIONES DEL GRAFO (offline) — species_sin_nombre:');
    expect(bloque).toContain('Compatible con (asociar): aliado_x.');
  });

  // Edge case: loadGrafoRelations con JSON malformado devuelve null sin lanzar.
  it('loadGrafoRelations con JSON inválido devuelve null sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: () => Promise.reject(new SyntaxError('JSON malformado')),
    }));

    const result = await mod.loadGrafoRelations();
    expect(result).toBeNull();
  });

  // Edge case: loadGrafoRelations con respuesta sin campo species devuelve null.
  it('loadGrafoRelations con JSON sin campo species devuelve null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({
      _meta: { schema_version: 1 },
    })));

    const result = await mod.loadGrafoRelations();
    expect(result).toBeNull();
  });

  // Edge case: loadGrafoRelations con content-type no-json devuelve null.
  it('loadGrafoRelations con content-type no json devuelve null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'text/html' : null) },
      json: () => Promise.resolve(FIXTURE),
    }));

    const result = await mod.loadGrafoRelations();
    expect(result).toBeNull();
  });

  // Edge case: getRelationsForSpecies con speciesId vacío o falsy devuelve null.
  it('getRelationsForSpecies con id vacío, null o undefined devuelve null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(FIXTURE)));

    expect(await mod.getRelationsForSpecies('')).toBeNull();
    expect(await mod.getRelationsForSpecies(null)).toBeNull();
    expect(await mod.getRelationsForSpecies(undefined)).toBeNull();
    expect(await mod.getRelationsForSpecies(0)).toBeNull();
  });

  // ---- Sinonimia de plagas/enfermedades (resolvePestSynonym) -------------
  // Fixture con la estructura nueva: _pest_synonyms (sinónimo → etiqueta
  // canónica) + _pest_index (etiqueta → especies afectadas). Datos REALES del
  // glosario regional colombiano (gota=tizón tardío, monilia=cacao, broca).
  const PEST_FIXTURE = {
    _meta: { schema_version: 1, species_count: 2 },
    _pest_synonyms: {
      gota: 'Tizon tardio / gota (papa y tomate)',
      'tizón tardío': 'Tizon tardio / gota (papa y tomate)',
      'phytophthora infestans': 'Tizon tardio / gota (papa y tomate)',
      monilia: 'moniliasis del cacao',
      moniliasis: 'moniliasis del cacao',
      broca: 'Broca del café',
    },
    _pest_index: {
      'Tizon tardio / gota (papa y tomate)': ['solanum_tuberosum', 'solanum_lycopersicum'],
      'moniliasis del cacao': ['theobroma_cacao'],
      'Broca del café': ['coffea_arabica'],
    },
    species: {
      theobroma_cacao: { nombre_comun: 'Cacao' },
    },
  };

  it('resolvePestSynonym: "gota" → tizón tardío + especies afectadas (papa/tomate)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    const r = await mod.resolvePestSynonym('gota');
    expect(r).not.toBeNull();
    expect(r.plaga).toBe('Tizon tardio / gota (papa y tomate)');
    expect(r.especiesAfectadas).toContain('solanum_tuberosum');
  });

  it('resolvePestSynonym: "Monilia" (mayúscula) → moniliasis del cacao', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    const r = await mod.resolvePestSynonym('Monilia');
    expect(r.plaga).toBe('moniliasis del cacao');
    expect(r.especiesAfectadas).toEqual(['theobroma_cacao']);
  });

  it('resolvePestSynonym: nombre científico "Phytophthora infestans" resuelve a la etiqueta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    const r = await mod.resolvePestSynonym('Phytophthora infestans');
    expect(r.plaga).toBe('Tizon tardio / gota (papa y tomate)');
  });

  it('resolvePestSynonym: etiqueta canónica exacta también resuelve', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    const r = await mod.resolvePestSynonym('Broca del café');
    expect(r.plaga).toBe('Broca del café');
    expect(r.especiesAfectadas).toEqual(['coffea_arabica']);
  });

  it('resolvePestSynonym: término sin match → null sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    expect(await mod.resolvePestSynonym('xyz no existe')).toBeNull();
    expect(await mod.resolvePestSynonym('')).toBeNull();
  });

  it('getPestIndex: devuelve el índice plaga → especies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(PEST_FIXTURE)));

    const idx = await mod.getPestIndex();
    expect(idx['moniliasis del cacao']).toEqual(['theobroma_cacao']);
  });

  it('resolvePestSynonym OFFLINE (fetch rechaza) → null sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caida')));

    expect(await mod.resolvePestSynonym('gota')).toBeNull();
    expect(await mod.getPestIndex()).toEqual({});
  });

  // ── SLICE conocimiento ampliado (2026-07-14) ────────────────────────────
  // Cobertura de los nuevos accesores para los 6 tópicos sourceados.
  const KNOWLEDGE_FIXTURE = {
    _meta: { schema_version: 1, species_count: 1 },
    _piso_termico: {
      definicion: 'Clasificación altitudinal andina.',
      fuentes: [
        {
          cite: 'Caldas, F.J. (1808). Memoria sobre el nivel de las plantas.',
          tipo: 'historico',
        },
      ],
      gradiente_termico_c_por_100m: 0.6,
      pisos: [
        {
          id: 'calido',
          nombre: 'Piso cálido tropical',
          altitud_m: { min: 0, max: 1000 },
          temperatura_media_c: { min: 24, max: 30 },
          cultivos_representativos: ['manihot_esculenta', 'zea_mays'],
          notas: 'Cultivos tropicales.',
        },
      ],
    },
    _micorrizas: {
      definicion: 'Simbiosis mutualista planta-hongo.',
      fuentes: [
        {
          cite: 'Smith & Read (2008). Mycorrhizal Symbiosis.',
          tipo: 'book',
        },
      ],
      tipos: [
        {
          id: 'amf',
          nombre: 'Micorrizas arbusculares (AMF)',
          caracteristicas: 'Hongos endófitos que forman arbúsculos.',
          hospederos_en_grafo: ['coffea_arabica', 'manihot_esculenta'],
        },
      ],
    },
    species: {
      manihot_esculenta: { nombre_comun: 'Yuca' },
    },
  };

  it('getKnowledgeTopics lista los tópicos disponibles (fixture con piso_termico)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    const topics = await mod.getKnowledgeTopics();
    expect(topics).toContain('_piso_termico');
    expect(topics).toContain('_micorrizas');
  });

  it('getKnowledgeTopic devuelve la sección cruda', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    const sec = await mod.getKnowledgeTopic('_piso_termico');
    expect(sec).not.toBeNull();
    expect(Array.isArray(sec.pisos)).toBe(true);
    expect(sec.gradiente_termico_c_por_100m).toBe(0.6);
  });

  it('getKnowledgeTopic normaliza key sin prefijo `_`', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    const sec = await mod.getKnowledgeTopic('micorrizas');
    expect(sec).not.toBeNull();
    expect(sec.tipos[0].id).toBe('amf');
  });

  it('getKnowledgeTopic rechaza tópico no declarado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    expect(await mod.getKnowledgeTopic('_inventado')).toBeNull();
    expect(await mod.getKnowledgeTopic('inventado')).toBeNull();
    expect(await mod.getKnowledgeTopic('')).toBeNull();
  });

  it('buildKnowledgeTopicBlock arma bloque con definicion, fuentes y pisos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    const bloque = await mod.buildKnowledgeTopicBlock('_piso_termico');
    expect(bloque).not.toBe('');
    expect(bloque).toContain('CONOCIMIENTO DEL GRAFO (offline) — piso_termico:');
    expect(bloque).toContain('Definición: Clasificación altitudinal andina.');
    expect(bloque).toContain('Fuentes: Caldas, F.J. (1808)');
    expect(bloque).toContain('Piso Piso cálido tropical (0-1000 m, 24-30 °C):');
    expect(bloque).toContain('manihot_esculenta, zea_mays');
  });

  it('buildKnowledgeTopicBlock arma bloque para micorrizas (tipos)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    const bloque = await mod.buildKnowledgeTopicBlock('micorrizas');
    expect(bloque).toContain('CONOCIMIENTO DEL GRAFO (offline) — micorrizas:');
    expect(bloque).toContain('Micorrizas arbusculares (AMF): coffea_arabica, manihot_esculenta.');
  });

  it('buildKnowledgeTopicBlock para tópico inexistente devuelve cadena vacía', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(KNOWLEDGE_FIXTURE)));
    expect(await mod.buildKnowledgeTopicBlock('_inventado')).toBe('');
    expect(await mod.buildKnowledgeTopicBlock('')).toBe('');
  });

  it('getKnowledgeTopics OFFLINE (fetch rechaza) → array vacío sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caida')));
    expect(await mod.getKnowledgeTopics()).toEqual([]);
    expect(await mod.getKnowledgeTopic('_piso_termico')).toBeNull();
    expect(await mod.buildKnowledgeTopicBlock('_piso_termico')).toBe('');
  });
});
