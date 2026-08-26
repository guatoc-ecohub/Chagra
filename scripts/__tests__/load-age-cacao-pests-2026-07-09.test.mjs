/**
 * scripts/__tests__/load-age-cacao-pests-2026-07-09.test.mjs
 *
 * Cobertura del loader de plagas de cacao: slug de binomio coincide con los
 * ids ya existentes en el grafo, las 8 fuentes verificadas están completas
 * (DOI o Work ID real, nunca ambos vacíos), cada plaga cita al menos una
 * fuente, la arista AFFECTS apunta al cacao ya existente, e idempotencia
 * (MERGE-only, sin CREATE / ON CREATE).
 */
import { describe, it, expect } from 'vitest';

import {
  binomialSlug,
  CACAO_SPECIES_ID,
  SOURCES,
  PESTS,
  buildStatements,
} from '../load-age-cacao-pests-2026-07-09.mjs';

describe('binomialSlug', () => {
  it('convierte genus+species a snake_case, descartando autor/año', () => {
    expect(binomialSlug('Selenothrips rubrocinctus (Giard)')).toBe('selenothrips_rubrocinctus');
    expect(binomialSlug('Carmenta foraseminis Eichlin, 1995')).toBe('carmenta_foraseminis');
  });

  it('coincide con los ids ya existentes en el grafo (evita duplicar nodos)', () => {
    // Verificado contra catalog/chagra-kg-graph-snapshot.json (2026-07-09):
    // ambos Pest ya existen con estos ids (origen mip-backlog-2026-06-04).
    expect(PESTS.map((p) => p.id).sort()).toEqual([
      'carmenta_foraseminis',
      'selenothrips_rubrocinctus',
    ]);
  });

  it('devuelve null si solo hay género (sin epíteto específico)', () => {
    expect(binomialSlug('Selenothrips sp.')).toBeNull();
    expect(binomialSlug('')).toBeNull();
    expect(binomialSlug(null)).toBeNull();
  });
});

describe('cacao ya existente', () => {
  it('apunta al id real del catálogo (theobroma_cacao), no inventa un nodo nuevo', () => {
    expect(CACAO_SPECIES_ID).toBe('theobroma_cacao');
  });
});

describe('Sources verificadas', () => {
  it('trae 8 fuentes, cada una con id único', () => {
    expect(SOURCES).toHaveLength(8);
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada fuente tiene DOI real o, en su defecto, un OpenAlex Work ID real (nunca ninguno)', () => {
    for (const s of SOURCES) {
      const hasDoi = typeof s.doi === 'string' && /^10\.\d{4,9}\/\S+/.test(s.doi);
      const hasOpenAlexId = typeof s.openalex_id === 'string' && /^W\d+$/.test(s.openalex_id);
      expect(hasDoi || hasOpenAlexId).toBe(true);
      // Work ID SIEMPRE presente (identificador primario de verificación).
      expect(hasOpenAlexId).toBe(true);
    }
  });

  it('solo una fuente carece de DOI (Figueroa 2013, indexada en DOAJ sin DOI asignado)', () => {
    const sinDoi = SOURCES.filter((s) => s.doi === null);
    expect(sinDoi.map((s) => s.id)).toEqual(['figueroa-2013-biocontrol-hongos-carmenta']);
  });
});

describe('Pests groundeados', () => {
  it('trae exactamente 2 plagas: Selenothrips rubrocinctus y Carmenta foraseminis', () => {
    expect(PESTS).toHaveLength(2);
  });

  it('cada plaga trae orden y familia taxonómica (no null, no inventado sin fuente)', () => {
    for (const p of PESTS) {
      expect(p.orden).toBeTruthy();
      expect(p.familia).toBeTruthy();
    }
    const selenothrips = PESTS.find((p) => p.id === 'selenothrips_rubrocinctus');
    expect(selenothrips.orden).toBe('Thysanoptera');
    expect(selenothrips.familia).toBe('Thripidae');
    const carmenta = PESTS.find((p) => p.id === 'carmenta_foraseminis');
    expect(carmenta.orden).toBe('Lepidoptera');
    expect(carmenta.familia).toBe('Sesiidae');
  });

  it('cada plaga cita al menos 2 fuentes reales de SOURCES (sourceIds resuelven)', () => {
    const sourceIds = new Set(SOURCES.map((s) => s.id));
    for (const p of PESTS) {
      expect(p.sourceIds.length).toBeGreaterThanOrEqual(2);
      for (const sid of p.sourceIds) {
        expect(sourceIds.has(sid)).toBe(true);
      }
      // La fuente citada en la arista AFFECTS debe ser una de las citadas.
      expect(p.sourceIds).toContain(p.affectsSourceId);
    }
  });
});

describe('buildStatements', () => {
  const stmts = buildStatements();

  it('nunca usa CREATE ni ON CREATE SET (solo MERGE + SET/MATCH idempotente)', () => {
    for (const s of stmts) {
      expect(s).not.toMatch(/\bCREATE\s*\(/i);
      expect(s).not.toMatch(/ON CREATE/i);
    }
  });

  it('emite exactamente un MERGE de Source por cada una de las 8 fuentes', () => {
    for (const src of SOURCES) {
      const merges = stmts.filter((s) => s.includes(`MERGE (n:Source {id: '${src.id}'})`));
      expect(merges).toHaveLength(1);
    }
  });

  it('emite exactamente un MERGE de Pest por cada plaga, con nombre_cientifico (binomio)', () => {
    for (const pest of PESTS) {
      const merges = stmts.filter((s) => s.includes(`MERGE (n:Pest {id: '${pest.id}'})`));
      expect(merges).toHaveLength(1);
      expect(merges[0]).toContain('nombre_cientifico:');
      expect(merges[0]).toContain(pest.binomio.replace(/'/g, "\\'"));
    }
  });

  it('emite una arista AFFECTS por plaga hacia el cacao ya existente (theobroma_cacao)', () => {
    const affectsEdges = stmts.filter((s) => s.includes(':AFFECTS]->'));
    expect(affectsEdges).toHaveLength(PESTS.length);
    for (const e of affectsEdges) {
      expect(e).toContain("MATCH (b:Species {id: 'theobroma_cacao'})");
      expect(e).toContain('SET r.fuente =');
    }
  });

  it('emite una arista REFERENCED_BY por cada (plaga, fuente) declarada', () => {
    const totalSourceRefs = PESTS.reduce((acc, p) => acc + p.sourceIds.length, 0);
    const referencedByEdges = stmts.filter((s) => s.includes(':REFERENCED_BY]->'));
    expect(referencedByEdges).toHaveLength(totalSourceRefs);
  });

  it('es idempotente: correrlo dos veces produce el mismo output', () => {
    expect(buildStatements()).toEqual(stmts);
  });
});
