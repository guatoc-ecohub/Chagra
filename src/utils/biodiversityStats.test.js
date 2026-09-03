/**
 * biodiversityStats.test.js — tests para el cómputo de stats que alimenta
 * BiodiversidadView. Verifica el fix del bug "37 Especies / 0 Estratos /
 * 0 Gremios" reportado por el operador el 2026-05-18.
 *
 * Casos cubiertos:
 *   1. Catálogo presente + plants con name canónico → estratos/gremios
 *      derivados del catálogo (camino feliz).
 *   2. Catálogo presente + plants con name "display" estilo SpeciesSelect
 *      ("Gulupa (Passiflora edulis f. edulis)") → match por display.
 *   3. Plants con `attributes.notes` inline ("Estrato: X | Gremio: Y") y
 *      sin match en catálogo → fallback al parser legacy.
 *   4. Plants free-text sin match ni notes → contadas como especie pero
 *      sin sumar a estratos/gremios (skip graceful).
 *   5. Sufijo "#003" de bulk-individual → mismo nombre base se cuenta una
 *      sola vez como especie.
 *   6. Mix realista Guatoc (>=4 estratos, >=3 gremios) — el escenario que
 *      el operador estaba viendo en producción.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSpeciesIndex,
  computeBiodiversityStats,
  normalizeForMatch,
  resolvePlantTraits,
} from './biodiversityStats';

const mockCatalog = [
  {
    id: 'passiflora_edulis',
    nombre_comun: 'Gulupa',
    nombre_cientifico: 'Passiflora edulis f. edulis',
    estrato: 'medio',
    gremio: 'productivo_principal',
  },
  {
    id: 'psidium_guajava',
    nombre_comun: 'Guayaba',
    nombre_cientifico: 'Psidium guajava',
    estrato: 'alto',
    gremio: 'productivo_principal',
  },
  {
    id: 'phaseolus_vulgaris',
    nombre_comun: 'Frijol',
    nombre_cientifico: 'Phaseolus vulgaris',
    estrato: 'bajo',
    gremio: 'fijador_nitrogeno',
  },
  {
    id: 'calendula_officinalis',
    nombre_comun: 'Caléndula',
    nombre_cientifico: 'Calendula officinalis',
    estrato: 'bajo',
    gremio: 'atrayente_polinizadores',
  },
  {
    id: 'zea_mays',
    nombre_comun: 'Maíz',
    nombre_cientifico: 'Zea mays',
    estrato: 'medio',
    gremio: 'productivo_principal',
  },
  {
    // Especie emergente para validar las 4 capas verticales.
    id: 'cedrela_montana',
    nombre_comun: 'Cedro andino',
    nombre_cientifico: 'Cedrela montana',
    estrato: 'emergente',
    gremio: 'productor_biomasa',
  },
];

const makePlant = (name, extra = {}) => ({
  id: `plant-${name}`,
  type: 'asset--plant',
  attributes: { name, ...(extra.attributes || {}) },
  ...extra,
});

describe('normalizeForMatch', () => {
  it('quita tildes y baja a lowercase', () => {
    expect(normalizeForMatch('Caléndula')).toBe('calendula');
    expect(normalizeForMatch('Maíz')).toBe('maiz');
  });

  it('quita sufijo "#NNN" de siembras bulk-individual', () => {
    expect(normalizeForMatch('Gulupa #003')).toBe('gulupa');
    expect(normalizeForMatch('Frijol #12')).toBe('frijol');
  });

  it('retorna string vacío para input inválido', () => {
    expect(normalizeForMatch(null)).toBe('');
    expect(normalizeForMatch(undefined)).toBe('');
    expect(normalizeForMatch(/** @type {any} */ (42))).toBe('');
  });
});

describe('buildSpeciesIndex', () => {
  it('indexa por id, nombre_comun, nombre_cientifico y display "comun (cientifico)"', () => {
    const idx = buildSpeciesIndex(mockCatalog);
    expect(idx.get('gulupa')).toEqual(expect.objectContaining({ id: 'passiflora_edulis' }));
    expect(idx.get('passiflora_edulis')).toEqual(expect.objectContaining({ id: 'passiflora_edulis' }));
    expect(idx.get('passiflora edulis f. edulis')).toEqual(
      expect.objectContaining({ id: 'passiflora_edulis' })
    );
    expect(idx.get('gulupa (passiflora edulis f. edulis)')).toEqual(
      expect.objectContaining({ id: 'passiflora_edulis' })
    );
  });

  it('tolera input vacío o no-array', () => {
    expect(buildSpeciesIndex(null).size).toBe(0);
    expect(buildSpeciesIndex(undefined).size).toBe(0);
    expect(buildSpeciesIndex([]).size).toBe(0);
  });
});

