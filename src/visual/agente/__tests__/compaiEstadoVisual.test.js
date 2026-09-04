import { describe, expect, it } from 'vitest';
import { ESTADOS_ANGELITA } from '../angelitaEstados.js';
import { resolverEstadoVisualCompai } from '../compaiEstadoVisual.js';

const ELENCO = [
  'angelita',
  'jaguar',
  'oso-baston',
  'zariguya',
  'luciernaga',
  'chivito-punk',
  'guacamaya',
];

describe('compaiEstadoVisual — contrato por especie', () => {
  it('conserva los diez estados canónicos y siempre resuelve una pose', () => {
    for (const especie of ELENCO) {
      for (const estado of ESTADOS_ANGELITA) {
        const visual = resolverEstadoVisualCompai(especie, estado);
        expect(visual.estado).toBe(estado);
        expect(visual.state).toBeTruthy();
        expect(visual.pose).toBeTruthy();
      }
    }
  });

  it('caminando es locomoción aérea en voladores y marcha en terrestres', () => {
    for (const especie of ['angelita', 'luciernaga', 'guacamaya', 'chivito-punk']) {
      expect(resolverEstadoVisualCompai(especie, 'caminando').pose).toBe('vuela');
    }
    for (const especie of ['jaguar', 'oso-baston', 'zariguya']) {
      expect(resolverEstadoVisualCompai(especie, 'caminando').pose).toBe('camina');
    }
  });

  it('chivito y guacamaya se conservan posados en estados estáticos', () => {
    for (const especie of ['chivito-punk', 'guacamaya']) {
      for (const estado of ['acompana', 'escuchando', 'pensando', 'no-se']) {
        expect(resolverEstadoVisualCompai(especie, estado).pose).toBe('reposo');
      }
    }
  });
});
