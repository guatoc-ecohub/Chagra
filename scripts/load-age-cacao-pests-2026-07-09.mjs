#!/usr/bin/env node
/**
 * scripts/load-age-cacao-pests-2026-07-09.mjs
 *
 * Loader offline-first (estilo `load-age-paramo-species-2026-07-09.mjs`) para
 * dos plagas reales del cacao (Theobroma cacao) en el grafo `chagra_kg`:
 *
 *   - Selenothrips rubrocinctus (trips de bandas rojas / "cacao thrips")
 *   - Carmenta foraseminis Eichlin, 1995 (perforador del fruto y semilla
 *     del cacao / "American cocoa pod borer")
 *
 * GROUNDING (obligatorio, sin inventar nada):
 *   Cada afirmación de este archivo (binomio, orden/familia, síntoma, daño,
 *   control/biocontrol) fue verificada 2026-07-09 contra OpenAlex
 *   (https://api.openalex.org, mailto=dev@guatoc.co, throttle 150-250ms,
 *   retry/backoff 1s/3s/8s en HTTP 503) y cruzada contra CrossRef
 *   (https://api.crossref.org) resolviendo el DOI de cada fuente citada.
 *   Los 6 DOIs con DOI real fueron confirmados HTTP 200 en ambas APIs con
 *   título coincidente; la única fuente sin DOI (Figueroa Medina et al. 2013,
 *   indexada en DOAJ) se cita por su OpenAlex Work ID, que sí resuelve.
 *   NINGÚN DOI ni Work ID de este archivo fue inventado — todos son los
 *   identificadores reales devueltos por las APIs (ver PR para el detalle
 *   de la verificación).
 *
 * IDENTIFICACIÓN DE NODOS EXISTENTES (para no duplicar — verificado contra
 * `catalog/chagra-kg-graph-snapshot.json` 2026-07-09):
 *   - El cacao YA existe como `Species {id: 'theobroma_cacao'}` (label
 *     "Cacao", `nombre_cientifico: 'Theobroma cacao L.'`).
 *   - AMBAS plagas YA existen como nodos `Pest` (`selenothrips_rubrocinctus`,
 *     `carmenta_foraseminis`, origen `mip-backlog-2026-06-04` / Agrosavia)
 *     y YA tienen arista `AFFECTS` hacia `theobroma_cacao`. Este script por
 *     lo tanto ENRIQUECE esos dos nodos (agrega `orden`, `familia`,
 *     `sintoma_clave`, `manejo_agroecologico` — campos que NO tenían) sin
 *     tocar ni sobrescribir los campos que ya traían (`fuente`, `confianza`,
 *     `nombre_comun`, `cultivos_afectados`, `practicas_culturales`,
 *     `quimico_ica_menor_tox`, etc.), y agrega los nodos `Source`
 *     académicos + aristas `REFERENCED_BY` de procedencia que antes no
 *     existían (la data previa citaba solo "Agrosavia" como texto libre,
 *     sin nodos de fuente verificables individualmente).
 *
 * Convenciones seguidas (mismas que el loader de páramo):
 *   - Id: `genus_species` snake_case vía `binomialSlug` (coincide con los
 *     ids ya cargados, confirmado arriba).
 *   - Nodos vía `MERGE ... SET n += {...}` (nunca `CREATE` / `ON CREATE`).
 *   - Aristas simples vía `emitRelUpsert` (MATCH+MERGE, importado de
 *     catalog-to-age.mjs). La arista `AFFECTS` lleva una propiedad
 *     (`fuente`) — AGE 1.5 NO persiste `SET r += {mapa}` sobre aristas
 *     (verificado empíricamente en 2026-07-06, ver
 *     load-age-frutales-tuberculos-fable-2026-07-06.mjs y
 *     load-age-paramo-species-2026-07-09.mjs), así que se usa el mismo
 *     helper local `emitRelUpsertScalar` (SET por-campo) para esa arista.
 *
 * Este script NO toca la base de datos: imprime a stdout (o `--out`) un SQL
 * idempotente. Ejecutarlo dos veces no duplica nada (todo MERGE). No se
 * ejecutó contra ningún grafo vivo — solo `node --check` + tests.
 *
 * Uso:
 *   node scripts/load-age-cacao-pests-2026-07-09.mjs > cacao-pests.sql
 *   node scripts/load-age-cacao-pests-2026-07-09.mjs --out .local/cacao-pests.sql
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { cypherLiteral, emitNode, emitRelUpsert, wrapCypher } from './catalog-to-age.mjs';

const GRAPH = 'chagra_kg';

/** Id del nodo Species de cacao ya existente en el catálogo/grafo. */
export const CACAO_SPECIES_ID = 'theobroma_cacao';

