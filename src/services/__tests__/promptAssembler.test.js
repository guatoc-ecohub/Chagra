/**
 * promptAssembler.test.js — unit tests del ensamblador de system prompt con
 * presupuesto de tokens y prioridad por relevancia (re-arquitectura GR-10).
 *
 * Garantías que se prueban:
 *   1. ORDEN: el grounding (evidencia/entidades/curados/cadena) queda DESPUÉS
 *      del contexto ambiental y el corpus — donde la truncación de ollama no
 *      lo alcanza — y las guardas dominantes (precio/fermento) van al final.
 *   2. PRESUPUESTO: si el total supera el presupuesto se degradan SOLO los
 *      bloques sacrificables (corpus por variantes, contexto ambiental).
 *   3. PROTECCIÓN: base, guardas y grounding JAMÁS se recortan, aunque el
 *      total quede por encima del presupuesto (overBudget: true + warning).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  assembleSystemContent,
  estimateTokens,
  SYSTEM_PROMPT_TOKEN_BUDGET,
  PROMPT_TOKEN_BUDGET,
} from '../promptAssembler.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('estimateTokens', () => {
  it('devuelve 0 para entradas vacías o no-string', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens(/** @type {any} */ (42))).toBe(0);
  });

  it('estima ~1 token por cada ~2.65 chars (calibrado contra granite, conservador)', () => {
    expect(estimateTokens('a'.repeat(265))).toBe(100);
    expect(estimateTokens('abc')).toBe(2);
  });
});

