#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { getDbCmd } from './lib/db-cmd.mjs';

const DEFAULT_GRAPH = 'chagra_kg';

export function buildGraphParitySql(graph = DEFAULT_GRAPH) {
  const graphLiteral = String(graph).replace(/'/g, "''");
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT base_id::text, variety_id::text, relation::text, missing_id::text
FROM cypher('${graphLiteral}', $$
  MATCH (base:Species)
  MATCH (variety:Species)
  WHERE variety.id STARTS WITH base.id + '_'
  OPTIONAL MATCH (base)-[:TARGETS_PEST]->(basePest:Pest)
  WITH base, variety, collect(DISTINCT basePest.id) AS basePests
  OPTIONAL MATCH (variety)-[:TARGETS_PEST]->(varietyPest:Pest)
  WITH base, variety, basePests, collect(DISTINCT varietyPest.id) AS varietyPests
  UNWIND varietyPests AS pestId
  WITH base.id AS base_id, variety.id AS variety_id, 'TARGETS_PEST' AS relation, pestId AS missing_id, basePests
  WHERE pestId IS NOT NULL AND NOT pestId IN basePests
  RETURN base_id, variety_id, relation, missing_id
  UNION
  MATCH (base:Species)
  MATCH (variety:Species)
  WHERE variety.id STARTS WITH base.id + '_'
  OPTIONAL MATCH (base)-[:USED_AS_BIOPREPARADO]->(baseBio:Biopreparado)
  WITH base, variety, collect(DISTINCT baseBio.id) AS baseBios
  OPTIONAL MATCH (variety)-[:USED_AS_BIOPREPARADO]->(varietyBio:Biopreparado)
  WITH base, variety, baseBios, collect(DISTINCT varietyBio.id) AS varietyBios
  UNWIND varietyBios AS bioId
  WITH base.id AS base_id, variety.id AS variety_id, 'USED_AS_BIOPREPARADO' AS relation, bioId AS missing_id, baseBios
  WHERE bioId IS NOT NULL AND NOT bioId IN baseBios
  RETURN base_id, variety_id, relation, missing_id
  ORDER BY base_id, variety_id, relation, missing_id
$$) AS (base_id agtype, variety_id agtype, relation agtype, missing_id agtype);
`.trim();
}

function stripAgtype(value) {
  return String(value || '').trim().replace(/^"|"$/g, '');
}

export function parsePsqlRows(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(LOAD|SET|\(\d+ rows?\))$/.test(line))
    .map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split('|');
      return {
        base_id: stripAgtype(parts[0]),
        variety_id: stripAgtype(parts[1]),
        relation: stripAgtype(parts[2]),
        missing_id: stripAgtype(parts[3]),
      };
    })
    .filter((row) => row.base_id && row.variety_id && row.relation && row.missing_id);
}

export function formatGraphParityReport(rows) {
  const counts = rows.reduce((acc, row) => {
    acc[row.relation] = (acc[row.relation] || 0) + 1;
    return acc;
  }, {});
  const lines = [`Graph parity gaps: ${rows.length}`];
  for (const [relation, count] of Object.entries(counts).sort()) {
    lines.push(`- ${relation}: ${count}`);
  }
  for (const row of rows) {
    lines.push(`FAIL ${row.relation}: base=${row.base_id} variety=${row.variety_id} missing=${row.missing_id}`);
  }
  return lines.join('\n');
}

export function runPsql(sql, env = process.env) {
  const command = env.CHAGRA_AGE_PSQL_COMMAND;
  if (command) {
    return spawnSync(command, {
      input: sql,
      encoding: 'utf8',
      shell: true,
      env,
    });
  }
  const dbCmd = getDbCmd(env);
  return spawnSync(dbCmd.file, [...dbCmd.args, '-At', '-F', '\t'], {
    input: sql,
    encoding: 'utf8',
    env,
  });
}

export function parseArgs(argv) {
  const opts = { graph: DEFAULT_GRAPH };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--graph') opts.graph = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/validate-graph-parity.mjs [--graph chagra_kg]');
    console.log('Override command with CHAGRA_AGE_PSQL_COMMAND if needed.');
    return 0;
  }

  const sql = buildGraphParitySql(opts.graph);
  const result = runPsql(sql);
  if (result.error) {
    console.error(`Graph parity query failed: ${result.error.message}`);
    return 2;
  }
  if (result.status !== 0) {
    if (result.stderr) console.error(result.stderr.trim());
    return result.status || 2;
  }

  const rows = parsePsqlRows(result.stdout);
  const report = formatGraphParityReport(rows);
  const writer = rows.length ? console.error : console.log;
  writer(report);
  return rows.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error('[graph-parity] ' + e.message);
    process.exitCode = 2;
  }
}
