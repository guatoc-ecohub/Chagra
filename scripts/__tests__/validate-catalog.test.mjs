/**
 * scripts/__tests__/validate-catalog.test.mjs
 *
 * Cobertura unitaria de los validadores semánticos AMB-25/26/27 introducidos
 * en Batch 7A (Pasada 7 — auditoría agroecológica 2026-05-22). El módulo
 * principal `validate-catalog.mjs` mantiene un guard `import.meta.url`
 * alrededor del CLI para permitir que este test importe las funciones sin
 * disparar `process.exit()`.
 *
 * Convenciones de catálogo sintético:
 * - Cada catalog de test incluye solo los campos mínimos requeridos por el
 *   validador bajo prueba; no se valida JSON Schema completo.
 * - Los species fixture usan id snake_case + nombre real para que un fallo
 *   se lea de forma humana sin tener que crossref vs el seed.
 */
import { describe, it, expect } from 'vitest';

import {
  AUTORIDAD_ENUM_CANONICA_ESTRICTA,
  VALIDATION_LEVEL_ENUM,
  TOXICO_KEYWORDS,
  INSECT_KEYWORDS,
  PATHOGEN_KEYWORDS,
  validateAmb25_autoridadCanonicaEstricta,
  validateAmb26_validationLevelCanonico,
  validateAmb27_toxicoSinAdvertencia,
  validateAmb28_taxonomicConfusion,
  validateAmb29_speciesInBiopreparados,
  validateAmb31_crossContaminationInsectoPatogeno,
} from '../validate-catalog.mjs';

describe('AMB-25 — autoridad canónica estricta', () => {
  it('expone los 12 valores canónicos exactos', () => {
    expect(AUTORIDAD_ENUM_CANONICA_ESTRICTA.size).toBe(12);
    for (const v of ['MADS', 'ICA', 'IAvH', 'AGROSAVIA', 'MinCultura', 'MinSalud', 'MinJusticia', 'CAR', 'CORPOBOYACA', 'SDA-Bogota', 'UICN', 'IDEAM']) {
      expect(AUTORIDAD_ENUM_CANONICA_ESTRICTA.has(v)).toBe(true);
    }
  });

  it('acepta autoridades en el enum sin error', () => {
    const catalog = {
      species: [
        {
          id: 'eucalyptus_globulus',
          normativa_colombiana: [
            { tipo: 'regulatoria', autoridad: 'MADS', alcance: 'control invasoras' },
            { tipo: 'regulatoria', autoridad: 'ICA', alcance: 'cuarentena' },
          ],
        },
      ],
    };
    expect(validateAmb25_autoridadCanonicaEstricta(catalog)).toEqual([]);
  });

  it('reporta autoridades legacy fuera del enum (CAR Cundinamarca, IUCN, SDA Bogotá larga)', () => {
    const catalog = {
      species: [
        {
          id: 'acacia_melanoxylon',
          normativa_colombiana: [
            { tipo: 'regulatoria', autoridad: 'CAR Cundinamarca', alcance: 'control regional' },
            { tipo: 'estatus_conservacion', autoridad: 'IUCN', alcance: 'LC' },
            { tipo: 'regulatoria', autoridad: 'Secretaría Distrital de Ambiente Bogotá', alcance: 'invasora distrital' },
          ],
        },
      ],
    };
    const errors = validateAmb25_autoridadCanonicaEstricta(catalog);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain('"CAR Cundinamarca"');
    expect(errors[1]).toContain('"IUCN"');
    expect(errors[2]).toContain('"Secretaría Distrital de Ambiente Bogotá"');
    // Mensaje incluye sugerencia de batch responsable del sweep
    expect(errors[0]).toContain('Batch 3A');
  });

  it('ignora species sin normativa_colombiana o normativa string legacy', () => {
    const catalog = {
      species: [
        { id: 'no_norm' },
        { id: 'legacy_string', normativa_colombiana: 'string libre legacy' },
      ],
    };
    expect(validateAmb25_autoridadCanonicaEstricta(catalog)).toEqual([]);
  });

  it('ignora normativa_colombiana[i] sin autoridad', () => {
    const catalog = {
      species: [
        {
          id: 'sin_aut',
          normativa_colombiana: [
            { tipo: 'contexto_etnocultural', alcance: 'patrimonio cultural' },
          ],
        },
      ],
    };
    expect(validateAmb25_autoridadCanonicaEstricta(catalog)).toEqual([]);
  });
});

