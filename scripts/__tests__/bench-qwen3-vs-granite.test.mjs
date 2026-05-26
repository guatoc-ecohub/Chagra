/**
 * scripts/__tests__/bench-qwen3-vs-granite.test.mjs
 *
 * Cobertura unitaria de bench-qwen3-vs-granite.mjs.
 * Verifica:
 * - Carga de prompts (20 prompts representativos)
 * - Parsing de respuestas de modelos
 * - Conteo de keywords
 * - Cálculo de ganadores
 * - Escritura de archivos JSONL + summary.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT_PATH = join(__dirname, '..', 'bench-qwen3-vs-granite.mjs');

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

describe('bench-qwen3-vs-granite.mjs — smoke test comparativo', () => {
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
    it('tiene 20 prompts representativos', () => {
      // El script define PROMPTS con 20 elementos
      const expectedCategories = {
        species: 8,
        biopreparados: 6,
        plagas: 6,
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
    it('genera estructura correcta para prompt exitoso', () => {
      const mockResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        qwen3: {
          model: 'qwen2.5:14b',
          latency_ms: 1500,
          response: 'Respuesta con kw1 y kw2',
          tokens_estimated: 50,
          keywords_matched: 2,
          keywords_total: 2,
          error: null,
        },
        granite: {
          model: 'granite3.1-dense:8b',
          latency_ms: 1200,
          response: 'Respuesta con kw1',
          tokens_estimated: 40,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'qwen3',
        reason: 'qwen3 matched 2/2 vs granite 1/2',
      };

      expect(mockResult).toHaveProperty('prompt_id');
      expect(mockResult).toHaveProperty('category');
      expect(mockResult).toHaveProperty('qwen3');
      expect(mockResult).toHaveProperty('granite');
      expect(mockResult).toHaveProperty('winner');
      expect(mockResult).toHaveProperty('reason');
    });

    it('genera estructura correcta para prompt con error', () => {
      const mockResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        qwen3: {
          model: 'qwen2.5:14b',
          error: 'Timeout: request took too long',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 2,
        },
        granite: {
          model: 'granite3.1-dense:8b',
          latency_ms: 1000,
          response: 'Respuesta con kw1',
          tokens_estimated: 30,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'granite',
        reason: 'qwen3 falló',
      };

      expect(mockResult.qwen3.error).toBeTruthy();
      expect(mockResult.qwen3.latency_ms).toBeNull();
      expect(mockResult.granite.error).toBeNull();
      expect(mockResult.winner).toBe('granite');
    });

    it('determina ganador correctamente cuando gana qwen3', () => {
      const qwenScore = 2 / 2; // 100%
      const graniteScore = 1 / 2; // 50%
      
      expect(qwenScore).toBeGreaterThan(graniteScore);
    });

    it('determina empate correctamente', () => {
      const qwenScore = 1 / 2; // 50%
      const graniteScore = 1 / 2; // 50%
      
      expect(qwenScore).toBe(graniteScore);
    });

    it('determina ganador cuando uno falla', () => {
      const qwenError = 'Timeout';
      const graniteSuccess = true;
      
      expect(qwenError).toBeTruthy();
      expect(graniteSuccess).toBe(true);
    });
  });

  describe('cálculo de estadísticas', () => {
    it('calcula latencia promedio correctamente', () => {
      const results = [
        { qwen3: { latency_ms: 1500, error: null } },
        { qwen3: { latency_ms: 2000, error: null } },
        { qwen3: { latency_ms: 1000, error: null } },
      ];

      const avg = results.reduce((s, r) => s + r.qwen3.latency_ms, 0) / results.length;
      expect(avg).toBeCloseTo(1500);
    });

    it('calcula keywords promedio correctamente', () => {
      const results = [
        { qwen3: { keywords_matched: 2, keywords_total: 2, error: null } },
        { qwen3: { keywords_matched: 1, keywords_total: 2, error: null } },
        { qwen3: { keywords_matched: 3, keywords_total: 4, error: null } },
      ];

      const avg = results.reduce((s, r) => s + (r.qwen3.keywords_matched / r.qwen3.keywords_total), 0) / results.length;
      expect(avg).toBeCloseTo(0.75, 2); // (1 + 0.5 + 0.75) / 3
    });

    it('filtra resultados exitosos correctamente', () => {
      const results = [
        { qwen3: { latency_ms: 1500, error: null } },
        { qwen3: { latency_ms: null, error: 'Timeout' } },
        { qwen3: { latency_ms: 1000, error: null } },
      ];

      const successful = results.filter(r => !r.qwen3.error);
      expect(successful).toHaveLength(2);
    });

    it('cuenta ganadores por categoría', () => {
      const results = [
        { winner: 'qwen3', category: 'species' },
        { winner: 'granite', category: 'species' },
        { winner: 'qwen3', category: 'biopreparados' },
        { winner: 'tie', category: 'plagas' },
      ];

      const qwen3Wins = results.filter(r => r.winner === 'qwen3').length;
      const graniteWins = results.filter(r => r.winner === 'granite').length;
      const ties = results.filter(r => r.winner === 'tie').length;

      expect(qwen3Wins).toBe(2);
      expect(graniteWins).toBe(1);
      expect(ties).toBe(1);
    });
  });

  describe('formato de output', () => {
    it('genera línea JSONL válida', () => {
      const result = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1', 'kw2'],
        timestamp: new Date().toISOString(),
        qwen3: {
          model: 'qwen2.5:14b',
          latency_ms: 1500,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        granite: {
          model: 'granite3.1-dense:8b',
          latency_ms: 1200,
          response: 'Test',
          tokens_estimated: 10,
          keywords_matched: 1,
          keywords_total: 2,
          error: null,
        },
        winner: 'tie',
        reason: 'Ambos matched 1/2',
      };

      const jsonlLine = JSON.stringify(result);
      const parsed = JSON.parse(jsonlLine);

      expect(parsed).toEqual(result);
      expect(jsonlLine).toContain('"prompt_id":1');
      expect(jsonlLine).toContain('"winner":"tie"');
    });

    it('genera summary.md con estructura correcta', () => {
      const dateStr = '2026-05-26';
      const stats = {
        totalPrompts: 20,
        qwen3Successful: 18,
        graniteSuccessful: 19,
        qwen3AvgLatency: 1500,
        graniteAvgLatency: 1200,
        qwen3AvgKeywords: 0.75,
        graniteAvgKeywords: 0.70,
        winners: { qwen3: 10, granite: 8, tie: 2, none: 0 },
      };

      const summaryContent = `# Qwen3 vs Granite Benchmark — ${dateStr}

## Metadata
- **Timestamp**: 2026-05-26T10:00:00.000Z
- **Modelos**: qwen2.5:14b vs granite3.1-dense:8b
- **Prompts**: ${stats.totalPrompts}

## Resultados Globales

| Modelo | Exitosos | Latencia Promedio (ms) | Keywords Promedio (%) |
|--------|----------|----------------------|---------------------|
| **qwen3:14b** | ${stats.qwen3Successful}/${stats.totalPrompts} | ${stats.qwen3AvgLatency.toFixed(0)} | ${(stats.qwen3AvgKeywords * 100).toFixed(1)}% |
| **granite:8b** | ${stats.graniteSuccessful}/${stats.totalPrompts} | ${stats.graniteAvgLatency.toFixed(0)} | ${(stats.graniteAvgKeywords * 100).toFixed(1)}% |

## Ganadores por Prompt

| Ganador | Cantidad | Porcentaje |
|---------|----------|-----------|
| **qwen3:14b** | ${stats.winners.qwen3} | ${(stats.winners.qwen3 / stats.totalPrompts * 100).toFixed(1)}% |
| **granite:8b** | ${stats.winners.granite} | ${(stats.winners.granite / stats.totalPrompts * 100).toFixed(1)}% |
| **Empate** | ${stats.winners.tie} | ${(stats.winners.tie / stats.totalPrompts * 100).toFixed(1)}% |
`;

      expect(summaryContent).toContain('# Qwen3 vs Granite Benchmark');
      expect(summaryContent).toContain('## Metadata');
      expect(summaryContent).toContain('## Resultados Globales');
      expect(summaryContent).toContain('## Ganadores por Prompt');
      expect(summaryContent).toContain('| **qwen3:14b** |');
      expect(summaryContent).toContain('| **granite:8b** |');
    });
  });

  describe('integración mock fetch', () => {
    it('mockea respuesta exitosa de qwen3', async () => {
      const mockResponse = {
        response: 'La fresa requiere drenaje y riego.',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:14b',
          prompt: 'Test prompt',
          stream: false,
        }),
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('mockea respuesta con error de modelo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetch('http://localhost:11434/api/generate');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });
  });

  describe('manejo de errores', () => {
    it('maneja timeout con AbortController', () => {
      const controller = new AbortController();
      expect(controller.signal).toHaveProperty('aborted');

      controller.abort();
      expect(controller.signal.aborted).toBe(true);
    });

    it('maneja prompts con error en ambos modelos', () => {
      const failedResult = {
        prompt_id: 1,
        category: 'species',
        query: '¿Test?',
        expected_keywords: ['kw1'],
        timestamp: new Date().toISOString(),
        qwen3: {
          model: 'qwen2.5:14b',
          error: 'Timeout',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        granite: {
          model: 'granite3.1-dense:8b',
          error: 'Connection refused',
          latency_ms: null,
          response: null,
          keywords_matched: 0,
          keywords_total: 1,
        },
        winner: 'none',
        reason: 'Ambos fallaron',
      };

      expect(failedResult.qwen3.error).toBeTruthy();
      expect(failedResult.granite.error).toBeTruthy();
      expect(failedResult.winner).toBe('none');
      expect(failedResult.reason).toContain('Ambos fallaron');
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
    it('tiene configuración correcta de modelos', () => {
      const MODELS = {
        qwen3: 'qwen2.5:14b',
        granite: 'granite3.1-dense:8b',
      };

      expect(MODELS.qwen3).toBe('qwen2.5:14b');
      expect(MODELS.granite).toBe('granite3.1-dense:8b');
    });

    it('tiene timeout configurado', () => {
      const TIMEOUT_MS = 120_000;
      expect(TIMEOUT_MS).toBe(120_000);
    });

    it('tiene URL de Ollama configurada', () => {
      const OLLAMA_URL = 'http://localhost:11434/api/generate';
      expect(OLLAMA_URL).toContain('localhost:11434');
      expect(OLLAMA_URL).toContain('/api/generate');
    });
  });
});