/**
 * MERGE de arista con propiedades por-campo (`SET r.k = v`), NO por-mapa.
 * Copiado de load-age-paramo-species-2026-07-09.mjs (ver nota de diseño ahí
 * sobre por qué AGE 1.5 exige SET por-campo en aristas).
 *
 * @param {{label:string,id:string}} from
 * @param {string} relType
 * @param {{label:string,id:string}} to
 * @param {Record<string, unknown>} [relProps]
 */
function emitRelUpsertScalar(from, relType, to, relProps = {}) {
  const sets = Object.entries(relProps)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `r.${k} = ${cypherLiteral(v)}`);
  const setClause = sets.length ? ` SET ${sets.join(', ')}` : '';
  return [
    `MATCH (a:${from.label} {id: ${cypherLiteral(from.id)}})`,
    `MATCH (b:${to.label} {id: ${cypherLiteral(to.id)}})`,
    `MERGE (a)-[r:${relType}]->(b)${setClause}`,
  ].join(' ');
}

/**
 * Convierte un binomio ("Carmenta foraseminis Eichlin, 1995") en un id-slug
 * `genus_species` (primeros dos tokens, sin autor/año, sin acentos).
 * Copiado de load-age-paramo-species-2026-07-09.mjs para mantener este
 * loader autocontenido.
 *
 * @param {string} binomio
 * @returns {string|null}
 */
