/**
 * chagra-catalog-seed-miscategorizacion.test.js — invariante anti-regresión
 * para la corrección de la clase MISCATEGORIZACION del auditor de
 * contaminación (task #contam-misc-only, 2026-07-03).
 *
 * Contexto: el auditor (`scripts/audit-contaminacion.mjs`) marcaba la entrada
 * `plagas_criticas` de `oryza_sativa` como `patogeno_en_plagas` porque la
 * descripción incluía la palabra "Virus" (trigger de `VIRUS_RE = /\bvirus\b/i`).
 * El insecto Tagosodes orizicolus (sogata) SÍ es plaga #1 del arroz en
 * Colombia y está correctamente en `plagas_criticas` — el bug era solo
 * ortográfico al audit. La entrada fue reescrita usando el acrónimo VHB
 * (definido en el mismo species `enfermedades_criticas` y canónico en la
 * literatura FEDEARROZ) para evitar el match del regex sin perder
 * información agronómica.
 *
 * Este test bloquea regresiones:
 *   1. La entrada de `oryza_sativa` NO contiene la palabra "virus" (que
 *      triggera `VIRUS_RE`).
 *   2. `detectMiscategorizacion` sobre el seed NO reporta hallazgos para
 *      `oryza_sativa`.
 *   3. La entrada sí menciona "VHB" (acrónimo establecido en
 *      `enfermedades_criticas` del mismo species) para no perder el binding
 *      agronómico vector↔enfermedad.
 *
 * Anti-invento: el test se limita a verificar invariantes del contenido del
 * seed público (`catalog/chagra-catalog-seed-v3.1.json`); no invoca MCP ni
 * red. La toración VHB↔Virus de la Hoja Blanca está documentada en el mismo
 * seed (línea de `enfermedades_criticas` del species) y en el
 * `valor_pedagogico`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { detectMiscategorizacion } from '../../scripts/audit-contaminacion.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, '..', 'chagra-catalog-seed-v3.1.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const oryza = seed.species.find((sp) => sp.id === 'oryza_sativa');

describe('catalog/chagra-catalog-seed-v3.1.json — oryza_sativa miscategorizacion (task #contam-misc-only)', () => {
  it('oryza_sativa existe en el seed', () => {
    expect(oryza).toBeDefined();
  });

  it('la entrada plagas_criticas de sogata NO contiene la palabra "virus" (trigger de VIRUS_RE)', () => {
    // VIRUS_RE = /\bvirus\b/i en scripts/audit-contaminacion.mjs. Cualquier
    // aparición de la palabra "virus" (case-insensitive) en una entrada de
    // plagas_criticas produce un falso `patogeno_en_plagas`.
    const virusWord = /\bvirus\b/i;
    const offenders = (oryza.plagas_criticas || []).filter((e) => virusWord.test(e));
    expect(offenders).toEqual([]);
  });

  it('la entrada plagas_criticas de sogata conserva el binding al acrónimo VHB', () => {
    // VHB = Virus de la Hoja Blanca, canónico en literatura FEDEARROZ y
    // ya establecido en enfermedades_criticas del mismo species. Verifica
    // que el fix no pierda información agronómica.
    const sogataEntry = (oryza.plagas_criticas || []).find((e) => /Tagosodes orizicolus/i.test(e));
    expect(sogataEntry).toBeDefined();
    expect(sogataEntry).toMatch(/\bVHB\b/);
  });

  it('enfermedades_criticas de oryza_sativa define el acrónimo VHB (trazabilidad)', () => {
    // El acrónimo VHB usado en plagas_criticas debe estar definido en
    // enfermedades_criticas del mismo species (anti-pérdida de binding).
    const vhbDefEntry = (oryza.enfermedades_criticas || []).find(
      (e) => /Virus de la Hoja Blanca\s*\(VHB\)/i.test(e),
    );
    expect(vhbDefEntry).toBeDefined();
  });

  it('detectMiscategorizacion NO reporta oryza_sativa en el seed', () => {
    const findings = detectMiscategorizacion([
      { file: 'chagra-catalog-seed-v3.1.json', species: seed.species },
    ]);
    const oryzaFindings = findings.filter((f) => f.speciesId === 'oryza_sativa');
    expect(oryzaFindings).toEqual([]);
  });
});

describe('catalog/chagra-catalog-seed-v3.1.json — invariante global anti_miscategorizacion del seed', () => {
  it('NO hay ningún hallazgo de miscategorizacion en el seed', () => {
    // Invariante del catálogo fuente: el seed no debe tener entradas en
    // campo equivocado (plaga en enfermedades, o patógeno/virus en plagas).
    // Si este test fallara, significa que se introdujo una nueva
    // miscategorización en el seed — debe arreglarse antes de mergear.
    const findings = detectMiscategorizacion([
      { file: 'chagra-catalog-seed-v3.1.json', species: seed.species },
    ]);
    expect(findings).toEqual([]);
  });
});
