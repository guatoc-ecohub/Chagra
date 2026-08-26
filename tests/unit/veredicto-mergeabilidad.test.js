import { describe, it, expect } from 'vitest';

const CHECKS_INFORMATIVOS = new Set([
  'E2E suite completa (informativo)',
  'Playwright visual snapshots',
]);

const CHECKS_PROCESO = new Set([
  'CLAAssistant',
]);

function clasificarChecks(runs) {
  const requeridos = [];
  const informativos = [];
  const proceso = [];
  const skipped = [];
  
  for (const run of runs) {
    const nombre = run.name;
    const conclusion = run.conclusion;
    const status = run.status;
    
    if (status === 'skipped') {
      skipped.push(nombre);
      continue;
    }
    
    if (CHECKS_INFORMATIVOS.has(nombre)) {
      informativos.push({ nombre, conclusion });
      continue;
    }
    
    if (CHECKS_PROCESO.has(nombre)) {
      proceso.push({ nombre, conclusion });
      continue;
    }
    
    requeridos.push({ nombre, conclusion, status });
  }
  
  return { requeridos, informativos, proceso, skipped };
}

function evaluarMergeabilidad(pr, runs, base = 'dev') {
  const { requeridos, informativos, proceso, skipped } = clasificarChecks(runs);
  
  if (pr.baseRefName !== base) {
    return {
      veredicto: 'NO LISTO',
      razon: `base=${pr.baseRefName} (requerido: ${base})`,
      detalles: { base: pr.baseRefName, requeridos, informativos, proceso, skipped }
    };
  }
  
  if (pr.isDraft) {
    return {
      veredicto: 'NO LISTO',
      razon: 'PR es DRAFT',
      detalles: { requeridos, informativos, proceso, skipped }
    };
  }
  
  const requeridosFallidos = requeridos.filter(r => r.conclusion !== 'success');
  
  if (requeridosFallidos.length > 0) {
    const nombresFallidos = requeridosFallidos.map(r => r.nombre).join(', ');
    return {
      veredicto: 'NO LISTO',
      razon: `checks rojos: ${nombresFallidos}`,
      detalles: { requeridosFallidos, requeridos, informativos, proceso, skipped }
    };
  }
  
  const procesoFallidos = proceso.filter(p => p.conclusion !== 'success');
  if (procesoFallidos.length > 0) {
    return {
      veredicto: 'LISTO',
      razon: `CI verde (advertencia: proceso falla: ${procesoFallidos.map(p => p.nombre).join(', ')})`,
      detalles: { requeridos, informativos, proceso, skipped, procesoFallidos }
    };
  }
  
  return {
    veredicto: 'LISTO',
    razon: 'CI verde - todos los checks requeridos pasan',
    detalles: { requeridos, informativos, proceso, skipped }
  };
}

