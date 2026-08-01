import { describe, it, expect } from 'vitest';
import {
  loadPisoTermicoBands,
  parsePisoTermicoBand,
  derivePisoTermico,
  analyzeSchemaDrift,
  detectEdgeCases,
  calculateOverlap,
  meetsOverlapCriteria,
} from '../derivar-piso-termico.mjs';

describe('derivar-piso-termico', () => {
  describe('loadPisoTermicoBands', () => {
    it('carga las bandas desde src/data/piso-termico.json', () => {
      const data = loadPisoTermicoBands();
      expect(data).toHaveProperty('fuente');
      expect(data).toHaveProperty('pisos');
      expect(Array.isArray(data.pisos)).toBe(true);
      expect(data.pisos.length).toBeGreaterThan(0);
      expect(data.fuente).toMatch(/IDEAM|IGAC/i);
    });

    it('tiene las 4 bandas canónicas', () => {
      const data = loadPisoTermicoBands();
      const ids = data.pisos.map(p => p.id);
      expect(ids).toContain('calido');
      expect(ids).toContain('templado');
      expect(ids).toContain('frio');
      expect(ids).toContain('paramo');
    });
  });

  describe('parsePisoTermicoBand', () => {
    it('parsea bandas con rango numérico', () => {
      const band = parsePisoTermicoBand('1000-2000', 'templado');
      expect(band.id).toBe('templado');
      expect(band.min).toBe(1000);
      expect(band.max).toBe(2000);
      expect(band.label).toBe('1000-2000');
    });

    it('parsea banda abierta (>3000)', () => {
      const band = parsePisoTermicoBand('>3000', 'paramo');
      expect(band.id).toBe('paramo');
      expect(band.min).toBe(3000);
      expect(band.max).toBe(null);
      expect(band.label).toBe('>3000');
    });

    it('parsea banda desde 0', () => {
      const band = parsePisoTermicoBand('0-1000', 'calido');
      expect(band.id).toBe('calido');
      expect(band.min).toBe(0);
      expect(band.max).toBe(1000);
    });
  });

  describe('calculateOverlap', () => {
    const bands = [
      { id: 'calido', min: 0, max: 1000, label: '0-1000' },
      { id: 'templado', min: 1000, max: 2000, label: '1000-2000' },
      { id: 'frio', min: 2000, max: 3000, label: '2000-3000' },
      { id: 'paramo', min: 3000, max: null, label: '>3000' },
    ];

    it('calcula solape completo dentro de banda', () => {
      const overlap = calculateOverlap(1200, 1800, bands[1]); // templado
      expect(overlap).toBe(600); // 1800 - 1200
    });

    it('calcula solape parcial con banda', () => {
      const overlap = calculateOverlap(1500, 2800, bands[1]); // templado
      expect(overlap).toBe(500); // 2000 - 1500
    });

    it('calcula solape con banda abierta', () => {
      const overlap = calculateOverlap(3200, 3500, bands[3]); // paramo
      expect(overlap).toBe(300); // 3500 - 3200
    });

    it('calcula 0 sin solape', () => {
      const overlap = calculateOverlap(500, 800, bands[2]); // frio
      expect(overlap).toBe(0);
    });

    it('calcula solape en frontera de banda', () => {
      const overlap = calculateOverlap(950, 1050, bands[1]); // templado
      expect(overlap).toBe(50); // 1050 - 1000
    });
  });

  describe('meetsOverlapCriteria', () => {
    const bands = [
      { id: 'calido', min: 0, max: 1000, label: '0-1000' },
      { id: 'templado', min: 1000, max: 2000, label: '1000-2000' },
      { id: 'frio', min: 2000, max: 3000, label: '2000-3000' },
      { id: 'paramo', min: 3000, max: null, label: '>3000' },
    ];

    it('acepta solape >= 100m', () => {
      const overlap = 150;
      expect(meetsOverlapCriteria(overlap, bands[0])).toBe(true);
    });

    it('rechaza solape < 100m', () => {
      const overlap = 50;
      expect(meetsOverlapCriteria(overlap, bands[0])).toBe(false);
    });

    it('acepta solape >= 10% de banda', () => {
      const overlap = 90; // 9% de banda de 1000m
      expect(meetsOverlapCriteria(overlap, bands[0])).toBe(false);
      
      const overlap2 = 101; // 10.1% de banda de 1000m
      expect(meetsOverlapCriteria(overlap2, bands[0])).toBe(true);
    });

    it('maneja banda abierta (paramo)', () => {
      const overlap = 1000; // solape grande con paramo
      expect(meetsOverlapCriteria(overlap, bands[3])).toBe(true);
    });
  });

  describe('derivePisoTermico', () => {
    const bands = [
      { id: 'calido', min: 0, max: 1000, label: '0-1000' },
      { id: 'templado', min: 1000, max: 2000, label: '1000-2000' },
      { id: 'frio', min: 2000, max: 3000, label: '2000-3000' },
      { id: 'paramo', min: 3000, max: null, label: '>3000' },
    ];

    it('deriva piso único', () => {
      const pisos = derivePisoTermico(1200, 1800, bands);
      expect(pisos).toEqual(['templado']);
    });

    it('deriva múltiples pisos por solape', () => {
      const pisos = derivePisoTermico(1500, 2800, bands);
      expect(pisos).toContain('templado');
      expect(pisos).toContain('frio');
      expect(pisos.length).toBe(2);
    });

    it('deriva tres pisos con rango amplio', () => {
      const pisos = derivePisoTermico(500, 3200, bands);
      expect(pisos).toContain('calido');
      expect(pisos).toContain('templado');
      expect(pisos).toContain('frio');
      expect(pisos).toContain('paramo');
      expect(pisos.length).toBe(4);
    });

    it('rechaza solape mínimo (< 100m)', () => {
      const pisos = derivePisoTermico(950, 1050, bands);
      // Solo solape 50m con templado y 50m con calido
      // 50m < 100m y 5% < 10%
      expect(pisos.length).toBe(0);
    });

    it('acepta solape justo en el límite (100m)', () => {
      const pisos = derivePisoTermico(900, 1100, bands);
      // Solape 100m con calido (1000-900=100) y 100m con templado (1100-1000=100)
      // 100m = 100m (cumple) y 100m = 10% de 1000m (cumple)
      expect(pisos).toContain('calido');
      expect(pisos).toContain('templado');
    });

    it('deriva páramo para alturas >3000', () => {
      const pisos = derivePisoTermico(3200, 3500, bands);
      expect(pisos).toContain('paramo');
      expect(pisos.length).toBe(1);
    });
  });

  describe('analyzeSchemaDrift', () => {
    it('detecta solo altitud_min', () => {
      const species = [
        { id: 's1', altitud_min: 1000, altitud_max: 2000 },
      ];
      const result = analyzeSchemaDrift(species);
      expect(result.total).toBe(1);
      expect(result.altitud_min).toBe(1);
      expect(result.altitud_min_msnm).toBe(0);
      expect(result.only_min).toBe(1);
      expect(result.only_msnm).toBe(0);
      expect(result.both).toBe(0);
    });

    it('detecta solo altitud_min_msnm', () => {
      const species = [
        { id: 's1', altitud_min_msnm: 1500, altitud_max_msnm: 2500 },
      ];
      const result = analyzeSchemaDrift(species);
      expect(result.total).toBe(1);
      expect(result.altitud_min).toBe(0);
      expect(result.altitud_min_msnm).toBe(1);
      expect(result.only_min).toBe(0);
      expect(result.only_msnm).toBe(1);
      expect(result.both).toBe(0);
    });

    it('detecta ambas convenciones', () => {
      const species = [
        { id: 's1', altitud_min: 1000, altitud_max: 2000, altitud_min_msnm: 1000, altitud_max_msnm: 2000 },
      ];
      const result = analyzeSchemaDrift(species);
      expect(result.total).toBe(1);
      expect(result.altitud_min).toBe(1);
      expect(result.altitud_min_msnm).toBe(1);
      expect(result.only_min).toBe(0);
      expect(result.only_msnm).toBe(0);
      expect(result.both).toBe(1);
    });

    it('detecta conflictos de valores', () => {
      const species = [
        { id: 's1', altitud_min: 1000, altitud_max: 2000, altitud_min_msnm: 1200, altitud_max_msnm: 2200 },
      ];
      const result = analyzeSchemaDrift(species);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].id).toBe('s1');
      expect(result.conflicts[0].min).toBe(1000);
      expect(result.conflicts[0].msnm).toBe(1200);
    });

    it('agrega estadísticas de múltiples especies', () => {
      const species = [
        { id: 's1', altitud_min: 1000, altitud_max: 2000 },
        { id: 's2', altitud_min_msnm: 1500, altitud_max_msnm: 2500 },
        { id: 's3', altitud_min: 1200, altitud_max: 2200, altitud_min_msnm: 1200, altitud_max_msnm: 2200 },
      ];
      const result = analyzeSchemaDrift(species);
      expect(result.total).toBe(3);
      expect(result.altitud_min).toBe(2);
      expect(result.altitud_min_msnm).toBe(2);
      expect(result.only_min).toBe(1);
      expect(result.only_msnm).toBe(1);
      expect(result.both).toBe(1);
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('detectEdgeCases', () => {
    it('detecta sin altitud_min', () => {
      const species = [
        { id: 's1', altitud_max: 2000 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(1);
      expect(issues[0].issue).toContain('sin altitud_min');
    });

    it('detecta sin altitud_max', () => {
      const species = [
        { id: 's1', altitud_min: 1000 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(1);
      expect(issues[0].issue).toContain('sin altitud_max');
    });

    it('detecta min > max', () => {
      const species = [
        { id: 's1', altitud_min: 2000, altitud_max: 1000 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(1);
      expect(issues[0].issue).toContain('min > max');
    });

    it('detecta altitudes negativas', () => {
      const species = [
        { id: 's1', altitud_min: -500, altitud_max: 1000 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(1);
      expect(issues[0].issue).toContain('negativa');
    });

    it('detecta altitudes absurdas (>5000m)', () => {
      const species = [
        { id: 's1', altitud_min: 5200, altitud_max: 5500 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(1);
      expect(issues[0].issue).toContain('>5000m');
    });

    it('no reporta especies válidas', () => {
      const species = [
        { id: 's1', altitud_min: 1200, altitud_max: 2800 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(0);
    });

    it('usa coalesce de convenciones', () => {
      const species = [
        { id: 's1', altitud_min_msnm: 1500, altitud_max_msnm: 2500 },
      ];
      const issues = detectEdgeCases(species);
      expect(issues.length).toBe(0); // Valores válidos desde altitud_msnm
    });
  });
});
