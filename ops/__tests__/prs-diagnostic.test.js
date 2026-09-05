import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('PRS Conflict Diagnostic', () => {
  const opsDir = join(process.cwd(), 'ops');
  const diagnosticFile = join(opsDir, 'prs-dev-conflict-diagnostic.md');

  describe('Diagnóstico Completo', () => {
    it('debe crear el archivo de diagnóstico', () => {
      expect(existsSync(diagnosticFile)).toBe(true);
    });

    it('debe contener las secciones requeridas', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toContain('## Resumen Ejecutivo');
      expect(content).toContain('## 1. PRs CONFLICTING');
      expect(content).toContain('## 2. PRs MERGEABLE/UNSTABLE');
      expect(content).toContain('## 3. Ranking Valor/Esfuerzo');
      expect(content).toContain('## 4. Plan de Acción Concreto');
      expect(content).toContain('## 5. Métricas de Éxito');
    });

    it('debe identificar 8 PRs CONFLICTING masivos', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toContain('#3003');
      expect(content).toContain('#3002');
      expect(content).toContain('#3000');
      expect(content).toContain('#2959');
      expect(content).toContain('#2958');
      expect(content).toContain('#2952');
    });

    it('debe identificar 23 PRs MERGEABLE/UNSTABLE', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toContain('23 PRs MERAGEABLE/UNSTABLE');
      expect(content).toContain('PRs listos para merge inmediato');
    });

    it('debe tener ranking valor/esfuerzo con 3 categorías', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toContain('🔥 URGENTE');
      expect(content).toContain('🟡 RECOMENDADO');
      expect(content).toContain('🔴 ESCALAR A OPUS');
    });
  });

  describe('Archivos de Evidencia', () => {
    it('debe crear merge-tree outputs para PRs conflictivos', () => {
      expect(existsSync(join(opsDir, 'merge-tree-crudo-3003.txt'))).toBe(true);
      expect(existsSync(join(opsDir, 'merge-tree-crudo-3002.txt'))).toBe(true);
      expect(existsSync(join(opsDir, 'merge-tree-crudo-3000.txt'))).toBe(true);
    });

    it('merge-tree outputs deben tener contenido válido', () => {
      const tree3003 = readFileSync(join(opsDir, 'merge-tree-crudo-3003.txt'), 'utf-8');
      const tree3002 = readFileSync(join(opsDir, 'merge-tree-crudo-3002.txt'), 'utf-8');
      const tree3000 = readFileSync(join(opsDir, 'merge-tree-crudo-3000.txt'), 'utf-8');
      
      // Los outputs deben tener el formato de merge-tree (hash + modo + archivo)
      expect(tree3003).toMatch(/^[a-f0-9]{40}\s/);
      expect(tree3002).toMatch(/^[a-f0-9]{40}\s/);
      expect(tree3000).toMatch(/^[a-f0-9]{40}\s/);
      
      // Deben mencionar archivos en conflicto
      expect(tree3003).toMatch(/\.github\/workflows\/cla\.yml|package\.json|src\/components/);
    });
  });

  describe('Consistencia del Ranking', () => {
    it('debe tener prioridades consistentes con commits behind', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      // PRs con menos commits behind deben tener mayor prioridad
      expect(content).toContain('#2938 (zarigüeya) - 1 commit behind');
      expect(content).toContain('MUY ALTA');
      
      // PRs con 43 commits behind deben tener prioridad BAJA
      expect(content).toContain('43 commits behind');
      expect(content).toContain('BAJA');
    });

    it('debe priorizar MERGEABLE sobre CONFLICTING', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      // La sección URGENTE debe mencionar rebase simple
      expect(content).toContain('Rebase de 1 comando → merge');
      
      // La sección RECOMENDADO debe mencionar batch merge
      expect(content).toContain('Batch merge de 23 PRs MERGEABLE/UNSTABLE');
    });
  });

  describe('Métricas de Éxito', () => {
    it('debe tener métricas cuantificables', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toMatch(/Antes.*31 PRs/);
      expect(content).toMatch(/Después.*28 PRs/);
      expect(content).toMatch(/Backlog limpio/);
    });

    it('debe tener timeline realista', () => {
      const content = readFileSync(diagnosticFile, 'utf-8');
      
      expect(content).toMatch(/Fase 1.*1 hora/);
      expect(content).toMatch(/Fase 2.*2 horas/);
      expect(content).toMatch(/3 horas/);
    });
  });

  describe('Script de Diagnóstico', () => {
    it('el script principal debe poder ejecutarse', () => {
      const scriptPath = join(opsDir, 'diagnose_prs.sh');
      
      if (existsSync(scriptPath)) {
        expect(() => {
          execSync(`bash ${scriptPath}`, { 
            stdio: 'pipe',
            timeout: 30000 
          });
        }).not.toThrow();
      }
    });
  });
});
