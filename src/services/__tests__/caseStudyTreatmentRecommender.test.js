import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del RAG retriever — los tests sincrónicos de recommendTreatments
// NO lo usan, pero los tests async de recommendTreatmentsWithRag sí.
vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn(),
}));

import { retrieve } from '../ragRetriever';
import {
  recommendTreatments,
  recommendTreatmentsWithRag,
  buildRagContextBlock,
  listAllBiopreparados,
  RAG_CONTEXT_HEADER,
  __TEST__,
} from '../caseStudyTreatmentRecommender';

beforeEach(() => {
  vi.mocked(retrieve).mockReset();
});

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
    expect(recommendTreatments(/** @type {any} */ (null))).toEqual([]);
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

describe('caseStudyTreatmentRecommender — buildRagContextBlock', () => {
  it('passages vacíos → string vacío', () => {
    expect(buildRagContextBlock([])).toBe('');
    expect(buildRagContextBlock(/** @type {any} */ (null))).toBe('');
    expect(buildRagContextBlock(/** @type {any} */ (undefined))).toBe('');
  });

  it('inserta header + footer + warning anti-alucinación', () => {
    const out = buildRagContextBlock([
      { species: 'solanum_lycopersicum_cherry', text: 'BT 1g/L foliar al atardecer.', score: 1.2, key: 'test-key' },
    ]);
    expect(out).toContain(RAG_CONTEXT_HEADER);
    expect(out).toContain('NO viene del usuario');
    expect(out).toContain('solanum_lycopersicum_cherry');
    expect(out).toContain('BT 1g/L foliar al atardecer.');
    expect(out).toContain('=== FIN INFORMACIÓN AGRONÓMICA DE REFERENCIA ===');
  });

  it('numera los passages y mantiene orden', () => {
    const out = buildRagContextBlock([
      { species: 'a', text: 'primero', score: 1.0, key: 'k1' },
      { species: 'b', text: 'segundo', score: 0.9, key: 'k2' },
    ]);
    expect(out).toMatch(/\[1\] \(a\) primero/);
    expect(out).toMatch(/\[2\] \(b\) segundo/);
  });

  it('omite passages sin texto', () => {
    const out = buildRagContextBlock([
      { species: 'a', text: '   ', score: 0.5, key: 'k3' },
      { species: 'b', text: 'útil', score: 0.8, key: 'k4' },
    ]);
    expect(out).not.toMatch(/\(a\)/);
    expect(out).toMatch(/\(b\) útil/);
  });
});

describe('caseStudyTreatmentRecommender — recommendTreatmentsWithRag', () => {
  it('combina recomendaciones deterministas + passages RAG', async () => {
    vi.mocked(retrieve).mockResolvedValue([
      { species: 'solanum_lycopersicum_cherry', text: 'Bacillus thuringiensis es bioinsecticida específico para Lepidoptera.', score: 1.5, key: 'biopreparados[0].nombre' },
      { species: 'solanum_lycopersicum_cherry', text: 'Aplicar BT al atardecer cuando las larvas salen a alimentarse.', score: 1.1, key: 'biopreparados[0].uso' },
    ]);
    const result = await recommendTreatmentsWithRag('Trozador (Agrotis ipsilon)', {
      speciesNames: ['tomate cherry'],
    });

    // Determinista intacto
    expect(result.recommendations.map((x) => x.id)).toContain('bacillus_thuringiensis');

    // RAG context populado
    expect(result.ragPassages).toHaveLength(2);
    expect(result.ragContext).toContain(RAG_CONTEXT_HEADER);
    expect(result.ragContext).toContain('Bacillus thuringiensis');

    // retrieve fue llamado con pest + species en la query
    expect(retrieve).toHaveBeenCalledTimes(1);
    const [calledQuery, calledTopK] = vi.mocked(retrieve).mock.calls[0];
    expect(calledQuery.toLowerCase()).toContain('trozador');
    expect(calledQuery.toLowerCase()).toContain('tomate cherry');
    expect(calledTopK).toBe(5);
  });

  it('respeta opts.topK', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    await recommendTreatmentsWithRag('oídio', { topK: 3 });
    expect(vi.mocked(retrieve).mock.calls[0][1]).toBe(3);
  });

  it('topK inválido → default 5', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    await recommendTreatmentsWithRag('oídio', { topK: 0 });
    expect(vi.mocked(retrieve).mock.calls[0][1]).toBe(5);
  });

  it('si retrieve falla → degrade gracefully, sin contexto pero con recomendaciones', async () => {
    vi.mocked(retrieve).mockRejectedValue(new Error('corpus down'));
    const result = await recommendTreatmentsWithRag('mildiu');
    expect(result.recommendations.map((x) => x.id)).toContain('caldo_bordeles');
    expect(result.ragPassages).toEqual([]);
    expect(result.ragContext).toBe('');
  });

  it('si retrieve devuelve [] → ragContext vacío pero objeto bien formado', async () => {
    vi.mocked(retrieve).mockResolvedValue([]);
    const result = await recommendTreatmentsWithRag('cogollero');
    expect(result.recommendations.map((x) => x.id)).toContain('bacillus_thuringiensis');
    expect(result.ragPassages).toEqual([]);
    expect(result.ragContext).toBe('');
  });

  it('si retrieve devuelve no-array (defensa) → ragPassages=[]', async () => {
    vi.mocked(retrieve).mockResolvedValue(/** @type {any} */ (null));
    const result = await recommendTreatmentsWithRag('cogollero');
    expect(result.ragPassages).toEqual([]);
    expect(result.ragContext).toBe('');
  });

  it('pestName vacío + sin speciesNames → no llama retrieve y devuelve recs vacías', async () => {
    const result = await recommendTreatmentsWithRag('');
    expect(retrieve).not.toHaveBeenCalled();
    expect(result.recommendations).toEqual([]);
    expect(result.ragPassages).toEqual([]);
    expect(result.ragContext).toBe('');
  });

  it('pestName vacío pero con speciesNames → sí consulta RAG (uso preventivo)', async () => {
    vi.mocked(retrieve).mockResolvedValue([{ species: 'lechuga', text: 'companions con caléndula', score: 0.8 }]);
    const result = await recommendTreatmentsWithRag('', { speciesNames: ['lechuga'] });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(vi.mocked(retrieve).mock.calls[0][0]).toContain('lechuga');
    expect(result.ragPassages).toHaveLength(1);
  });
});
