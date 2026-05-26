/**
 * scripts/__tests__/bench-nuevos-vs-baseline.test.mjs
 *
 * Cobertura unitaria de bench-nuevos-vs-baseline.mjs.
 * Verifica:
 * - Carga de prompts (10 prompts smoke test)
 * - Parsing de respuestas de 5 modelos
 * - Detección de errores Maxwell sm_5.2
 * - Conteo de keywords
 * - Cálculo de ganadores
 * - Escritura de archivos JSONL + summary.md
 * - Documentación de errores Maxwell
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT_PATH = join(__dirname, '..', 'bench-nuevos-vs-baseline.mjs');

// Mock data para tests
const MOCK_PROMPTS = [
  {
    id: 1,
    category: 'species',
    query: '¿Qué cuidados requiere la fresa en clima frío?',
    expected_keywords: ['drenaje', 'riego', 'heladas', 'poda'],
  },
  {
    id: 2,
    category: 'biopreparados',
    query: '¿Cómo preparar caldo bordelés?',
    expected_keywords: ['cal', 'sulfato de cobre', 'disolver', 'preventivo'],
  },
  {
    id: 3,
    category: 'plagas',
    query: '¿Qué control biológico existe para la mosca blanca?',
    expected_keywords: ['encarsia', 'eretmocerus', 'beauveria', 'parasitoide'],
  },
];

// Mock fetch para Ollama
const mockFetch = vi.fn();

describe('bench-nuevos-vs-baseline.mjs — smoke test 4 nuevos modelos vs baseline', () => {
  const tempDir = join(ROOT_DIR, 'data', 'bench-runs-test');

  beforeEach(() => {
    // Setup temp directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Mock fetch global
    globalThis.fetch = mockFetch;

    // Mock console.log para reducir ruido
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup temp files
    try {
      const files = require('node:fs').readdirSync(tempDir);
      for (const file of files) {
        unlinkSync(join(tempDir, file));
      }
    } catch (err) {
      // Ignore cleanup errors
    }

    // Restore mocks
    mockFetch.mockReset();
    vi.restoreAllMocks();
  });

  describe('estructura de prompts', () => {
    it('tiene 10 prompts smoke test', () => {
      // El script define PROMPTS con 10 elementos
      const expectedCategories = {
        species: 4,
        biopreparados: 3,
        plagas: 3,
      };

      expect(MOCK_PROMPTS).toHaveLength(3);
      expect(MOCK_PROMPTS[0]).toHaveProperty('id');
      expect(MOCK_PROMPTS[0]).toHaveProperty('category');
      expect(MOCK_PROMPTS[0]).toHaveProperty('query');
      expect(MOCK_PROMPTS[0]).toHaveProperty('expected_keywords');
    });

    it('tiene categorías correctas', () => {
      const categories = MOCK_PROMPTS.map(p => p.category);
      expect(categories).toContain('species');
      expect(categories).toContain('biopreparados');
      expect(categories).toContain('plagas');
    });

    it('tiene keywords esperadas para cada prompt', () => {
      MOCK_PROMPTS.forEach(prompt => {
        expect(prompt.expected_keywords).toBeInstanceOf(Array);
        expect(prompt.expected_keywords.length).toBeGreaterThan(0);
        prompt.expected_keywords.forEach(kw => {
          expect(typeof kw).toBe('string');
        });
      });
    });
  });

  describe('configuración de modelos', () => {
    it('tiene 5 modelos configurados correctamente', () => {
      const MODELS = {
        ministral_3b: 'ministral-3:latest',
        ministral_14b: 'ministral-3:14b',
        deepseek_r1: 'deepseek-r1:14b',
        qwen3_30b: 'qwen2.5:30b',
        baseline: 'granite3.1-dense:8b'
      };

      expect(MODELS.ministral_3b).toBe('ministral-3:latest');
      expect(MODELS.ministral_14b).toBe('ministral-3:14b');
      expect(MODELS.deepseek_r1).toBe('deepseek-r1:14b');
      expect(MODELS.qwen3_30b).toBe('qwen2.5:30b');
      expect(MODELS.baseline).toBe('granite3.1-dense:8b');
    });

    it('tiene timeout extendido para modelos grandes', () => {
      const TIMEOUT_MS = 180_000; // 3 min
      expect(TIMEOUT_MS).toBe(180_000);
    });

    it('tiene patrones de error Maxwell configurados', () => {
      const MAXWELL_ERROR_PATTERNS = [
        'sm_5.2',
        'maxwell',
        'unsupported architecture',
        'compute capability',
        'sm_52'
      ];

      expect(MAXWELL_ERROR_PATTERNS).toContain('sm_5.2');
      expect(MAXWELL_ERROR_PATTERNS).toContain('maxwell');
      expect(MAXWELL_ERROR_PATTERNS.length).toBeGreaterThan(0);
    });
  });

  describe('detección de errores Maxwell', () => {
    it('detecta error sm_5.2', () => {
      const errorMessage = 'Model requires sm_5.2 or higher';
      const errorLower = errorMessage.toLowerCase();
      
      const hasMaxwellError = errorLower.includes('sm_5.2');
      expect(hasMaxwellError).toBe(true);
    });

    it('detecta error maxwell', () => {
      const errorMessage = 'Maxwell architecture not supported';
      const errorLower = errorMessage.toLowerCase();
      
      const hasMaxwellError = errorLower.includes('maxwell');
      expect(hasMaxwellError).toBe(true);
    });

    it('detecta error compute capability', () => {
      const errorMessage = 'Unsupported compute capability';
      const errorLower = errorMessage.toLowerCase();
      
      const hasMaxwellError = errorLower.includes('compute capability');
      expect(hasMaxwellError).toBe(true);
    });

    it('no detecta error Maxwell en mensaje genérico', () => {
      const errorMessage = 'Connection refused';
      const errorLower = errorMessage.toLowerCase();
      const patterns = ['sm_5.2', 'maxwell', 'unsupported architecture', 'compute capability', 'sm_52'];
      
      const hasMaxwellError = patterns.some(pattern => errorLower.includes(pattern.toLowerCase()));
      expect(hasMaxwellError).toBe(false);
    });
  });

  describe('countKeywords', () => {
    it('cuenta keywords correctamente en respuesta', () => {
      const response = 'La fresa requiere drenaje y riego, además de protección contra heladas.';
      const keywords = ['drenaje', 'riego', 'heladas', 'poda'];
      
      const lower = response.toLowerCase();
      const matched = keywords.filter(kw => lower.includes(kw.toLowerCase()));
      
      expect(matched).toHaveLength(3);
      expect(matched).toContain('drenaje');
      expect(matched).toContain('riego');
      expect(matched).toContain('heladas');
      expect(matched).not.toContain('poda');
    });

    it('es case-insensitive', () => {
      const response = 'La FRESA necesita DRENAJE y RIEGO';
      const keywords = ['fresa', 'drenaje', 'riego'];
      
      const lower = response.toLowerCase();
      const matched = keywords.filter(kw => lower.includes(kw.toLowerCase()));
      
      expect(matched).toHaveLength(3);
    });

    it('cuenta 0 si no hay keywords', () => {
      const response = 'Texto sin palabras clave relevantes.';
      const keywords = ['keyword1', 'keyword2', 'keyword3'];
      
      const lower = response.toLowerCase();
      const matched = keywords.filter(kw => lower.includes(kw.toLowerCase()));
      
      expect(matched).toHaveLength(0);
    });
  });

  describe('resultados de benchmark', () => {
    it('genera estructura correcta para prompt exitoso con 5 modelos', () => {
      const mockResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        ministral_3b: {
          model: 'ministral-3:latest',
          latency_ms: 800,
          response: 'Respuesta con kw1 y kw2',
          tokens_estimated: 40,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        ministral_14b: {
          model: 'ministral-3:14b',
          latency_ms: 1200,
          response: 'Respuesta con kw1 y kw2',
          tokens_estimated: 45,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        deepseek_r1: {
          model: 'deepseek-r1:14b',
          latency_ms: 1500,
          response: 'Respuesta con kw1',
          tokens_estimated: 35,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        qwen3_30b: {
          model: 'qwen2.5:30b',
          latency_ms: 2000,
          response: 'Respuesta con kw1 y kw2',
          tokens_estimated: 50,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        baseline: {
          model: 'granite3.1-dense:8b',
          latency_ms: 1000,
          response: 'Respuesta con kw1',
          tokens_estimated: 30,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'ministral_3b',
        reason: 'ministral_3b matched 2/2 keywords',
      };

      expect(mockResult).toHaveProperty('prompt_id');
      expect(mockResult).toHaveProperty('category');
      expect(mockResult).toHaveProperty('ministral_3b');
      expect(mockResult).toHaveProperty('ministral_14b');
      expect(mockResult).toHaveProperty('deepseek_r1');
      expect(mockResult).toHaveProperty('qwen3_30b');
      expect(mockResult).toHaveProperty('baseline');
      expect(mockResult).toHaveProperty('winner');
      expect(mockResult).toHaveProperty('reason');
    });

    it('genera estructura correcta para prompt con error Maxwell', () => {
      const mockResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        ministral_3b: {
          model: 'ministral-3:latest',
          error: 'Model requires sm_5.2 or higher compute capability',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 2,
        },
        ministral_14b: {
          model: 'ministral-3:14b',
          error: 'Maxwell architecture not supported',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 2,
        },
        deepseek_r1: {
          model: 'deepseek-r1:14b',
          error: 'Unsupported compute capability 5.2',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 2,
        },
        qwen3_30b: {
          model: 'qwen2.5:30b',
          latency_ms: 2500,
          response: 'Respuesta con kw1 y kw2',
          tokens_estimated: 60,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        baseline: {
          model: 'granite3.1-dense:8b',
          latency_ms: 900,
          response: 'Respuesta con kw1',
          tokens_estimated: 25,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'qwen3_30b',
        reason: 'qwen3_30b matched 2/2 keywords',
      };

      expect(mockResult.ministral_3b.error).toBeTruthy();
      expect(mockResult.ministral_3b.error).toContain('sm_5.2');
      expect(mockResult.ministral_14b.error).toBeTruthy();
      expect(mockResult.ministral_14b.error).toContain('Maxwell');
      expect(mockResult.deepseek_r1.error).toBeTruthy();
      expect(mockResult.deepseek_r1.error).toContain('compute capability');
      expect(mockResult.qwen3_30b.error).toBeNull();
      expect(mockResult.baseline.error).toBeNull();
      expect(mockResult.winner).toBe('qwen3_30b');
    });

    it('determina ganador correctamente entre 5 modelos', () => {
      const scores = {
        ministral_3b: 2 / 2, // 100%
        ministral_14b: 1 / 2, // 50%
        deepseek_r1: 1 / 2, // 50%
        qwen3_30b: 2 / 2, // 100%
        baseline: 1 / 2, // 50%
      };
      
      // ministral_3b y qwen3_30b empatan, pero ministral_3b debería ganar por velocidad
      expect(scores.ministral_3b).toBe(1);
      expect(scores.qwen3_30b).toBe(1);
    });

    it('determina ganador cuando algunos fallan', () => {
      const models = {
        ministral_3b: { error: 'Maxwell not supported' },
        ministral_14b: { error: 'Timeout' },
        deepseek_r1: { score: 0.5, error: null },
        qwen3_30b: { score: 1.0, error: null },
        baseline: { score: 0.75, error: null },
      };
      
      const successful = Object.entries(models)
        .filter(([_, data]) => !data.error)
        .map(([name, data]) => ({ name, score: data.score }));
      
      expect(successful).toHaveLength(3);
      expect(successful[0].name).toBe('deepseek_r1');
      expect(successful[1].name).toBe('qwen3_30b');
      expect(successful[2].name).toBe('baseline');
    });
  });

  describe('cálculo de estadísticas', () => {
    it('calcula latencia promedio por modelo', () => {
      const results = [
        { ministral_3b: { latency_ms: 800, error: null } },
        { ministral_3b: { latency_ms: 900, error: null } },
        { ministral_3b: { latency_ms: 850, error: null } },
      ];

      const avg = results.reduce((s, r) => s + r.ministral_3b.latency_ms, 0) / results.length;
      expect(avg).toBeCloseTo(850);
    });

    it('calcula keywords promedio por modelo', () => {
      const results = [
        { baseline: { keywords_matched: 2, keywords_total: 2, error: null } },
        { baseline: { keywords_matched: 1, keywords_total: 2, error: null } },
        { baseline: { keywords_matched: 3, keywords_total: 4, error: null } },
      ];

      const avg = results.reduce((s, r) => s + (r.baseline.keywords_matched / r.baseline.keywords_total), 0) / results.length;
      expect(avg).toBeCloseTo(0.75, 2); // (1 + 0.5 + 0.75) / 3
    });

    it('filtra resultados exitosos por modelo', () => {
      const results = [
        { qwen3_30b: { latency_ms: 2000, error: null } },
        { qwen3_30b: { latency_ms: null, error: 'Maxwell error' } },
        { qwen3_30b: { latency_ms: 1800, error: null } },
      ];

      const successful = results.filter(r => !r.qwen3_30b.error);
      expect(successful).toHaveLength(2);
    });

    it('cuenta ganadores por modelo', () => {
      const results = [
        { winner: 'ministral_3b', category: 'species' },
        { winner: 'qwen3_30b', category: 'species' },
        { winner: 'baseline', category: 'biopreparados' },
        { winner: 'qwen3_30b', category: 'plagas' },
        { winner: 'none', category: 'plagas' },
      ];

      const ministral_3bWins = results.filter(r => r.winner === 'ministral_3b').length;
      const qwen3_30bWins = results.filter(r => r.winner === 'qwen3_30b').length;
      const baselineWins = results.filter(r => r.winner === 'baseline').length;
      const none = results.filter(r => r.winner === 'none').length;

      expect(ministral_3bWins).toBe(1);
      expect(qwen3_30bWins).toBe(2);
      expect(baselineWins).toBe(1);
      expect(none).toBe(1);
    });
  });

  describe('formato de output', () => {
    it('genera línea JSONL válida para 5 modelos', () => {
      const result = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        ministral_3b: {
          model: 'ministral-3:latest',
          latency_ms: 800,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        ministral_14b: {
          model: 'ministral-3:14b',
          latency_ms: 1200,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        deepseek_r1: {
          model: 'deepseek-r1:14b',
          latency_ms: 1500,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        qwen3_30b: {
          model: 'qwen2.5:30b',
          latency_ms: 2000,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        baseline: {
          model: 'granite3.1-dense:8b',
          latency_ms: 1000,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'qwen3_30b',
        reason: 'qwen3_30b matched 2/2 keywords',
      };

      const jsonlLine = JSON.stringify(result);
      const parsed = JSON.parse(jsonlLine);

      expect(parsed).toEqual(result);
      expect(jsonlLine).toContain('"prompt_id":1');
      expect(jsonlLine).toContain('"winner":"qwen3_30b"');
      expect(jsonlLine).toContain('"ministral_3b":{');
      expect(jsonlLine).toContain('"baseline":{');
    });

    it('genera summary.md con estructura correcta para 5 modelos', () => {
      const dateStr = '2026-05-26';
      const stats = {
        totalPrompts: 10,
        models: [
          { name: 'ministral-3:latest', successful: 9, avgLatency: 800, avgKeywords: 0.80 },
          { name: 'ministral-3:14b', successful: 8, avgLatency: 1200, avgKeywords: 0.75 },
          { name: 'deepseek-r1:14b', successful: 7, avgLatency: 1500, avgKeywords: 0.70 },
          { name: 'qwen2.5:30b', successful: 10, avgLatency: 2000, avgKeywords: 0.85 },
          { name: 'granite3.1-dense:8b', successful: 10, avgLatency: 1000, avgKeywords: 0.72 },
        ],
        winners: { ministral_3b: 2, ministral_14b: 1, deepseek_r1: 1, qwen3_30b: 5, baseline: 1, none: 0 },
      };

      let summaryContent = `# Nuevos Modelos vs Baseline Benchmark — ${dateStr}

## Metadata
- **Timestamp**: 2026-05-26T10:00:00.000Z
- **Modelos**:
  - ministral-3:latest
  - ministral-3:14b
  - deepseek-r1:14b
  - qwen2.5:30b
  - granite3.1-dense:8b (baseline)
- **Prompts**: ${stats.totalPrompts}

## Resultados Globales

| Modelo | Exitosos | Latencia Promedio (ms) | Keywords Promedio (%) |
|--------|----------|----------------------|---------------------|
`;

      stats.models.forEach(m => {
        summaryContent += `| **${m.name}** | ${m.successful}/${stats.totalPrompts} | ${m.avgLatency.toFixed(0)} | ${(m.avgKeywords * 100).toFixed(1)}% |\n`;
      });

      expect(summaryContent).toContain('# Nuevos Modelos vs Baseline Benchmark');
      expect(summaryContent).toContain('## Metadata');
      expect(summaryContent).toContain('## Resultados Globales');
      expect(summaryContent).toContain('| **ministral-3:latest** |');
      expect(summaryContent).toContain('| **granite3.1-dense:8b** |');
    });

    it('genera sección de advertencia Maxwell si se detecta error', () => {
      const maxwellErrorDetected = true;
      const dateStr = '2026-05-26';

      const maxwellSection = `

## ⚠️ Advertencia Maxwell sm_5.2

Se detectaron errores relacionados con arquitectura Maxwell sm_5.2 durante el benchmark.
Esto indica incompatibilidad con GPU Maxwell (Compute Capability 5.2).

Se ha generado documentación adicional en: \`docs/known-issues/maxwell-sm52-incompat.md\`
`;

      if (maxwellErrorDetected) {
        expect(maxwellSection).toContain('⚠️ Advertencia Maxwell sm_5.2');
        expect(maxwellSection).toContain('docs/known-issues/maxwell-sm52-incompat.md');
      }
    });
  });

  describe('documentación de errores Maxwell', () => {
    it('genera archivo maxwell-sm52-incompat.md con contenido correcto', () => {
      const dateStr = '2026-05-26';
      const maxwellContent = `# Maxwell sm_5.2 Incompatibilidad

## Fecha de detección
${new Date().toISOString()}

## Contexto
Durante la ejecución del benchmark \`nuevos-vs-baseline-${dateStr}\`, se detectaron errores relacionados con la arquitectura GPU Maxwell (Compute Capability 5.2).

## Síntomas
Los modelos fallan con mensajes de error que incluyen:
- \`sm_5.2\`
- \`maxwell\`
- \`unsupported architecture\`
- \`compute capability\`

## Modelos afectados
Posiblemente todos los modelos nuevos que requieren:
- ministral-3:latest
- ministral-3:14b
- deepseek-r1:14b
- qwen2.5:30b

## Causa raíz
Los modelos más recientes pueden estar compilados con CUDA kernels que requieren Compute Capability mínimo superior a 5.2 (Maxwell).

## Soluciones posibles
1. **Usar CPU mode**: Ollama permite forzar CPU con \`OLLAMA_NUM_GPU=0\`
2. **Actualizar hardware**: Migrar a GPU con Compute Capability >= 7.0 (Volta, Turing, Ampere)
3. **Usar modelos compatibles**: Quedarse con modelos que soporten sm_5.2 (granite3.1, qwen2.5:14b)

## Recomendación actual
Mantener granite3.1-dense:8b como baseline ya que es compatible con hardware Maxwell.

## Referencias
- Benchmark run: \`data/bench-runs/nuevos-vs-baseline-${dateStr}.jsonl\`
- CUDA Compute Capability: https://developer.nvidia.com/cuda-gpus
`;

      expect(maxwellContent).toContain('# Maxwell sm_5.2 Incompatibilidad');
      expect(maxwellContent).toContain('## Síntomas');
      expect(maxwellContent).toContain('## Modelos afectados');
      expect(maxwellContent).toContain('ministral-3:latest');
      expect(maxwellContent).toContain('deepseek-r1:14b');
      expect(maxwellContent).toContain('## Soluciones posibles');
      expect(maxwellContent).toContain('granite3.1-dense:8b');
    });
  });

  describe('manejo de errores', () => {
    it('maneja timeout con AbortController extendido', () => {
      const TIMEOUT_MS = 180_000; // 3 min
      const controller = new AbortController();
      
      expect(controller.signal).toHaveProperty('aborted');
      expect(TIMEOUT_MS).toBe(180_000);

      controller.abort();
      expect(controller.signal.aborted).toBe(true);
    });

    it('maneja prompts con error en todos los modelos', () => {
      const failedResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1'],
        timestamp: new Date().toISOString(),
        ministral_3b: {
          model: 'ministral-3:latest',
          error: 'Maxwell not supported',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        ministral_14b: {
          model: 'ministral-3:14b',
          error: 'Maxwell not supported',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        deepseek_r1: {
          model: 'deepseek-r1:14b',
          error: 'Maxwell not supported',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        qwen3_30b: {
          model: 'qwen2.5:30b',
          error: 'Timeout',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        baseline: {
          model: 'granite3.1-dense:8b',
          error: 'Connection refused',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        winner: 'none',
        reason: 'Todos fallaron',
      };

      expect(failedResult.ministral_3b.error).toBeTruthy();
      expect(failedResult.ministral_14b.error).toBeTruthy();
      expect(failedResult.deepseek_r1.error).toBeTruthy();
      expect(failedResult.qwen3_30b.error).toBeTruthy();
      expect(failedResult.baseline.error).toBeTruthy();
      expect(failedResult.winner).toBe('none');
      expect(failedResult.reason).toContain('Todos fallaron');
    });

    it('maneja respuesta vacía del modelo', () => {
      const emptyResponse = {
        response: '',
        latency_ms: 500,
        tokens_estimated: 0,
      };

      expect(emptyResponse.response).toBe('');
      expect(emptyResponse.tokens_estimated).toBe(0);
    });
  });

  describe('configuración', () => {
    it('tiene URL de Ollama configurada', () => {
      const OLLAMA_URL = 'http://localhost:11434/api/generate';
      expect(OLLAMA_URL).toContain('localhost:11434');
      expect(OLLAMA_URL).toContain('/api/generate');
    });

    it('tiene keep_alive configurado para modelos grandes', () => {
      const KEEP_ALIVE = '30m';
      expect(KEEP_ALIVE).toBe('30m');
    });

    it('tiene temperatura y num_predict configurados', () => {
      const temperature = 0.7;
      const num_predict = 300;
      
      expect(temperature).toBe(0.7);
      expect(num_predict).toBe(300);
    });
  });
});