describe('resolvePlantTraits', () => {
  const idx = buildSpeciesIndex(mockCatalog);

  it('resuelve via catálogo cuando el name matchea nombre_comun', () => {
    const plant = makePlant('Gulupa');
    expect(resolvePlantTraits(plant, idx)).toEqual({
      estrato: 'medio',
      gremio: 'productivo_principal',
    });
  });

  it('resuelve via catálogo con name display SpeciesSelect ("Comun (Cientifico)")', () => {
    const plant = makePlant('Gulupa (Passiflora edulis f. edulis)');
    expect(resolvePlantTraits(plant, idx)).toEqual({
      estrato: 'medio',
      gremio: 'productivo_principal',
    });
  });

  it('resuelve via _speciesSlug si está presente (camino VoiceCapture)', () => {
    const plant = makePlant('Frijol bola roja', { _speciesSlug: 'phaseolus_vulgaris' });
    expect(resolvePlantTraits(plant, idx)).toEqual({
      estrato: 'bajo',
      gremio: 'fijador_nitrogeno',
    });
  });

  it('fallback a notes parsing cuando no hay match en catálogo', () => {
    const plant = makePlant('Especie inventada', {
      attributes: {
        name: 'Especie inventada',
        notes: { value: 'Notas | Estrato: Alto | Gremio: Productor biomasa' },
      },
    });
    expect(resolvePlantTraits(plant, idx)).toEqual({
      estrato: 'alto',
      gremio: 'productor biomasa',
    });
  });

  it('retorna null/null cuando no hay match ni notes inline', () => {
    const plant = makePlant('Planta libre sin contexto');
    expect(resolvePlantTraits(plant, idx)).toEqual({ estrato: null, gremio: null });
  });

  it('acepta notes como string plano (sin wrapper {value})', () => {
    const plant = makePlant('Otra libre', {
      attributes: { name: 'Otra libre', notes: 'Origen: voz | Estrato: Medio | Gremio: Repelente plagas' },
    });
    expect(resolvePlantTraits(plant, idx)).toEqual({
      estrato: 'medio',
      gremio: 'repelente plagas',
    });
  });
});

