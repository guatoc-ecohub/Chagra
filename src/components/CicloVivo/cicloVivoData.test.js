/**
 * cicloVivoData.test.js — invariantes puros de los datos del ciclo.
 * Guarda contra drift entre las fases (los `cap` que referencian) y la tabla
 * de respaldo offline, y valida la resolución de especie/estado.
 */
import { describe, it, expect } from 'vitest';
import {
  PHASES, SPECIES, SPECIES_ORDER, MOTOR_CAPS, FALLBACK_CAPACIDADES,
  resolverEspecie, resolverEstado,
} from './cicloVivoData';

describe('cicloVivoData — estructura de fases', () => {
  it('tiene exactamente 7 fases con las claves de la v3', () => {
    expect(PHASES).toHaveLength(7);
    expect(PHASES.map((p) => p.key)).toEqual([
      'semilla', 'germinacion', 'crecimiento', 'floracion', 'fructificacion', 'cosecha', 'poscosecha',
    ]);
  });

  it('cada función referencia una capacidad presente en la tabla de respaldo (anti-drift)', () => {
    for (const fase of PHASES) {
      for (const fn of fase.functions) {
        expect(FALLBACK_CAPACIDADES[fn.cap], `falta ${fn.cap} en FALLBACK_CAPACIDADES`).toBeTruthy();
      }
    }
  });

  it('la tira motora incluye el indicador SIPSA', () => {
    expect(MOTOR_CAPS).toContain('precio_sipsa');
  });

  it('cada especie tiene 7 notas de observación (una por fase)', () => {
    for (const key of SPECIES_ORDER) {
      expect(SPECIES[key].observe).toHaveLength(7);
    }
  });
});

describe('resolverEspecie', () => {
  it('respeta el override del perfil si es una especie válida', () => {
    expect(resolverEspecie('cafe', 'frio')).toBe('cafe');
  });
  it('ignora un override inválido y cae en la sugerida por piso', () => {
    expect(resolverEspecie('marte', 'templado')).toBe('cafe');
  });
  it('sugiere por piso térmico cuando no hay override', () => {
    expect(resolverEspecie(null, 'paramo')).toBe('papa');
    expect(resolverEspecie(null, 'calido')).toBe('frijol');
  });
  it('cae en maíz sin override ni piso', () => {
    expect(resolverEspecie(null, null)).toBe('maiz');
  });
});

describe('resolverEstado', () => {
  it('prefiere el mapa fetcheado sobre el respaldo', () => {
    const fetched = { cromatografia_suelo: { estado: 'proximamente', view: null, nota: 'x' } };
    expect(resolverEstado('cromatografia_suelo', fetched).estado).toBe('proximamente');
  });
  it('cae en el respaldo si el mapa fetcheado no trae la capacidad', () => {
    expect(resolverEstado('cromatografia_suelo', {}).estado).toBe('activo');
  });
  it('degrada a proximamente ante una capacidad desconocida', () => {
    expect(resolverEstado('no_existe', null).estado).toBe('proximamente');
  });
});