describe('assembleSystemContent — orden por prioridad', () => {
  it('pone el grounding DESPUÉS del contexto ambiental y el corpus', () => {
    const { content } = assembleSystemContent({
      base: 'BASE_PROMPT',
      finca: 'BLOQUE_FINCA',
      clima: 'BLOQUE_CLIMA',
      corpus: { variants: ['BLOQUE_CORPUS', ''] },
      evidence: 'BLOQUE_EVIDENCIA',
      resolvedEntities: 'BLOQUE_ENTIDADES',
      relacional: 'BLOQUE_CADENA',
      queryAnalysis: 'BLOQUE_ANALISIS',
    });
    const idx = (s) => content.indexOf(s);
    expect(idx('BASE_PROMPT')).toBe(0);
    expect(idx('BLOQUE_EVIDENCIA')).toBeGreaterThan(idx('BLOQUE_CORPUS'));
    expect(idx('BLOQUE_EVIDENCIA')).toBeGreaterThan(idx('BLOQUE_FINCA'));
    expect(idx('BLOQUE_EVIDENCIA')).toBeGreaterThan(idx('BLOQUE_CLIMA'));
    expect(idx('BLOQUE_ENTIDADES')).toBeGreaterThan(idx('BLOQUE_EVIDENCIA'));
    expect(idx('BLOQUE_CADENA')).toBeGreaterThan(idx('BLOQUE_ENTIDADES'));
    expect(idx('BLOQUE_ANALISIS')).toBeGreaterThan(idx('BLOQUE_CADENA'));
  });

  it('las guardas dominantes (precio/fermento) quedan al FINAL (recency máxima)', () => {
    const { content } = assembleSystemContent({
      base: 'BASE',
      evidence: 'EVIDENCIA',
      priceDecline: 'GUARDA_PRECIO',
      fermento: 'GUARDA_FERMENTO',
    });
    expect(content.indexOf('GUARDA_PRECIO')).toBeGreaterThan(content.indexOf('EVIDENCIA'));
    expect(content.endsWith('GUARDA_FERMENTO')).toBe(true);
  });

  it('bloques vacíos son no-op (sin separadores huérfanos)', () => {
    const { content } = assembleSystemContent({ base: 'BASE', evidence: '', clima: '' });
    expect(content).toBe('BASE');
  });

  it('GUARDA piso térmico (chagra-pro #288) queda AL FINAL, después de fermento/biopreparado (máxima recency)', () => {
    const { content } = assembleSystemContent({
      base: 'BASE',
      evidence: 'EVIDENCIA',
      fermento: 'GUARDA_FERMENTO',
      biopreparado: 'GUARDA_BIOPREPARADO',
      pisoTermico: 'GUARDA_PISO_TERMICO',
    });
    expect(content.indexOf('GUARDA_PISO_TERMICO')).toBeGreaterThan(content.indexOf('GUARDA_FERMENTO'));
    expect(content.indexOf('GUARDA_PISO_TERMICO')).toBeGreaterThan(content.indexOf('GUARDA_BIOPREPARADO'));
    expect(content.endsWith('GUARDA_PISO_TERMICO')).toBe(true);
  });

  // MODO CIENTÍFICO (#17): el bloque answer/hedge/abstain (grounding-policy.ts
  // WIRING real vía el sidecar) queda DENTRO del cluster de grounding —
  // después de la cadena relacional, antes del análisis de la query — para
  // que domine por recency sin pisar las guardas de seguridad finales.
  it('groundingPolicy queda DESPUÉS de relacional y ANTES de queryAnalysis', () => {
    const { content } = assembleSystemContent({
      base: 'BASE_PROMPT',
      relacional: 'BLOQUE_CADENA',
      groundingPolicy: 'BLOQUE_GROUNDING_POLICY',
      queryAnalysis: 'BLOQUE_ANALISIS',
    });
    expect(content.indexOf('BLOQUE_GROUNDING_POLICY')).toBeGreaterThan(
      content.indexOf('BLOQUE_CADENA'),
    );
    expect(content.indexOf('BLOQUE_ANALISIS')).toBeGreaterThan(
      content.indexOf('BLOQUE_GROUNDING_POLICY'),
    );
  });

  it('GUARDAS confusión de especie (#292) y plaga vs enfermedad (#293) quedan AL FINAL, después de pisoTermico (máxima recency)', () => {
    const { content } = assembleSystemContent({
      base: 'BASE',
      evidence: 'EVIDENCIA',
      fermento: 'GUARDA_FERMENTO',
      biopreparado: 'GUARDA_BIOPREPARADO',
      pisoTermico: 'GUARDA_PISO_TERMICO',
      confusionEspecie: 'GUARDA_CONFUSION_ESPECIE',
      pestVsDisease: 'GUARDA_PEST_VS_DISEASE',
    });
    expect(content.indexOf('GUARDA_CONFUSION_ESPECIE')).toBeGreaterThan(content.indexOf('GUARDA_PISO_TERMICO'));
    expect(content.indexOf('GUARDA_PEST_VS_DISEASE')).toBeGreaterThan(content.indexOf('GUARDA_CONFUSION_ESPECIE'));
    expect(content.endsWith('GUARDA_PEST_VS_DISEASE')).toBe(true);
  });

  it('GUARDAS confusión de especie / pest_vs_disease NUNCA se recortan (no están en SACRIFICE_ORDER)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const big = 'w'.repeat(6400); // ~2000 tokens
    const r = assembleSystemContent(
      {
        base: big,
        confusionEspecie: big,
        pestVsDisease: big,
        corpus: { variants: ['recortable', ''] },
      },
      { budget: 100 },
    );
    expect(r.overBudget).toBe(true);
    expect(warn).toHaveBeenCalled();
    expect(r.breakdown.find((b) => b.name === 'confusionEspecie').degraded).toBe(false);
    expect(r.breakdown.find((b) => b.name === 'pestVsDisease').degraded).toBe(false);
    expect(r.content).toContain(big);
  });
});

