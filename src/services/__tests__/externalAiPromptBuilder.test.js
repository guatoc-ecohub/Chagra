import { describe, it, expect } from 'vitest';
import {
  deriveThermalZoneFromAltitud,
  buildGuildExternalPrompt,
  buildDiagnosticExternalPrompt,
  buildOpenExternalPrompt,
} from '../externalAiPromptBuilder.js';

/**
 * Tests del constructor de prompts portables (puro, sin red ni efectos).
 */

describe('deriveThermalZoneFromAltitud', () => {
  it.each([
    [0, 'cálido'],
    [999, 'cálido'],
    [1000, 'templado'],
    [1999, 'templado'],
    [2000, 'frío'],
    [2550, 'frío'],
    [2999, 'frío'],
    [3000, 'páramo'],
    [3599, 'páramo'],
    [3600, 'glacial'],
    [5000, 'glacial'],
  ])('clasifica %i msnm como %s', (msnm, zona) => {
    expect(deriveThermalZoneFromAltitud(msnm)).toBe(zona);
  });

  it.each([NaN, Infinity, -Infinity, -10, '2550', null, undefined, {}])(
    'retorna null para entrada inválida: %s',
    (input) => {
      expect(deriveThermalZoneFromAltitud(input)).toBeNull();
    },
  );
});

describe('buildGuildExternalPrompt', () => {
  it('incluye especie con nombre científico y común', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'maíz', scientificName: 'Zea mays' });
    expect(p).toContain('Zea mays (maíz)');
  });

  it('deriva el piso térmico desde la altitud cuando no hay thermalZones', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'papa', altitudMsnm: 2550 });
    expect(p).toContain('piso térmico frío');
    expect(p).toContain('2550 msnm');
  });

  it('usa thermalZones explícitos por encima de la altitud', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'papa', altitudMsnm: 2550, thermalZones: ['templado'] });
    expect(p).toContain('piso térmico templado');
    expect(p).not.toContain('piso térmico frío');
  });

  it('marca "no especificado" cuando no hay zona ni altitud', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'yuca' });
    expect(p).toContain('piso térmico no especificado');
    expect(p).toContain('altitud no especificada');
  });

  it('usa los textos por defecto para companions y antagonists vacíos', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'frijol' });
    expect(p).toContain('Companions ya considerados: ninguno aún');
    expect(p).toContain('Antagonists conocidos: ninguno conocido');
  });

  it('lista companions y antagonists provistos', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'maíz', companions: ['frijol', 'calabaza'], antagonists: ['hinojo'] });
    expect(p).toContain('frijol, calabaza');
    expect(p).toContain('hinojo');
  });

  it('incluye el estrato solo cuando se provee', () => {
    expect(buildGuildExternalPrompt({ speciesName: 'maíz', estrato: 'alto' })).toContain('Estrato: alto');
    expect(buildGuildExternalPrompt({ speciesName: 'maíz' })).not.toContain('Estrato:');
  });

  it('pide respuesta en JSON y va recortado', () => {
    const p = buildGuildExternalPrompt({ speciesName: 'maíz' });
    expect(p).toContain('JSON');
    expect(p).toBe(p.trim());
  });

  it('usa "especie desconocida" si no se da speciesName', () => {
    expect(buildGuildExternalPrompt({})).toContain('especie desconocida');
  });
});

describe('buildDiagnosticExternalPrompt', () => {
  it('formatea las condiciones ambientales provistas', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', humedad: 80, temperatura: 18, lluvia: 40 });
    expect(p).toContain('HR 80%');
    expect(p).toContain('temperatura media 18°C');
    expect(p).toContain('precipitación acumulada 40mm');
  });

  it('marca "datos no disponibles" sin condiciones', () => {
    expect(buildDiagnosticExternalPrompt({ speciesName: 'tomate' })).toContain('datos no disponibles');
  });

  it('compone fase fenológica y días desde siembra', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', fase: 'floración', diasDesdeSiembra: 45 });
    expect(p).toContain('fase fenológica floración');
    expect(p).toContain('45 días desde siembra');
  });

  it('marca "fase no especificada" cuando faltan fase y días', () => {
    expect(buildDiagnosticExternalPrompt({ speciesName: 'tomate' })).toContain('fase no especificada');
  });

  it('usa el placeholder de síntomas por defecto', () => {
    expect(buildDiagnosticExternalPrompt({ speciesName: 'tomate' })).toContain('[usuario describe síntomas aquí]');
  });

  it('incluye los síntomas provistos por el usuario', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate', sintomas: 'manchas negras en hojas' });
    expect(p).toContain('manchas negras en hojas');
  });

  it('prohíbe agroquímicos sintéticos en la tarea', () => {
    const p = buildDiagnosticExternalPrompt({ speciesName: 'tomate' });
    expect(p).toContain('NO agroquímicos sintéticos');
    expect(p).toContain('biopreparado');
  });

  it('humedad 0 se incluye (no se trata como ausente)', () => {
    expect(buildDiagnosticExternalPrompt({ speciesName: 'tomate', humedad: 0 })).toContain('HR 0%');
  });
});

describe('buildOpenExternalPrompt', () => {
  it('usa el placeholder de pregunta por defecto', () => {
    expect(buildOpenExternalPrompt({ speciesName: 'mora' })).toContain('[Escribe tu pregunta aquí]');
  });

  it('incluye la pregunta del usuario y el piso térmico derivado', () => {
    const p = buildOpenExternalPrompt({ speciesName: 'mora', altitudMsnm: 2550, pregunta: '¿cuándo podar?' });
    expect(p).toContain('¿cuándo podar?');
    expect(p).toContain('piso térmico frío');
  });

  it('incluye la especie y va recortado', () => {
    const p = buildOpenExternalPrompt({ speciesName: 'mora', scientificName: 'Rubus glaucus' });
    expect(p).toContain('Rubus glaucus (mora)');
    expect(p).toBe(p.trim());
  });
});
