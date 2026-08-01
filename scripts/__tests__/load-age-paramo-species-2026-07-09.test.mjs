/**
 * scripts/__tests__/load-age-paramo-species-2026-07-09.test.mjs
 *
 * Cobertura del loader de especies de páramo: slug de binomio, cobertura
 * exacta del doc fuente (32 especies: 9 frailejones + 12 otras plantas +
 * 11 fauna), ausencia de datos inventados (UICN/familia solo cuando el doc
 * los da), e idempotencia (MERGE-only, sin CREATE / ON CREATE).
 */
import { describe, it, expect } from 'vitest';

import {
  binomialSlug,
  ECOSYSTEM,
  SOURCES,
  FRAILEJONES,
  OTRAS_PLANTAS,
  FAUNA,
  ALL_SPECIES,
  buildStatements,
} from '../load-age-paramo-species-2026-07-09.mjs';

describe('binomialSlug', () => {
  it('convierte genus+species a snake_case, descartando autor', () => {
    expect(binomialSlug('Espeletia grandiflora Bonpl.')).toBe('espeletia_grandiflora');
  });

  it('coincide con los ids ya establecidos del catálogo (evita duplicar nodos)', () => {
    // Verificado contra catalog/chagra-catalog-oss-subset-v3.2.json (2026-07-09):
    // estas especies ya existen en el grafo con id underscore.
    expect(binomialSlug('Espeletia grandiflora Humb. & Bonpl.')).toBe('espeletia_grandiflora');
    expect(binomialSlug('Polylepis quadrijuga Bitter')).toBe('polylepis_quadrijuga');
    expect(binomialSlug('Vaccinium floribundum Kunth')).toBe('vaccinium_floribundum');
    expect(binomialSlug('Quercus humboldtii Bonpl.')).toBe('quercus_humboldtii');
  });

  it('maneja autor con "ex" / paréntesis sin romper el slug', () => {
    expect(binomialSlug('Espeletia hartwegiana Sch.Bip. ex Cuatrec.')).toBe('espeletia_hartwegiana');
    expect(binomialSlug('Espeletiopsis santanderensis (A.C.Sm.) Cuatrec.')).toBe('espeletiopsis_santanderensis');
  });

  it('devuelve null si solo hay género (sin epíteto específico)', () => {
    expect(binomialSlug('Draba spp.')).toBeNull();
    expect(binomialSlug('Sphagnum')).toBeNull();
    expect(binomialSlug('')).toBeNull();
    expect(binomialSlug(null)).toBeNull();
  });
});

describe('cobertura del doc fuente', () => {
  it('trae las 9 fichas de frailejones con UICN', () => {
    expect(FRAILEJONES).toHaveLength(9);
    for (const f of FRAILEJONES) {
      expect(f.conservation_status).toMatch(/^(LC|NT|VU|EN|CR)$/);
      expect(f.family).toBe('Asteraceae');
    }
  });

  it('separa filas compuestas de "otras plantas" en especies reales (Puya x3)', () => {
    const puyas = OTRAS_PLANTAS.filter((p) => p.nombre_cientifico.startsWith('Puya '));
    expect(puyas.map((p) => p.id).sort()).toEqual(['puya_goudotiana', 'puya_nitida', 'puya_trianae']);
  });

  it('NO inventa especies para entradas de solo-género o conteos agregados', () => {
    const ids = OTRAS_PLANTAS.map((p) => p.id);
    // Draba spp. / Sphagnum spp. / ~77 orquídeas quedan fuera (ver nota E del script).
    expect(ids).not.toContain('draba_spp');
    expect(OTRAS_PLANTAS).toHaveLength(12);
  });

  it('solo asigna UICN cuando el doc lo da explícito (Bejaria resinosa = EN)', () => {
    const bejaria = OTRAS_PLANTAS.find((p) => p.id === 'bejaria_resinosa');
    expect(bejaria.conservation_status).toBe('EN');
    const resto = OTRAS_PLANTAS.filter((p) => p.id !== 'bejaria_resinosa');
    for (const p of resto) expect(p.conservation_status).toBeNull();
  });

  it('separa "Atelopus muisca/lozanoi" en 2 especies de fauna reales', () => {
    const ids = FAUNA.map((f) => f.id);
    expect(ids).toContain('atelopus_muisca');
    expect(ids).toContain('atelopus_lozanoi');
    expect(FAUNA).toHaveLength(11);
  });

  it('fauna no trae UICN ni familia inventada (el doc no las da)', () => {
    for (const f of FAUNA) {
      expect(f.conservation_status).toBeNull();
      expect(f.family).toBeNull();
    }
  });

  it('fauna cita solo Doc.1 (IAvH 2011), flora cita el compuesto 2011/2015', () => {
    expect(FAUNA.every((f) => f.source === 'IAvH 2011')).toBe(true);
    expect([...FRAILEJONES, ...OTRAS_PLANTAS].every((f) => f.source === 'IAvH 2011/2015')).toBe(true);
  });

  it('el total es 32 especies sin ids duplicados', () => {
    expect(ALL_SPECIES).toHaveLength(32);
    const ids = ALL_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(Boolean)).toBe(true);
  });
});

describe('buildStatements', () => {
  const stmts = buildStatements();

  it('nunca usa CREATE ni ON CREATE SET (solo MERGE + SET idempotente)', () => {
    for (const s of stmts) {
      expect(s).not.toMatch(/\bCREATE\s*\(/i);
      expect(s).not.toMatch(/ON CREATE/i);
    }
  });

  it('MERGE del Ecosystem paramo exactamente una vez', () => {
    const ecosystemMerges = stmts.filter((s) => s.includes("MERGE (n:Ecosystem {id: 'paramo'})"));
    expect(ecosystemMerges).toHaveLength(1);
    expect(ECOSYSTEM.id).toBe('paramo');
  });

  it('emite ambos nodos Source (IAvH 2011 y 2015)', () => {
    expect(SOURCES.map((s) => s.id)).toEqual([
      'iavh-2011-gran-libro-paramos',
      'iavh-2015-paramos-vivos-flora',
    ]);
  });

  it('emite exactamente una arista HABITAT_OF por especie, hacia Ecosystem paramo', () => {
    const habitatEdges = stmts.filter((s) => s.includes(':HABITAT_OF]->'));
    expect(habitatEdges).toHaveLength(ALL_SPECIES.length);
    for (const e of habitatEdges) {
      expect(e).toContain("MATCH (b:Ecosystem {id: 'paramo'})");
    }
  });

  it('es idempotente: correrlo dos veces produce el mismo output', () => {
    expect(buildStatements()).toEqual(stmts);
  });

  it('setea tanto la convención establecida (nombre_cientifico) como la pedida (scientific_name)', () => {
    const espeletia = stmts.find((s) => s.includes("MERGE (n:Species {id: 'espeletia_grandiflora'})"));
    expect(espeletia).toContain('nombre_cientifico:');
    expect(espeletia).toContain('nombre_comun:');
    expect(espeletia).toContain('scientific_name:');
    expect(espeletia).toContain('common_name:');
    expect(espeletia).toContain("family: 'Asteraceae'");
    expect(espeletia).toContain("conservation_status: 'LC'");
  });
});
