#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/build-sierra-pisos-datos.mjs
 * ====================================================================
 * Deriva `src/data/sierra-pisos-datos.json`, el archivo ESTÁTICO que
 * alimenta el panel de datos por piso térmico de la Sierra
 * (`VistaGlobalSierra`). Una sola fuente real por número, sin inventos:
 *
 *  · `catalogo_total`  → viene de `catalog/...-v3.2.json`
 *                        (`species[].thermal_zones`): cuántas especies
 *                        del catálogo se documentan creciendo en ese piso.
 *                        El total por los 4 pisos documentados suma las
 *                        581 especies del catálogo.
 *  · `representativos` → lista CURADA por piso de `public/grafo-relations.json`
 *                        (`_piso_termico.pisos[*].cultivos_representativos`
 *                        y `especies_nativas_representativas` para el
 *                        páramo; resueltos a `species[slug].nombre_comun`).
 *  · `grafo_rango`     → especies del grafo (`species[].altitud_min/max`)
 *                        cuyo rango toca el rango del piso (intersección).
 *  · `formacion`, `temperatura_media_c`, `notas` → del mismo `_piso_termico`.
 *
 * Pisos sin ninguna especie documentada (superpáramo y nival) quedan con
 * `con_dato: false` y total 0: el panel dirá "sin datos para este piso",
 * que es la verdad medida, no prosa.
 *
 * El archivo generado se COMMITEA. Un cambio en el catálogo o en el grafo
 * sin regenerar lo detecta `tests/unit/sierraPisosDatos.test.js` (fresca &&
 * invariantes) en el mismo `npx vitest run`.
 *
 * Uso
 * ---
 *   node scripts/build-sierra-pisos-datos.mjs          # escribe src/data/...
 *   node scripts/build-sierra-pisos-datos.mjs --dry    # imprime, no escribe
 * ====================================================================
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

export const DEFAULT_CATALOG_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
export const DEFAULT_GRAFO_PATH = join(ROOT, 'public/grafo-relations.json');
export const DEFAULT_OUTPUT_PATH = join(ROOT, 'src/data/sierra-pisos-datos.json');

/** Las 6 cotas de la Sierra tienen una entrada propia en `_piso_termico`. */
const ORDEN_PISOS = ['calido', 'templado', 'frio', 'paramo', 'superparamo', 'nival'];

/** Quita glifos ajenos al español (p. ej. CJK colados en la fuente) de un texto UI. */
export function sanearTextoUI(texto) {
  return String(texto ?? '')
    .replace(/[^\u0020-\u007E\u00A0-\u024F\u2010-\u2027\u2030-\u203E\u00AB\u00BB]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Conteo de especies del catálogo cuyo `thermal_zones` incluye `pisoId`. */
function contarCatalogoPorPiso(catalog, pisoId) {
  const species = Array.isArray(catalog?.species) ? catalog.species : [];
  let total = 0;
  for (const s of species) {
    if (Array.isArray(s.thermal_zones) && s.thermal_zones.includes(pisoId)) total += 1;
  }
  return total;
}

/** Especies del grafo (objeto slug → ficha) cuyo rango de altitud toca el rango del piso. */
function contarRangoGrafo(species, rango) {
  let total = 0;
  for (const x of Object.values(species || {})) {
    const { altitud_min: min, altitud_max: max } = x || {};
    if (typeof min !== 'number' || typeof max !== 'number') continue;
    if (Math.max(min, rango.min) <= Math.min(max, rango.max)) total += 1;
  }
  return total;
}

/**
 * Deriva el estado por piso térmico de la Sierra. PURA: sin disco, sin reloj.
 *
 * @param {object} catalog  catálogo canónico (`chagra-catalog-oss-subset-v3.2.json`)
 * @param {object} grafo    `public/grafo-relations.json`
 * @returns {{_fuente:object,_total_catalogo:number,pisos:Array<object>}}
 */
export function deriveSierraPisosDatos(catalog, grafo) {
  const grafoSpecies = grafo?.species || {};
  const pisosGrafo = Array.isArray(grafo?._piso_termico?.pisos) ? grafo._piso_termico.pisos : [];
  const porId = new Map(pisosGrafo.map((p) => [p.id, p]));

  const pisos = ORDEN_PISOS.map((id) => {
    const p = porId.get(id) || {
      id,
      altitud_m: { min: null, max: null },
      temperatura_media_c: { min: null, max: null },
    };
    const rango = p.altitud_m || { min: null, max: null };
    const catalogados = contarCatalogoPorPiso(catalog, id);
    const enRango = contarRangoGrafo(grafoSpecies, rango);

    const representativos = [];
    for (const slug of [...(p.cultivos_representativos || []), ...(p.especies_nativas_representativas || [])]) {
      const nombre = grafoSpecies[slug]?.nombre_comun || slug;
      if (!representativos.some((r) => r.id === slug)) {
        representativos.push({ id: slug, nombre });
      }
    }

    return {
      id,
      nombre: sanearTextoUI(p.nombre) || id,
      altitud_m: { min: rango.min, max: rango.max },
      temperatura_media_c: {
        min: p.temperatura_media_c?.min ?? null,
        max: p.temperatura_media_c?.max ?? null,
      },
      formacion: sanearTextoUI(p.formacion_vegetal_principal),
      catalogo_total: catalogados,
      grafo_rango: enRango,
      representativos,
      notas: sanearTextoUI(p.notas),
      con_dato: catalogados > 0 || representativos.length > 0,
    };
  });

  const catalogoSpecies = Array.isArray(catalog?.species) ? catalog.species : [];
  return {
    _fuente: {
      catalogo: 'catalog/chagra-catalog-oss-subset-v3.2.json → species[].thermal_zones (catalogo_total)',
      grafo: 'public/grafo-relations.json → _piso_termico.pisos (representativos/formacion/temperatura/notas) + species[].altitud (grafo_rango)',
    },
    _total_catalogo: catalogoSpecies.length,
    pisos,
  };
}

function main() {
  const dry = process.argv.includes('--dry');
  const catalog = JSON.parse(readFileSync(DEFAULT_CATALOG_PATH, 'utf8'));
  const grafo = JSON.parse(readFileSync(DEFAULT_GRAFO_PATH, 'utf8'));
  const datos = deriveSierraPisosDatos(catalog, grafo);
  const salida = { ...datos, _generado: new Date().toISOString() };

  if (dry) {
    console.log(`[sierra-pisos-datos] dry: total catálogo ${salida._total_catalogo}`);
    for (const p of salida.pisos) {
      console.log(`  ${p.id.padEnd(11)} dato=${p.con_dato} catálogo=${p.catalogo_total} grafo-rango=${p.grafo_rango} reps=${p.representativos.length}`);
    }
    return;
  }

  writeFileSync(DEFAULT_OUTPUT_PATH, `${JSON.stringify(salida, null, 2)}\n`, 'utf8');
  console.log(`[sierra-pisos-datos] escrito ${DEFAULT_OUTPUT_PATH} (${salida.pisos.length} pisos, ${salida._total_catalogo} especies en catálogo)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();