describe('computeBiodiversityStats', () => {
  const idx = buildSpeciesIndex(mockCatalog);

  it('retorna 0/0/0 con array vacío', () => {
    expect(computeBiodiversityStats([], idx)).toMatchObject({
      speciesCount: 0,
      strataCount: 0,
      guildsCount: 0,
    });
  });

  it('FIX BUG 2026-05-18: estratos y gremios > 0 cuando plants tienen species del catálogo', () => {
    // Escenario operator: 5 plants distintas, 3 estratos, 3 gremios.
    const plants = [
      makePlant('Gulupa'),          // medio / productivo_principal
      makePlant('Guayaba'),         // alto  / productivo_principal
      makePlant('Frijol'),          // bajo  / fijador_nitrogeno
      makePlant('Caléndula'),       // bajo  / atrayente_polinizadores
      makePlant('Cedro andino'),    // emergente / productor_biomasa
    ];
    const stats = computeBiodiversityStats(plants, idx);
    expect(stats.speciesCount).toBe(5);
    expect(stats.strataCount).toBe(4); // emergente + alto + medio + bajo
    // 4 gremios: productivo_principal (gulupa+guayaba) + fijador_nitrogeno +
    // atrayente_polinizadores + productor_biomasa.
    expect(stats.guildsCount).toBe(4);
    expect(stats.byStratum).toEqual({
      emergente: 1,
      alto: 1,
      medio: 1,
      bajo: 2,
    });
  });

  it('agrupa bulk-individual "Gulupa #001 / #002 / #003" como una sola especie', () => {
    const plants = [
      makePlant('Gulupa #001'),
      makePlant('Gulupa #002'),
      makePlant('Gulupa #003'),
    ];
    const stats = computeBiodiversityStats(plants, idx);
    expect(stats.speciesCount).toBe(1);
    expect(stats.strataCount).toBe(1);
    expect(stats.guildsCount).toBe(1);
    expect(stats.byStratum.medio).toBe(3);
  });

  it('mix realista Guatoc: 37 plants en 4 estratos + 4 gremios diferentes', () => {
    // Reproduce la distribución que el operador esperaba ver (no exactamente
    // sus 37, pero estructuralmente equivalente: muchas plants de mismas
    // species cubriendo 4 estratos).
    const plants = [
      // 10 frijoles (bajo / fijador_n)
      ...Array.from({ length: 10 }, (_, i) => makePlant(`Frijol #${String(i + 1).padStart(3, '0')}`)),
      // 8 maíces (medio / productivo)
      ...Array.from({ length: 8 }, (_, i) => makePlant(`Maíz #${String(i + 1).padStart(3, '0')}`)),
      // 5 guayabas (alto / productivo)
      ...Array.from({ length: 5 }, (_, i) => makePlant(`Guayaba #${String(i + 1).padStart(3, '0')}`)),
      // 3 cedros (emergente / productor biomasa)
      ...Array.from({ length: 3 }, (_, i) => makePlant(`Cedro andino #${String(i + 1).padStart(3, '0')}`)),
      // 6 caléndulas (bajo / atrayente_polinizadores)
      ...Array.from({ length: 6 }, (_, i) => makePlant(`Caléndula #${String(i + 1).padStart(3, '0')}`)),
      // 5 gulupas (medio / productivo) — comparte gremio con maíz/guayaba
      ...Array.from({ length: 5 }, (_, i) => makePlant(`Gulupa #${String(i + 1).padStart(3, '0')}`)),
    ];
    const stats = computeBiodiversityStats(plants, idx);
    expect(stats.speciesCount).toBe(6);
    expect(stats.strataCount).toBe(4);
    // 4 gremios distintos: productivo_principal (gulupa+guayaba+maíz) +
    // fijador_nitrogeno (frijol) + atrayente_polinizadores (caléndula) +
    // productor_biomasa (cedro andino).
    expect(stats.guildsCount).toBe(4);
    expect(stats.byStratum.bajo).toBe(16); // 10 frijoles + 6 caléndulas
    expect(stats.byStratum.medio).toBe(13); // 8 maíces + 5 gulupas
    expect(stats.byStratum.alto).toBe(5);  // 5 guayabas
    expect(stats.byStratum.emergente).toBe(3); // 3 cedros
  });

  it('plants free-text sin match cuentan como especie pero no suman a estratos/gremios', () => {
    const plants = [
      makePlant('Gulupa'),             // catálogo: medio/productivo
      makePlant('Cucayo del abuelo'),  // libre, sin notes
      makePlant('Mata misteriosa'),    // libre, sin notes
    ];
    const stats = computeBiodiversityStats(plants, idx);
    expect(stats.speciesCount).toBe(3);
    expect(stats.strataCount).toBe(1);
    expect(stats.guildsCount).toBe(1);
  });

  it('combina catálogo + notes legacy: plants con ambas fuentes', () => {
    const plants = [
      makePlant('Gulupa'),                                  // catálogo
      makePlant('Especie X', {
        attributes: {
          name: 'Especie X',
          notes: { value: 'Estrato: Emergente | Gremio: Productor biomasa' },
        },
      }),                                                   // notes
    ];
    const stats = computeBiodiversityStats(plants, idx);
    expect(stats.speciesCount).toBe(2);
    expect(stats.strataCount).toBe(2);  // medio + emergente
    expect(stats.guildsCount).toBe(2);
  });

  it('robusto ante speciesIndex vacío (catalog timeout en cold boot offline)', () => {
    const emptyIdx = new Map();
    const plants = [
      makePlant('Gulupa'),
      makePlant('Frijol', {
        attributes: {
          name: 'Frijol',
          notes: { value: 'Notas | Estrato: Bajo | Gremio: Fijador nitrogeno' },
        },
      }),
    ];
    // Sin catálogo, solo plants con notes inline cuentan para estratos/gremios.
    const stats = computeBiodiversityStats(plants, emptyIdx);
    expect(stats.speciesCount).toBe(2);
    expect(stats.strataCount).toBe(1);
    expect(stats.guildsCount).toBe(1);
  });
});
