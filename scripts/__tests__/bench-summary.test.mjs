/**
 * bench-summary.test.mjs — Tests para el módulo bench-summary
 */

import { describe, it, expect } from 'vitest';
import {
  generateMetadataSection,
  generateModelTable,
  generateConclusionSection,
  calculateCategoryStats,
} from '../lib/bench-summary.mjs';

describe('bench-summary', () => {
  describe('generateMetadataSection', () => {
    it('debería generar sección de metadata', () => {
      const metadata = generateMetadataSection({
        benchName: 'test-bench',
        dateStr: '2026-06-15',
        timestamp: '2026-06-15T10:00:00Z',
        models: ['model1', 'model2'],
        promptCount: 10,
        totalTimeMs: 60000,
      });

      expect(metadata).toContain('## Metadata');
      expect(metadata).toContain('2026-06-15');
      expect(metadata).toContain('model1');
      expect(metadata).toContain('model2');
      expect(metadata).toContain('10');
    });

    it('debería incluir campos extra', () => {
      const metadata = generateMetadataSection({
        benchName: 'test',
        dateStr: '2026-06-15',
        timestamp: '2026-06-15T10:00:00Z',
        models: ['model1'],
        promptCount: 5,
        totalTimeMs: 30000,
        extra: {
          'Extra Field': 'Extra Value',
        },
      });

      expect(metadata).toContain('Extra Field');
      expect(metadata).toContain('Extra Value');
    });
  });

  describe('generateModelTable', () => {
    it('debería generar tabla con columnas especificadas', () => {
      const stats = [
        { name: 'Model 1', score: 0.8, latency: 100 },
        { name: 'Model 2', score: 0.9, latency: 150 },
      ];

      const table = generateModelTable(
        stats,
        ['name', 'score', 'latency'],
        (col, val) => val
      );

      expect(table).toContain('| name | score | latency |');
      expect(table).toContain('Model 1');
      expect(table).toContain('Model 2');
      expect(table).toContain('0.8');
      expect(table).toContain('0.9');
    });

    it('debería usar formateador personalizado', () => {
      const stats = [{ name: 'Model 1', score: 0.8 }];

      const table = generateModelTable(
        stats,
        ['name', 'score'],
        (col, val) => (col === 'score' ? `${(val * 100).toFixed(1)}%` : val)
      );

      expect(table).toContain('80.0%');
    });
  });

  describe('generateConclusionSection', () => {
    it('debería generar conclusión con mejor modelo', () => {
      const conclusion = generateConclusionSection({
        bestModel: 'model1',
        bestWins: 8,
        totalPrompts: 10,
        bestStats: {
          avgLatency: 120,
          avgKeywords: 0.85,
        },
      });

      expect(conclusion).toContain('## Conclusión');
      expect(conclusion).toContain('model1');
      expect(conclusion).toContain('8');
      expect(conclusion).toContain('10');
      expect(conclusion).toContain('80.0%'); // 8/10 * 100
    });
  });

  describe('calculateCategoryStats', () => {
    it('debería calcular estadísticas por categoría', () => {
      const results = [
        {
          category: 'species',
          model1: { latency_ms: 100, keywords_matched: 4, keywords_total: 5 },
          model2: { latency_ms: 120, keywords_matched: 3, keywords_total: 5 },
        },
        {
          category: 'species',
          model1: { latency_ms: 110, keywords_matched: 5, keywords_total: 5 },
          model2: { error: 'failed' },
        },
      ];

      const stats = calculateCategoryStats(results, 'species', ['model1', 'model2']);

      expect(stats.model1.avgLatency).toBe(105); // (100 + 110) / 2
      expect(stats.model1.avgKeywords).toBe(0.9); // (4/5 + 5/5) / 2
      expect(stats.model1.count).toBe(2);

      expect(stats.model2.avgLatency).toBe(120); // Solo un resultado exitoso
      expect(stats.model2.avgKeywords).toBe(0.6); // 3/5
      expect(stats.model2.count).toBe(1);
    });

    it('debería manejar categoría sin resultados', () => {
      const results = [
        { category: 'other', model1: { latency_ms: 100 } },
      ];

      const stats = calculateCategoryStats(results, 'species', ['model1']);

      expect(stats.model1.avgLatency).toBe(0);
      expect(stats.model1.avgKeywords).toBe(0);
      expect(stats.model1.count).toBe(0);
    });
  });
});
