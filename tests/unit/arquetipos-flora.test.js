/**
 * Test unitarios para arquetipos-flora.json
 * Task #idea55c: Completar trabajo de arquetipos de flora
 * 
 * Estos tests verifican:
 * - Las especies vetadas (eucalyptus_globulus, ulex_europaeus) tienen arquetipo VETADA
 * - El arquetipo roseta-columnar-tipo-frailejon tiene 12 especies (Espeletia spp.)
 * - Todos los registros con arquetipo null tienen confianza 'revisar' y razón no vacía
 * - La suma de conteos por arquetipo es igual al total de registros
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Arquetipos Flora - Task #idea55c', () => {
  const arquetiposPath = path.join(__dirname, '../../catalog/arquetipos-flora.json');
  const arquetipos = JSON.parse(fs.readFileSync(arquetiposPath, 'utf-8'));

  it('should have eucalyptus_globulus with VETADA archetype', () => {
    const eucalypto = arquetipos.especies.find(e => e.especie_id === 'eucalyptus_globulus');
    
    expect(eucalypto).toBeDefined();
    expect(eucalypto.arquetipo).toBe('VETADA');
    expect(eucalypto.confianza).toBe('alta');
    expect(eucalypto.razon).toContain('vetada');
  });

  it('should have ulex_europaeus with VETADA archetype', () => {
    const ulex = arquetipos.especies.find(e => e.especie_id === 'ulex_europaeus');
    
    expect(ulex).toBeDefined();
    expect(ulex.arquetipo).toBe('VETADA');
    expect(ulex.confianza).toBe('alta');
    expect(ulex.razon).toContain('vetada');
  });

  it('should have 12 species with roseta-columnar-tipo-frailejon archetype', () => {
    const rosetas = arquetipos.especies.filter(e => e.arquetipo === 'roseta-columnar-tipo-frailejon');
    
    expect(rosetas.length).toBe(12);
    // Verify that Espeletia species are included
    const espeletias = rosetas.filter(e => e.especie_id.startsWith('espeletia'));
    expect(espeletias.length).toBeGreaterThan(0);
  });

  it('should have all null archetype records with confidence "revisar" and non-empty reason', () => {
    const sinClasificar = arquetipos.especies.filter(e => e.arquetipo === null);
    
    expect(sinClasificar.length).toBe(37);
    
    sinClasificar.forEach(especie => {
      expect(especie.confianza).toBe('revisar');
      expect(especie.razon).toBeDefined();
      expect(especie.razon.length).toBeGreaterThan(0);
      expect(especie.razon).not.toBe('');
    });
  });

  it('should have archetype counts sum equal to total species', () => {
    const totalFromCounts = Object.values(arquetipos.conteo_por_arquetipo)
      .reduce((sum, count) => sum + count, 0);
    
    expect(totalFromCounts).toBe(arquetipos.total_especies);
    expect(arquetipos.total_especies).toBe(581);
  });

  it('should have exact archetype counts as specified', () => {
    const expected = {
      'arbol-dosel-copa-ancha': 216,
      'arbusto-denso': 125,
      'herbacea-erecta': 97,
      'sin-clasificar': 37,
      'graminea-macolla': 33,
      'trepadora-liana': 23,
      'palma': 17,
      'roseta-columnar-tipo-frailejon': 12,
      'suculenta-cactacea': 8,
      'VETADA': 6,
      'arbol-emergente': 4,
      'rastrera-tapizante': 2,
      'helecho-arboreo': 1
    };

    // Note: JSON uses 'SIN_CLASIFICAR' but our expected uses lowercase key
    const actual = arquetipos.conteo_por_arquetipo;
    
    expect(actual['arbol-dosel-copa-ancha']).toBe(expected['arbol-dosel-copa-ancha']);
    expect(actual['arbusto-denso']).toBe(expected['arbusto-denso']);
    expect(actual['herbacea-erecta']).toBe(expected['herbacea-erecta']);
    expect(actual['SIN_CLASIFICAR']).toBe(expected['sin-clasificar']);
    expect(actual['graminea-macolla']).toBe(expected['graminea-macolla']);
    expect(actual['trepadora-liana']).toBe(expected['trepadora-liana']);
    expect(actual['palma']).toBe(expected['palma']);
    expect(actual['roseta-columnar-tipo-frailejon']).toBe(expected['roseta-columnar-tipo-frailejon']);
    expect(actual['suculenta-cactacea']).toBe(expected['suculenta-cactacea']);
    expect(actual['VETADA']).toBe(expected['VETADA']);
    expect(actual['arbol-emergente']).toBe(expected['arbol-emergente']);
    expect(actual['rastrera-tapizante']).toBe(expected['rastrera-tapizante']);
    expect(actual['helecho-arboreo']).toBe(expected['helecho-arboreo']);
  });

  it('should have valid metadata structure', () => {
    expect(arquetipos.version).toBeDefined();
    expect(arquetipos.generated_at).toBeDefined();
    expect(arquetipos.source_catalog).toBeDefined();
    expect(arquetipos.total_especies).toBeDefined();
    expect(arquetipos.arquetipos_definidos).toBe(12);
    expect(arquetipos.especies).toBeInstanceOf(Array);
  });
});
