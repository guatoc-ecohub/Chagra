#!/usr/bin/env node
/**
 * scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs
 *
 * Loader offline-first para aristas de plagas/controladores de cultivos
 * objetivo de los próximos "mundos" de Fable (tubérculos + frutales) que HOY
 * quedaban sin aterrizar en el grafo `chagra_kg`:
 *
 *   - Batata / camote (Ipomoea batatas): NO tenía ninguna plaga en el grafo.
 *     Se agrega su plaga clave (picudo de la batata, Cylas formicarius) y su
 *     controlador biológico documentado (Beauveria bassiana).
 *   - Guayaba (Psidium guajava): faltaba SU plaga insignia en Colombia (el
 *     picudo de la guayaba, Conotrachelus psidii) y su control con nematodos
 *     entomopatógenos.
 *
 * El resto de los cultivos objetivo (papa, yuca, arracacha, ñame, naranja,
 * limón, mandarina, aguacate, mango, mora, lulo, tomate de árbol, papaya) ya
 * están grounded en el grafo; este delta sólo cierra los dos huecos reales.
 *
 * NO INVENTA: cada arista lleva `fuente` con cita real y cada nodo Pest queda
 * `REFERENCED_BY` a Sources con URL verificada (repositorios institucionales /
 * revistas). Si un dato no tenía fuente comprobable, se omitió.
 *
 * Este script NO toca la base de datos: imprime a stdout (o `--out`) un SQL
 * idempotente (`MATCH` + `MERGE` + `SET`, nunca `ON CREATE SET`) que ops aplica
 * contra AGE. Mismo patrón que scripts/load-age-milpa-associations.mjs.
 *
 * Uso:
 *   node scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs > delta.sql
 *   node scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs --out .local/frutales-tuberculos.sql
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cypherLiteral, emitNode, emitRelUpsert, wrapCypher } from './catalog-to-age.mjs';

const GRAPH = 'chagra_kg';

/**
 * MERGE de arista con propiedades por-campo (`SET r.k = v`).
 *
 * AGE 1.5 NO persiste `SET r += {mapa}` sobre aristas (queda `{}`), a diferencia
 * de los nodos. Para grabar la provenance (`fuente`) EN la arista usamos SET por
 * campo, que sí persiste. Verificado empíricamente contra chagra_kg (2026-07-06).
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

// ---------------------------------------------------------------------------
// Fuentes (Source) — todas con URL real verificada (WebFetch, 2026-07-06).
// ---------------------------------------------------------------------------
export const SOURCES = [
  {
    id: 'li-cylas-formicarius-review-2026',
    tipo: 'revision_cientifica',
    ano: 2026,
    tier: 'A',
    titulo: 'Recent Advances in Sustainable Management of Cylas formicarius',
    autores: 'Li Y., Ju H., Huang W., Ou B., Li H., Huang Y., Li Y., Chen T., Zheng X.-L., Hua J.',
    institucion: 'Insects (MDPI) 17(3):245',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13027346/',
  },
  {
    id: 'luz-alcala-cylas-beauveria-2012',
    tipo: 'articulo_revista',
    ano: 2012,
    tier: 'B',
    titulo:
      'Patogenicidad de Beauveria bassiana y Paecilomyces fumosoroseus sobre adultos del picudo de la batata Cylas formicarius elegantulus Summers (Curculionidae)',
    autores: 'Alcalá de Marcano D., Marcano J., Morales M.',
    institucion: 'Revista de la Facultad de Agronomía, Universidad del Zulia',
    url: 'https://www.produccioncientificaluz.org/index.php/agronomia/article/view/26238',
  },
  {
    id: 'unal-delgado-conotrachelus-nematodos-2012',
    tipo: 'tesis',
    ano: 2012,
    tier: 'A',
    titulo:
      'Control del picudo de la guayaba Conotrachelus psidii Marshall (Coleoptera: Curculionidae) con nematodos entomopatógenos',
    autores: 'Delgado Ochica, Clara Yalexy',
    institucion: 'Universidad Nacional de Colombia',
    url: 'https://repositorio.unal.edu.co/handle/unal/12109',
  },
  {
    id: 'agrosavia-mip-picudo-guayaba-santander',
    tipo: 'manual_tecnico',
    ano: null,
    tier: 'A',
    titulo:
      'Manejo integrado del picudo de la guayaba (Conotrachelus psidii Marshall) en Santander',
    autores: 'AGROSAVIA (Corpoica)',
    institucion: 'AGROSAVIA — Corporación Colombiana de Investigación Agropecuaria',
    url: 'https://redcol.minciencias.gov.co/Record/Agrosavia2_c70ed384746b15638fd7c1d1b174b515',
  },
];

// ---------------------------------------------------------------------------
// Plagas (Pest) nuevas.
// ---------------------------------------------------------------------------
export const PESTS = [
  {
    id: 'cylas_formicarius',
    nombre_comun: 'Picudo de la batata (gorgojo del camote)',
    nombre_cientifico: 'Cylas formicarius',
    categoria: 'pest',
    source_ids: ['li-cylas-formicarius-review-2026', 'luz-alcala-cylas-beauveria-2012'],
  },
  {
    id: 'conotrachelus_psidii',
    nombre_comun: 'Picudo de la guayaba',
    nombre_cientifico: 'Conotrachelus psidii Marshall',
    categoria: 'pest',
    source_ids: [
      'unal-delgado-conotrachelus-nematodos-2012',
      'agrosavia-mip-picudo-guayaba-santander',
    ],
  },
];

// ---------------------------------------------------------------------------
// Aristas Pest -[:AFFECTS]-> Species (plaga → cultivo).
// ---------------------------------------------------------------------------
export const AFFECTS = [
  {
    pest: 'cylas_formicarius',
    species: 'ipomoea_batatas',
    fuente:
      'Li et al. 2026 (Insects 17:245): Cylas formicarius es la plaga clave de Ipomoea batatas; la larva barrena la raíz tuberosa, 30-100% de pérdida.',
    species_source_ids: ['li-cylas-formicarius-review-2026'],
  },
  {
    pest: 'conotrachelus_psidii',
    species: 'psidium_guajava',
    fuente:
      'Delgado 2012 (UNAL) + AGROSAVIA MIP picudo de la guayaba (Santander): Conotrachelus psidii es la plaga principal de Psidium guajava en Colombia.',
    species_source_ids: [
      'agrosavia-mip-picudo-guayaba-santander',
      'unal-delgado-conotrachelus-nematodos-2012',
    ],
  },
];

// ---------------------------------------------------------------------------
// Aristas controlador -[:CONTROLS]-> Pest (control biológico documentado).
// El nodo controlador se elige por el label que YA tiene nombre_comun (así el
// export offline muestra un controlador legible).
// ---------------------------------------------------------------------------
export const CONTROLS = [
  {
    ctrl: { label: 'BeneficialOrganism', id: 'beauveria_bassiana' },
    pest: 'cylas_formicarius',
    fuente:
      'Alcalá de Marcano et al. 2012 (Rev. Fac. Agron. LUZ 16(1)): Beauveria bassiana patógena sobre adultos de Cylas formicarius elegantulus.',
  },
  {
    ctrl: { label: 'Biopreparado', id: 'heterorhabditis_bacteriophora' },
    pest: 'conotrachelus_psidii',
    fuente:
      'Delgado 2012 (UNAL): nematodos entomopatógenos (Heterorhabditis) controlan larvas de C. psidii (63-90% de mortalidad en L4).',
  },
  {
    ctrl: { label: 'Biopreparado', id: 'steinernema_carpocapsae' },
    pest: 'conotrachelus_psidii',
    fuente:
      'Delgado 2012 (UNAL): nematodos entomopatógenos (Steinernema) evaluados contra el picudo de la guayaba C. psidii.',
  },
];

// ---------------------------------------------------------------------------
// Fixups ortográficos de nodos existentes (restaurar la "ñ" perdida en el
// nombre de display de un cultivo objetivo). NO cambia semántica ni identidad,
// sólo corrige el nombre visible que consume el frontend.
// ---------------------------------------------------------------------------
export const NODE_FIXUPS = [
  { label: 'Species', id: 'dioscorea_alata', set: { nombre_comun: 'Ñame blanco' } },
];

/** Construye la lista ordenada de statements SQL (nodos antes que aristas). */
export function buildStatements() {
  const stmts = [];

  // 0) Fixups de nodos existentes (MERGE por id → SET de la propiedad).
  for (const fx of NODE_FIXUPS) {
    stmts.push(wrapCypher(GRAPH, emitNode(fx.label, { id: fx.id, ...fx.set })));
  }

  // 1) Sources
  for (const src of SOURCES) {
    const { id, ...rest } = src;
    stmts.push(wrapCypher(GRAPH, emitNode('Source', { id, ...rest })));
  }

  // 2) Pests (nodo) + REFERENCED_BY a sus fuentes
  for (const p of PESTS) {
    const { source_ids = [], ...node } = p;
    stmts.push(wrapCypher(GRAPH, emitNode('Pest', node)));
    for (const sid of source_ids) {
      stmts.push(
        wrapCypher(
          GRAPH,
          emitRelUpsert({ label: 'Pest', id: p.id }, 'REFERENCED_BY', { label: 'Source', id: sid }),
        ),
      );
    }
  }

  // 3) AFFECTS (plaga → cultivo) + REFERENCED_BY del cultivo a la fuente
  for (const a of AFFECTS) {
    stmts.push(
      wrapCypher(
        GRAPH,
        emitRelUpsertScalar({ label: 'Pest', id: a.pest }, 'AFFECTS', { label: 'Species', id: a.species }, {
          fuente: a.fuente,
          verificado_manual: true,
        }),
      ),
    );
    for (const sid of a.species_source_ids ?? []) {
      stmts.push(
        wrapCypher(
          GRAPH,
          emitRelUpsert({ label: 'Species', id: a.species }, 'REFERENCED_BY', {
            label: 'Source',
            id: sid,
          }),
        ),
      );
    }
  }

  // 4) CONTROLS (controlador → plaga)
  for (const c of CONTROLS) {
    stmts.push(
      wrapCypher(
        GRAPH,
        emitRelUpsertScalar(c.ctrl, 'CONTROLS', { label: 'Pest', id: c.pest }, { fuente: c.fuente }),
      ),
    );
  }

  return stmts;
}

function buildSql() {
  const header = [
    '-- load-age-frutales-tuberculos-fable-2026-07-06',
    '-- Delta idempotente (MERGE-only) para plagas/controladores de batata + guayaba.',
    '-- Generado por scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs',
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
    process.stderr.write(`[frutales-tuberculos] SQL → ${argv[outIdx + 1]} (${buildStatements().length} statements)\n`);
  } else {
    process.stdout.write(sql);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
