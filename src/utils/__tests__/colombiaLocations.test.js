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
  findNearestMunicipio,
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

describe('findMunicipio — match offline robusto (#338 + offline-first)', () => {
  it('prioriza match exacto sobre prefijo que aparece antes en el dataset', () => {
    // "Olaya" (Antioquia) es exacto; "Olaya Herrera" (Nariño) tambien empieza
    // por "olaya". Antioquia se itera antes, pero el exacto debe ganar igual.
    const hit = findMunicipio('Olaya');
    expect(hit).not.toBeNull();
    expect(hit.name).toBe('Olaya');
    expect(hit.departamento).toBe('Antioquia');
  });

  it('desempata homonimos con la pista de departamento tras la coma', () => {
    const hit = findMunicipio('Popayán, Cauca');
    expect(hit).not.toBeNull();
    expect(hit.departamento).toBe('Cauca');
  });

  it('es tolerante a mayusculas y ausencia de tildes', () => {
    const hit = findMunicipio('POPAYAN');
    expect(hit).not.toBeNull();
    expect(hit.departamento).toBe('Cauca');
  });

  it('devuelve null para query vacio o sin match', () => {
    expect(findMunicipio('')).toBeNull();
    expect(findMunicipio('Zzqxnoexiste')).toBeNull();
  });
});

describe('findNearestMunicipio — reverse-geocode OFFLINE por centroide (#338)', () => {
  it('resuelve el municipio mas cercano a unas coordenadas conocidas', () => {
    // Centro de Popayan aprox.
    const hit = findNearestMunicipio(2.444, -76.614);
    expect(hit).not.toBeNull();
    expect(hit.departamento).toBe('Cauca');
    expect(hit.name).toMatch(/Popay/);
    expect(hit.distanciaKm).toBeLessThan(15);
  });

  it('resuelve Bogota a partir de su lat/lng', () => {
    const hit = findNearestMunicipio(4.711, -74.072);
    expect(hit).not.toBeNull();
    // Bogota D.C. es su propio departamento en DIVIPOLA.
    expect(hit.name).toMatch(/Bogot/);
  });

  it('expone distanciaKm numerica no negativa', () => {
    const hit = findNearestMunicipio(4.711, -74.072);
    expect(typeof hit.distanciaKm).toBe('number');
    expect(hit.distanciaKm).toBeGreaterThanOrEqual(0);
  });

  it('devuelve null para coordenadas no numericas', () => {
    expect(findNearestMunicipio(/** @type {any} */ ('a'), 1)).toBeNull();
    expect(findNearestMunicipio(NaN, NaN)).toBeNull();
    expect(findNearestMunicipio(undefined, undefined)).toBeNull();
  });
});
