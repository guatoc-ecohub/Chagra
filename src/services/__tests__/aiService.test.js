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
  globalThis.FileReader = class {
    constructor() { this.onloadend = null; this.onerror = null; this.result = null; }
    readAsDataURL(_blob) {
      this.result = 'data:image/webp;base64,FAKE_BASE64';
      queueMicrotask(() => this.onloadend && this.onloadend());
    }
  };
}

const { analyzeFoliage, __TEST__, __retrieveRagContextForFoliage } = await import('../aiService');

const makeBlob = () => new Blob(['fake image bytes'], { type: 'image/webp' });

const happyDiagnosisJson = JSON.stringify({
  score: 78,
  issues: ['mancha foliar incipiente'],
  treatment: 'aplicar caldo bordelés (Fuente 1)',
});

beforeEach(() => {
  streamOllamaMock.mockReset();
  retrieveMock.mockReset();
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
    expect(prompt).toContain('{"score": 0-100');
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

describe('aiService — scientificToSpeciesId (QUICK-17 ASCII snake_case)', () => {
  it('binomial limpio → snake_case lowercase', () => {
    expect(__TEST__.scientificToSpeciesId('Coffea arabica')).toBe('coffea_arabica');
    expect(__TEST__.scientificToSpeciesId('Solanum lycopersicum')).toBe('solanum_lycopersicum');
  });

  it('descarta autoría taxonómica (L., Mart., Triana ex Micheli)', () => {
    expect(__TEST__.scientificToSpeciesId('Coffea arabica L.')).toBe('coffea_arabica');
    expect(__TEST__.scientificToSpeciesId('Erythrina edulis Triana ex Micheli')).toBe('erythrina_edulis');
  });

  it('hybrid notation Fragaria × ananassa → null (× no es ASCII letra)', () => {
    // parts[0]='Fragaria', parts[1]='×' → falla regex epíteto.
    expect(__TEST__.scientificToSpeciesId('Fragaria × ananassa')).toBeNull();
  });

  it('input vacío o no-string → null', () => {
    expect(__TEST__.scientificToSpeciesId('')).toBeNull();
    expect(__TEST__.scientificToSpeciesId('   ')).toBeNull();
    expect(__TEST__.scientificToSpeciesId(null)).toBeNull();
    expect(__TEST__.scientificToSpeciesId(undefined)).toBeNull();
    expect(__TEST__.scientificToSpeciesId(42)).toBeNull();
  });

  it('una sola palabra (sin epíteto) → null', () => {
    expect(__TEST__.scientificToSpeciesId('Coffea')).toBeNull();
  });
});

describe('aiService — validateImageSize (QUICK-16 guard pre-Ollama)', () => {
  // Importamos en este describe para no contaminar el resto de describes con
  // la dependencia (validateImageSize es export adicional del módulo).
  let validateImageSize;
  beforeEach(async () => {
    ({ validateImageSize } = await import('../aiService'));
  });

  it('blob pequeño (<2MB) no lanza', () => {
    const blob = new Blob(['x'.repeat(1024)], { type: 'image/webp' }); // 1 KB
    expect(() => validateImageSize(blob)).not.toThrow();
  });

  it('blob límite (2MB exactos) no lanza (umbral inclusive)', () => {
    // Exactamente MAX_IMAGE_BYTES → no throw (>2MB es el corte).
    const blob = new Blob([new Uint8Array(2_000_000)], { type: 'image/webp' });
    expect(() => validateImageSize(blob)).not.toThrow();
  });

  it('blob >2MB lanza Error con mensaje en español + tamaño', () => {
    const blob = new Blob([new Uint8Array(2_500_000)], { type: 'image/webp' }); // 2.5 MB
    expect(() => validateImageSize(blob)).toThrow(/muy grande/i);
    expect(() => validateImageSize(blob)).toThrow(/2\.5 MB/);
    expect(() => validateImageSize(blob)).toThrow(/reduce calidad/i);
  });

  it('null/undefined → no lanza (defer al caller propio handling)', () => {
    expect(() => validateImageSize(null)).not.toThrow();
    expect(() => validateImageSize(undefined)).not.toThrow();
  });

  it('objeto sin .size → no lanza (no es blob válido)', () => {
    expect(() => validateImageSize({})).not.toThrow();
    expect(() => validateImageSize({ size: 'huge' })).not.toThrow();
  });

  it('analyzeFoliage con blob >2MB → throw bubble-up al caller (no swallow)', async () => {
    const { analyzeFoliage } = await import('../aiService');
    const bigBlob = new Blob([new Uint8Array(3_000_000)], { type: 'image/webp' });
    // No mockeamos retrieve/streamOllama porque la validación debe fallar ANTES.
    await expect(analyzeFoliage(bigBlob, {})).rejects.toThrow(/muy grande/i);
  });

  it('recognizeSpecies con blob >2MB → throw bubble-up al caller', async () => {
    const { recognizeSpecies } = await import('../aiService');
    const bigBlob = new Blob([new Uint8Array(2_500_000)], { type: 'image/webp' });
    await expect(recognizeSpecies(bigBlob, {})).rejects.toThrow(/muy grande/i);
  });
});

describe('aiService — VALID_SPECIES_ID regex (QUICK-17 sidecar pre-check)', () => {
  it('acepta snake_case ASCII puro', () => {
    expect(__TEST__.VALID_SPECIES_ID.test('coffea_arabica')).toBe(true);
    expect(__TEST__.VALID_SPECIES_ID.test('fragaria_ananassa_monterrey')).toBe(true);
    expect(__TEST__.VALID_SPECIES_ID.test('zea_mays_var_24')).toBe(true);
  });

  it('rechaza mayúsculas, espacios, unicode, caracteres especiales', () => {
    expect(__TEST__.VALID_SPECIES_ID.test('Coffea_arabica')).toBe(false); // mayúscula
    expect(__TEST__.VALID_SPECIES_ID.test('coffea arabica')).toBe(false); // espacio
    expect(__TEST__.VALID_SPECIES_ID.test('fragaria_×_ananassa')).toBe(false); // ×
    expect(__TEST__.VALID_SPECIES_ID.test('solanum-tuberosum')).toBe(false); // guión
    expect(__TEST__.VALID_SPECIES_ID.test('solanum.tuberosum')).toBe(false); // punto
    expect(__TEST__.VALID_SPECIES_ID.test('')).toBe(false); // vacío
  });
});
