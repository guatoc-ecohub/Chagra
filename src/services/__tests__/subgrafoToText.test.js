import { describe, it, expect } from 'vitest';
import { subgrafoATextoCampesino } from '../subgrafoToText.js';

describe('subgrafoATextoCampesino', () => {
  it('retorna string vacio para subgrafo sin nodos', () => {
    expect(subgrafoATextoCampesino(null)).toBe('');
    expect(subgrafoATextoCampesino({})).toBe('');
    expect(subgrafoATextoCampesino({ nodes: [] })).toBe('');
  });

  it('lista especies por nombre_comun', () => {
    const sg = {
      nodes: [
        { labels: ['Species'], properties: { nombre_comun: 'aguacate' } },
        { labels: ['Species'], properties: { nombre_comun: 'cafe' } },
      ],
    };
    const r = subgrafoATextoCampesino(sg);
    expect(r).toContain('aguacate');
    expect(r).toContain('cafe');
  });

  it('lista plagas encontradas', () => {
    const sg = {
      nodes: [
        { labels: ['Pest'], properties: { nombre_comun: 'broca' } },
      ],
    };
    const r = subgrafoATextoCampesino(sg);
    expect(r).toContain('Plagas:');
    expect(r).toContain('broca');
  });

  it('lista biopreparados', () => {
    const sg = {
      nodes: [
        { labels: ['Biopreparado'], properties: { nombre: 'caldo sulfocalcico' } },
      ],
    };
    const r = subgrafoATextoCampesino(sg);
    expect(r).toContain('caldo sulfocalcico');
  });

  it('incluye relaciones encontradas', () => {
    const sg = {
      nodes: [{ labels: ['Species'], properties: { nombre_comun: 'frijol' } }],
      relaciones: [{ from: 'frijol', rel: 'companion_de', to: 'maiz' }],
    };
    const r = subgrafoATextoCampesino(sg);
    expect(r).toContain('Relaciones encontradas');
    expect(r).toContain('companion_de');
  });
});
