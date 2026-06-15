import { describe, it, expect } from 'vitest';
import { formatearRecetaAgroecologica } from '../restauracionRecetaFormatter.js';

describe('formatearRecetaAgroecologica', () => {
  it('retorna string vacio para diagnostico nulo', () => {
    expect(formatearRecetaAgroecologica(null)).toBe('');
    expect(formatearRecetaAgroecologica(undefined)).toBe('');
  });

  it('retorna string vacio si sin_datos es true', () => {
    expect(formatearRecetaAgroecologica({ sin_datos: true })).toBe('');
  });

  it('formatea arreglo con nombre y detalle', () => {
    const d = { arreglo: { nombre: 'silvopastoril', detalle: 'combina arboles con pastos' } };
    const r = formatearRecetaAgroecologica(d);
    expect(r).toContain('silvopastoril');
    expect(r).toContain('combina arboles con pastos');
  });

  it('formatea roles de sucesion', () => {
    const d = {
      roles: {
        pioneras: ['aliso', 'chilco'],
        intermedias: ['roble'],
        climax: ['palma de cera'],
      },
    };
    const r = formatearRecetaAgroecologica(d);
    expect(r).toContain('aliso');
    expect(r).toContain('roble');
    expect(r).toContain('palma de cera');
  });

  it('formatea alertas', () => {
    const d = { alertas: ['no plantar eucalipto', 'evitar quema'] };
    const r = formatearRecetaAgroecologica(d);
    expect(r).toContain('no plantar eucalipto');
  });
});
