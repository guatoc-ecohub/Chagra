import { describe, it, expect } from 'vitest';
import { normalizeForMatch, matchSpeciesInCatalog } from './speciesResolver';

const CATALOG = [
  {
    id: 'fragaria_ananassa',
    slug: 'fragaria_ananassa',
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
  {
    id: 'allium_fistulosum',
    nombre_comun: 'Cebollín / Cebolla larga',
    nombre_cientifico: 'Allium fistulosum L.',
    familia_botanica: 'Amaryllidaceae',
  },
  {
    id: 'theobroma_cacao',
    nombre_comun: 'Cacao',
    nombre_cientifico: 'Theobroma cacao L.',
  },
  {
    id: 'hybridus_genericus',
    nombre_comun: null,
    nombre_cientifico: 'Hybridus genericus',
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
    expect(normalizeForMatch(/** @type {any} */ (42))).toBe('');
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

  it('resuelve cultivos del operador con calificador de estructura ("Fresa - Invernadero #1")', () => {
    // Antes del fix, "Fresa - Invernadero #1" normalizaba a "fresa - invernadero"
    // y NO matcheaba ninguna especie → calendario vacío.
    expect(
      matchSpeciesInCatalog(CATALOG, 'fresa_invernadero', 'Fresa - Invernadero #1')?.id,
    ).toBe('fragaria_ananassa');
    expect(
      matchSpeciesInCatalog(CATALOG, 'fresa_invernadero', 'Fresa - Invernadero #10')?.id,
    ).toBe('fragaria_ananassa');
  });

  it('tolera lista vacía o inválida', () => {
    expect(matchSpeciesInCatalog([], 'fresa', 'Fresa')).toBeNull();
    expect(matchSpeciesInCatalog(null, 'fresa', 'Fresa')).toBeNull();
  });
});

// —— Cascada extendida: cobertura completa del resolver ——

describe('matchSpeciesInCatalog — paso 1: id/slug exacto', () => {
  it('matchea por campo slug cuando el id no coincide', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'fragaria_ananassa', null);
    expect(r?.id).toBe('fragaria_ananassa');
    expect(r?.slug).toBe('fragaria_ananassa');
  });

  it('no produce falso positivo cuando slug es parcial (solo id/slug completo matchea paso 1)', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'fragaria', 'Algo raro');
    expect(r).toBeNull();
  });
});

describe('matchSpeciesInCatalog — paso 2: nombre comun y cientifico', () => {
  it('matchea por nombre_comun exacto del catalogo (sin slug)', () => {
    const r = matchSpeciesInCatalog(CATALOG, null, 'Cacao');
    expect(r?.id).toBe('theobroma_cacao');
  });

  it('matchea por nombre_cientifico exacto del catalogo', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'cacao', 'Cacao #2');
    expect(r?.id).toBe('theobroma_cacao');
  });

  it('slug no existe en paso 1, pero nombre_comun matchea en paso 2', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'algo_inexistente', 'Fresa');
    expect(r?.id).toBe('fragaria_ananassa');
  });

  it('slug no matchea paso 1, pero nombre_cientifico matchea en paso 2', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'allium', 'Allium fistulosum L.');
    expect(r?.id).toBe('allium_fistulosum');
  });

  it('matchea nombre_comun con barra inclinada en el catalogo', () => {
    const r = matchSpeciesInCatalog(CATALOG, null, 'Cebollín');
    expect(r?.id).toBe('allium_fistulosum');
  });

  it('matchea usando el slug normalizado contra nombre_comun del catalogo', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'tomate san marzano', null);
    expect(r?.id).toBe('solanum_lycopersicum_san_marzano');
  });
});

describe('matchSpeciesInCatalog — paso 3: inclusion parcial', () => {
  it('matchea cuando el candidato aparece dentro del nombre_comun del catalogo', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'cebolla', 'Cebollín #1');
    expect(r?.id).toBe('allium_fistulosum');
  });

  it('matchea cuando el nombre_comun del catalogo aparece dentro del candidato', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'café_colombiano', null);
    expect(r?.id).toBe('coffea_arabica');
  });

  it('NO matchea candidatos de menos de 3 caracteres', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'ab', 'cd');
    expect(r).toBeNull();
  });

  it('NO rompe cuando una especie tiene nombre_comun null', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'generic', null);
    expect(r).toBeNull();
    expect(() => matchSpeciesInCatalog(CATALOG, 'hybridus_genericus', null)).not.toThrow();
  });
});

