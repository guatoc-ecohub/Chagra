import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks DEBEN declararse antes del import del módulo bajo test.
// Audit 2026-05-18 #4: integramos RAG en analyzeFoliage; estos tests
// aíslan el flujo de retrieval + prompt building + propagación de
// rag_passages_used a la telemetría.

const streamOllamaMock = vi.fn();
const retrieveMock = vi.fn();

vi.mock('../ollamaStream', () => ({
  streamOllama: (...args) => streamOllamaMock(...args),
}));

vi.mock('../ragRetriever', () => ({
  retrieve: (...args) => retrieveMock(...args),
}));

// blobToBase64 internamente usa FileReader.readAsDataURL. JSDOM lo soporta,
// pero el resultado depende del shape del Blob. Polyfill defensivo: si
// global no provee FileReader compatible, simulamos suficiente.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = /** @type {any} */ (class {
    constructor() { this.onloadend = null; this.onerror = null; this.result = null; }
    readAsDataURL(_blob) {
      this.result = 'data:image/webp;base64,FAKE_BASE64';
      queueMicrotask(() => this.onloadend && this.onloadend());
    }
    static get EMPTY() { return 0; }
    static get LOADING() { return 1; }
    static get DONE() { return 2; }
  });
}

const { analyzeFoliage, __TEST__, __retrieveRagContextForFoliage } = await import('../aiService');
// V-11 (#231): analyzeFoliage ahora cachea por hash de contenido. Como estos
// tests reusan los MISMOS bytes (`makeBlob`), hay que limpiar el cache entre
// casos o el 2do análisis serviría el resultado del 1ro en vez del mock.
const { clearCache } = await import('../visionCacheService');

const makeBlob = () => new Blob(['fake image bytes'], { type: 'image/webp' });

const happyDiagnosisJson = JSON.stringify({
  score: 78,
  issues: ['mancha foliar incipiente'],
  treatment: 'aplicar caldo bordelés (Fuente 1)',
});

beforeEach(() => {
  streamOllamaMock.mockReset();
  retrieveMock.mockReset();
  clearCache();
});

describe('aiService — buildRagQuery (helper)', () => {
  it('con speciesSlug → query especifica + tokens fitosanitarios', () => {
    const q = __TEST__.buildRagQuery('fragaria_ananassa_monterrey');
    expect(q).toContain('fragaria ananassa monterrey');
    expect(q).toMatch(/plagas|enfermedades|manejo/i);
  });

  it('sin speciesSlug → fallback genérico agroecológico', () => {
    expect(__TEST__.buildRagQuery(null)).toBe(__TEST__.RAG_FALLBACK_QUERY);
    expect(__TEST__.buildRagQuery(undefined)).toBe(__TEST__.RAG_FALLBACK_QUERY);
    expect(__TEST__.buildRagQuery('')).toBe(__TEST__.RAG_FALLBACK_QUERY);
    expect(__TEST__.buildRagQuery('   ')).toBe(__TEST__.RAG_FALLBACK_QUERY);
  });

  it('normaliza underscores a espacios para que BM25 tokenice', () => {
    const q = __TEST__.buildRagQuery('coffea_arabica');
    expect(q).toContain('coffea arabica');
    expect(q).not.toContain('coffea_arabica');
  });
});

