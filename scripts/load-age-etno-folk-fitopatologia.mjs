#!/usr/bin/env node
/**
 * scripts/load-age-etno-folk-fitopatologia.mjs
 *
 * Runner idempotente para aplicar la ingesta folk fitopatología en AGE.
 * No inventa datos: ejecuta el SQL fuente curado (contenido que vive FUERA de
 * este repo; ruta por CHAGRA_AGE_ETNO_SQL o --sql) contra `chagra_kg`, pero
 * primero corre el preflight local para asegurar que el paquete es consistente.
 *
 * Por defecto usa el patrón del resto del repo:
 *   - si `CHAGRA_AGE_PSQL_COMMAND` está definido, lo usa tal cual
 *   - si no, arma `sudo podman exec -i <container> psql ...` desde CHAGRA_DB_*
 *
 * Requiere:
 *   - acceso al host donde corre el contenedor de base de datos
 *   - AGE disponible en `chagra_kg`
 *   - PGPASSWORD en el entorno si el comando lo necesita
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPreflightSummary } from './age-etno-preflight.mjs';
import { getDbCmd } from './lib/db-cmd.mjs';

const DEFAULT_SQL_PATH = process.env.CHAGRA_AGE_ETNO_SQL || '';

export function parseArgs(argv) {
  const opts = {
    sql: DEFAULT_SQL_PATH,
    dryRun: false,
    force: false,
    json: false,
    verify: true,
    preflightOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sql') opts.sql = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-verify') opts.verify = false;
    else if (a === '--preflight-only') opts.preflightOnly = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

export function buildPsqlInvocation(env = process.env) {
  const override = env.CHAGRA_AGE_PSQL_COMMAND;
  if (override) {
    return { kind: 'shell', command: override };
  }
  const dbCmd = getDbCmd(env);
  return {
    kind: 'podman',
    file: dbCmd.file,
    args: [...dbCmd.args, '-v', 'ON_ERROR_STOP=1', '-f', '-'],
  };
}

export function runSql(sql, env = process.env) {
  const inv = buildPsqlInvocation(env);
  if (inv.kind === 'shell') {
    return spawnSync(inv.command, {
      input: sql,
      encoding: 'utf8',
      shell: true,
      env,
    });
  }
  return spawnSync(inv.file, inv.args, {
    input: sql,
    encoding: 'utf8',
    env,
  });
}

export function buildVerificationSql(graph = 'chagra_kg') {
  return [
    "LOAD 'age';",
    'SET search_path = ag_catalog, "$user", public;',
    `SELECT count(*) AS folk_edges FROM cypher('${graph}', $$ MATCH (f:FolkSymptom)-[:FOLK_NAME_OF]->(p:Pest) RETURN f $$) AS (f agtype);`,
    `SELECT count(*) AS folk_nodes FROM cypher('${graph}', $$ MATCH (f:FolkSymptom) RETURN f $$) AS (f agtype);`,
    '',
  ].join('\n');
}

export function buildRunReport(summary, opts, env = process.env) {
  const inv = buildPsqlInvocation(env);
  const psqlCmd = inv.kind === 'shell' ? inv.command : `${inv.file} ${inv.args.join(' ')}`;
  const mode = opts.preflightOnly ? 'preflight-only'
    : opts.dryRun ? 'dry-run'
    : 'real-run';
  const verificationSql = opts.verify ? buildVerificationSql() : null;
  return {
    mode,
    sqlPath: resolve(process.cwd(), opts.sql),
    psqlCommand: psqlCmd,
    preflight: {
      ready: summary.ready,
      mappingCount: summary.mappingCount,
      uniqueLabelCount: summary.uniqueLabelCount,
      uniquePestCount: summary.uniquePestCount,
      missingLabels: summary.missingLabels,
      missingPests: summary.missingPests,
    },
    verify: opts.verify ? 'on' : 'off',
    verificationSql,
    force: opts.force,
  };
}

export function printRunReport(summary, opts, env = process.env) {
  const report = buildRunReport(summary, opts, env);
  const lines = [
    `[age-etno] mode=${report.mode}`,
    `[age-etno] sql=${report.sqlPath}`,
    `[age-etno] psql=${report.psqlCommand}`,
    `[age-etno] ready=${report.preflight.ready ? 'yes' : 'no'}`,
    `[age-etno] mappings=${report.preflight.mappingCount}`,
    `[age-etno] labels=${report.preflight.uniqueLabelCount}`,
    `[age-etno] pests=${report.preflight.uniquePestCount}`,
  ];
  if (report.preflight.missingLabels.length) {
    lines.push(`[age-etno] missing_labels=${report.preflight.missingLabels.join(',')}`);
  }
  if (report.preflight.missingPests.length) {
    lines.push(`[age-etno] missing_pests=${report.preflight.missingPests.join(',')}`);
  }
  lines.push(`[age-etno] verify=${report.verify}`);
  if (report.force) {
    lines.push('[age-etno] force=yes');
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/load-age-etno-folk-fitopatologia.mjs [--sql FILE] [--preflight-only] [--dry-run] [--force] [--no-verify] [--json]');
    return 0;
  }

  if (!opts.sql) {
    console.error('ERROR: falta el SQL fuente. Define CHAGRA_AGE_ETNO_SQL o pasa --sql FILE.');
    return 2;
  }

  if (!existsSync(resolve(process.cwd(), opts.sql))) {
    console.error(`ERROR: no existe el SQL: ${resolve(process.cwd(), opts.sql)}`);
    return 2;
  }

  const summary = buildPreflightSummary();
  if (opts.json) {
    console.log(JSON.stringify(buildRunReport(summary, opts, process.env), null, 2));
  } else {
    printRunReport(summary, opts, process.env);
  }

  if (!summary.ready && !opts.force) {
    console.error('[age-etno] ERROR: preflight fallo. Usa --force solo si sabes que quieres ejecutar igual.');
    return 2;
  }

  if (opts.preflightOnly) {
    return 0;
  }

  if (opts.dryRun) {
    if (opts.verify) {
      console.log('[age-etno] verification SQL (dry-run, no ejecutado):');
      console.log(buildVerificationSql());
    }
    return 0;
  }

  // Pipeamos el CONTENIDO del SQL (no `\i <ruta>`): psql corre DENTRO del
  // contenedor y una ruta del host no existiría en su filesystem.
  const sql = readFileSync(resolve(process.cwd(), opts.sql), 'utf8');
  const result = runSql(sql);
  if (result.error) {
    console.error(`ERROR ejecutando carga AGE: ${result.error.message}`);
    return 1;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0 && opts.verify) {
    const verifySql = buildVerificationSql();
    const verifyResult = runSql(verifySql);
    if (verifyResult.error) {
      console.error(`ERROR ejecutando verificación AGE: ${verifyResult.error.message}`);
      return 1;
    }
    if (verifyResult.stdout) process.stdout.write(verifyResult.stdout);
    if (verifyResult.stderr) process.stderr.write(verifyResult.stderr);
    return verifyResult.status ?? 0;
  }
  return result.status ?? 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error('[age-etno] ' + e.message);
    process.exitCode = 2;
  }
}
