import { describe, expect, it } from 'vitest';

import {
  ARQUETIPOS_MORFOLOGICOS,
  ESPECIES_VETADAS,
  FAMILIA_A_ARQUETIPO,
  isVetada,
  clasificarArquetipo,
  derivarAltura,
  derivarPisoTermico,
  procesarEspecie,
  generarEstadisticas,
  generarDocumentacion,
} from '../../scripts/clasificar-arquetipos-flora.mjs';

describe('clasificar-arquetipos-flora', () => {
  describe('ARQUETIPOS_MORFOLOGICOS', () => {
    it('debe tener exactamente 12 arquetipos definidos', () => {
      expect(ARQUETIPOS_MORFOLOGICOS).toHaveLength(12);
    });

    it('cada arquetipo debe tener los campos requeridos', () => {
      for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
        expect(arquetipo).toHaveProperty('id');
        expect(arquetipo).toHaveProperty('nombre');
        expect(arquetipo).toHaveProperty('descripcion');
        expect(arquetipo).toHaveProperty('altura_tipica');
        expect(arquetipo).toHaveProperty('estratos');
        expect(arquetipo).toHaveProperty('familias_botanicas_clave');
        expect(arquetipo).toHaveProperty('categories_clave');
        expect(arquetipo).toHaveProperty('color_dominante');
      }
    });

    it('cada arquetipo debe tener altura_tipica con min, max y unidad', () => {
      for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
        expect(arquetipo.altura_tipica).toHaveProperty('min');
        expect(arquetipo.altura_tipica).toHaveProperty('max');
        expect(arquetipo.altura_tipica).toHaveProperty('unidad');
        expect(arquetipo.altura_tipica.min).toBeGreaterThan(0);
        expect(arquetipo.altura_tipica.max).toBeGreaterThan(arquetipo.altura_tipica.min);
      }
    });

    it('cada arquetipo debe tener color_dominante válido (HSL)', () => {
      for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
        expect(arquetipo.color_dominante).toHaveProperty('h');
        expect(arquetipo.color_dominante).toHaveProperty('s');
        expect(arquetipo.color_dominante).toHaveProperty('l');
        expect(arquetipo.color_dominante.h).toBeGreaterThanOrEqual(0);
        expect(arquetipo.color_dominante.h).toBeLessThanOrEqual(360);
        expect(arquetipo.color_dominante.s).toBeGreaterThanOrEqual(0);
        expect(arquetipo.color_dominante.s).toBeLessThanOrEqual(100);
        expect(arquetipo.color_dominante.l).toBeGreaterThanOrEqual(0);
        expect(arquetipo.color_dominante.l).toBeLessThanOrEqual(100);

        // Verificar que sea verde-dominante (H entre 80 y 160)
        expect(arquetipo.color_dominante.h).toBeGreaterThanOrEqual(80);
        expect(arquetipo.color_dominante.h).toBeLessThanOrEqual(160);
      }
    });

    it('los IDs de arquetipos deben ser únicos', () => {
      const ids = ARQUETIPOS_MORFOLOGICOS.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('ESPECIES_VETADAS', () => {
    it('debe incluir las especies vetadas conocidas', () => {
      expect(ESPECIES_VETADAS.has('eucalyptus_globulus')).toBe(true);
      expect(ESPECIES_VETADAS.has('pinus_patula')).toBe(true);
      expect(ESPECIES_VETADAS.has('ulex_europaeus')).toBe(true);
      expect(ESPECIES_VETADAS.has('acacia_mangium')).toBe(true);
    });

    it('debe ser un Set', () => {
      expect(ESPECIES_VETADAS).toBeInstanceOf(Set);
    });
  });

  describe('FAMILIA_A_ARQUETIPO', () => {
    it('debe mapear familias específicas a arquetipos', () => {
      expect(FAMILIA_A_ARQUETIPO['Arecaceae']).toBe('palma');
      expect(FAMILIA_A_ARQUETIPO['Poaceae']).toBe('graminea-macolla');
      expect(FAMILIA_A_ARQUETIPO['Orchidaceae']).toBe('epifita');
      expect(FAMILIA_A_ARQUETIPO['Cactaceae']).toBe('suculenta-cactacea');
    });

    it('familias complejas deben ser null (requieren más contexto)', () => {
      expect(FAMILIA_A_ARQUETIPO['Fabaceae']).toBeNull();
      expect(FAMILIA_A_ARQUETIPO['Asteraceae']).toBeNull();
      expect(FAMILIA_A_ARQUETIPO['Solanaceae']).toBeNull();
    });
  });

  describe('isVetada', () => {
    it('detecta eucalipto por ID', () => {
      expect(isVetada({ id: 'eucalyptus_globulus', nombre_cientifico: 'Eucalyptus globulus' })).toBe(true);
    });

    it('detecta pino patula por ID', () => {
      expect(isVetada({ id: 'pinus_patula', nombre_cientifico: 'Pinus patula' })).toBe(true);
    });

    it('detecta retamo espinoso (ulex) por ID', () => {
      expect(isVetada({ id: 'ulex_europaeus', nombre_cientifico: 'Ulex europaeus L.' })).toBe(true);
    });

    it('detecta acacia mangium por ID', () => {
      expect(isVetada({ id: 'acacia_mangium', nombre_cientifico: 'Acacia mangium' })).toBe(true);
    });

    it('detecta acacia melanoxylon por ID', () => {
      expect(isVetada({ id: 'acacia_melanoxylon', nombre_cientifico: 'Acacia melanoxylon' })).toBe(true);
    });

    it('detecta eucalipto por patrón en nombre_cientifico', () => {
      expect(isVetada({ id: 'otro_id', nombre_cientifico: 'Eucalyptus camaldulensis' })).toBe(true);
    });

    it('no marca especies no vetadas', () => {
      expect(isVetada({ id: 'coffea_arabica', nombre_cientifico: 'Coffea arabica L.' })).toBe(false);
      expect(isVetada({ id: 'arracacia_xanthorrhiza', nombre_cientifico: 'Arracacia xanthorrhiza' })).toBe(false);
    });
  });

  describe('clasificarArquetipo', () => {
    it('marca como VETADA las especies vetadas', () => {
      const eucalipto = {
        id: 'eucalyptus_globulus',
        nombre_cientifico: 'Eucalyptus globulus Labill.',
        familia_botanica: 'Myrtaceae',
        category: 'especies_invasoras',
        estrato: 'emergente',
      };

      const result = clasificarArquetipo(eucalipto);
      expect(result.arquetipo).toBe('VETADA');
      expect(result.confianza).toBe(1.0);
      expect(result.razon).toContain('vetada');
    });

    it('clasifica palmas correctamente por familia', () => {
      const palma = {
        id: 'bactris_gasipaes',
        nombre_cientifico: 'Bactris gasipaes Kunth',
        familia_botanica: 'Arecaceae',
        category: 'frutales_perennes',
        estrato: 'alto',
      };

      const result = clasificarArquetipo(palma);
      expect(result.arquetipo).toBe('palma');
      expect(result.confianza).toBeGreaterThan(0.8);
      expect(result.razon).toContain('Arecaceae');
    });

    it('clasifica gramíneas correctamente por familia', () => {
      const maiz = {
        id: 'zea_mays',
        nombre_cientifico: 'Zea mays L.',
        familia_botanica: 'Poaceae',
        category: 'cereales',
        estrato: 'alto',
      };

      const result = clasificarArquetipo(maiz);
      expect(result.arquetipo).toBe('graminea-macolla');
      expect(result.confianza).toBeGreaterThan(0.8);
    });

    it('clasifica cactáceas correctamente por familia', () => {
      const cactus = {
        id: 'selenicereus_megalanthus',
        nombre_cientifico: 'Selenicereus megalanthus',
        familia_botanica: 'Cactaceae',
        category: 'frutales_perennes',
        estrato: 'medio',
      };

      const result = clasificarArquetipo(cactus);
      expect(result.arquetipo).toBe('suculenta-cactacea');
      expect(result.confianza).toBeGreaterThan(0.8);
    });

    it('clasifica helechos arbóreos por género', () => {
      const helecho = {
        id: 'pteridium_aquilinum',
        nombre_cientifico: 'Pteridium aquilinum (L.) Kuhn',
        familia_botanica: 'Dennstaedtiaceae',
        category: 'especies_invasoras',
        estrato: 'bajo',
      };

      const result = clasificarArquetipo(helecho);
      expect(result.arquetipo).toBe('helecho-arboreo');
    });

    it('clasifica trepadoras por género Ipomoea', () => {
      const batata = {
        id: 'ipomoea_batatas',
        nombre_cientifico: 'Ipomoea batatas (L.) Lam.',
        familia_botanica: 'Convolvulaceae',
        category: 'tuberculos_raices',
        estrato: null,
      };

      const result = clasificarArquetipo(batata);
      expect(result.arquetipo).toBe('trepadora-liana');
      expect(result.razon).toContain('ipomoea'); // lowercase en el código
    });

    it('clasifica vainilla (Vanilla) como epifita orquídea', () => {
      const vainilla = {
        id: 'vanilla_planifolia',
        nombre_cientifico: 'Vanilla planifolia',
        familia_botanica: 'Orchidaceae',
        category: 'medicinales_alelopaticas',
        estrato: 'medio',
      };

      const result = clasificarArquetipo(vainilla);
      expect(result.arquetipo).toBe('epifita');
      expect(result.razon).toContain('Orchidaceae');
    });

    it('clasifica árboles de dosel por estrato alto + categoría', () => {
      const arbol = {
        id: 'cedrela_odorata',
        nombre_cientifico: 'Cedrela odorata L.',
        familia_botanica: 'Meliaceae',
        category: 'arboles_sombra',
        estrato: 'alto',
      };

      const result = clasificarArquetipo(arbol);
      expect(result.arquetipo).toBe('arbol-dosel-copa-ancha');
    });

    it('clasifica especies rastreras por estrato', () => {
      const rastrera = {
        id: 'fragaria_ananassa',
        nombre_cientifico: 'Fragaria × ananassa',
        familia_botanica: 'Rosaceae',
        category: 'frutales_perennes',
        estrato: 'rastrero',
      };

      const result = clasificarArquetipo(rastrera);
      expect(result.arquetipo).toBe('rastrera-tapizante');
    });

    it('asigna confianza baja a especies sin información morfológica', () => {
      const sinInfo = {
        id: 'especie_desconocida',
        nombre_cientifico: 'Species desconocida',
        familia_botanica: null,
        category: null,
        estrato: null,
      };

      const result = clasificarArquetipo(sinInfo);
      expect(result.confianza).toBeLessThan(0.5);
      expect(result.arquetipo).toBe('herbacea-erecta'); // default
      expect(result.razon).toContain('REVISAR');
    });

    it('asigna confianza media-alta a clasificaciones con estrato', () => {
      const conEstrato = {
        id: 'alnus_acuminata',
        nombre_cientifico: 'Alnus acuminata Kunth',
        familia_botanica: 'Betulaceae',
        category: 'abonos_verdes_coberturas',
        estrato: 'alto',
      };

      const result = clasificarArquetipo(conEstrato);
      expect(result.confianza).toBeGreaterThanOrEqual(0.5);
    });

    it('retorna siempre un arquetipo válido', () => {
      const minimalSpecies = {
        id: 'min',
        nombre_cientifico: 'Minimal',
      };

      const result = clasificarArquetipo(minimalSpecies);
      expect(result).toHaveProperty('arquetipo');
      expect(result).toHaveProperty('confianza');
      expect(result).toHaveProperty('razon');
      expect(result.confianza).toBeGreaterThanOrEqual(0);
      expect(result.confianza).toBeLessThanOrEqual(1);
    });
  });

  describe('derivarAltura', () => {
    it('deriva altura para estrato emergente', () => {
      const emergente = {
        estrato: 'emergente',
        category: 'arboles_sombra',
      };

      const altura = derivarAltura(emergente);
      expect(altura.min).toBeGreaterThanOrEqual(40);
      expect(altura.max).toBeLessThanOrEqual(70);
      expect(altura.unidad).toBe('m');
    });

    it('deriva altura para estrato alto', () => {
      const alto = {
        estrato: 'alto',
        category: 'frutales_perennes',
      };

      const altura = derivarAltura(alto);
      expect(altura.min).toBeGreaterThanOrEqual(3);
      expect(altura.max).toBeLessThanOrEqual(35);
      expect(altura.unidad).toBe('m');
    });

    it('deriva altura para estrato medio', () => {
      const medio = {
        estrato: 'medio',
        category: 'medicinales_alelopaticas',
      };

      const altura = derivarAltura(medio);
      expect(altura.min).toBeGreaterThanOrEqual(1.5);
      expect(altura.max).toBeLessThanOrEqual(6);
      expect(altura.unidad).toBe('m');
    });

    it('deriva altura para estrato bajo', () => {
      const bajo = {
        estrato: 'bajo',
        category: 'medicinales_alelopaticas',
      };

      const altura = derivarAltura(bajo);
      expect(altura.min).toBeGreaterThanOrEqual(0.3);
      expect(altura.max).toBeLessThanOrEqual(1.5);
      expect(altura.unidad).toBe('m');
    });

    it('deriva altura para estrato rastrero', () => {
      const rastrero = {
        estrato: 'rastrero',
        category: 'abonos_verdes_coberturas',
      };

      const altura = derivarAltura(rastrero);
      expect(altura.min).toBeLessThan(0.5);
      expect(altura.max).toBeLessThanOrEqual(0.5);
      expect(altura.unidad).toBe('m');
    });

    it('deriva altura por categoría si no hay estrato', () => {
      const sinEstrato = {
        estrato: null,
        category: 'hortalizas_hoja',
      };

      const altura = derivarAltura(sinEstrato);
      expect(altura).toHaveProperty('min');
      expect(altura).toHaveProperty('max');
      expect(altura).toHaveProperty('unidad');
      expect(altura.unidad).toBe('m');
    });

    it('retorna altura default para especies sin categoría', () => {
      const sinInfo = {
        estrato: null,
        category: null,
      };

      const altura = derivarAltura(sinInfo);
      expect(altura.min).toBeGreaterThan(0);
      expect(altura.max).toBeGreaterThan(altura.min);
    });
  });

  describe('derivarPisoTermico', () => {
    it('usa thermal_zones si están disponibles', () => {
      const conZonas = {
        thermal_zones: ['templado', 'frio'],
        altitud_msnm: null,
      };

      const pisos = derivarPisoTermico(conZonas);
      expect(pisos).toEqual(['templado', 'frio']);
    });

    it('deriva de altitud_msnm si no hay thermal_zones', () => {
      const conAltitud = {
        thermal_zones: [],
        altitud_msnm: {
          min_absoluto: 1200,
          max_absoluto: 2200,
        },
      };

      const pisos = derivarPisoTermico(conAltitud);
      expect(pisos).toContain('templado');
    });

    it('deriva multiple pisos para rangos amplios', () => {
      const rangoAmplio = {
        thermal_zones: [],
        altitud_msnm: {
          min_absoluto: 500,
          max_absoluto: 3500,
        },
      };

      const pisos = derivarPisoTermico(rangoAmplio);
      expect(pisos.length).toBeGreaterThan(1);
      expect(pisos).toContain('calido');
      expect(pisos).toContain('templado');
      expect(pisos).toContain('frio');
      expect(pisos).toContain('paramo');
    });

    it('retorna array vacío si no hay datos', () => {
      const sinDatos = {
        thermal_zones: [],
        altitud_msnm: null,
      };

      const pisos = derivarPisoTermico(sinDatos);
      expect(pisos).toEqual([]);
    });
  });

  describe('procesarEspecie', () => {
    it('procesa una especie completa correctamente', () => {
      const especie = {
        id: 'coffea_arabica',
        nombre_cientifico: 'Coffea arabica L.',
        familia_botanica: 'Rubiaceae',
        category: 'medicinales_alelopaticas',
        estrato: 'medio',
        thermal_zones: ['templado'],
        altitud_msnm: {
          min_absoluto: 1200,
          max_absoluto: 2200,
        },
      };

      const resultado = procesarEspecie(especie);

      expect(resultado).toHaveProperty('especie_id', 'coffea_arabica');
      expect(resultado).toHaveProperty('nombre_cientifico');
      expect(resultado).toHaveProperty('familia_botanica');
      expect(resultado).toHaveProperty('category');
      expect(resultado).toHaveProperty('estrato');
      expect(resultado).toHaveProperty('arquetipo');
      expect(resultado).toHaveProperty('altura_m');
      expect(resultado).toHaveProperty('piso_termico');
      expect(resultado).toHaveProperty('confianza');
      expect(resultado).toHaveProperty('razon');

      expect(resultado.arquetipo).toBe('arbusto-denso');
      expect(resultado.confianza).toBeGreaterThan(0);
      expect(resultado.piso_termico).toContain('templado');
    });

    it('procesa especie vetada correctamente', () => {
      const vetada = {
        id: 'eucalyptus_globulus',
        nombre_cientifico: 'Eucalyptus globulus Labill.',
        familia_botanica: 'Myrtaceae',
        category: 'especies_invasoras',
        estrato: 'emergente',
      };

      const resultado = procesarEspecie(vetada);

      expect(resultado.arquetipo).toBe('VETADA');
      expect(resultado.confianza).toBe(1.0);
    });

    it('maneja especies con campos null', () => {
      const minimal = {
        id: 'test',
        nombre_cientifico: 'Test test',
      };

      const resultado = procesarEspecie(minimal);

      expect(resultado.especie_id).toBe('test');
      expect(resultado.familia_botanica).toBeNull();
      expect(resultado.category).toBeNull();
      expect(resultado.estrato).toBeNull();
      expect(resultado).toHaveProperty('arquetipo');
      expect(resultado).toHaveProperty('altura_m');
    });
  });

  describe('generarEstadisticas', () => {
    it('genera estadísticas correctamente', () => {
      const clasificaciones = [
        { arquetipo: 'arbol-dosel-copa-ancha', confianza: 0.9, category: 'arboles_sombra', piso_termico: ['frio'] },
        { arquetipo: 'palma', confianza: 0.85, category: 'frutales_perennes', piso_termico: ['calido'] },
        { arquetipo: 'herbacea-erecta', confianza: 0.4, category: 'hortalizas_hoja', piso_termico: ['templado'] },
        { arquetipo: 'VETADA', confianza: 1.0, category: 'especies_invasoras', piso_termico: [] },
      ];

      const stats = generarEstadisticas(clasificaciones);

      expect(stats.total_especies).toBe(4);
      expect(stats.por_arquetipo['arbol-dosel-copa-ancha']).toBe(1);
      expect(stats.por_arquetipo['palma']).toBe(1);
      expect(stats.por_arquetipo['herbacea-erecta']).toBe(1);
      expect(stats.por_arquetipo['VETADA']).toBe(1);
      expect(stats.por_confianza.alta).toBe(3); // 0.9, 0.85, y VETADA=1.0
      expect(stats.por_confianza.media).toBe(0);
      expect(stats.por_confianza.baja).toBe(1);
      expect(stats.vetadas).toBe(1);
      expect(stats.sin_piso_termico).toBe(1);
    });

    it('cuenta correctamente por confianza', () => {
      const clasificaciones = [
        { arquetipo: 'a', confianza: 0.9, category: 'x', piso_termico: ['a'] },
        { arquetipo: 'b', confianza: 0.7, category: 'y', piso_termico: ['b'] },
        { arquetipo: 'c', confianza: 0.4, category: 'z', piso_termico: ['c'] },
      ];

      const stats = generarEstadisticas(clasificaciones);

      expect(stats.por_confianza.alta).toBe(1);
      expect(stats.por_confianza.media).toBe(1);
      expect(stats.por_confianza.baja).toBe(1);
    });
  });

  describe('generarDocumentacion', () => {
    it('genera documentación Markdown válida', () => {
      const clasificaciones = [
        {
          especie_id: 'test',
          nombre_cientifico: 'Test test',
          familia_botanica: 'Testaceae',
          category: 'test',
          estrato: 'medio',
          arquetipo: 'arbusto-denso',
          confianza: 0.8,
          razon: 'Test',
          altura_m: { min: 2, max: 4, unidad: 'm' },
          piso_termico: ['templado'],
        },
      ];

      const stats = generarEstadisticas(clasificaciones);
      const docs = generarDocumentacion(clasificaciones, stats);

      expect(docs).toContain('# Arquetipos Morfológicos de Flora');
      expect(docs).toContain('## Los 12 Arquetipos Morfológicos');
      expect(docs).toContain('## Descripción Detallada por Arquetipo');
      expect(docs).toContain('arbusto-denso');
      expect(docs).toContain('Test test');
    });

    it('incluye tabla de arquetipos', () => {
      const clasificaciones = [
        {
          especie_id: 'a',
          nombre_cientifico: 'A a',
          arquetipo: 'palma',
          confianza: 0.9,
          altura_m: { min: 5, max: 15, unidad: 'm' },
          piso_termico: [],
          razon: '',
        },
      ];

      const stats = generarEstadisticas(clasificaciones);
      const docs = generarDocumentacion(clasificaciones, stats);

      expect(docs).toContain('| Arquetipo | Descripción | Altura típica |');
    });

    it('incluye sección de especies vetadas si las hay', () => {
      const clasificaciones = [
        {
          especie_id: 'eucalyptus_globulus',
          nombre_cientifico: 'Eucalyptus globulus',
          arquetipo: 'VETADA',
          confianza: 1.0,
          altura_m: null,
          piso_termico: [],
          razon: 'Especie vetada',
        },
      ];

      const stats = generarEstadisticas(clasificaciones);
      const docs = generarDocumentacion(clasificaciones, stats);

      expect(docs).toContain('### VETADA: Especies Vetadas del Proyecto');
      expect(docs).toContain('eucalyptus_globulus');
    });

    it('incluye sección de especies con baja confianza si las hay', () => {
      const clasificaciones = [
        {
          especie_id: 'test',
          nombre_cientifico: 'Test',
          arquetipo: 'herbacea-erecta',
          confianza: 0.3,
          altura_m: { min: 0.5, max: 1, unidad: 'm' },
          piso_termico: [],
          razon: 'Sin información suficiente',
          category: 'test',
          familia_botanica: 'Testaceae',
          estrato: null,
        },
      ];

      const stats = generarEstadisticas(clasificaciones);
      const docs = generarDocumentacion(clasificaciones, stats);

      expect(docs).toContain('## Especies con Confianza Baja');
      expect(docs).toContain('test');
    });
  });
});
