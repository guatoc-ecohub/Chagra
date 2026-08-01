/**
 * restauracionEspecies.grounding.test.js
 *
 * GROUNDING de src/data/restauracion-especies.json — la fuente que el LLM
 * REALMENTE inyecta en el prompt vía
 * restauracionDiagnostic.formatearGroundingRestauracion() (con la
 * instrucción "usa SOLO estas, NO inventes otras").
 *
 * Motivo (auditoría Chagra-strategy/ops/AUDIT-RESTAURACION-GROUNDING-2026-07-09.md):
 * `restauracionFinca.js` (mundo "bosque de alimentos") YA tenía este candado
 * — ver el bloque "GROUNDING" en RestauracionScreen.test.jsx, que cruza cada
 * id contra public/grafo-relations.json. Pero `restauracion-especies.json`
 * NO lo tenía: 23 de 31 especies eran binomios reales pero "colgados" (sin
 * respaldo del catálogo) — exactamente el hueco por donde se reabriría el
 * modo de falla histórico (memoria feedback-restauracion-grounding-fabrica-
 * especies) si alguien edita este archivo sin este test.
 *
 * Este test le aplica a restauracion-especies.json el MISMO candado: cada
 * entrada con campo `cientifico` (en especies_por_rol.*.* y en
 * invasoras_manejo) debe resolver, por binomio género+especie normalizado, a
 * una especie real de public/grafo-relations.json.
 *
 * Las 23 especies colgadas encontradas por la auditoría se resolvieron así
 * (ver PR que introduce este test):
 *   - 21 eran binomios reales y andinos/colombianos → se añadieron al
 *     catálogo (public/grafo-relations.json).
 *   - "Cassia fistula" (cañafístula) → exótica del subcontinente indio, NO
 *     fija nitrógeno (Caesalpinioideae) → se sacó del injector.
 *   - "Complejo Espeletia spp." → agregado de género sin epíteto específico
 *     (no es un binomio real sluggeable, mismo criterio que
 *     scripts/load-age-paramo-species-2026-07-09.mjs) → se sacó del injector.
 *   - "Pennisetum clandestinum" (kikuyo) → sinonimia: el nombre aceptado hoy
 *     es Cenchrus clandestinus → se corrigió el campo `cientifico`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import ESPECIES_DATA from '../../data/restauracion-especies.json';

// El grafo es el mismo que consume la app en runtime (public/grafo-relations).
// Se lee del disco para no acoplar el test a fetch ni a un import JSON.
const __dir = path.dirname(fileURLToPath(import.meta.url));
const grafoPath = path.resolve(__dir, '../../../public/grafo-relations.json');
const grafo = JSON.parse(fs.readFileSync(grafoPath, 'utf8'));
const species = grafo.species || {};

/**
 * Normaliza un binomio ("Cordia alliodora (Ruiz & Pav.) Oken") a
 * `genero_especie` en minúsculas, sin autor ni acentos — mismo criterio que
 * `binomialSlug()` de scripts/load-age-paramo-species-2026-07-09.mjs, para
 * poder cruzar el nombre científico de restauracion-especies.json (que no
 * trae id de catálogo) contra los slugs reales del grafo.
 */
function binomKey(nombreCientifico) {
  const cleaned = String(nombreCientifico || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const tokens = cleaned
    .trim()
    .split(/\s+/)
    .map((t) => t.toLowerCase().replace(/[^a-z]/g, ''));
  const [genus, epithet] = tokens;
  if (!genus || !epithet) return null;
  return `${genus}_${epithet}`;
}

const CATALOG_BINOMIOS = new Set(
  Object.values(species)
    .map((sp) => binomKey(sp.nombre_cientifico))
    .filter(Boolean),
);

/** Junta todas las entradas con `cientifico` de restauracion-especies.json. */
function todasLasEntradas() {
  const entradas = [];
  const roles = ESPECIES_DATA.especies_por_rol || {};
  for (const [piso, grupos] of Object.entries(roles)) {
    for (const [rol, arr] of Object.entries(grupos || {})) {
      for (const e of arr || []) entradas.push({ piso, rol, ...e });
    }
  }
  for (const e of ESPECIES_DATA.invasoras_manejo || []) {
    entradas.push({ piso: null, rol: 'invasora', ...e });
  }
  return entradas;
}

describe('restauracion-especies.json — grounding contra el catálogo (anti-fabricación)', () => {
  const entradas = todasLasEntradas();

  it('el archivo tiene contenido (no quedó vacío por un error de edición)', () => {
    expect(entradas.length).toBeGreaterThan(10);
  });

  it('cada entrada trae un binomio de 2+ tokens (nada de "Complejo X spp.")', () => {
    for (const e of entradas) {
      expect(
        binomKey(e.cientifico),
        `binomio no-parseable (¿solo género, sin epíteto?): ${e.nombre} (${e.cientifico})`,
      ).toBeTruthy();
    }
  });

  it('cada especie referida EXISTE en el catálogo (public/grafo-relations.json) — 0 colgadas', () => {
    const colgadas = entradas.filter((e) => !CATALOG_BINOMIOS.has(binomKey(e.cientifico)));
    const detalle = colgadas
      .map((e) => `${e.nombre} (${e.cientifico}) [${e.piso ?? 'invasora'}/${e.rol}]`)
      .join('; ');
    expect(colgadas, `especies sin respaldo del catálogo: ${detalle}`).toHaveLength(0);
  });

  it('Cassia fistula (cañafístula, exótica del subcontinente indio) NO está en las recomendaciones', () => {
    const presente = entradas.some((e) => binomKey(e.cientifico) === 'cassia_fistula');
    expect(presente, 'Cassia fistula debe estar fuera del injector (hallazgo #1 de la auditoría)').toBe(false);
  });
});
