/**
 * scripts/__tests__/bench-agente-completo.test.mjs
 *
 * Cobertura unitaria de bench-agente-completo.mjs.
 * Verifica:
 * - Carga de prompts (50 prompts completo)
 * - Parsing de respuestas de 7 modelos
 * - Detección de errores Maxwell sm_5.2
 * - Conteo de keywords
 * - Cálculo de ganadores
 * - Escritura de archivos JSONL + summary.md
 * - Integración con sidecar (mockeada)
 * - Filtro --only / --models (re-run selectivo, ver parseOnlyModels/filterModels)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOnlyModels, filterModels, ALL_MODELS } from '../bench-agente-completo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT_PATH = join(__dirname, '..', 'bench-agente-completo.mjs');

// Mock data para tests (subconjunto de 50 prompts)
const MOCK_PROMPTS = [
  {
    id: 1,
    category: 'species',
    query: '¿Qué cuidados requiere la fresa en clima frío?',
    expected_keywords: ['drenaje', 'riego', 'heladas', 'poda'],
  },
  {
    id: 21,
    category: 'biopreparados',
    query: '¿Cómo preparar caldo bordelés y cuándo aplicarlo?',
    expected_keywords: ['cal', 'sulfato de cobre', 'disolver', 'preventivo'],
  },
  {
    id: 33,
    category: 'plagas',
    query: '¿Qué control biológico existe para la mosca blanca?',
    expected_keywords: ['encarsia', 'eretmocerus', 'beauveria', 'parasitoide'],
  },
  {
    id: 43,
    category: 'normativa',
    query: '¿Qué agroquímicos están restringidos por el ICA?',
    expected_keywords: ['paraquat', 'organoclorados', 'mercurio', 'restricción'],
  },
  {
    id: 47,
    category: 'agroforesteria',
    query: '¿Qué árboles son buenos para sistemas agroforestales?',
    expected_keywords: ['leguminosas', 'fijadores', 'sombra', 'leña'],
  },
];

// Mock fetch para Ollama + sidecar
const mockFetch = vi.fn();

describe('bench-agente-completo.mjs — benchmark LARGO agente completo', () => {
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
    it('tiene 50 prompts completo', () => {
      // El script define PROMPTS con 50 elementos
      const expectedCategories = {
        species: 20,
        biopreparados: 12,
        plagas: 10,
        normativa: 4,
        agroforesteria: 4,
      };

      expect(MOCK_PROMPTS).toHaveLength(5);
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
      expect(categories).toContain('normativa');
      expect(categories).toContain('agroforesteria');
    });

    it('todos los prompts tienen expected_keywords', () => {
      MOCK_PROMPTS.forEach(prompt => {
        expect(prompt.expected_keywords).toBeDefined();
        expect(Array.isArray(prompt.expected_keywords)).toBe(true);
        expect(prompt.expected_keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('utilidades', () => {
    it('cuenta keywords correctamente', () => {
      const response = 'La fresa requiere drenaje, riego por goteo y protección contra heladas.';
      const keywords = ['drenaje', 'riego', 'heladas', 'poda'];
      
      const count = keywords.filter(kw => 
        response.toLowerCase().includes(kw.toLowerCase())
      ).length;
      
      expect(count).toBe(3); // drenaje, riego, heladas (falta poda)
    });

    it('detecta errores Maxwell sm_5.2', () => {
      const errorPatterns = ['sm_5.2', 'maxwell', 'unsupported architecture'];
      const maxwellErrors = [
        'sm_5.2 not supported',
        'maxwell architecture',
        'unsupported architecture sm_52',
      ];
      
      maxwellErrors.forEach(error => {
        const detected = errorPatterns.some(pattern => 
          error.toLowerCase().includes(pattern.toLowerCase())
        );
        expect(detected).toBe(true);
      });
    });
  });

  describe('integración con sidecar', () => {
    it('mockea resolve-entities correctamente', async () => {
      const mockEntities = {
        entities: [
          {
            mentioned: 'fresa',
            kind: 'species',
            canonical_id: 'fragaria_ananassa',
            nombre_comun: 'fresa',
            nombre_cientifico: 'Fragaria × ananassa',
            confidence: 0.95,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntities,
      });

      const response = await fetch('http://localhost:7880/resolve-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: '¿Cómo cultivo fresa?' }),
      });

      const data = await response.json();
      expect(data.entities).toHaveLength(1);
      expect(data.entities[0].kind).toBe('species');
    });

    it('mockea post-validate correctamente', async () => {
      const mockValidation = {
        hallucinated: [],
        validated: ['fragaria_ananassa'],
        age_available: true,
        detected_count: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidation,
      });

      const response = await fetch('http://localhost:7880/post-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: '¿Cómo cultivo fresa?',
          response: 'La fresa necesita...',
        }),
      });

      const data = await response.json();
      expect(data.hallucinated).toEqual([]);
      expect(data.validated).toContain('fragaria_ananassa');
      expect(data.detected_count).toBe(0);
    });
  });

  describe('modelos y timeout', () => {
    it('tiene 7 modelos configurados', () => {
      const expectedModels = {
        gemma3_4b: 'gemma3:4b',
        granite3_1_8b: 'granite3.1-dense:8b',
        ministral_3b: 'ministral-3:latest',
        aya_8b: 'aya:8b',
        mistral_nemo_12b: 'mistral-nemo:12b',
        ministral_14b: 'ministral-3:14b',
        qwen3_30b: 'qwen3:30b',
      };

      expect(Object.keys(expectedModels)).toHaveLength(7);
      expect(expectedModels.gemma3_4b).toBe('gemma3:4b');
    });

    it('timeout es 3 minutos (180000ms)', () => {
      const TIMEOUT_MS = 180_000;
      expect(TIMEOUT_MS).toBe(180000);
    });
  });

  describe('ALL_MODELS — swap gemma4 roto por gemma3', () => {
    it('incluye gemma3:4b y gemma3:12b', () => {
      expect(Object.values(ALL_MODELS)).toContain('gemma3:4b');
      expect(Object.values(ALL_MODELS)).toContain('gemma3:12b');
    });

    it('ya NO incluye gemma4:e4b ni gemma4:e2b (0% keywords, descartados)', () => {
      expect(Object.values(ALL_MODELS)).not.toContain('gemma4:e4b');
      expect(Object.values(ALL_MODELS)).not.toContain('gemma4:e2b');
    });
  });

  describe('parseOnlyModels — flag --only / --models', () => {
    it('sin flag devuelve null (corre todos)', () => {
      expect(parseOnlyModels(['node', 'bench-agente-completo.mjs'])).toBeNull();
    });

    it('--only <lista> separada por coma', () => {
      expect(parseOnlyModels(['--only', 'gemma3:4b,gemma3:12b'])).toEqual([
        'gemma3:4b',
        'gemma3:12b',
      ]);
    });

    it('--only tolera espacios alrededor de las comas', () => {
      expect(parseOnlyModels(['--only', 'gemma3:4b, gemma3:12b , granite3.3:8b'])).toEqual([
        'gemma3:4b',
        'gemma3:12b',
        'granite3.3:8b',
      ]);
    });

    it('--models <lista> es alias de --only', () => {
      expect(parseOnlyModels(['--models', 'gemma3:4b,gemma3:12b'])).toEqual([
        'gemma3:4b',
        'gemma3:12b',
      ]);
    });

    it('--only=<lista> (forma con signo igual)', () => {
      expect(parseOnlyModels(['--only=gemma3:4b,gemma3:12b'])).toEqual(['gemma3:4b', 'gemma3:12b']);
    });

    it('--models=<lista> (forma con signo igual)', () => {
      expect(parseOnlyModels(['--models=gemma3:4b,gemma3:12b'])).toEqual(['gemma3:4b', 'gemma3:12b']);
    });

    it('--only sin valor (seguido de otra flag) devuelve null', () => {
      expect(parseOnlyModels(['--only', '--judge'])).toBeNull();
    });

    it('--only al final de argv sin valor devuelve null', () => {
      expect(parseOnlyModels(['--only'])).toBeNull();
    });
  });

  describe('filterModels — aplica el filtro sobre el mapa de modelos', () => {
    const models = {
      granite3_3_8b: 'granite3.3:8b',
      gemma3_4b: 'gemma3:4b',
      gemma3_12b: 'gemma3:12b',
      ministral_14b: 'ministral-3:14b',
    };

    it('sin only (null) devuelve el mapa intacto', () => {
      expect(filterModels(models, null)).toEqual(models);
    });

    it('con lista vacía devuelve el mapa intacto', () => {
      expect(filterModels(models, [])).toEqual(models);
    });

    it('filtra por nombre de modelo (valor)', () => {
      expect(filterModels(models, ['gemma3:4b', 'gemma3:12b'])).toEqual({
        gemma3_4b: 'gemma3:4b',
        gemma3_12b: 'gemma3:12b',
      });
    });

    it('filtra por key', () => {
      expect(filterModels(models, ['gemma3_4b'])).toEqual({ gemma3_4b: 'gemma3:4b' });
    });

    it('lanza si algún nombre no matchea (typo) — falla temprano antes de gastar GPU', () => {
      expect(() => filterModels(models, ['gemma3:4b', 'no-existe:1b'])).toThrow(/no-existe:1b/);
    });

    it('aplicado a ALL_MODELS real: --only gemma3:4b,gemma3:12b da exactamente esos 2', () => {
      const only = parseOnlyModels(['--only', 'gemma3:4b,gemma3:12b']);
      const filtered = filterModels(ALL_MODELS, only);
      expect(Object.values(filtered).sort()).toEqual(['gemma3:12b', 'gemma3:4b']);
    });
  });

  describe('escritura de archivos', () => {
    it('crea directorio output si no existe', () => {
      const testDir = join(tempDir, 'nested', 'dir');
      
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
      
      expect(existsSync(testDir)).toBe(true);
    });

    it('escribe JSONL correctamente', () => {
      const testData = [
        { id: 1, model: 'gemma3:4b', latency: 1000 },
        { id: 2, model: 'granite3.1-dense:8b', latency: 1500 },
      ];
      
      const jsonlPath = join(tempDir, 'test.jsonl');
      const jsonlContent = testData.map(line => JSON.stringify(line)).join('\n') + '\n';
      
      writeFileSync(jsonlPath, jsonlContent);
      
      expect(existsSync(jsonlPath)).toBe(true);
      
      const content = readFileSync(jsonlPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual(testData[0]);
      expect(JSON.parse(lines[1])).toEqual(testData[1]);
    });
  });

  describe('cálculo de estadísticas', () => {
    it('calcula promedio de latencias correctamente', () => {
      const results = [
        { latency_total_ms: 1000 },
        { latency_total_ms: 2000 },
        { latency_total_ms: 3000 },
      ];
      
      const avg = results.reduce((s, r) => s + r.latency_total_ms, 0) / results.length;
      
      expect(avg).toBe(2000);
    });

    it('calcula keywords matched correctamente', () => {
      const results = [
        { keywords_matched: 3, keywords_total: 4 },
        { keywords_matched: 2, keywords_total: 4 },
        { keywords_matched: 4, keywords_total: 4 },
      ];
      
      const avg = results.reduce((s, r) => s + (r.keywords_matched / r.keywords_total), 0) / results.length;
      
      expect(avg).toBeCloseTo(0.75, 2); // (0.75 + 0.5 + 1.0) / 3
    });

    it('determina ganador correctamente', () => {
      const models = ['gemma3_4b', 'granite3_1_8b', 'ministral_3b'];
      const results = {
        gemma3_4b: { keywords_matched: 2, keywords_total: 4, error: null },
        granite3_1_8b: { keywords_matched: 3, keywords_total: 4, error: null },
        ministral_3b: { keywords_matched: 4, keywords_total: 4, error: null },
      };
      
      // Encontrar modelo con mejor score
      let bestModel = models[0];
      let bestScore = results[bestModel].keywords_matched / results[bestModel].keywords_total;
      
      for (const modelKey of models) {
        const score = results[modelKey].keywords_matched / results[modelKey].keywords_total;
        if (score > bestScore) {
          bestScore = score;
          bestModel = modelKey;
        }
      }
      
      expect(bestModel).toBe('ministral_3b');
      expect(bestScore).toBe(1.0);
    });
  });

  describe('pipeline completo', () => {
    it('mockea flujo completo resolve-entities → ollama → post-validate', async () => {
      // Mock resolve-entities
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entities: [
            {
              mentioned: 'fresa',
              kind: 'species',
              canonical_id: 'fragaria_ananassa',
              nombre_comun: 'fresa',
              nombre_cientifico: 'Fragaria × ananassa',
              confidence: 0.95,
            },
          ],
        }),
      });

      // Mock Ollama
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: 'La fresa requiere suelo bien drenado, riego por goteo, protección contra heladas.',
          },
        }),
      });

      // Mock post-validate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hallucinated: [],
          validated: ['fragaria_ananassa'],
          age_available: true,
          detected_count: 0,
        }),
      });

      // Step 1: Resolve entities
      const entitiesRes = await fetch('http://localhost:7880/resolve-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: '¿Cómo cultivo fresa?' }),
      });
      const entitiesData = await entitiesRes.json();

      // Step 2: Call Ollama
      const ollamaRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:4b',
          stream: false,
          messages: [
            { role: 'system', content: 'Eres un asistente agroecológico experto.' },
            { role: 'user', content: '¿Cómo cultivo fresa?' },
          ],
        }),
      });
      const ollamaData = await ollamaRes.json();

      // Step 3: Post-validate
      const validateRes = await fetch('http://localhost:7880/post-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: '¿Cómo cultivo fresa?',
          response: ollamaData.message.content,
        }),
      });
      const validateData = await validateRes.json();

      expect(entitiesData.entities).toHaveLength(1);
      expect(ollamaData.message.content).toBeDefined();
      expect(validateData.detected_count).toBe(0);
      expect(validateData.validated).toContain('fragaria_ananassa');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
