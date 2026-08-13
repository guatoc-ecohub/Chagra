// ── Guard graph-backed: consistencia de altitud/piso térmico contra el grafo ──
//
// Fix cross_thermal (bench-contaminacion.mjs midió 40% de contaminación,
// 6/15, 2026-07-10 — AUDIT-INJECTORS-GROUNDING-2026-07-09.md): los servicios
// de diagnóstico (`animalDiagnostic`, `restauracionDiagnostic`) recomendaban
// especies/forrajeras sin cruzar su piso térmico contra la altitud de la
// finca. La parte 1 del fix recorta candidatos en runtime
// (`forrajeraEnRangoAltitud` / bucket por `piso` ya existente); esta es la
// parte 2: un MEMBERSHIP TEST estático, graph-backed, que valida que los
// datos curados de `src/data/*.json` sean consistentes con el rango de
// altitud REAL de cada especie en el grafo de conocimiento `chagra_kg`
// (exportado offline en `public/grafo-relations.json`, enriquecido con
// altitud_min/altitud_max por `scripts/enrich-grafo-relations-altitud.mjs`).
//
// Mismo molde que `RestauracionScreen.test.jsx` (carga el grafo + assert de
// membresía) y `animalDiagnostic.test.js` ("grounding de forrajeras contra
// el catálogo"), pero para el dato de ALTITUD específicamente — atrapa un
// error de digitación/asignación de piso ANTES de que llegue a producción
// (p. ej. una forrajera cálida bucketeada como fría, o un altitud_min
// desalineado del grafo).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import ANIMAL_DATA from '../../data/animal-diagnostics.json';
import REST_ESPECIES from '../../data/restauracion-especies.json';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const grafoPath = path.resolve(__dir, '../../../public/grafo-relations.json');
const grafo = JSON.parse(readFileSync(grafoPath, 'utf8'));
const grafoSpecies = grafo.species || {};

/**
 * Banda nominal [min, max] msnm de un piso térmico de restauración, en el
 * mismo esquema que `pisoDesdeAltitud` (restauracionDiagnostic.js): calido
 * 0-1000, templado 1000-2000, frio 2000-3000, paramo 3000+.
 */
const PISO_BAND = {
  calido_0_1000: [0, 1000],
  templado_1000_2000: [1000, 2000],
  frio_2000_3000: [2000, 3000],
  paramo_3000: [3000, 6000],
};

/** Tolerancia (m) para el chequeo de overlap piso↔grafo: bandas de piso son
 * cortes duros de un continuo real, así que exigimos overlap dentro de un
 * margen generoso (no una pared exacta). */
const PISO_OVERLAP_MARGIN_M = 400;

/**
 * Primeras dos palabras alfabéticas de un binomio científico ("Gliricidia
 * sepium (Jacq.) Kunth" → "gliricidia sepium"), para matchear contra el
 * grafo tolerando autoría/variedad. Espejo simplificado de `_binomial()` en
 * outputGuards.js.
 */
function binomialKey(sci) {
  const cleaned = String(sci || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const m = cleaned.match(/^([a-z]+)\s+([a-z-]+)/);
  return m ? `${m[1]} ${m[2]}` : null;
}

/** Índice nombre_cientifico(binomio) → entrada del grafo, para matchear
 * restauracion-especies.json (que no trae id-slug, solo nombre+cientifico). */
const grafoByBinomial = new Map();
for (const [id, sp] of Object.entries(grafoSpecies)) {
  const key = binomialKey(sp.nombre_cientifico);
  if (key && !grafoByBinomial.has(key)) grafoByBinomial.set(key, { id, ...sp });
}

describe('animalDiagnostic — altitud_min/altitud_max consistente con el grafo (chagra_kg)', () => {
  const botanicas = ANIMAL_DATA.forrajeras.filter((f) => f.id_catalogo);

  it('toda forrajera botánica CON altitud declarada coincide con el grafo (misma fuente, 2026-07-10)', () => {
    let checked = 0;
    for (const f of botanicas) {
      const sp = grafoSpecies[f.id_catalogo];
      if (!sp || typeof sp.altitud_min !== 'number' || typeof sp.altitud_max !== 'number') continue;
      if (typeof f.altitud_min !== 'number' || typeof f.altitud_max !== 'number') continue;
      checked += 1;
      expect(f.altitud_min, `${f.id}.altitud_min desalineado del grafo (${f.id_catalogo})`).toBe(sp.altitud_min);
      expect(f.altitud_max, `${f.id}.altitud_max desalineado del grafo (${f.id_catalogo})`).toBe(sp.altitud_max);
    }
    // Sanity: el test no debe degradar a no-op silencioso — al menos las 7
    // forrajeras botánicas enriquecidas (fix cross_thermal) deben cruzarse.
    expect(checked).toBeGreaterThanOrEqual(7);
  });

  it('ninguna forrajera botánica trae SOLO uno de los dos campos (min sin max o viceversa)', () => {
    for (const f of botanicas) {
      const hasMin = typeof f.altitud_min === 'number';
      const hasMax = typeof f.altitud_max === 'number';
      expect(hasMin, `${f.id}: altitud_max sin altitud_min`).toBe(hasMax);
    }
  });
});

describe('restauracionDiagnostic — piso térmico de especies_por_rol consistente con el grafo', () => {
  const buckets = Object.entries(REST_ESPECIES.especies_por_rol);

  it('cada especie con match en el grafo tiene overlap real con la banda de su piso (± margen)', () => {
    let checked = 0;
    let skippedNoGraphMatch = 0;
    for (const [piso, roles] of buckets) {
      const [bandMin, bandMax] = PISO_BAND[piso] || [];
      expect(PISO_BAND[piso], `piso desconocido en PISO_BAND: ${piso}`).toBeTruthy();
      for (const [, especies] of Object.entries(roles)) {
        for (const especie of especies) {
          const key = binomialKey(especie.cientifico);
          const sp = key ? grafoByBinomial.get(key) : null;
          if (!sp || typeof sp.altitud_min !== 'number' || typeof sp.altitud_max !== 'number') {
            skippedNoGraphMatch += 1;
            continue;
          }
          checked += 1;
          // Overlap: [sp.altitud_min, sp.altitud_max] debe tocar
          // [bandMin-margen, bandMax+margen] — si el rango real de la
          // especie cae TOTALMENTE fuera de la banda de su piso (incluso
          // con margen), el bucket está mal asignado.
          const overlaps = sp.altitud_min <= bandMax + PISO_OVERLAP_MARGIN_M
            && sp.altitud_max >= bandMin - PISO_OVERLAP_MARGIN_M;
          expect(
            overlaps,
            `${especie.nombre} (${especie.cientifico}) bucketeada en piso "${piso}" ` +
              `[${bandMin}-${bandMax}msnm] pero el grafo dice [${sp.altitud_min}-${sp.altitud_max}msnm] — sin overlap.`,
          ).toBe(true);
        }
      }
    }
    // Documenta la cobertura real (honesto: la mayoría de restauracion-especies.json
    // aún no cruza contra el grafo — ver AUDIT-INJECTORS-GROUNDING-2026-07-09.md
    // hallazgo #2, 24/26 colgadas en el fallback roles_sucesion). Este test valida
    // lo que SÍ matchea; no afirma cobertura total.
    expect(checked + skippedNoGraphMatch).toBeGreaterThan(0);
  });
});