describe('aiService — formatRagContext (helper)', () => {
  it('passages vacíos → string vacío (caller usa prompt base)', () => {
    expect(__TEST__.formatRagContext([])).toBe('');
    expect(__TEST__.formatRagContext(null)).toBe('');
    expect(__TEST__.formatRagContext(undefined)).toBe('');
  });

  it('formatea bloque CONTEXTO_CIENTÍFICO con fuentes numeradas', () => {
    const passages = [
      { text: 'La fresa Monterrey es sensible a Botrytis cinerea en clima frío y húmedo.', species: 'fragaria_ananassa_monterrey', key: 'valor_pedagogico' },
      { text: 'Caldo bordelés a 1% es el manejo agroecológico estándar AGROSAVIA.', species: 'fragaria_ananassa_monterrey', key: 'manejo' },
    ];
    const ctx = __TEST__.formatRagContext(passages);
    expect(ctx).toContain('<CONTEXTO_CIENTÍFICO>');
    expect(ctx).toContain('</CONTEXTO_CIENTÍFICO>');
    expect(ctx).toContain('[Fuente 1 — fragaria_ananassa_monterrey :: valor_pedagogico]');
    expect(ctx).toContain('[Fuente 2 — fragaria_ananassa_monterrey :: manejo]');
    expect(ctx).toContain('Botrytis');
    expect(ctx).toContain('AGROSAVIA');
  });

  it('trunca passages largos al cap defensivo', () => {
    const longText = 'x'.repeat(__TEST__.PASSAGE_CHAR_CAP + 500);
    const ctx = __TEST__.formatRagContext([{ text: longText, species: 'tomate', key: 'k' }]);
    // El bloque incluye solo PASSAGE_CHAR_CAP 'x' (sin contar headers/fences).
    const xs = (ctx.match(/x/g) || []).length;
    expect(xs).toBe(__TEST__.PASSAGE_CHAR_CAP);
  });

  it('passages con text vacío se filtran (no bloques fantasma)', () => {
    const ctx = __TEST__.formatRagContext([
      { text: '   ', species: 'a', key: 'b' },
      { text: 'contenido real útil para diagnóstico', species: 'c', key: 'd' },
    ]);
    expect(ctx).toContain('[Fuente 1 — c :: d]');
    expect(ctx).not.toContain('[Fuente 2');
  });
});

describe('aiService — buildDiagnosisPrompt (helper)', () => {
  it('sin contexto → usa DIAGNOSIS_BASE_PROMPT crudo (degrade graceful)', () => {
    expect(__TEST__.buildDiagnosisPrompt('')).toBe(__TEST__.DIAGNOSIS_BASE_PROMPT);
    expect(__TEST__.buildDiagnosisPrompt(null)).toBe(__TEST__.DIAGNOSIS_BASE_PROMPT);
  });

  it('con contexto → instruye citar fuente + mantiene JSON output spec', () => {
    const ctx = '<CONTEXTO_CIENTÍFICO>\nFuente 1\n</CONTEXTO_CIENTÍFICO>\n\n';
    const prompt = __TEST__.buildDiagnosisPrompt(ctx);
    expect(prompt).toContain('<CONTEXTO_CIENTÍFICO>');
    expect(prompt).toContain('agroecológico');
    expect(prompt).toMatch(/cit.*fuente/i);
    expect(prompt).toContain('{"isPlant": true/false, "score": 0-100');
  });
});

describe('aiService — __retrieveRagContextForFoliage (graceful degrade)', () => {
  it('retrieve falla → retorna [] sin propagar la excepción', async () => {
    retrieveMock.mockRejectedValueOnce(new Error('corpus boom'));
    const result = await __retrieveRagContextForFoliage('cualquier');
    expect(result).toEqual([]);
  });

  it('retrieve retorna non-array → normaliza a []', async () => {
    retrieveMock.mockResolvedValueOnce(null);
    const result = await __retrieveRagContextForFoliage('x');
    expect(result).toEqual([]);
  });

  it('retrieve retorna passages → pasa-through', async () => {
    const passages = [{ text: 'algo', species: 's', key: 'k' }];
    retrieveMock.mockResolvedValueOnce(passages);
    const result = await __retrieveRagContextForFoliage('s');
    expect(result).toBe(passages);
  });
});