describe('veredicto-mergeabilidad', () => {
  describe('clasificarChecks', () => {
    it('debe clasificar checks requeridos como success', () => {
      const runs = [
        { name: 'vitest', conclusion: 'success', status: 'completed' },
        { name: 'tsc:check vs baseline', conclusion: 'success', status: 'completed' },
      ];
      
      const result = clasificarChecks(runs);
      
      expect(result.requeridos).toHaveLength(2);
      expect(result.requeridos[0].nombre).toBe('vitest');
      expect(result.requeridos[1].nombre).toBe('tsc:check vs baseline');
    });
    
    it('debe ignorar checks informativos', () => {
      const runs = [
        { name: 'E2E suite completa (informativo)', conclusion: 'failure', status: 'completed' },
        { name: 'Playwright visual snapshots', conclusion: 'failure', status: 'completed' },
        { name: 'vitest', conclusion: 'success', status: 'completed' },
      ];
      
      const result = clasificarChecks(runs);
      
      expect(result.informativos).toHaveLength(2);
      expect(result.requeridos).toHaveLength(1);
      expect(result.requeridos[0].nombre).toBe('vitest');
    });
    
    it('debe clasificar checks de proceso', () => {
      const runs = [
        { name: 'CLAAssistant', conclusion: 'failure', status: 'completed' },
        { name: 'vitest', conclusion: 'success', status: 'completed' },
      ];
      
      const result = clasificarChecks(runs);
      
      expect(result.proceso).toHaveLength(1);
      expect(result.proceso[0].nombre).toBe('CLAAssistant');
      expect(result.requeridos).toHaveLength(1);
    });
    
    it('debe clasificar checks skipped', () => {
      const runs = [
        { name: 'bench-gate', conclusion: null, status: 'skipped' },
        { name: 'vitest', conclusion: 'success', status: 'completed' },
      ];
      
      const result = clasificarChecks(runs);
      
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toBe('bench-gate');
    });
  });
  
  describe('evaluarMergeabilidad - Control POSITIVO', () => {
    it('debe dar LISTO para PR con todos los checks verdes (#2909)', () => {
      const pr = {
        number: 2909,
        title: 'fix(ci): make vitest test detection fail loudly',
        baseRefName: 'dev',
        isDraft: false,
        changedFiles: 4,
      };
      
      const runs = [
        { name: 'Check bundle sizes', conclusion: 'success', status: 'completed' },
        { name: 'CodeQL', conclusion: 'success', status: 'completed' },
        { name: 'Offline-first E2E', conclusion: 'success', status: 'completed' },
        { name: 'tsc:check vs baseline', conclusion: 'success', status: 'completed' },
        { name: 'vitest', conclusion: 'success', status: 'completed' },
        { name: 'E2E suite completa (informativo)', conclusion: 'failure', status: 'completed' },
      ];
      
      const result = evaluarMergeabilidad(pr, runs);
      
      expect(result.veredicto).toBe('LISTO');
      expect(result.razon).toContain('CI verde');
    });
  });
  
  describe('evaluarMergeabilidad - Control NEGATIVO', () => {
    it('debe dar NO LISTO para PR con tsc rojo (#2913)', () => {
      const pr = {
        number: 2913,
        title: 'fix(compai): reconciliar selector 2D con roster-8',
        baseRefName: 'dev',
        isDraft: false,
        changedFiles: 4,
      };
      
      const runs = [
        { name: 'Check bundle sizes', conclusion: 'success', status: 'completed' },
        { name: 'tsc:check vs baseline', conclusion: 'failure', status: 'completed' },
        { name: 'vitest', conclusion: 'success', status: 'completed' },
        { name: 'E2E suite completa (informativo)', conclusion: 'failure', status: 'completed' },
      ];
      
      const result = evaluarMergeabilidad(pr, runs);
      
      expect(result.veredicto).toBe('NO LISTO');
      expect(result.razon).toContain('checks rojos');
      expect(result.razon).toContain('tsc:check vs baseline');
      expect(result.detalles.requeridosFallidos).toHaveLength(1);
      expect(result.detalles.requeridosFallidos[0].nombre).toBe('tsc:check vs baseline');
    });
    
    it('debe dar NO LISTO para PR DRAFT (#2916)', () => {
      const pr = {
        number: 2916,
        title: 'feat(compai): algún cambio draft',
        baseRefName: 'dev',
        isDraft: true,
        changedFiles: 2,
      };
      
      const runs = [
        { name: 'vitest', conclusion: 'success', status: 'completed' },
      ];
      
      const result = evaluarMergeabilidad(pr, runs);
      
      expect(result.veredicto).toBe('NO LISTO');
      expect(result.razon).toContain('DRAFT');
    });
  });
  
  describe('evaluarMergeabilidad - Base incorrecta', () => {
    it('debe dar NO LISTO para PR con base != dev', () => {
      const pr = {
        number: 2886,
        title: 'fix(i18n): reemplaza voseo argentino',
        baseRefName: 'main',
        isDraft: false,
        changedFiles: 786,
      };
      
      const runs = [
        { name: 'vitest', conclusion: 'success', status: 'completed' },
      ];
      
      const result = evaluarMergeabilidad(pr, runs);
      
      expect(result.veredicto).toBe('NO LISTO');
      expect(result.razon).toContain('base=main');
      expect(result.razon).toContain('requerido: dev');
    });
  });
  
  describe('evaluarMergeabilidad - Checks de proceso', () => {
    it('debe dar LISTO con advertencia si solo fallan checks de proceso', () => {
      const pr = {
        number: 2909,
        title: 'fix(ci): make vitest test detection fail loudly',
        baseRefName: 'dev',
        isDraft: false,
        changedFiles: 4,
      };
      
      const runs = [
        { name: 'vitest', conclusion: 'success', status: 'completed' },
        { name: 'tsc:check vs baseline', conclusion: 'success', status: 'completed' },
        { name: 'CLAAssistant', conclusion: 'failure', status: 'completed' },
      ];
      
      const result = evaluarMergeabilidad(pr, runs);
      
      expect(result.veredicto).toBe('LISTO');
      expect(result.razon).toContain('CI verde');
      expect(result.razon).toContain('advertencia');
      expect(result.razon).toContain('CLAAssistant');
      expect(result.detalles.procesoFallidos).toHaveLength(1);
    });
  });
});
