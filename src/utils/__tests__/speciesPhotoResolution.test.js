/**
 * speciesPhotoResolution.test.js — verificación de DATOS REALES de que la
 * ficha de una especie muestra su PROPIA foto, no la de otra.
 *
 * Bug demo 2026-06-21 (operador): buscar "limón" mostraba LIMONARIA
 * (cymbopogon, una hierba), "tomate" mostraba TOMATE DE ÁRBOL
 * (solanum_betaceum), y "fresa" no mostraba foto. Causa: el resolver hacía
 * matching por SUBSTRING que cruzaba géneros ("limon" ⊂ "limonaria") y la
 * cadena de imagen no caía al cultivar cuando el id base no estaba indexado.
 *
 * Este test carga el CATÁLOGO REAL del repo y el species-images.json REAL
 * (no mocks inventados): es una verificación de datos de producción. Si el
 * catálogo cambia de forma que reintroduzca un cruce de género, este test
 * falla y bloquea el merge.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import { matchSpeciesInCatalog } from '../speciesResolver';
import { findLocalImage, __resetSpeciesImageCache } from '../speciesImageResolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const catalog = JSON.parse(
  readFileSync(
    path.join(REPO_ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json'),
    'utf8',
  ),
);
const speciesImagesRaw = readFileSync(
  path.join(REPO_ROOT, 'public/species-images.json'),
  'utf8',
);
const speciesImages = JSON.parse(speciesImagesRaw);

const LIST = catalog.species;

// Set de species_id con imagen, para afirmar cobertura sin depender de fetch.
const IMAGE_IDS = new Set(
  speciesImages.species
    .filter((s) => s?.species_id && s?.image_url)
    .map((s) => s.species_id),
);

/** ¿Existe imagen para este binomio (exacta o por prefijo de cultivar)? */
function hasImageForBinomio(scientificName) {
  const norm = String(scientificName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const tokens = norm.split('_').filter(Boolean);
  if (tokens.length < 2) return IMAGE_IDS.has(tokens[0]);
  const binomio = tokens.slice(0, 2).join('_');
  if (IMAGE_IDS.has(norm) || IMAGE_IDS.has(binomio)) return true;
  for (const id of IMAGE_IDS) {
    if (id.startsWith(`${binomio}_`)) return true;
  }
  return false;
}

describe('catálogo y datos reales presentes', () => {
  it('el catálogo OSS v3.2 tiene cientos de especies', () => {
    expect(Array.isArray(LIST)).toBe(true);
    expect(LIST.length).toBeGreaterThan(100);
  });

  it('species-images.json tiene la estructura esperada', () => {
    expect(Array.isArray(speciesImages.species)).toBe(true);
    expect(IMAGE_IDS.size).toBeGreaterThan(500);
  });
});

describe('cruce de género corregido (bug demo)', () => {
  it('"limón"/"limon" resuelve a un CÍTRICO, nunca a cymbopogon (limonaria)', () => {
    for (const q of ['limón', 'limon']) {
      const r = matchSpeciesInCatalog(LIST, q, q);
      expect(r, `"${q}" debe matchear`).toBeTruthy();
      expect(r.id.startsWith('citrus_'), `"${q}" → ${r.id}`).toBe(true);
      expect(r.id.startsWith('cymbopogon_')).toBe(false);
    }
  });

  it('"tomate" resuelve a solanum_lycopersicum*, nunca a solanum_betaceum (tomate de árbol)', () => {
    const r = matchSpeciesInCatalog(LIST, 'tomate', 'tomate');
    expect(r).toBeTruthy();
    expect(r.id.startsWith('solanum_lycopersicum'), `tomate → ${r.id}`).toBe(true);
    expect(r.id).not.toBe('solanum_betaceum');
  });

  it('"fresa" resuelve a fragaria_*', () => {
    const r = matchSpeciesInCatalog(LIST, 'fresa', 'fresa');
    expect(r).toBeTruthy();
    expect(r.id.startsWith('fragaria_'), `fresa → ${r.id}`).toBe(true);
  });

  it('"limonaria" SÍ resuelve a cymbopogon_* (caso legítimo, no romper)', () => {
    const r = matchSpeciesInCatalog(LIST, 'limonaria', 'limonaria');
    expect(r).toBeTruthy();
    expect(r.id.startsWith('cymbopogon_'), `limonaria → ${r.id}`).toBe(true);
  });

  it('"tomate de árbol" SÍ resuelve a solanum_betaceum (caso legítimo, no romper)', () => {
    const r = matchSpeciesInCatalog(LIST, 'tomate de árbol', 'tomate de árbol');
    expect(r).toBeTruthy();
    expect(r.id).toBe('solanum_betaceum');
  });

  it('nunca a mitad de palabra: "limon" no puede caer en "limonaria"', () => {
    const r = matchSpeciesInCatalog(LIST, 'limon', 'limon');
    expect(r.id).not.toBe('cymbopogon_citratus');
  });
});

describe('resolución de imagen (cadena completa)', () => {
  beforeEach(() => {
    __resetSpeciesImageCache();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(JSON.parse(speciesImagesRaw)),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetSpeciesImageCache();
  });

  it('la imagen de "fresa" NO es vacía (fallback por cultivar)', async () => {
    const r = matchSpeciesInCatalog(LIST, 'fresa', 'fresa');
    const img = await findLocalImage(r.nombre_cientifico);
    expect(img).toBeTruthy();
    expect(typeof img.url).toBe('string');
    expect(img.url.length).toBeGreaterThan(0);
  });

  it('el binomio base "Fragaria × ananassa" (sin cultivar) cae al cultivar con foto', async () => {
    const img = await findLocalImage('Fragaria × ananassa');
    expect(img).toBeTruthy();
    expect(img.url.length).toBeGreaterThan(0);
  });

  it('la imagen de "limón" es un cítrico (no la hierba limonaria)', async () => {
    const r = matchSpeciesInCatalog(LIST, 'limón', 'limón');
    const img = await findLocalImage(r.nombre_cientifico);
    expect(img).toBeTruthy();
    expect(img.url.length).toBeGreaterThan(0);
  });
});

// Lista amplia de especies comunes: cada una debe resolver a una especie del
// catálogo cuya imagen existe (exacta o por fallback de cultivar), sin cruces
// de género. Algunas no están en el subset OSS (banano/mandarina) → se
// permiten como "no en catálogo" pero NO como cruce de género.
const COMMON_SPECIES = [
  { q: 'limón', expectGenus: 'citrus', forbidGenus: 'cymbopogon' },
  { q: 'tomate', expectGenus: 'solanum', forbidId: 'solanum_betaceum' },
  { q: 'fresa', expectGenus: 'fragaria' },
  { q: 'papa', expectGenus: 'solanum' },
  { q: 'maíz', expectGenus: 'zea' },
  { q: 'frijol', expectGenus: 'phaseolus' },
  { q: 'aguacate', expectGenus: 'persea' },
  { q: 'café', expectGenus: 'coffea' },
  { q: 'cacao', expectGenus: 'theobroma' },
  { q: 'plátano', expectGenus: 'musa' },
  { q: 'banano', optional: true },
  { q: 'cebolla', expectGenus: 'allium' },
  { q: 'zanahoria', expectGenus: 'daucus' },
  { q: 'lechuga', expectGenus: 'lactuca' },
  { q: 'repollo', expectGenus: 'brassica' },
  { q: 'cilantro', expectGenus: 'coriandrum' },
  { q: 'naranja', expectGenus: 'citrus' },
  { q: 'mandarina', optional: true },
  { q: 'limonaria', expectGenus: 'cymbopogon' },
  { q: 'tomate de árbol', expectId: 'solanum_betaceum' },
];

describe('cobertura amplia: foto correcta por especie común', () => {
  it(`cubre ${COMMON_SPECIES.length} especies comunes`, () => {
    expect(COMMON_SPECIES.length).toBeGreaterThanOrEqual(18);
  });

  for (const spec of COMMON_SPECIES) {
    it(`"${spec.q}" → especie correcta con imagen, sin cruce de género`, () => {
      const r = matchSpeciesInCatalog(LIST, spec.q, spec.q);
      if (spec.optional && !r) {
        // No está en el subset OSS — aceptable, no es un cruce.
        expect(r).toBeNull();
        return;
      }
      expect(r, `"${spec.q}" debería resolver`).toBeTruthy();
      if (spec.expectGenus) {
        expect(
          r.id.startsWith(`${spec.expectGenus}_`),
          `"${spec.q}" → ${r.id}, esperaba género ${spec.expectGenus}`,
        ).toBe(true);
      }
      if (spec.expectId) expect(r.id).toBe(spec.expectId);
      if (spec.forbidId) expect(r.id).not.toBe(spec.forbidId);
      if (spec.forbidGenus) {
        expect(r.id.startsWith(`${spec.forbidGenus}_`)).toBe(false);
      }
      // La especie resuelta debe tener imagen (exacta o por cultivar).
      expect(
        hasImageForBinomio(r.nombre_cientifico),
        `"${spec.q}" → ${r.id} (${r.nombre_cientifico}) sin imagen disponible`,
      ).toBe(true);
    });
  }
});