describe('aiService — analyzeFoliage integración RAG', () => {
  it('con speciesSlug → retrieve query incluye el slug + 3 passages al prompt', async () => {
    retrieveMock.mockResolvedValueOnce([
      { text: 'Mancha foliar en fresa por Mycosphaerella fragariae.', species: 'fragaria_ananassa_monterrey', key: 'valor_pedagogico' },
      { text: 'Manejo: caldo bordelés 1%, podar foliolos enfermos.', species: 'fragaria_ananassa_monterrey', key: 'manejo_agroecologico' },
      { text: 'AGROSAVIA recomienda inspección semanal en clima frío húmedo.', species: 'fragaria_ananassa_monterrey', key: 'monitoreo' },
    ]);
    streamOllamaMock.mockResolvedValueOnce(happyDiagnosisJson);

    const result = await analyzeFoliage(makeBlob(), { speciesSlug: 'fragaria_ananassa_monterrey' });

    expect(retrieveMock).toHaveBeenCalledTimes(1);
    const [retrieveQuery, retrieveK] = retrieveMock.mock.calls[0];
    expect(retrieveQuery).toContain('fragaria ananassa monterrey');
    expect(retrieveK).toBe(3);

    expect(streamOllamaMock).toHaveBeenCalledTimes(1);
    const [, body, , options] = streamOllamaMock.mock.calls[0];
    expect(body.model).toBe('gemma3:4b');
    expect(body.prompt).toContain('<CONTEXTO_CIENTÍFICO>');
    expect(body.prompt).toContain('Mycosphaerella fragariae');
    expect(body.prompt).toContain('caldo bordelés');
    expect(body.prompt).toMatch(/cit.*fuente/i);
    expect(options.meta).toEqual({ rag_passages_used: 3 });

    expect(result).toEqual({
      score: 78,
      issues: ['mancha foliar incipiente'],
      treatment: 'aplicar caldo bordelés (Fuente 1)',
      treatment_suggestion: 'aplicar caldo bordelés (Fuente 1)',
    });
  });

  it('sin speciesSlug → fallback query genérica + prompt aún incluye contexto si RAG matchea', async () => {
    retrieveMock.mockResolvedValueOnce([
      { text: 'Pautas generales de manejo agroecológico colombiano.', species: 'general', key: 'guía' },
    ]);
    streamOllamaMock.mockResolvedValueOnce(happyDiagnosisJson);

    await analyzeFoliage(makeBlob(), {});

    const [retrieveQuery] = retrieveMock.mock.calls[0];
    expect(retrieveQuery).toBe(__TEST__.RAG_FALLBACK_QUERY);

    const [, body, , options] = streamOllamaMock.mock.calls[0];
    expect(body.prompt).toContain('<CONTEXTO_CIENTÍFICO>');
    expect(options.meta).toEqual({ rag_passages_used: 1 });
  });

  it('RAG retorna [] (cold-start / sin matches) → usa DIAGNOSIS_BASE_PROMPT crudo', async () => {
    retrieveMock.mockResolvedValueOnce([]);
    streamOllamaMock.mockResolvedValueOnce(happyDiagnosisJson);

    await analyzeFoliage(makeBlob(), { speciesSlug: 'planta_inexistente' });

    const [, body, , options] = streamOllamaMock.mock.calls[0];
    expect(body.prompt).toBe(__TEST__.DIAGNOSIS_BASE_PROMPT);
    expect(body.prompt).not.toContain('<CONTEXTO_CIENTÍFICO>');
    expect(options.meta).toEqual({ rag_passages_used: 0 });
  });

  it('RAG lanza excepción → degrade graceful al prompt base sin romper analyzeFoliage', async () => {
    retrieveMock.mockRejectedValueOnce(new Error('boom corpus'));
    streamOllamaMock.mockResolvedValueOnce(happyDiagnosisJson);

    const result = await analyzeFoliage(makeBlob(), { speciesSlug: 'cualquier' });

    expect(result).not.toBeNull();
    expect(result.score).toBe(78);

    const [, body, , options] = streamOllamaMock.mock.calls[0];
    expect(body.prompt).toBe(__TEST__.DIAGNOSIS_BASE_PROMPT);
    expect(options.meta).toEqual({ rag_passages_used: 0 });
  });

  it('streamOllama falla → retorna null sin romper (contrato legacy preservado)', async () => {
    retrieveMock.mockResolvedValueOnce([]);
    streamOllamaMock.mockRejectedValueOnce(new Error('ollama down'));

    const result = await analyzeFoliage(makeBlob(), {});
    expect(result).toBeNull();
  });

  it('response con markdown fences → JSON.parse robusto', async () => {
    retrieveMock.mockResolvedValueOnce([]);
    streamOllamaMock.mockResolvedValueOnce('```json\n' + happyDiagnosisJson + '\n```');

    const result = await analyzeFoliage(makeBlob(), {});
    expect(result.score).toBe(78);
    expect(result.treatment_suggestion).toContain('caldo bordelés');
  });

  it('legacy: respuesta sin field treatment → treatment_suggestion vacío', async () => {
    retrieveMock.mockResolvedValueOnce([]);
    streamOllamaMock.mockResolvedValueOnce(JSON.stringify({ score: 95, issues: [] }));
    const result = await analyzeFoliage(makeBlob(), {});
    expect(result.treatment_suggestion).toBe('');
  });
});