export function binomialSlug(binomio) {
  const cleaned = String(binomio || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const tokens = cleaned.trim().split(/\s+/);
  const genus = (tokens[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  const epithetRaw = (tokens[1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const epithet = epithetRaw === 'sp' || epithetRaw === 'spp' ? '' : epithetRaw;
  if (!genus || !epithet) return null;
  return `${genus}_${epithet}`;
}

// ---------------------------------------------------------------------------
// Sources — verificadas 2026-07-09 vía OpenAlex (Work ID real) + CrossRef
// (DOI resuelve HTTP 200, título coincide). `doi: null` solo para la fuente
// que efectivamente no tiene DOI asignado (indexada en DOAJ, Work ID real).
// ---------------------------------------------------------------------------
export const SOURCES = [
  {
    id: 'denmark-wolfenbarger-1999-edis-selenothrips',
    tipo: 'ficha_extension',
    ano: 1999,
    tier: 'B',
    titulo: 'Redbanded Thrips, Selenothrips rubrocinctus (Giard) (Insects: Thysanoptera: Thripidae)',
    autores: 'Denmark, H.A. & Wolfenbarger, D.O.',
    institucion: 'EDIS — Univ. of Florida IFAS (Featured Creatures, EENY-099)',
    doi: '10.32473/edis-in256-1999',
    openalex_id: 'W3094358042',
  },
  {
    id: 'fennah-1965-ber-selenothrips-cacao',
    tipo: 'articulo_revista',
    ano: 1965,
    tier: 'A',
    titulo: 'The influence of environmental stress on the cacao tree in predetermining the feeding sites of cacao thrips, Selenothrips rubrocinctus (Giard), on leaves and pods',
    autores: 'Fennah, R.G.',
    institucion: 'Bulletin of Entomological Research',
    doi: '10.1017/s000748530005642x',
    openalex_id: 'W2012672469',
  },
  {
    id: 'callan-1943-ber-natural-enemies-selenothrips',
    tipo: 'articulo_revista',
    ano: 1943,
    tier: 'A',
    titulo: 'Natural Enemies of the Cacao Thrips',
    autores: 'Callan, E. McC.',
    institucion: 'Bulletin of Entomological Research',
    doi: '10.1017/s0007485300023828',
    openalex_id: 'W2144753643',
  },
  {
    id: 'callan-1975-biocontrol-termatophylidea-selenothrips',
    tipo: 'articulo_revista',
    ano: 1975,
    tier: 'A',
    titulo: 'Miridae of the genus Termatophylidea [Hemiptera] as predators of cacao thrips',
    autores: 'Callan, E. McC.',
    institucion: 'BioControl',
    doi: '10.1007/bf02371593',
    openalex_id: 'W2064620223',
  },
  {
    id: 'carabali-2018-agrosavia-manual-carmenta',
    tipo: 'manual_tecnico',
    ano: 2018,
    tier: 'A',
    titulo: 'Reconocimiento, daño y opciones de manejo de Carmenta foraseminis Eichlin (Lepidóptera: Sesiidae), perforador del fruto y semilla de cacao Theobroma cacao L. (Malvaceae)',
    autores: 'Carabalí Muñoz, A., Senejoa Lizcano, C.E. & Montes Prado, M.',
    institucion: 'Corporación Colombiana de Investigación Agropecuaria (Agrosavia)',
    doi: '10.21930/agrosavia.manual.7402599',
    openalex_id: 'W2932800349',
  },
  {
    id: 'arias-2025-afe-review-carmenta',
    tipo: 'articulo_revista',
    ano: 2025,
    tier: 'A',
    titulo: 'The American cocoa pod borer, Carmenta foraseminis, an emerging pest of cocoa: A review',
    autores: 'Arias, M., Ninnin, P., Ten Hoopen, G.M., Alvarado, J. et al.',
    institucion: 'Agricultural and Forest Entomology',
    doi: '10.1111/afe.12676',
    openalex_id: 'W4408385756',
  },
  {
    id: 'figueroa-2013-biocontrol-hongos-carmenta',
    tipo: 'articulo_revista',
    ano: 2013,
    tier: 'B',
    titulo: 'Efecto de las cepas nativas Paecilomyces sp. (Bainier) y Lecanicillium sp. (Zimm) en el control de Carmenta foraseminis Eichlin (Lepidoptera: Sesiidae) en cultivos de cacao (Theobroma cacao L.)',
    autores: 'Figueroa Medina, W., Ramírez Sulvarán, J.A. & Sigarroa-Rieche, A.K.',
    institucion: 'DOAJ (sin DOI asignado)',
    doi: null,
    openalex_id: 'W2170203959',
  },
  {
    id: 'guerra-2024-extractos-vegetales-carmenta',
    tipo: 'articulo_revista',
    ano: 2024,
    tier: 'A',
    titulo: 'Extracts of Azadirachta indica, Tagetes erecta and Jatropha curcas resin control the attack of Carmenta foraseminis on Theobroma cacao fruits',
    autores: 'Guerra Árevalo, H., Abanto-Rodríguez, C., Arévalo-Gardini, E. & Vásquez-Vela, A.L.M.',
    institucion: 'Revista Brasileira de Fruticultura',
    doi: '10.1590/0100-29452024100',
    openalex_id: 'W4394852572',
  },
];

// ---------------------------------------------------------------------------
// Pests — cada campo de texto (sintoma_clave, manejo_agroecologico) es
// paráfrasis directa de los abstracts/títulos verificados arriba, sin
// agregar ningún dato que no esté respaldado por al menos una fuente citada.
// ---------------------------------------------------------------------------
export const PESTS = [
  {
    id: binomialSlug('Selenothrips rubrocinctus'),
    binomio: 'Selenothrips rubrocinctus (Giard)',
    orden: 'Thysanoptera',
    familia: 'Thripidae',
    sintoma_clave: 'Trips de coloración con banda roja abdominal en las ninfas ("trips de bandas rojas"). En cacao se alimenta por punción-succión en el envés de hojas jóvenes y en la superficie de las mazorcas (frutos), concentrándose en tejido de menor edad fisiológica; el ataque es más frecuente en árboles con antecedente de crecimiento retardado y baja producción, y se intensifica en época húmeda (Fennah, 1965, Bull. Ent. Res.).',
    manejo_agroecologico: 'Enemigos naturales documentados en cacao (Trinidad): crisópidos (Chrysopidae), considerados los depredadores más importantes; trips depredadores del género Franklinothrips; y chinches Miridae del género Termatophylidea (T. maculata) que se alimentan de trips del cacao (Callan, 1943; Callan, 1975, BioControl). El parasitoide eulófido Dasyscapus parvipennis, introducido desde Ghana a Trinidad en 1935 y hoy establecido también en Puerto Rico y Jamaica, no mostró control económico demostrado (Callan, 1943).',
    affectsSourceId: 'fennah-1965-ber-selenothrips-cacao',
    sourceIds: [
      'denmark-wolfenbarger-1999-edis-selenothrips',
      'fennah-1965-ber-selenothrips-cacao',
      'callan-1943-ber-natural-enemies-selenothrips',
      'callan-1975-biocontrol-termatophylidea-selenothrips',
    ],
  },
  {
    id: binomialSlug('Carmenta foraseminis'),
    binomio: 'Carmenta foraseminis Eichlin, 1995',
    orden: 'Lepidoptera',
    familia: 'Sesiidae',
    sintoma_clave: 'Perforador del fruto y semilla de cacao: las larvas barrenan la mazorca (fruto) de Theobroma cacao y se alimentan de las almendras (semillas) y su pulpa, dejando orificios de entrada visibles en la cáscara. Descrita por primera vez en 1995 en Panamá, es una plaga emergente en la cuenca amazónica y el norte de Suramérica (Colombia, Perú, Brasil) que amenaza la sostenibilidad de la producción cacaotera regional (Carabalí et al., 2018, Agrosavia; Arias et al., 2025, Agric. Forest Entomol.).',
    manejo_agroecologico: 'Control biológico con hongos entomopatógenos nativos: cepas de Paecilomyces sp. y Lecanicillium sp. aisladas de suelo en Norte de Santander (Colombia) mostraron mortalidad de larvas dosis-dependiente por inmersión, con la cepa de Lecanicillium sp. requiriendo menor concentración de inóculo para igual efecto (Figueroa Medina et al., 2013). Extractos vegetales de nim (Azadirachta indica) y flor de muerto (Tagetes erecta), además de resina de piñón (Jatropha curcas), a concentraciones ≥40% controlan eficazmente el ataque de larvas en frutos de cacao (Guerra Árevalo et al., 2024, Rev. Bras. Frutic.).',
    affectsSourceId: 'carabali-2018-agrosavia-manual-carmenta',
    sourceIds: [
      'carabali-2018-agrosavia-manual-carmenta',
      'arias-2025-afe-review-carmenta',
      'figueroa-2013-biocontrol-hongos-carmenta',
      'guerra-2024-extractos-vegetales-carmenta',
    ],
  },
];

/** Construye la lista ordenada de statements SQL (nodos antes que aristas). */
export function buildStatements() {
  const stmts = [];

  // 1) Sources
  for (const src of SOURCES) {
    const { id, ...rest } = src;
    stmts.push(wrapCypher(GRAPH, emitNode('Source', { id, ...rest })));
  }

  // 2) Pests (+ REFERENCED_BY + AFFECTS hacia el cacao ya existente)
  for (const pest of PESTS) {
    if (!pest.id) {
      throw new Error(`No se pudo generar id-slug para: ${pest.binomio}`);
    }

    stmts.push(wrapCypher(GRAPH, emitNode('Pest', {
      id: pest.id,
      nombre_cientifico: pest.binomio,
      orden: pest.orden,
      familia: pest.familia,
      sintoma_clave: pest.sintoma_clave,
      manejo_agroecologico: pest.manejo_agroecologico,
    })));

    // Pest → Source(s) (procedencia académica verificada)
    for (const sid of pest.sourceIds) {
      stmts.push(wrapCypher(GRAPH, emitRelUpsert(
        { label: 'Pest', id: pest.id },
        'REFERENCED_BY',
        { label: 'Source', id: sid },
      )));
    }

    // Pest → Species (cacao), con provenance por-campo en la arista.
    stmts.push(wrapCypher(GRAPH, emitRelUpsertScalar(
      { label: 'Pest', id: pest.id },
      'AFFECTS',
      { label: 'Species', id: CACAO_SPECIES_ID },
      { fuente: pest.affectsSourceId },
    )));
  }

  return stmts;
}

function buildSql() {
  const header = [
    '-- load-age-cacao-pests-2026-07-09',
    '-- Delta idempotente (MERGE-only) para 2 plagas reales del cacao',
    '-- (Selenothrips rubrocinctus, Carmenta foraseminis), groundeadas vía',
    '-- OpenAlex + CrossRef (2026-07-09). Enriquece los nodos Pest ya',
    '-- existentes (orden, familia, sintoma_clave, manejo_agroecologico) y',
    '-- agrega 8 nodos Source académicos + aristas REFERENCED_BY/AFFECTS.',
    '-- Generado por scripts/load-age-cacao-pests-2026-07-09.mjs',
    `-- Plagas: ${PESTS.length}, Sources: ${SOURCES.length}`,
    "LOAD 'age';",
    'SET search_path = ag_catalog, "$user", public;',
    '',
  ].join('\n');
  return `${header}\n${buildStatements().join('\n')}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const sql = buildSql();
  if (outIdx !== -1 && argv[outIdx + 1]) {
    const outPath = resolve(process.cwd(), argv[outIdx + 1]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, sql, 'utf8');
    process.stderr.write(`[cacao-pests] SQL → ${argv[outIdx + 1]} (${buildStatements().length} statements, ${PESTS.length} plagas, ${SOURCES.length} sources)\n`);
  } else {
    process.stdout.write(sql);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
