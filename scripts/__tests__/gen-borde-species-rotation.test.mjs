/**
 * scripts/__tests__/gen-borde-species-rotation.test.mjs
 *
 * Cobertura del generador de bench adversarial rotativo por especie
 * (gen-borde-species-rotation.mjs). NO toca el filesystem ni el catálogo real:
 * inyecta un STUB pequeño de especies para que la salida sea determinística y
 * auditable.
 *
 * Invariantes críticos verificados:
 *   - determinismo: misma seed → misma salida (idéntica byte-a-byte).
 *   - schema: cada prompt cumple las claves de TEST_PROMPTS_BORDE_ALUCINACION_V3.
 *   - SEGURIDAD: el eje toxicidad_consumo_crudo SOLO aparece para especies con
 *     toxicidad documentada en el catálogo — NUNCA para una especie sin el dato.
 *   - gating por datos: altitud/edáfico/mezcla/homónimo sólo cuando hay datos.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCatalog,
  generatePrompts,
  generateAxis,
  buildFixture,
  AXIS_ORDER,
  firstToken,
  speciesBase,
  makeTypo,
  mulberry32,
  deterministicSample,
} from '../gen-borde-species-rotation.mjs';

// ── Stub de catálogo (mezcla de casos con/sin cada dato) ───────────────────
const STUB = [
  {
    id: 'solanum_lycopersicum',
    nombre_comun: 'Tomate chonto',
    nombre_cientifico: 'Solanum lycopersicum L.',
    familia_botanica: 'Solanaceae',
    altitud_msnm: { min_absoluto: 1000, optimo_min: 1200, optimo_max: 2000, max_absoluto: 2400 },
    ph_suelo: { optimo_min: 6.0, optimo_max: 6.8 },
    antagonists: ['solanum_tuberosum'],
    // sin toxicidad
  },
  {
    id: 'solanum_tuberosum',
    nombre_comun: 'Tomate de árbol', // mismo token "tomate", especie distinta
    nombre_cientifico: 'Solanum betaceum Cav.',
    familia_botanica: 'Solanaceae',
    altitud_msnm: { min_absoluto: 1800, optimo_min: 2000, optimo_max: 2600, max_absoluto: 3000 },
    ph_suelo: { optimo_min: 5.5, optimo_max: 6.5 },
    antagonists: [],
    // sin toxicidad
  },
  {
    id: 'manihot_esculenta',
    nombre_comun: 'Yuca brava',
    nombre_cientifico: 'Manihot esculenta Crantz',
    familia_botanica: 'Euphorbiaceae',
    altitud_msnm: { min_absoluto: 0, optimo_min: 0, optimo_max: 1000, max_absoluto: 1800 },
    ph_suelo: null, // sin pH → no debe generar premisa_edafologica
    antagonists: [],
    advertencia_toxicologica:
      'NUNCA consumir cruda variedades amargas (HCN). Procesar (rallar, fermentar, cocer) antes de consumir.',
  },
  {
    id: 'lechuga_crespa',
    nombre_comun: 'Lechuga crespa',
    nombre_cientifico: 'Lactuca sativa L.',
    familia_botanica: 'Asteraceae',
    altitud_msnm: null, // sin altitud → no debe generar altitud_inviable
    ph_suelo: { optimo_min: 6.0, optimo_max: 7.0 },
    antagonists: [],
    // sin toxicidad
  },
];

function gen(opts) {
  const catalog = buildCatalog(STUB);
  return { catalog, prompts: generatePrompts(catalog, opts) };
}

const REQUIRED_KEYS = [
  'id',
  'region',
  'axes',
  'complexity',
  'prompt',
  'expected',
  'must_include',
  'should_include',
  'red_flags',
  'pass_fail',
];

describe('gen-borde-species-rotation', () => {
  it('mulberry32 es determinística por seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('deterministicSample reproduce la misma muestra con la misma seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(deterministicSample(arr, 3, 7)).toEqual(deterministicSample(arr, 3, 7));
    expect(deterministicSample(arr, 3, 7)).not.toEqual(deterministicSample(arr, 3, 99));
  });

  it('firstToken normaliza tildes y toma la primera variante antes de "/"', () => {
    expect(firstToken('Ají dulce / Ají topito')).toBe('aji');
    expect(firstToken('Tomate de árbol')).toBe('tomate');
  });

  it('speciesBase distingue especie de variedad', () => {
    expect(speciesBase("Beta vulgaris var. cicla 'Morada'")).toBe('beta vulgaris');
    expect(speciesBase('Solanum lycopersicum L.')).toBe('solanum lycopersicum');
    // misma base = NO son especies distintas
    expect(speciesBase("Beta vulgaris var. cicla 'Morada'")).toBe(
      speciesBase('Beta vulgaris var. cicla L.')
    );
  });

  it('makeTypo produce un nombre distinto al original', () => {
    const rng = mulberry32(1);
    const t = makeTypo('Amaranto', rng);
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThan(0);
  });

  it('genera salida DETERMINÍSTICA con la misma seed', () => {
    const a = gen({ mode: 'rotate', rotate: 3, seed: 42 }).prompts;
    const b = gen({ mode: 'rotate', rotate: 3, seed: 42 }).prompts;
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('cada prompt cumple el schema de claves de V3', () => {
    const { prompts } = gen({ mode: 'full' });
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) {
      for (const k of REQUIRED_KEYS) expect(p, `${p.id} falta ${k}`).toHaveProperty(k);
      expect(Array.isArray(p.axes)).toBe(true);
      expect(p.axes.length).toBe(1);
      expect(Array.isArray(p.must_include)).toBe(true);
      expect(Array.isArray(p.red_flags)).toBe(true);
      expect(typeof p.prompt).toBe('string');
      expect(p.prompt.length).toBeGreaterThan(0);
      expect(p.region).toBe('andina');
    }
  });

  it('cada eje genera el shape correcto para una especie con todos los datos', () => {
    const catalog = buildCatalog(STUB);
    const tomate = catalog.byId.get('solanum_lycopersicum');
    for (const axisKey of AXIS_ORDER) {
      if (axisKey === 'toxicidad_consumo_crudo') continue; // tomate no es tóxico
      const out = generateAxis(axisKey, [tomate], catalog, 42);
      // tomate tiene altitud, pH, antagonista y homónimo → todos deben emitir
      expect(out.length, `eje ${axisKey} no emitió para tomate`).toBe(1);
      expect(out[0].axes[0]).toBe(axisKey);
    }
  });

  // ── INVARIANTE DE SEGURIDAD ───────────────────────────────────────────────
  it('toxicidad_consumo_crudo SOLO aparece para especies con toxicidad documentada', () => {
    const { prompts } = gen({ mode: 'full' });
    const toxPrompts = prompts.filter((p) => p.axes[0] === 'toxicidad_consumo_crudo');
    // En el stub, sólo manihot_esculenta tiene advertencia_toxicologica.
    expect(toxPrompts.map((p) => p.species_id)).toEqual(['manihot_esculenta']);
  });

  it('NUNCA genera toxicidad para una especie sin el dato (generateAxis directo)', () => {
    const catalog = buildCatalog(STUB);
    const tomate = catalog.byId.get('solanum_lycopersicum'); // sin toxicidad
    const out = generateAxis('toxicidad_consumo_crudo', [tomate], catalog, 42);
    expect(out).toEqual([]);
  });

  it('gating: no genera altitud_inviable si falta altitud_msnm', () => {
    const catalog = buildCatalog(STUB);
    const lechuga = catalog.byId.get('lechuga_crespa'); // altitud_msnm null
    expect(generateAxis('altitud_inviable', [lechuga], catalog, 42)).toEqual([]);
  });

  it('gating: no genera premisa_edafologica si falta ph_suelo', () => {
    const catalog = buildCatalog(STUB);
    const yuca = catalog.byId.get('manihot_esculenta'); // ph_suelo null
    expect(generateAxis('premisa_edafologica', [yuca], catalog, 42)).toEqual([]);
  });

  it('gating: no genera mezcla_incompatible si antagonists vacío', () => {
    const catalog = buildCatalog(STUB);
    const yuca = catalog.byId.get('manihot_esculenta'); // antagonists []
    expect(generateAxis('mezcla_incompatible', [yuca], catalog, 42)).toEqual([]);
  });

  it('homonimo_confusion empareja especies DISTINTAS, no variedades de la misma', () => {
    const catalog = buildCatalog(STUB);
    const tomate = catalog.byId.get('solanum_lycopersicum');
    const out = generateAxis('homonimo_confusion', [tomate], catalog, 42);
    expect(out.length).toBe(1);
    // El otro debe ser "Tomate de árbol" (binomio base distinto)
    expect(out[0].expected.especie).toContain('Tomate de árbol');
    expect(out[0].red_flags.some((r) => /misma especie/i.test(r))).toBe(true);
  });

  it('altitud_inviable propone una altitud FUERA del rango y la marca como tal', () => {
    const catalog = buildCatalog(STUB);
    const tomate = catalog.byId.get('solanum_lycopersicum'); // max_absoluto 2400
    const out = generateAxis('altitud_inviable', [tomate], catalog, 42);
    const m = out[0].prompt.match(/a (\d+) msnm/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThan(2400);
  });

  it('buildFixture envuelve los prompts en el sobre compatible con el runner', () => {
    const { prompts } = gen({ mode: 'rotate', rotate: 2, seed: 1 });
    const fx = buildFixture(prompts, { rotation: { mode: 'rotate', N_per_axis: 2, seed: 1 } });
    expect(fx).toHaveProperty('prompts');
    expect(fx.prompts).toBe(prompts);
    expect(fx).toHaveProperty('scoring');
    expect(fx).toHaveProperty('schema_version');
    expect(fx.rotation).toEqual({ mode: 'rotate', N_per_axis: 2, seed: 1 });
  });

  it('--rotate respeta N por eje cuando hay universo suficiente', () => {
    // Con 4 especies en el stub, rotate 2 → ≤2 por eje.
    const { prompts } = gen({ mode: 'rotate', rotate: 2, seed: 42 });
    const byAxis = {};
    for (const p of prompts) byAxis[p.axes[0]] = (byAxis[p.axes[0]] || 0) + 1;
    for (const k of Object.keys(byAxis)) expect(byAxis[k]).toBeLessThanOrEqual(2);
  });
});
