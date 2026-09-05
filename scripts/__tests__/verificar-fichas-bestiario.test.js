/**
 * tests/audit/verificar-fichas-bestiario.test.js
 *
 * Tests para el script de verificación de fichas del bestiario contra el grafo AGE.
 */

import { describe, it, expect } from 'vitest';

describe('verificar-fichas-bestiario', () => {
  describe('FICHAS_BESTIARIO', () => {
    it('debe tener 7 especies definidas', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      expect(module.FICHAS_BESTIARIO).toHaveLength(7);
    });
    
    it('debe incluir las 7 especies del bestiario', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      const ids = module.FICHAS_BESTIARIO.map((f) => f.id);
      expect(ids).toContain('oso');
      expect(ids).toContain('jaguar');
      expect(ids).toContain('angelita');
      expect(ids).toContain('zariguya');
      expect(ids).toContain('guacamaya');
      expect(ids).toContain('chivito');
      expect(ids).toContain('luciernaga');
    });
    
    it('debe tener nombres científicos para todas las especies', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      const fichas = module.FICHAS_BESTIARIO;
      expect(fichas.every((f) => f.cientifico && f.cientifico !== '')).toBe(true);
    });
    
    it('debe tener categoría UICN para oso y jaguar', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      const oso = module.FICHAS_BESTIARIO.find((f) => f.id === 'oso');
      const jaguar = module.FICHAS_BESTIARIO.find((f) => f.id === 'jaguar');
      
      expect(oso).toBeDefined();
      expect(oso.claimed_uicn).toBe('VU');
      
      expect(jaguar).toBeDefined();
      expect(jaguar.claimed_uicn).toBe('NT');
    });
  });
  
  describe('validación de datos de entrada', () => {
    it('debe validar nombres científicos en formato binomial', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      const fichas = module.FICHAS_BESTIARIO;
      const binomiales = fichas.filter((f) => 
        !f.cientifico.includes('sp.') && f.cientifico !== 'Lampyridae'
      );
      
      expect(binomiales.length).toBeGreaterThan(0);
      
      const todasValidas = binomiales.every((ficha) => {
        const partes = ficha.cientifico.split(' ');
        if (partes.length < 2) return false;
        // Primera letra mayúscula
        if (!partes[0][0].match(/[A-Z]/)) return false;
        // Segunda palabra minúscula
        if (partes[1] && !partes[1][0].match(/[a-z]/)) return false;
        return true;
      });
      
      expect(todasValidas).toBe(true);
    });
    
    it('debe tener fuentes citadas para todas las fichas', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      const todasConFuente = module.FICHAS_BESTIARIO.every((ficha) => 
        ficha.fuente_ficha && ficha.fuente_ficha.includes('memoria paramétrica')
      );
      expect(todasConFuente).toBe(true);
    });
  });
  
  describe('funciones exportadas', () => {
    it('debe exportar runVerificacion', async () => {
      const module = await import('../audit/verificar-fichas-bestiario.mjs');
      expect(module.runVerificacion).toBeDefined();
      expect(typeof module.runVerificacion).toBe('function');
    });
  });
});
