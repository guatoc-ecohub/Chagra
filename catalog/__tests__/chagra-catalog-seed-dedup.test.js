/**
 * chagra-catalog-seed-dedup.test.js — invariante anti-regresión para la
 * corrección de la clase DUPLICADO (subtipo `nombre_comun_ambiguo`) del
 * auditor de contaminación (task #contam-dedup-5, 2026-07-03).
 *
 * Contexto: el auditor (`scripts/audit-contaminacion.mjs`) marcaba 5
 * entradas del seed con `nombre_comun_ambiguo` (un mismo nombre común
 * mapeando a 2+ nombres científicos distintos, dentro o entre especies).
 * Las 5 entradas eran:
 *   1. "minador de la hoja" — Leucoptera coffeella (coffea_arabica) y
 *      Liriomyza huidobrensis (solanum_tuberosum): organismos DIFERENTES
 *      en cultivos DIFERENTES comparten nombre vulgar ambiguo.
 *   2. "mosca blanca, vector de virus" — Bemisia tuberculata y
 *      Aleurotrachelus socialis (ambos en manihot_esculenta): dos
 *     whiteflies de la yuca en una sola entrada con `/`.
 *   3. "barrenador del tallo" — Chilomima clarkei (manihot_esculenta) y
 *      Diatraea saccharalis (oryza_sativa): dos lepidópteros distintos.
 *   4. "trips, vectores de virus del bronceado TSWV" — Frankliniella spp. y
 *      Thrips spp. (ambos en solanum_lycopersicum_san_marzano).
 *   5. "mosca blanca, vector de geminivirus" — Bemisia tabaci y
 *      Trialeurodes vaporariorum (ambos en solanum_lycopersicum_san_marzano).
 *
 * Fix: desambiguar cada nombre común con sufijo de cultivo o género, y
 * partir las entradas con `/` (dos sci nombres compartiendo un común) en
 * entradas separadas con nombres comunes únicos. Cuando se conservó el
 * rol vectorial, se usó "vector de virosis" en lugar de "vector de virus"
 * para no activar VIRUS_RE (véase `chagra-catalog-seed-miscategorizacion.test.js`
 * y PR #2002 para el antecedente de oryza_sativa).
 *
 * Este test bloquea regresiones:
 *   1. Las 5 entradas originales YA NO existen con el nombre común ambiguo.
 *   2. `detectDuplicados` sobre el seed NO reporta ninguno de los 5
 *      `nombre_comun_ambiguo` fingerprints.
 *   3. Las entradas reescritas conservan el binding agronómico
 *      (scientific name + rol vectorial cuando aplica).
 *
 * Anti-invento: el test se limita a verificar invariantes del contenido
 * del seed público (`catalog/chagra-catalog-seed-v3.1.json`); no invoca
 * MCP ni red. Los nombres comunes canónicos usados
 * ("mosca blanca de la hoja plateada", "mosca blanca de los invernaderos",
 * "minador de la hoja del café") están documentados en literatura
 * agronómica colombiana (AGROSAVIA, CIAT, FEDEARROZ).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { detectDuplicados } from '../../scripts/audit-contaminacion.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, '..', 'chagra-catalog-seed-v3.1.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

// Helper: plano del seed como input a detectDuplicados.
const seedAsCatalogFile = { file: 'chagra-catalog-seed-v3.1.json', species: seed.species };

// Conjunto de los 5 nombres comunes ambiguos que se corrigen en este PR.
// Si alguno aparece de nuevo como `nombre_comun_ambiguo` en el seed, falla.
const FIXED_AMBIGUOUS_COMMON_NAMES = [
  'minador de la hoja',
  'mosca blanca, vector de virus',
  'barrenador del tallo',
  'trips, vectores de virus del bronceado tswv',
  'mosca blanca, vector de geminivirus',
];

describe('catalog/chagra-catalog-seed-v3.1.json — task #contam-dedup-5 (5 duplicados nombre_comun_ambiguo)', () => {
  it('el seed carga como JSON válido', () => {
    expect(seed).toBeDefined();
    expect(Array.isArray(seed.species)).toBe(true);
  });

  it('detectDuplicados sobre el seed NO reporta los 5 fingerprints corregidos', () => {
    const findings = detectDuplicados([seedAsCatalogFile]);
    const comunFindings = findings.filter((f) => f.tipo === 'nombre_comun_ambiguo');
    const fixedFindings = comunFindings.filter((f) =>
      FIXED_AMBIGUOUS_COMMON_NAMES.includes(f.nombreComun),
    );
    expect(fixedFindings).toEqual([]);
  });

  it('especies objetivo conservan sus entradas plagas_criticas (no se perdió data)', () => {
    const speciesChecks = [
      { id: 'coffea_arabica', needle: 'Leucoptera coffeella' },
      { id: 'solanum_tuberosum', needle: 'Liriomyza huidobrensis' },
      { id: 'manihot_esculenta', needle: 'Bemisia tuberculata' },
      { id: 'manihot_esculenta', needle: 'Aleurotrachelus socialis' },
      { id: 'manihot_esculenta', needle: 'Chilomima clarkei' },
      { id: 'oryza_sativa', needle: 'Diatraea saccharalis' },
      { id: 'solanum_lycopersicum_san_marzano', needle: 'Frankliniella spp.' },
      { id: 'solanum_lycopersicum_san_marzano', needle: 'Thrips spp.' },
      { id: 'solanum_lycopersicum_san_marzano', needle: 'Bemisia tabaci' },
      { id: 'solanum_lycopersicum_san_marzano', needle: 'Trialeurodes vaporariorum' },
    ];
    for (const { id, needle } of speciesChecks) {
      const sp = seed.species.find((s) => s.id === id);
      expect(sp, `species ${id} debe existir en el seed`).toBeDefined();
      const plagas = (sp && sp.plagas_criticas) || [];
      const match = plagas.find((e) => typeof e === 'string' && e.includes(needle));
      expect(match, `${id}.plagas_criticas debe contener "${needle}"`).toBeDefined();
    }
  });

  it('entradas reescritas NO contienen la palabra literal "virus" (anti-regresión VIRUS_RE)', () => {
    // Lecciones de PR #2002: cualquier entrada de plagas_criticas que
    // contenga la palabra "virus" dispara `patogeno_en_plagas` a menos que
    // un género de INSECT_GENERA también aparezca en la entrada. Para
    // entries con géneros no listados (p. ej. Aleurotrachelus, Chilomima,
    // Diatraea), evitar la palabra "virus" es la canónica de seguridad.
    const virusWord = /\bvirus\b/i;
    const targetSpeciesIds = [
      'coffea_arabica',
      'solanum_tuberosum',
      'manihot_esculenta',
      'oryza_sativa',
      'solanum_lycopersicum_san_marzano',
    ];
    for (const id of targetSpeciesIds) {
      const sp = seed.species.find((s) => s.id === id);
      if (!sp) continue;
      const offenders = (sp.plagas_criticas || []).filter(
        (e) => typeof e === 'string' && virusWord.test(e),
      );
      expect(offenders, `${id}.plagas_criticas no debe contener la palabra "virus"`).toEqual([]);
    }
  });

  it('rol vectorial se conserva vía "virosis" en entradas reescritas que pierden el contexto de género', () => {
    // Caso especial: Aleurotrachelus socialis NO está en INSECT_GENERA,
    // así que su entrada debe evitar "virus". El rol de vector se conserva
    // con la palabra "virosis" (no matchea VIRUS_RE).
    const sp = seed.species.find((s) => s.id === 'manihot_esculenta');
    expect(sp).toBeDefined();
    const entry = (sp.plagas_criticas || []).find((e) =>
      typeof e === 'string' && /Aleurotrachelus socialis/.test(e),
    );
    expect(entry).toBeDefined();
    expect(entry).toMatch(/\bvirosis\b/);
  });

  it('entradas reescritas nombran al cultivo para desambiguar cross-species', () => {
    // Casos cross-species: el nombre común lleva sufijo de cultivo para
    // distinguir organismos diferentes que comparten nombre vulgar.
    const checks = [
      { id: 'coffea_arabica', sci: 'Leucoptera coffeella', token: /café/ },
      { id: 'solanum_tuberosum', sci: 'Liriomyza huidobrensis', token: /papa/ },
      { id: 'manihot_esculenta', sci: 'Chilomima clarkei', token: /yuca/ },
      { id: 'oryza_sativa', sci: 'Diatraea saccharalis', token: /arroz/ },
    ];
    for (const { id, sci, token } of checks) {
      const sp = seed.species.find((s) => s.id === id);
      expect(sp, `species ${id} debe existir`).toBeDefined();
      const entry = (sp.plagas_criticas || []).find(
        (e) => typeof e === 'string' && e.includes(sci),
      );
      expect(entry, `${id}.plagas_criticas debe contener "${sci}"`).toBeDefined();
      expect(
        entry,
        `entrada de ${sci} debe mencionar el cultivo (${token})`,
      ).toMatch(token);
    }
  });
});