describe('AMB-26 — validation_level canónico', () => {
  it('expone los 5 valores canónicos exactos', () => {
    expect(VALIDATION_LEVEL_ENUM.size).toBe(5);
    for (const v of ['claude_draft', 'powo_validated', 'agrosavia_verified', 'expert_reviewed', 'published']) {
      expect(VALIDATION_LEVEL_ENUM.has(v)).toBe(true);
    }
  });

  it('acepta valores en el enum sin error', () => {
    const catalog = {
      species: [
        { id: 'a', validation_level: 'claude_draft' },
        { id: 'b', validation_level: 'powo_validated' },
        { id: 'c', validation_level: 'agrosavia_verified' },
        { id: 'd', validation_level: 'expert_reviewed' },
        { id: 'e', validation_level: 'published' },
      ],
    };
    expect(validateAmb26_validationLevelCanonico(catalog)).toEqual([]);
  });

  it('reporta valor legacy operator_reviewed', () => {
    const catalog = {
      species: [
        { id: 'acacia_melanoxylon', validation_level: 'operator_reviewed' },
      ],
    };
    const errors = validateAmb26_validationLevelCanonico(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"operator_reviewed"');
    expect(errors[0]).toContain('Batch 3A/5A');
  });

  it('ignora species sin validation_level', () => {
    const catalog = { species: [{ id: 'a' }, { id: 'b', validation_level: '' }] };
    expect(validateAmb26_validationLevelCanonico(catalog)).toEqual([]);
  });
});

describe('AMB-27 — toxico_sin_advertencia (WARN-only)', () => {
  it('expone keywords con tildes opcionales', () => {
    expect(TOXICO_KEYWORDS.length).toBeGreaterThanOrEqual(5);
    // 'tóxico' con tilde y 'toxico' sin tilde ambos matchean
    const rx = TOXICO_KEYWORDS.find((r) => r.test('contiene compuestos tóxicos'));
    expect(rx).toBeTruthy();
    const rx2 = TOXICO_KEYWORDS.find((r) => r.test('contiene compuestos toxicos'));
    expect(rx2).toBeTruthy();
  });

  it('emite warning cuando vp menciona toxicidad y falta advertencia_toxicologica', () => {
    const catalog = {
      species: [
        {
          id: 'ruta_graveolens',
          valor_pedagogico: 'La ruda es abortifaciente y puede causar fotosensibilidad en piel expuesta.',
        },
      ],
    };
    const warnings = validateAmb27_toxicoSinAdvertencia(catalog);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('ruta_graveolens');
    expect(warnings[0]).toContain('advertencia_toxicologica');
  });

  it('NO emite warning si advertencia_toxicologica está presente', () => {
    const catalog = {
      species: [
        {
          id: 'ruta_graveolens',
          valor_pedagogico: 'La ruda es abortifaciente.',
          advertencia_toxicologica: 'Contraindicada en gestación; ruta cutánea provoca fotodermatitis.',
        },
      ],
    };
    expect(validateAmb27_toxicoSinAdvertencia(catalog)).toEqual([]);
  });

  it('NO emite warning si vp no menciona toxicidad', () => {
    const catalog = {
      species: [
        { id: 'allium_cepa', valor_pedagogico: 'La cebolla aporta vitamina C y sabor base a la sopa.' },
      ],
    };
    expect(validateAmb27_toxicoSinAdvertencia(catalog)).toEqual([]);
  });

  it('matchea alcaloides letales como frase compuesta', () => {
    const catalog = {
      species: [
        { id: 'datura_stramonium', valor_pedagogico: 'Contiene alcaloides letales (escopolamina, atropina) — uso ritual restringido.' },
      ],
    };
    const warnings = validateAmb27_toxicoSinAdvertencia(catalog);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('alcaloide');
  });

  it('ignora species sin valor_pedagogico', () => {
    const catalog = { species: [{ id: 'sin_vp' }] };
    expect(validateAmb27_toxicoSinAdvertencia(catalog)).toEqual([]);
  });
});

describe('AMB-28 — confusión taxonómica conocida', () => {
  it('detecta gulupa confundida con guayaba en nombre_comun', () => {
    const catalog = {
      species: [
        {
          id: 'passiflora_edulis_morada',
          nombre_comun: 'Guayaba', // ERROR: debería ser 'Gulupa'
          nombre_cientifico: 'Passiflora edulis f. edulis',
        },
      ],
    };
    const errors = validateAmb28_taxonomicConfusion(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('passiflora_edulis_morada');
    expect(errors[0]).toContain('guayaba');
    expect(errors[0]).toContain('gulupa');
  });

  it('detecta aguacate confundido con guayaba en nombre_comun', () => {
    const catalog = {
      species: [
        {
          id: 'persea_americana',
          nombre_comun: 'Guayaba', // ERROR: debería ser 'Aguacate'
          nombre_cientifico: 'Persea americana',
        },
      ],
    };
    const errors = validateAmb28_taxonomicConfusion(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('persea_americana');
    expect(errors[0]).toContain('aguacate');
  });

  it('detecta confusión en nombres_comunes_regionales', () => {
    const catalog = {
      species: [
        {
          id: 'passiflora_edulis_morada',
          nombre_comun: 'Gulupa',
          nombres_comunes_regionales: ['Guayaba de pasiflora', 'Curuba'], // ERROR: 'Guayaba' en Passiflora es confusión
        },
      ],
    };
    const errors = validateAmb28_taxonomicConfusion(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('guayaba de pasiflora');
  });

  it('acepta nombres correctos sin error', () => {
    const catalog = {
      species: [
        {
          id: 'passiflora_edulis_morada',
          nombre_comun: 'Gulupa',
          nombre_cientifico: 'Passiflora edulis f. edulis',
          nombres_comunes_regionales: ['Gulupa morada', 'Curuba de tierra fría'],
        },
        {
          id: 'psidium_guajava',
          nombre_comun: 'Guayaba',
          nombre_cientifico: 'Psidium guajava',
        },
        {
          id: 'persea_americana',
          nombre_comun: 'Aguacate',
          nombre_cientifico: 'Persea americana',
        },
      ],
    };
    expect(validateAmb28_taxonomicConfusion(catalog)).toEqual([]);
  });

  it('ignora species sin nombre_comun', () => {
    const catalog = {
      species: [
        {
          id: 'sin_nombre',
          nombre_cientifico: 'Species unknown',
        },
      ],
    };
    expect(validateAmb28_taxonomicConfusion(catalog)).toEqual([]);
  });

  it('detecta múltiples confusiones en una sola especie', () => {
    const catalog = {
      species: [
        {
          id: 'passiflora_edulis_morada',
          nombre_comun: 'Gulupa con confusiones',
          nombres_comunes_regionales: [
            'Aguacate de pasiflora', // ERROR: aguacate en Passiflora
            'Guayaba de montaña'      // ERROR: guayaba en Passiflora
          ],
        },
      ],
    };
    const errors = validateAmb28_taxonomicConfusion(catalog);
    // Debería detectar al menos 2 errores (aguacate y guayaba)
    expect(errors.length).toBeGreaterThanOrEqual(2);
    // Verificar que ambos errores están presentes
    const hasAguacateError = errors.some(e => e.includes('aguacate'));
    const hasGuayabaError = errors.some(e => e.includes('guayaba'));
    expect(hasAguacateError).toBe(true);
    expect(hasGuayabaError).toBe(true);
  });
});

describe('AMB-29 — species en array biopreparados', () => {
  it('detecta species insertada dentro de biopreparados array', () => {
    const catalog = {
      species: [
        {
          id: 'psidium_guajava',
          nombre_comun: 'Guayaba',
          nombre_cientifico: 'Psidium guajava',
        },
      ],
      biopreparados: [
        {
          id: 'bocashi',
          nombre: 'Bocashi',
          tipo: 'fermentado',
        },
        {
          // ERROR: esto es una species, no un biopreparado
          id: 'passiflora_edulis_morada',
          nombre_comun: 'Gulupa',
          nombre_cientifico: 'Passiflora edulis f. edulis',
          companions: ['psidium_guajava'],
        },
      ],
    };
    const errors = validateAmb29_speciesInBiopreparados(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('biopreparados');
    expect(errors[0]).toContain('passiflora_edulis_morada');
    expect(errors[0]).toContain('nombre_cientifico');
  });

  it('detecta múltiples species mal insertadas', () => {
    const catalog = {
      species: [],
      biopreparados: [
        {
          id: 'bocashi',
          nombre: 'Bocashi',
          tipo: 'fermentado',
        },
        {
          id: 'persea_americana',
          nombre_comun: 'Aguacate',
          nombre_cientifico: 'Persea americana',
          category: 'frutales',
        },
        {
          id: 'psidium_guajava',
          nombre_comun: 'Guayaba',
          nombre_cientifico: 'Psidium guajava',
          companions: ['persea_americana'],
        },
      ],
    };
    const errors = validateAmb29_speciesInBiopreparados(catalog);
    expect(errors).toHaveLength(2);
  });

  it('acepta biopreparados válidos sin error', () => {
    const catalog = {
      species: [
        {
          id: 'psidium_guajava',
          nombre_comun: 'Guayaba',
        },
      ],
      biopreparados: [
        {
          id: 'bocashi',
          nombre: 'Bocashi',
          tipo: 'fermentado',
          ingredientes: ['gallinaza', 'melaza'],
        },
        {
          id: 'biol',
          nombre: 'Biol',
          tipo: 'fermentado',
          ingredientes: ['estiércol', 'melaza'],
        },
      ],
    };
    expect(validateAmb29_speciesInBiopreparados(catalog)).toEqual([]);
  });

  it('ignora catálogos sin biopreparados', () => {
    const catalog = {
      species: [
        {
          id: 'psidium_guajava',
          nombre_comun: 'Guayaba',
        },
      ],
    };
    expect(validateAmb29_speciesInBiopreparados(catalog)).toEqual([]);
  });

  it('detecta species markers sutiles (companions/antagonists sin target)', () => {
    const catalog = {
      biopreparados: [
        {
          id: 'algo_raro',
          nombre: 'Algo Raro',
          tipo: 'fermentado',
          // ERROR: companions es un campo de species, no de biopreparados
          companions: ['otra_especie'],
        },
      ],
    };
    const errors = validateAmb29_speciesInBiopreparados(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('companions');
  });
});

describe('AMB-31 — contaminación cruzada insecto ↔ patógeno', () => {
  it('expone las keywords de insectos canónicas', () => {
    expect(INSECT_KEYWORDS.length).toBe(4);
    expect(INSECT_KEYWORDS).toContain('agrotis');
    expect(INSECT_KEYWORDS).toContain('phyllophaga');
    expect(INSECT_KEYWORDS).toContain('tecia');
    expect(INSECT_KEYWORDS).toContain('bemisia');
  });

  it('expone las keywords de patógenos canónicas', () => {
    expect(PATHOGEN_KEYWORDS.length).toBe(4);
    expect(PATHOGEN_KEYWORDS).toContain('phytophthora');
    expect(PATHOGEN_KEYWORDS).toContain('erwinia');
    expect(PATHOGEN_KEYWORDS).toContain('hemileia');
    expect(PATHOGEN_KEYWORDS).toContain('roya');
  });

  it('detecta insecto (Agrotis) en enfermedades_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'solanum_tuberosum',
          nombre_comun: 'Papa',
          enfermedades_criticas: [
            'Tizón tardío (Phytophthora infestans)',
            'Trozador (Agrotis ipsilon)', // ERROR: es insecto, no enfermedad
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('solanum_tuberosum');
    expect(errors[0]).toContain('Agrotis');
    expect(errors[0]).toContain('enfermedades_criticas');
    expect(errors[0]).toContain('plagas_criticas');
  });

  it('detecta insecto (Phyllophaga) en enfermedades_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'zea_mays',
          nombre_comun: 'Maíz',
          enfermedades_criticas: [
            'Gusano blanco (Phyllophaga spp.)', // ERROR: es insecto
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Phyllophaga');
  });

  it('detecta insecto (Tecia) en enfermedades_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'solanum_lycopersicum',
          nombre_comun: 'Tomate',
          enfermedades_criticas: [
            'Palomilla (Tecia solanivora)', // ERROR: es insecto
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Tecia');
  });

  it('detecta insecto (Bemisia) en enfermedades_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'phaseolus_vulgaris',
          nombre_comun: 'Fríjol',
          enfermedades_criticas: [
            'Mosca blanca (Bemisia tabaci)', // ERROR: es insecto
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Bemisia');
  });

  it('detecta patógeno (Phytophthora) en plagas_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'solanum_tuberosum',
          nombre_comun: 'Papa',
          plagas_criticas: [
            'Broca (Rhyzoconia similis)',
            'Tizón tardío (Phytophthora infestans)', // ERROR: es patógeno, no plaga
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('solanum_tuberosum');
    expect(errors[0]).toContain('Phytophthora');
    expect(errors[0]).toContain('plagas_criticas');
    expect(errors[0]).toContain('enfermedades_criticas');
  });

  it('detecta patógeno (Erwinia) en plagas_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'malus_domestica',
          nombre_comun: 'Manzano',
          plagas_criticas: [
            'Fuego bacterial (Erwinia amylovora)', // ERROR: es patógeno
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Erwinia');
  });

  it('detecta patógeno (Hemileia) en plagas_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'coffea_arabica',
          nombre_comun: 'Café',
          plagas_criticas: [
            'Roya del café (Hemileia vastatrix)', // ERROR: es patógeno
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Hemileia');
  });

  it('detecta patógeno (roya) en plagas_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'triticum_aestivum',
          nombre_comun: 'Trigo',
          plagas_criticas: [
            'Royas del trigo (Puccinia spp.)', // ERROR: es patógeno
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('roya');
  });

  it('detecta múltiples contaminaciones en una sola especie', () => {
    const catalog = {
      species: [
        {
          id: 'solanum_tuberosum',
          nombre_comun: 'Papa',
          enfermedades_criticas: [
            'Trozador (Agrotis ipsilon)', // ERROR: insecto
            'Gusano blanco (Phyllophaga spp.)', // ERROR: insecto
          ],
          plagas_criticas: [
            'Tizón tardío (Phytophthora infestans)', // ERROR: patógeno
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(3);
    expect(errors.some(e => e.includes('Agrotis'))).toBe(true);
    expect(errors.some(e => e.includes('Phyllophaga'))).toBe(true);
    expect(errors.some(e => e.includes('Phytophthora'))).toBe(true);
  });

  it('acepta categorización correcta sin errores', () => {
    const catalog = {
      species: [
        {
          id: 'solanum_tuberosum',
          nombre_comun: 'Papa',
          plagas_criticas: [
            'Trozador (Agrotis ipsilon)', // CORRECTO: insecto en plagas
            'Gusano blanco (Phyllophaga spp.)', // CORRECTO: insecto en plagas
          ],
          enfermedades_criticas: [
            'Tizón tardío (Phytophthora infestans)', // CORRECTO: patógeno en enfermedades
            'Fuego bacterial (Erwinia carotovora)', // CORRECTO: patógeno en enfermedades
          ],
        },
        {
          id: 'coffea_arabica',
          nombre_comun: 'Café',
          plagas_criticas: [
            'Broca (Hypothenemus hampei)',
          ],
          enfermedades_criticas: [
            'Roya del café (Hemileia vastatrix)',
          ],
        },
      ],
    };
    expect(validateAmb31_crossContaminationInsectoPatogeno(catalog)).toEqual([]);
  });

  it('ignora species sin plagas_criticas ni enfermedades_criticas', () => {
    const catalog = {
      species: [
        {
          id: 'sin_pest',
          nombre_comun: 'Sin plagas ni enfermedades',
        },
        {
          id: 'solo_plagas',
          nombre_comun: 'Solo plagas',
          plagas_criticas: ['Broca'],
        },
        {
          id: 'solo_enfermedades',
          nombre_comun: 'Solo enfermedades',
          enfermedades_criticas: ['Roya'],
        },
      ],
    };
    expect(validateAmb31_crossContaminationInsectoPatogeno(catalog)).toEqual([]);
  });

  it('match es case-insensitive', () => {
    const catalog = {
      species: [
        {
          id: 'test_case',
          enfermedades_criticas: [
            'AGROTIS IPSILON', // mayúsculas
            'agrotis ipsilon', // minúsculas
            'Agrotis Ipsilon', // mixto
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(3);
  });

  it('match es substring para capturar variantes', () => {
    const catalog = {
      species: [
        {
          id: 'test_substring',
          plagas_criticas: [
            'Royas del cafeto (Hemileia vastatrix)', // contiene "roya"
            'Royas múltiples (Puccinia triticina)', // contiene "roya"
          ],
        },
      ],
    };
    const errors = validateAmb31_crossContaminationInsectoPatogeno(catalog);
    expect(errors).toHaveLength(2);
    expect(errors.every(e => e.includes('roya'))).toBe(true);
  });
});
