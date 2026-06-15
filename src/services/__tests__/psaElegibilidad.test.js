import { describe, it, expect } from 'vitest';
import { evaluarPSA } from '../psaElegibilidad.js';

describe('evaluarPSA', () => {
  it('elegible si en cuenca', () => {
    const r = evaluarPSA({ enCuenca: true });
    expect(r.elegible).toBe(true);
    expect(r.modalidades.length).toBeGreaterThan(0);
  });

  it('elegible si en paramo', () => {
    const r = evaluarPSA({ enParamo: true });
    expect(r.elegible).toBe(true);
  });

  it('elegible si altitud > 3000', () => {
    const r = evaluarPSA({ altitud: 3200 });
    expect(r.elegible).toBe(true);
  });

  it('elegible si interes carbono', () => {
    const r = evaluarPSA({ interes: 'carbono' });
    expect(r.elegible).toBe(true);
  });

  it('no elegible sin condiciones', () => {
    const r = evaluarPSA({});
    expect(r.elegible).toBe(false);
    expect(r.modalidades.length).toBe(0);
  });

  it('incluye requisitos y monto', () => {
    const r = evaluarPSA({ enCuenca: true });
    expect(r.requisitos.length).toBeGreaterThan(0);
    expect(r.monto).toBeTruthy();
    expect(r.autoridad).toBeTruthy();
  });
});
