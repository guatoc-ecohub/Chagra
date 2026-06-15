/**
 * bench-runner.test.mjs — Tests para el módulo bench-runner
 */

import { describe, it, expect } from 'vitest';
import {
  loadPrompts,
  deduplicatePromptsById,
  generateBenchPaths,
  getBenchOutputDir,
  ensureDir,
  getSidecarToken,
} from '../lib/bench-runner.mjs';

describe('bench-runner', () => {
  describe('loadPrompts', () => {
    it('debería cargar prompts desde un array', () => {
      const prompts = [
        { id: 1, query: 'test' },
        { id: 2, query: 'test2' },
      ];
      const result = loadPrompts(prompts);
      expect(result).toEqual(prompts);
    });

    it('debería lanzar error si el archivo JSON no existe', () => {
      expect(() => loadPrompts('/nonexistent/file.json')).toThrow();
    });
  });

  describe('deduplicatePromptsById', () => {
    it('debería deduplicar prompts por ID', () => {
      const prompts = [
        { id: 1, query: 'test' },
        { id: 1, query: 'test-duplicate' },
        { id: 2, query: 'test2' },
      ];
      const result = deduplicatePromptsById(prompts);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('debería mantener el primer prompt con cada ID', () => {
      const prompts = [
        { id: 1, query: 'first' },
        { id: 1, query: 'second' },
      ];
      const result = deduplicatePromptsById(prompts);
      expect(result).toHaveLength(1);
      expect(result[0].query).toBe('first');
    });
  });

  describe('generateBenchPaths', () => {
    it('debería generar paths con fecha', () => {
      const paths = generateBenchPaths('test-bench', '/tmp/output', '2026-06-15');
      expect(paths.jsonlPath).toBe('/tmp/output/test-bench-2026-06-15.jsonl');
      expect(paths.summaryPath).toBe('/tmp/output/test-bench-2026-06-15-summary.md');
    });

    it('debería usar fecha actual si no se proporciona', () => {
      const paths = generateBenchPaths('test-bench', '/tmp/output');
      const today = new Date().toISOString().split('T')[0];
      expect(paths.jsonlPath).toContain(today);
    });
  });

  describe('getBenchOutputDir', () => {
    it('debería usar BENCH_OUTPUT_DIR si está definido', () => {
      const originalEnv = process.env.BENCH_OUTPUT_DIR;
      process.env.BENCH_OUTPUT_DIR = '/custom/output';
      const result = getBenchOutputDir('/root');
      expect(result).toBe('/custom/output');
      process.env.BENCH_OUTPUT_DIR = originalEnv;
    });

    it('debería usar data/bench-runs por defecto', () => {
      const originalEnv = process.env.BENCH_OUTPUT_DIR;
      delete process.env.BENCH_OUTPUT_DIR;
      const result = getBenchOutputDir('/root');
      expect(result).toBe('/root/data/bench-runs');
      if (originalEnv) process.env.BENCH_OUTPUT_DIR = originalEnv;
    });
  });

  describe('getSidecarToken', () => {
    it('debería retornar string vacío si no hay token', () => {
      const result = getSidecarToken();
      expect(typeof result).toBe('string');
    });
  });
});
