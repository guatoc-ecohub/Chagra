#!/usr/bin/env node
/**
 * scripts/fix-age-establishment-means-nativas-2026-07-09.mjs
 *
 * Corrige `establishment_means` para 3 especies neotropicales nativas que el
 * grafo `chagra_kg` marca por error como `introducido`, CONTRADICIENDO su
 * propio campo `conservation_status: 'nativo_silvestre'` en el mismo
 * registro (verificado en public/grafo-relations.json y en
 * catalog/chagra-catalog-oss-subset-v3.2.json, 2026-07-09):
 *
 *   - cordia_alliodora        (Cordia alliodora)         — Nogal cafetero
 *   - tabebuia_rosea          (Tabebuia rosea)            — Guayacán rosado
 *   - enterolobium_cyclocarpum (Enterolobium cyclocarpum) — Orejero
 *
 * Fuente del hallazgo: Chagra-strategy/ops/AUDIT-RESTAURACION-GROUNDING-2026-07-09.md
 * (hallazgo #3, severidad media-alta). El error es contraproducente en
 * restauración: `restauracionFinca.js` heredaba `establishment_means` para
 * pintar el flag `nativo`, así que estas 3 nativas neotropicales excelentes
 * (nodrizas/dosel) se le mostraban al campesino como si fueran exóticas.
 *
 * Las 3 especies son nativas neotropicales ampliamente documentadas
 * (Cordia alliodora, Tabebuia rosea y Enterolobium cyclocarpum se distribuyen
 * naturalmente en bosque seco/húmedo tropical de Colombia — no son
 * introducidas de otro continente como sí lo son, por contraste, especies
 * genuinamente exóticas del catálogo como Gliricidia sepium o Coffea
 * arabica). El PR que acompaña este script corrige `restauracionFinca.js`
 * (flag `nativo`) y `public/grafo-relations.json` (export offline) en el
 * mismo commit; este script es el delta idempotente para replicar el mismo
 * fix contra el grafo AGE vivo (`chagra_kg`) cuando el operador decida
 * aplicarlo.
 *
 * Patrón MERGE...SET (memoria reference-age-ingest-mecanica-gotchas): usa
 * `emitNode()` de catalog-to-age.mjs, que hace
 * `MERGE (n:Species {id: <slug>}) SET n += {establishment_means: 'nativo'}`
 * — SET con `+=` solo TOCA el campo indicado, preserva el resto del nodo
 * (compatible_with, threat_status, etc.), y MERGE nunca duplica porque el
 * id ya existe en el grafo.
 *
 * Este script NO se conecta a postgres/AGE ni ejecuta nada contra el grafo
 * de producción — solo imprime (o escribe con --out) el .sql idempotente
 * para revisión humana, igual que el resto de los loaders de scripts/.
 *
 * Uso:
 *   node scripts/fix-age-establishment-means-nativas-2026-07-09.mjs > fix.sql
 *   node scripts/fix-age-establishment-means-nativas-2026-07-09.mjs --out .local/fix.sql
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { emitNode, wrapCypher } from './catalog-to-age.mjs';

const GRAPH = 'chagra_kg';

/**
 * Las 3 especies a corregir. `establishment_means: 'nativo'` es el ÚNICO
 * campo que este delta toca — MERGE + `SET n +=` preserva todo lo demás del
 * nodo ya cargado en chagra_kg.
 */
export const FIXES = [
  { id: 'cordia_alliodora', nombre_comun: 'Nogal cafetero', establishment_means: 'nativo' },
  { id: 'tabebuia_rosea', nombre_comun: 'Guayacán rosado', establishment_means: 'nativo' },
  { id: 'enterolobium_cyclocarpum', nombre_comun: 'Orejero', establishment_means: 'nativo' },
];

/** Construye la lista de statements SQL (uno MERGE...SET por especie). */
export function buildStatements() {
  return FIXES.map((f) => wrapCypher(GRAPH, emitNode('Species', {
    id: f.id,
    establishment_means: f.establishment_means,
  })));
}

function buildSql() {
  const header = [
    '-- fix-age-establishment-means-nativas-2026-07-09',
    '-- Delta idempotente (MERGE...SET, NUNCA CREATE / ON CREATE) que corrige',
    "-- establishment_means: 'introducido' -> 'nativo' para 3 especies neotropicales",
    '-- nativas mal marcadas (contradecian su propio conservation_status).',
    '-- Fuente: Chagra-strategy/ops/AUDIT-RESTAURACION-GROUNDING-2026-07-09.md (hallazgo #3).',
    '-- Generado por scripts/fix-age-establishment-means-nativas-2026-07-09.mjs',
    `-- Especies corregidas: ${FIXES.map((f) => f.id).join(', ')}`,
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
    process.stderr.write(`[fix-establishment-means] SQL -> ${argv[outIdx + 1]} (${FIXES.length} especies)\n`);
  } else {
    process.stdout.write(sql);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
