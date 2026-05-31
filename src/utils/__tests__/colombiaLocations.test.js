/**
 * colombiaLocations.test.js — sanity del dataset DANE materializado (#338).
 *
 * Corre bajo vitest (jsdom + vite) que resuelve el import JSON nativamente.
 * Verifica que el consumidor (getDepartamentos/getMunicipios/findMunicipio)
 * sigue exponiendo el mismo shape que esperaba el onboarding (#187) tras
 * migrar de la lista a mano al catalogo DIVIPOLA completo.
 */
import { describe, it, expect } from 'vitest';
import {
  COLOMBIA_LOCATIONS,
  COLOMBIA_LOCATIONS_META,
  getDepartamentos,
  getMunicipios,
  findMunicipio,
} from '../colombiaLocations';

describe('colombiaLocations — dataset DANE DIVIPOLA (#338)', () => {
  it('cubre los 33 departamentos oficiales', () => {
    expect(getDepartamentos()).toHaveLength(33);
  });

  it('tiene mas de 1.000 municipios (vs 117 a mano antes)', () => {
    const total = getDepartamentos().reduce(
      (n, d) => n + getMunicipios(d).length,
      0
    );
    expect(total).toBeGreaterThan(1000);
    expect(total).toBe(COLOMBIA_LOCATIONS_META.municipios);
  });

  it('cada municipio conserva el shape consumido por el onboarding', () => {
    const cauca = getMunicipios('Cauca');
    expect(cauca.length).toBeGreaterThan(0);
    const m = cauca[0];
    expect(m).toHaveProperty('name');
    expect(m).toHaveProperty('lat');
    expect(m).toHaveProperty('lng');
    expect(m).toHaveProperty('altitud');
    // Campo aditivo nuevo: codigo DIVIPOLA de 5 digitos.
    expect(m.codigo).toMatch(/^\d{5}$/);
  });

  it('findMunicipio resuelve por nombre tolerante a tildes/caso', () => {
    const hit = findMunicipio('Popayán');
    expect(hit).not.toBeNull();
    expect(hit.departamento).toBe('Cauca');
    expect(hit.name).toMatch(/Popay/);
  });

  it('los departamentos vienen ordenados alfabeticamente', () => {
    const deptos = getDepartamentos();
    const sorted = [...deptos].sort((a, b) => a.localeCompare(b, 'es'));
    expect(deptos).toEqual(sorted);
  });

  it('COLOMBIA_LOCATIONS esta congelado (no mutable accidentalmente)', () => {
    expect(Object.isFrozen(COLOMBIA_LOCATIONS)).toBe(true);
  });
});
