/**
 * outputGuards.taxonomy.test.js — REGRESIÓN: el guard A24 (`applyTaxonomyGuard`)
 * se REMOVIÓ por estar MUERTO en producción (2026-06-06).
 *
 * CONTEXTO DEL BUG (confirmado empíricamente, fix/taxonomy-guard-a24-dead):
 *   `applyTaxonomyGuard` llamaba al tool `validate_taxonomy` del sidecar y
 *   filtraba sus resultados por `res.valid === false`. Pero el tool REAL
 *   (`chagra-pro/modules/agro-mcp/src/tools/age-tools.ts` → `validateTaxonomy`)
 *   NUNCA devuelve un campo `valid`: su contrato es
 *
 *     { available, source: "catalog"|"age"|"none", found: boolean,
 *       canonical_id, canonical_common, canonical_scientific,
 *       scientific_input_matched?, alternatives, age_enriched?, ... }
 *
 *   El campo `valid` SOLO existe en OTRO tool —`validate_visual_match`
 *   (pipeline de visión)—, que devuelve un ARRAY de `{species_id, valid, ...}`.
 *   El servidor MCP serializa el resultado del handler verbatim y el
 *   `sidecarClient.callTool` lo entrega sin transformar, así que el guard recibía
 *   `{found, ...}` y `res.valid === false` era SIEMPRE `false`: la rama de
 *   corrección JAMÁS disparaba fuera de los mocks de test (que falsamente
 *   devolvían `{valid}`, enmascarando el bug).
 *
 * POR QUÉ SE REMOVIÓ (Opción B) en vez de re-wirearlo (Opción A):
 *   La única señal real disponible es `found === false` = "no está en el
 *   catálogo Chagra (~496 especies)". Tratar eso como alucinación para un
 *   binomio ARBITRARIO en CUALQUIER contexto es exactamente el falso-positivo
 *   que el guard #1332 (`guardFabricatedBeneficialBinomial`) prohíbe: Colombia
 *   tiene muchísimas especies nativas REALES fuera del catálogo, y "no en
 *   catálogo" ≠ "inventado". La única versión acotada de A (solo en contexto de
 *   organismo benéfico) YA la cubre #1332 —determinístico, con allowlist curada
 *   de géneros de biocontrol, sin round-trip de red—. Re-wirear A duplicaría esa
 *   cobertura reintroduciendo el FP y la dependencia de red.
 *
 * Cobertura taxonómica REAL hoy (sin el guard A24):
 *   - `guardFabricatedBeneficialBinomial` (#1332): caveat suave a binomios de
 *     enemigo natural / biocontrol cuyo género no es de biocontrol conocido.
 *   - `guardSpeciesSubstitution` / `guardCompanionBinomial` (5/5b): corrigen
 *     binomios errados del CULTIVO principal y de companions/antagonists contra
 *     el grounding curado del turno.
 *   - El grounding de `resolve-entities` ancla los binomios en el catálogo/AGE
 *     antes de generar.
 *
 * Este test FIJA el contrato real del tool y verifica que el guard muerto ya no
 * se exporta, para que nadie re-introduzca una rama `res.valid` contra un tool
 * que no la produce.
 */

import { describe, it, expect } from 'vitest';
import * as outputGuards from '../outputGuards.js';

describe('applyTaxonomyGuard (A24) — guard muerto removido', () => {
  it('ya NO se exporta desde outputGuards (rama res.valid era no-op en prod)', () => {
    expect(/** @type {any} */ (outputGuards).applyTaxonomyGuard).toBeUndefined();
    expect('applyTaxonomyGuard' in outputGuards).toBe(false);
  });

  it('la cobertura taxonómica viva sigue exportada (no se removió protección real)', () => {
    // #1332 — binomio de organismo benéfico fabricado.
    expect(typeof outputGuards.guardFabricatedBeneficialBinomial).toBe('function');
    // 5/5b — sustitución de especie y binomio de companion.
    expect(typeof outputGuards.guardSpeciesSubstitution).toBe('function');
    expect(typeof outputGuards.guardCompanionBinomial).toBe('function');
  });
});

describe('contrato REAL de validate_taxonomy (fijado para evitar regresión)', () => {
  // Snapshots de las 4 formas que devuelve `validateTaxonomy` en el sidecar
  // (age-tools.ts). NINGUNA tiene `valid` — esa era la premisa falsa del guard
  // muerto. Si el tool cambiara su contrato, este test debe revisarse a mano.

  /** match en catálogo */
  const catalogHit = {
    available: true,
    source: 'catalog',
    found: true,
    canonical_id: '42',
    canonical_common: 'gulupa',
    canonical_scientific: 'Passiflora edulis f. edulis',
    scientific_input_matched: false,
    confidence_min: 0.5,
    alternatives: [],
    age_enriched: false,
  };

  /** sin match (AGE caído o AGE sin match): la ÚNICA señal negativa es found:false */
  const notFound = {
    available: true,
    source: 'none',
    found: false,
    query: { species_common: null, species_scientific: 'Inventus fakeus' },
    alternatives: [],
    hint: 'No species matched in catalog or AGE.',
  };

  /** match vía AGE (Species ∪ Pest) */
  const ageHit = {
    available: true,
    source: 'age',
    found: true,
    canonical_id: '900',
    canonical_common: 'roya',
    canonical_scientific: 'Hemileia vastatrix',
    scientific_input_matched: null,
    alternatives: [],
    age_enriched: true,
  };

  it('ninguna forma de validate_taxonomy expone un campo `valid`', () => {
    for (const shape of [catalogHit, notFound, ageHit]) {
      expect(shape).not.toHaveProperty('valid');
      // `res.valid === false` (la condición del guard muerto) era siempre false.
      expect(shape.valid === false).toBe(false);
    }
  });

  it('la señal negativa real es `found === false`, no `valid === false`', () => {
    expect(notFound.found).toBe(false);
    expect(catalogHit.found).toBe(true);
    expect(ageHit.found).toBe(true);
  });

  it('`found:false` NO implica alucinación (puede ser nativa real fuera del catálogo)', () => {
    // Documenta la razón de Opción B: el catálogo es ~496 especies; un binomio
    // ausente puede ser una nativa colombiana legítima. Por eso `found:false`
    // por sí solo NUNCA debe suprimir ni marcar como inventado un binomio
    // arbitrario — sólo el contexto acotado de #1332 puede anexar caveat suave.
    expect(notFound.found).toBe(false);
    expect(notFound.source).toBe('none');
  });
});
