import { describe, it, expect } from 'vitest';
import { normalizeForMatch, matchSpeciesInCatalog } from './speciesResolver';

const CATALOG = [
  {
    id: 'fragaria_ananassa',
    nombre_comun: 'Fresa',
    nombre_cientifico: 'Fragaria × ananassa',
    feeding_plan_template: { primary_steps: [{ offset_days: 7 }] },
  },
  {
    id: 'coffea_arabica',
    nombre_comun: 'Café',
    nombre_cientifico: 'Coffea arabica',
  },
  {
    id: 'solanum_lycopersicum_san_marzano',
    nombre_comun: 'Tomate San Marzano',
    nombre_cientifico: 'Solanum lycopersicum',
  },
];

describe('normalizeForMatch', () => {
  it('minúsculas, sin acentos, sin sufijo de conteo', () => {
    expect(normalizeForMatch('Fresa #1')).toBe('fresa');
    expect(normalizeForMatch('Café')).toBe('cafe');
    expect(normalizeForMatch('  Frijol_Cargamanto  ')).toBe('frijol cargamanto');
  });

  it('tolera entradas vacías o no-string', () => {
    expect(normalizeForMatch(null)).toBe('');
    expect(normalizeForMatch(undefined)).toBe('');
    expect(normalizeForMatch(42)).toBe('');
  });
});

describe('matchSpeciesInCatalog', () => {
  it('resuelve por id canónico exacto', () => {
    expect(matchSpeciesInCatalog(CATALOG, 'fragaria_ananassa', 'Fresa #1')?.id).toBe(
      'fragaria_ananassa',
    );
  });

  it('resuelve un asset viejo cuyo slug es el nombre común derivado (bug fresa)', () => {
    // deriveSpeciesSlug("Fresa") === "fresa", que NO es el id del catálogo.
    expect(matchSpeciesInCatalog(CATALOG, 'fresa', 'Fresa #1')?.id).toBe(
      'fragaria_ananassa',
    );
  });

  it('resuelve solo por nombre cuando no hay slug', () => {
    expect(matchSpeciesInCatalog(CATALOG, null, 'Café #2')?.id).toBe('coffea_arabica');
  });

  it('resuelve por inclusión parcial del nombre común', () => {
    expect(matchSpeciesInCatalog(CATALOG, 'tomate', 'Tomate #1')?.id).toBe(
      'solanum_lycopersicum_san_marzano',
    );
  });

  it('devuelve null cuando no hay coincidencia', () => {
    expect(matchSpeciesInCatalog(CATALOG, 'xyz', 'Especie Marciana')).toBeNull();
  });

  it('tolera lista vacía o inválida', () => {
    expect(matchSpeciesInCatalog([], 'fresa', 'Fresa')).toBeNull();
    expect(matchSpeciesInCatalog(null, 'fresa', 'Fresa')).toBeNull();
  });
});
