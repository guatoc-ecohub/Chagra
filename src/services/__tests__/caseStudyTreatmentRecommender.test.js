import { describe, it, expect } from 'vitest';
import { recommendTreatments, listAllBiopreparados, __TEST__ } from '../caseStudyTreatmentRecommender';

describe('caseStudyTreatmentRecommender — recommendTreatments', () => {
  it('trozador (Agrotis) → BT + Trichogramma + neem', () => {
    const r = recommendTreatments('Trozador (Agrotis ipsilon)');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('bacillus_thuringiensis');
    expect(ids).toContain('trichogramma_spp');
    expect(ids).toContain('extracto_neem');
    expect(r[0].priority).toBe('high'); // BT primero
  });

  it('cogollero (Spodoptera) → mismo grupo Lepidoptera', () => {
    const r = recommendTreatments('cogollero');
    expect(r.map((x) => x.id)).toContain('bacillus_thuringiensis');
  });

  it('oídio → caldo sulfocalcico + bordeles', () => {
    const r = recommendTreatments('oídio');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('caldo_sulfocalcico');
    expect(ids).toContain('caldo_bordeles');
  });

  it('antracnosis → caldo bordeles', () => {
    const r = recommendTreatments('antracnosis foliar');
    expect(r.map((x) => x.id)).toContain('caldo_bordeles');
  });

  it('mildiu / phytophthora → bordeles', () => {
    const r1 = recommendTreatments('Phytophthora infestans');
    expect(r1.map((x) => x.id)).toContain('caldo_bordeles');
    const r2 = recommendTreatments('tizón tardío');
    expect(r2.map((x) => x.id)).toContain('caldo_bordeles');
  });

  it('áfidos → purin ortiga + neem', () => {
    const r = recommendTreatments('áfidos verdes en lechuga');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('purin_ortiga');
    expect(ids).toContain('extracto_neem');
  });

  it('mosca blanca → purin ortiga + neem', () => {
    const r = recommendTreatments('mosca blanca');
    expect(r.map((x) => x.id)).toContain('purin_ortiga');
  });

  it('ácaros → caldo sulfocálcico', () => {
    const r = recommendTreatments('ácaros araña roja');
    expect(r.map((x) => x.id)).toContain('caldo_sulfocalcico');
  });

  it('fusarium suelo → trichoderma', () => {
    const r = recommendTreatments('fusarium en raíz');
    expect(r.map((x) => x.id)).toContain('trichoderma_harzianum_suelo');
  });

  it('damping off → trichoderma + bocashi', () => {
    const r = recommendTreatments('damping off plántulas');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('trichoderma_harzianum_suelo');
    expect(ids).toContain('bocashi');
  });

  it('clorosis general → biol + humus', () => {
    const r = recommendTreatments('clorosis general amarillamiento');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('biol');
    expect(ids).toContain('humus_liquido');
  });

  it('input vacío o muy corto → []', () => {
    expect(recommendTreatments('')).toEqual([]);
    expect(recommendTreatments(null)).toEqual([]);
    expect(recommendTreatments('ab')).toEqual([]);
  });

  it('pest desconocido → []', () => {
    const r = recommendTreatments('zombie tomato apocalypse 2026');
    expect(r).toEqual([]);
  });

  it('dedupe: si múltiples rules hit mismo biopreparado, conserva high priority', () => {
    const r = recommendTreatments('trozador con damping off');
    const bts = r.filter((x) => x.id === 'bacillus_thuringiensis');
    expect(bts).toHaveLength(1);
  });

  it('top 5 max', () => {
    // pest que matchea muchas rules
    const r = recommendTreatments('trozador áfidos fusarium oídio bacteriana');
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it('case insensitive', () => {
    const r1 = recommendTreatments('TROZADOR');
    const r2 = recommendTreatments('Trozador');
    const r3 = recommendTreatments('trozador');
    expect(r1).toEqual(r3);
    expect(r2).toEqual(r3);
  });
});

describe('caseStudyTreatmentRecommender — listAllBiopreparados', () => {
  it('retorna 19 biopreparados (catalog post Track C)', () => {
    const all = listAllBiopreparados();
    expect(all).toHaveLength(19);
    expect(all).toContain('bacillus_thuringiensis');
    expect(all).toContain('bocashi');
    expect(all).toContain('extracto_neem');
  });
});

describe('caseStudyTreatmentRecommender — PEST_RULES integrity', () => {
  it('cada rule tiene keywords no vacía', () => {
    for (const r of __TEST__.PEST_RULES) {
      expect(Array.isArray(r.keywords)).toBe(true);
      expect(r.keywords.length).toBeGreaterThan(0);
    }
  });

  it('cada rule tiene al menos 1 recommendation', () => {
    for (const r of __TEST__.PEST_RULES) {
      expect(Array.isArray(r.recs)).toBe(true);
      expect(r.recs.length).toBeGreaterThan(0);
    }
  });

  it('cada recommendation tiene id + rationale + priority válida', () => {
    const validPriorities = ['high', 'medium', 'low'];
    for (const r of __TEST__.PEST_RULES) {
      for (const rec of r.recs) {
        expect(rec.id).toMatch(/^[a-z][a-z0-9_]+$/);
        expect(rec.rationale).toBeTruthy();
        expect(rec.rationale.length).toBeGreaterThan(15);
        expect(validPriorities).toContain(rec.priority);
      }
    }
  });
});
