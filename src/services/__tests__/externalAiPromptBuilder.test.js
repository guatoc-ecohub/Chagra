import { describe, it, expect } from 'vitest';
import {
  deriveThermalZoneFromAltitud,
  buildGuildExternalPrompt,
  buildDiagnosticExternalPrompt,
  buildOpenExternalPrompt,
} from '../externalAiPromptBuilder.js';

describe('deriveThermalZoneFromAltitud — casos borde', () => {
  it('maneja altitud con decimales', () => {
    expect(deriveThermalZoneFromAltitud(999.5)).toBe('cálido');
    expect(deriveThermalZoneFromAltitud(1999.9)).toBe('templado');
  });

  it('maneja altitud extremadamente alta', () => {
    expect(deriveThermalZoneFromAltitud(8848)).toBe('glacial');
  });

  it('maneja altitud exacta en limite', () => {
    expect(deriveThermalZoneFromAltitud(1000)).toBe('templado');
    expect(deriveThermalZoneFromAltitud(2000)).toBe('frío');
    expect(deriveThermalZoneFromAltitud(3000)).toBe('páramo');
    expect(deriveThermalZoneFromAltitud(3600)).toBe('glacial');
  });

  it('retorna null para string numerico', () => {
    expect(deriveThermalZoneFromAltitud('2550')).toBeNull();
  });

  it('retorna null para boolean', () => {
    expect(deriveThermalZoneFromAltitud(true)).toBeNull();
    expect(deriveThermalZoneFromAltitud(false)).toBeNull();
  });

  it('retorna null para NaN', () => {
    expect(deriveThermalZoneFromAltitud(NaN)).toBeNull();
  });
});

describe('buildGuildExternalPrompt — casos borde', () => {
  it('maneja nombre de especie con tildes y caracteres especiales', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'cañamo', scientificName: 'Cannabis sativa L.' });
    expect(p).toContain('cañamo');
    expect(p).toContain('Cannabis sativa L.');
  });

  it('maneja nombre de especie muy largo', () => {
    const longName = 'Super Tomate Chonto Riñon Cherry Orgánico Certificado Premium';
    const p = buildGuildExternalPrompt({ speciesName: longName });
    expect(p).toContain(longName);
    expect(p.length).toBeGreaterThan(100);
  });

  it('maneja companions largos', () => {
    const p = buildGuildExternalPrompt({
      speciesName: 'maíz',
      companions: Array.from({ length: 20 }, (_, i) => `planta-${i}`),
    });
    expect(p).toContain('planta-0');
    expect(p).toContain('planta-19');
  });

  it('maneja altitud muy alta', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'papa', altitudMsnm: 4500 });
    expect(p).toContain('piso térmico glacial');
    expect(p).toContain('4500 msnm');
  });

  it('maneja municipio con caracteres especiales', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'café', municipio: 'Chinchiná, Caldas' });
    expect(p).toContain('Chinchiná, Caldas');
  });

  it('maneja estrato con caracter especial', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'yuca', estrato: 'sotobosque' });
    expect(p).toContain('Estrato: sotobosque');
  });

  it('maneja prompt sin especie (vacio total)', () => {
    const p = buildGuildExternalPrompt({});
    expect(p).toContain('especie desconocida');
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(50);
  });

  it('thermalZones vacio pero con altitud deriva correctamente', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'frijol', thermalZones: [], altitudMsnm: 1500 });
    expect(p).toContain('piso térmico templado');
  });

  it('thermalZones con multiples zonas', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'maíz', thermalZones: ['frío', 'templado'] });
    expect(p).toContain('frío, templado');
  });
});

describe('buildDiagnosticExternalPrompt — casos borde', () => {
  it('maneja humedad extrema', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', humedad: 100 });
    expect(p).toContain('HR 100%');
  });

  it('maneja temperatura bajo cero', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'papa', temperatura: -5 });
    expect(p).toContain('temperatura media -5°C');
  });

  it('maneja lluvia cero explícita', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', lluvia: 0 });
    expect(p).toContain('precipitación acumulada 0mm');
  });

  it('maneja sintomas muy largos', () => {
    const largoSintoma = 'manchas ' + 'amarillas '.repeat(50) + 'en hojas';
    const p = buildDiagnosticExternalPrompt({ speciesName: 'café', sintomas: largoSintoma });
    expect(p).toContain('amarillas');
  });

  it('maneja diasDesdeSiembra sin fase', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', diasDesdeSiembra: 90 });
    expect(p).toContain('90 días desde siembra');
    expect(p).not.toContain('fase fenológica');
  });

  it('maneja fase sin diasDesdeSiembra', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', fase: 'maduración' });
    expect(p).toContain('fase fenológica maduración');
    expect(p).not.toContain('días desde siembra');
  });

  it('usa "cultivo" cuando speciesName no se da', () => {
    const p = buildDiagnosticExternalPrompt({});
    expect(p).toContain('cultivo');
  });

  it('maneja condiciones parciales (solo humedad)', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'lechuga', humedad: 65 });
    expect(p).toContain('HR 65%');
    expect(p).not.toContain('temperatura media');
    expect(p).not.toContain('precipitación');
  });
});

describe('buildOpenExternalPrompt — casos borde', () => {
  it('maneja pregunta larga', () => {
    const larga = 'Cual es la mejor manera '.repeat(10);
    const p = buildOpenExternalPrompt({ speciesName: 'mora', pregunta: larga });
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(50);
  });

  it('maneja pregunta con caracteres especiales', () => {
    const p = buildOpenExternalPrompt({ speciesName: 'café', pregunta: '¿Cómo afecta el fenómeno de El Niño al cultivo?' });
    expect(p).toContain('El Niño');
  });

  it('maneja prompt sin especie ni nada', () => {
    const p = buildOpenExternalPrompt({});
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(20);
  });

  it('maneja municipio largo con tilde', () => {
    const p = buildOpenExternalPrompt({ speciesName: 'papa', municipio: 'San José de la Montaña, Antioquia' });
    expect(p).toContain('San José de la Montaña');
  });

  it('maneja thermalZones con zona unica', () => {
    const p = buildOpenExternalPrompt({ speciesName: 'yuca', thermalZones: ['cálido'] });
    expect(p).toContain('piso térmico cálido');
  });
});