describe('assembleSystemContent — presupuesto y degradación', () => {
  it('bajo presupuesto: no degrada nada', () => {
    const { breakdown, overBudget } = assembleSystemContent(
      { base: 'corto', corpus: { variants: ['corpus largo', ''] } },
      { budget: 1000 },
    );
    expect(overBudget).toBe(false);
    expect(breakdown.every((b) => !b.degraded)).toBe(true);
  });

  it('sobre presupuesto: degrada el corpus por variantes ANTES que nada más', () => {
    const big = 'x'.repeat(3200); // ~1000 tokens
    const small = 'y'.repeat(320); // ~100 tokens
    const r = assembleSystemContent(
      {
        base: small,
        clima: small,
        corpus: { variants: [big, small, ''] },
        evidence: small,
      },
      { budget: 400 },
    );
    const corpus = r.breakdown.find((b) => b.name === 'corpus');
    const clima = r.breakdown.find((b) => b.name === 'clima');
    expect(corpus.degraded).toBe(true);
    expect(r.content).not.toContain(big);
    // El clima solo se sacrifica si el corpus no alcanzó: aquí sí alcanzó.
    expect(clima.degraded).toBe(false);
    expect(r.overBudget).toBe(false);
  });

  it('JAMÁS recorta base, guardas ni grounding: prefiere overBudget + warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const big = 'z'.repeat(6400); // ~2000 tokens
    const r = assembleSystemContent(
      {
        base: big,
        evidence: big,
        seguridad: big,
        priceDecline: big,
        fermento: big,
        suggested: big,
        viabilidad: big,
        pisoTermico: big,
        corpus: { variants: ['recortable', ''] },
      },
      { budget: 100 },
    );
    expect(r.overBudget).toBe(true);
    expect(warn).toHaveBeenCalled();
    for (const name of ['base', 'evidence', 'seguridad', 'priceDecline', 'fermento', 'suggested', 'viabilidad', 'pisoTermico']) {
      expect(r.content.split(big).length - 1).toBeGreaterThanOrEqual(8);
      expect(r.breakdown.find((b) => b.name === name).degraded).toBe(false);
    }
  });

  it('groundingPolicy (MODO CIENTÍFICO #17) NUNCA se recorta bajo presión de presupuesto', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const big = 'w'.repeat(6400); // ~2000 tokens
    const r = assembleSystemContent(
      {
        base: big,
        groundingPolicy: big,
        corpus: { variants: ['recortable', ''] },
      },
      { budget: 100 },
    );
    expect(r.overBudget).toBe(true);
    expect(warn).toHaveBeenCalled();
    expect(r.breakdown.find((b) => b.name === 'groundingPolicy').degraded).toBe(false);
    expect(r.content).toContain(big);
  });

  it('MEMORIA EPISÓDICA (TIER 2 #6): va ANTES del grounding y se sacrifica tras el corpus, sin tocar la evidencia', () => {
    // Orden: memoria entre el contexto ambiental y el corpus — nunca después
    // del grounding (la evidencia debe dominar por recency).
    const ordered = assembleSystemContent({
      base: 'BASE',
      asociacion: 'BLOQUE_ASOCIACION',
      memoria: 'BLOQUE_MEMORIA',
      corpus: { variants: ['BLOQUE_CORPUS', ''] },
      evidence: 'BLOQUE_EVIDENCIA',
    });
    const idx = (s) => ordered.content.indexOf(s);
    expect(idx('BLOQUE_MEMORIA')).toBeGreaterThan(idx('BLOQUE_ASOCIACION'));
    expect(idx('BLOQUE_MEMORIA')).toBeLessThan(idx('BLOQUE_CORPUS'));
    expect(idx('BLOQUE_MEMORIA')).toBeLessThan(idx('BLOQUE_EVIDENCIA'));

    // Sacrificio bajo presión: corpus cede primero, luego memoria; el
    // grounding (evidence) queda intacto.
    const big = 'm'.repeat(3200); // ~1208 tokens
    const small = 'y'.repeat(265); // ~100 tokens
    const r = assembleSystemContent(
      {
        base: small,
        memoria: { variants: [big, ''] },
        corpus: { variants: [big, ''] },
        evidence: small,
      },
      { budget: 300 },
    );
    expect(r.breakdown.find((b) => b.name === 'corpus').degraded).toBe(true);
    expect(r.breakdown.find((b) => b.name === 'memoria').degraded).toBe(true);
    expect(r.breakdown.find((b) => b.name === 'evidence').degraded).toBe(false);
    expect(r.content).toContain(small);
    expect(r.content).not.toContain(big);
  });

  it('exporta presupuestos coherentes con num_ctx 6144 → headroom 8192 (GR-10)', () => {
    expect(SYSTEM_PROMPT_TOKEN_BUDGET).toBe(6144);
    expect(PROMPT_TOKEN_BUDGET).toBe(8192);
    expect(SYSTEM_PROMPT_TOKEN_BUDGET).toBeLessThan(PROMPT_TOKEN_BUDGET);
  });
});
