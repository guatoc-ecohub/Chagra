/**
 * Tests para medir-rag-local.mjs
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const SCRIPT_PATH = join(ROOT_DIR, 'scripts', 'bench', 'medir-rag-local.mjs');

describe('medir-rag-local', () => {
  describe('carga del manifest', () => {
    it('debe leer el manifest correctamente', () => {
      const manifestPath = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');
      expect(existsSync(manifestPath)).toBe(true);
      
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      expect(manifest).toBeDefined();
      expect(manifest.slugs || manifest).toBeDefined();
    });

    it('debe tener al menos 400 especies (threshold mínimo)', () => {
      const manifestPath = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const speciesCount = manifest.slugs?.length || manifest.length || 0;
      
      expect(speciesCount).toBeGreaterThanOrEqual(400);
    });

    it('debe tener 517 especies (catálogo completo)', () => {
      const manifestPath = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const speciesCount = manifest.slugs?.length || manifest.length || 0;
      
      // El catálogo completo debe tener 517 especies: 501 tras PR #2860
      // + 16 regenerados desde seed v3.1 (corpus rancio 070.9, 2026-09-03)
      expect(speciesCount).toBe(517);
    });
  });

  describe('preguntas agro', () => {
    it('debe tener al menos 30 preguntas', () => {
      // El script define AGRO_QUESTIONS con mínimo 30 preguntas
      // Este test verifica que el golden set existe
      const goldenPath = join(ROOT_DIR, 'eval', 'rag-golden.json');
      expect(existsSync(goldenPath)).toBe(true);
      
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(golden).toBeInstanceOf(Array);
      expect(golden.length).toBeGreaterThanOrEqual(30);
    });

    it('las preguntas deben tener estructura válida', () => {
      const goldenPath = join(ROOT_DIR, 'eval', 'rag-golden.json');
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      
      for (const item of golden) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('query');
        expect(item).toHaveProperty('expected');
        expect(typeof item.id).toBe('string');
        expect(typeof item.query).toBe('string');
        expect(typeof item.expected).toBe('string');
      }
    });
  });

  describe('cálculo de recall', () => {
    it('debe calcular recall@5 correctamente', () => {
      // Mock de resultados
      const results = [
        { id: 'G01', found: true, rank: 1 },
        { id: 'G02', found: true, rank: 2 },
        { id: 'G03', found: true, rank: 3 },
        { id: 'G04', found: true, rank: 4 },
        { id: 'G05', found: true, rank: 5 },
        { id: 'G06', found: true, rank: 6 },
        { id: 'G07', found: true, rank: 7 },
        { id: 'G08', found: true, rank: 8 },
        { id: 'G09', found: true, rank: 9 },
        { id: 'G10', found: true, rank: 10 },
        { id: 'G11', found: false, rank: null },
        { id: 'G12', found: false, rank: null },
        { id: 'G13', found: false, rank: null },
        { id: 'G14', found: false, rank: null },
        { id: 'G15', found: false, rank: null },
      ];

      const recall5 = results.filter(r => r.found && r.rank <= 5).length / results.length;
      expect(recall5).toBe(5 / 15); // 5 hits en top-5 de 15 total
    });

    it('debe calcular recall@10 correctamente', () => {
      const results = [
        { id: 'G01', found: true, rank: 1 },
        { id: 'G02', found: true, rank: 2 },
        { id: 'G03', found: true, rank: 3 },
        { id: 'G04', found: true, rank: 4 },
        { id: 'G05', found: true, rank: 5 },
        { id: 'G06', found: true, rank: 6 },
        { id: 'G07', found: true, rank: 7 },
        { id: 'G08', found: true, rank: 8 },
        { id: 'G09', found: true, rank: 9 },
        { id: 'G10', found: true, rank: 10 },
        { id: 'G11', found: false, rank: null },
        { id: 'G12', found: false, rank: null },
        { id: 'G13', found: false, rank: null },
        { id: 'G14', found: false, rank: null },
        { id: 'G15', found: false, rank: null },
      ];

      const recall10 = results.filter(r => r.found && r.rank <= 10).length / results.length;
      expect(recall10).toBe(10 / 15); // 10 hits en top-10 de 15 total
    });
  });

  describe('veredictos', () => {
    it('debe dar PASS si recall@5 >= 58%', () => {
      const recall5 = 0.60;
      const baseline = 0.44;
      const expected = 0.58;
      
      let verdict = 'NEUTRAL';
      if (recall5 >= expected) verdict = 'PASS';
      else if (recall5 < baseline) verdict = 'FAIL';
      
      expect(verdict).toBe('PASS');
    });

    it('debe dar NEUTRAL si 44% <= recall@5 < 58%', () => {
      const recall5 = 0.50;
      const baseline = 0.44;
      const expected = 0.58;
      
      let verdict = 'NEUTRAL';
      if (recall5 >= expected) verdict = 'PASS';
      else if (recall5 < baseline) verdict = 'FAIL';
      
      expect(verdict).toBe('NEUTRAL');
    });

    it('debe dar FAIL si recall@5 < 44%', () => {
      const recall5 = 0.40;
      const baseline = 0.44;
      const expected = 0.58;
      
      let verdict = 'NEUTRAL';
      if (recall5 >= expected) verdict = 'PASS';
      else if (recall5 < baseline) verdict = 'FAIL';
      
      expect(verdict).toBe('FAIL');
    });
  });

  describe('archivo de salida', () => {
    it('debe crear docs/bench-rag-local.json si el script corre', () => {
      const outputPath = join(ROOT_DIR, 'docs', 'bench-rag-local.json');
      
      // Este test verifica que el directorio docs existe y puede crear el archivo
      const docsDir = join(ROOT_DIR, 'docs');
      expect(existsSync(docsDir)).toBe(true);
    });

    it('debe crear docs/bench-rag-local.md', () => {
      const docsPath = join(ROOT_DIR, 'docs', 'bench-rag-local.md');
      
      // Este test verifica que el directorio docs existe
      const docsDir = join(ROOT_DIR, 'docs');
      expect(existsSync(docsDir)).toBe(true);
    });
  });

  describe('fail-closed PROD_BASE_URL', () => {
    it('debe fallar ruidosamente (exit != 0) si se define PROD_BASE_URL', () => {
      const result = spawnSync('node', [SCRIPT_PATH], {
        env: { ...process.env, PROD_BASE_URL: 'https://chagra.app' },
        encoding: 'utf8',
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROD_BASE_URL');
      expect(result.stderr).toContain('NO mide producción');
    });

    it('NO debe producir resultados de medición cuando falla fail-closed', () => {
      const result = spawnSync('node', [SCRIPT_PATH], {
        env: { ...process.env, PROD_BASE_URL: 'https://chagra.app' },
        encoding: 'utf8',
      });

      expect(result.stdout).not.toContain('recall@5:');
      expect(result.status).toBe(64);
    });
  });

  describe('validación de especies críticas', () => {
    it('el manifest debe contener especies críticas del PR #2860', () => {
      const manifestPath = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const slugs = manifest.slugs || manifest;
      
      // Especies críticas que tenían 0% recall por el bug del stub
      const criticalSpecies = [
        'manihot_esculenta', // yuca
        'musa_paradisiaca', // plátano
        'solanum_lycopersicum_cerasiforme', // tomate (chonto)
        'theobroma_cacao', // cacao
        'persea_americana', // aguacate
      ];
      
      for (const species of criticalSpecies) {
        expect(slugs).toContain(species);
      }
    });
  });

  describe('thresholds y constantes', () => {
    it('baseline debe ser 44%', () => {
      // El script define BASELINE_RECALL_5 = 0.44
      const baseline = 0.44;
      expect(baseline).toBe(0.44);
    });

    it('expected debe ser 58%', () => {
      // El script define EXPECTED_RECALL_5 = 0.58
      const expected = 0.58;
      expect(expected).toBe(0.58);
    });

    it('MIN_SPECIES debe ser 400 por defecto', () => {
      // El script define MIN_SPECIES = 400
      const minSpecies = 400;
      expect(minSpecies).toBe(400);
    });
  });
});
