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
  validateAmb25_autoridadCanonicaEstricta,
  validateAmb26_validationLevelCanonico,
  validateAmb27_toxicoSinAdvertencia,
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