describe('matchSpeciesInCatalog — bordes', () => {
  it('ambos slug y name son null o vacios → null', () => {
    expect(matchSpeciesInCatalog(CATALOG, null, null)).toBeNull();
    expect(matchSpeciesInCatalog(CATALOG, '', '')).toBeNull();
  });

  it('tolera entradas null/undefined dentro del array del catalogo', () => {
    const mixedList = [null, undefined, ...CATALOG];
    expect(() => matchSpeciesInCatalog(mixedList, 'fresa', 'Fresa')).not.toThrow();
    expect(matchSpeciesInCatalog(mixedList, 'fresa', 'Fresa')?.id).toBe('fragaria_ananassa');
  });

  it('name vacio y slug solo → usa slug para paso 1 y paso 2', () => {
    const r = matchSpeciesInCatalog(CATALOG, 'fresa', '');
    expect(r?.id).toBe('fragaria_ananassa');
  });

  it('slug vacio y name solo → usa name para paso 2 y paso 3', () => {
    const r = matchSpeciesInCatalog(CATALOG, '', 'Café');
    expect(r?.id).toBe('coffea_arabica');
  });

  it('NO falla si slug no es string ni si name es un objeto', () => {
    expect(matchSpeciesInCatalog(CATALOG, /** @type {any} */ (42), /** @type {any} */ ({}))).toBeNull();
    expect(matchSpeciesInCatalog(CATALOG, /** @type {any} */ (123), 'Fresa')?.id).toBe('fragaria_ananassa');
  });
});

describe('normalizeForMatch — ampliado', () => {
  it('remueve tilde de la eñe (ñ → n)', () => {
    expect(normalizeForMatch('cañamo')).toBe('canamo');
    expect(normalizeForMatch('Ñame')).toBe('name');
  });

  it('colapsa multiples guiones bajos y espacios consecutivos', () => {
    expect(normalizeForMatch('  cafe___colombiano  ')).toBe('cafe colombiano');
  });

  it('devuelve string vacio para entrada vacia o solo whitespace', () => {
    expect(normalizeForMatch('')).toBe('');
    expect(normalizeForMatch('   ')).toBe('');
  });

  it('passthrough: string ya limpio queda igual', () => {
    expect(normalizeForMatch('fresa organica')).toBe('fresa organica');
  });
});

describe('normalizeForMatch — calificadores de estructura de finca (cultivos del operador)', () => {
  it('recorta "- Invernadero #N" al nombre de la especie', () => {
    expect(normalizeForMatch('Fresa - Invernadero #1')).toBe('fresa');
    expect(normalizeForMatch('Fresa - Invernadero #10')).toBe('fresa');
    expect(normalizeForMatch('Guayaba - Invernadero')).toBe('guayaba');
  });

  it('recorta otros calificadores de ubicación predial', () => {
    expect(normalizeForMatch('Tomate - Era 3')).toBe('tomate');
    expect(normalizeForMatch('Mora - Cama 4')).toBe('mora');
    expect(normalizeForMatch('Cilantro - Lote 2')).toBe('cilantro');
  });

  it('recorta el calificador de estructura aunque venga sin guion', () => {
    expect(normalizeForMatch('Fresa Invernadero #1')).toBe('fresa');
  });

  it('recorta conteo con cero a la izquierda (#01)', () => {
    expect(normalizeForMatch('Fresa #01')).toBe('fresa');
  });

  it('CONSERVA el nombre científico entre paréntesis (lo usa el paso 2/3)', () => {
    expect(normalizeForMatch('Tomate (Solanum lycopersicum)')).toBe('tomate (solanum lycopersicum)');
    expect(normalizeForMatch('Guayaba (Psidium guajava)')).toBe('guayaba (psidium guajava)');
  });

  it('NO recorta separadores que no son estructura predial (anti-falso-positivo)', () => {
    // "Ají - dulce" NO es ubicación; el guion separa una variedad, se conserva.
    expect(normalizeForMatch('Ají - dulce')).toBe('aji - dulce');
  });

  it('anti-confusión: NO recorta "árbol" (Tomate de árbol es OTRA especie)', () => {
    expect(normalizeForMatch('Tomate de árbol')).toBe('tomate de arbol');
  });
});
