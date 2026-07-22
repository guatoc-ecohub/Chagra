#!/usr/bin/env node
/**
 * bench/run.mjs - PUNTO DE ENTRADA UNICO de los benches y suites de Chagra.
 *
 * Reemplaza el "cada bench se invoca distinto y nadie sabe cuales hay". Lee
 * `bench/index.json` (fuente de verdad) y `bench/history/*.json` (corridas
 * estandarizadas) para LISTAR, EJECUTAR y mostrar TENDENCIA.
 *
 *   node bench/run.mjs --list            lista benches + suites (que/infra/ultima/tendencia)
 *   node bench/run.mjs --history [id]    tendencia por bench y modelo (filtrable)
 *   node bench/run.mjs <id>              corre un bench/suite (id exacto o sufijo unico)
 *   node bench/run.mjs --all [--dry-run] corre todo lo ejecutable con su infra disponible
 *   node bench/run.mjs --regen-index     regenera bench/INDEX.md desde index.json
 *   node bench/run.mjs --check           valida el indice (ids unicos, scripts existen) + sync INDEX.md
 *
 * Logica pura (parseo de args, decision de infra, render) en funciones export.
 * Solo `main()` y `runEntry()` tienen efectos (spawn, write).
 *
 * @module bench/run
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadIndex,
  validateIndex,
  findEntry,
  resolveCommand,
  REPO_ROOT,
} from './lib/registry.mjs';
import {
  readHistory,
  summarizeAllTrends,
  trendArrow,
  latestRunFor,
} from './lib/history.mjs';
import { renderIndexMarkdown } from './lib/render-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_MD_PATH = join(__dirname, 'INDEX.md');

/**
 * parseArgs - parsea argv en una intencion. PURO.
 *
 * @param {string[]} argv  process.argv.slice(2)
 * @returns {{mode:string, target:string|null, dryRun:boolean, only:string|null}}
 */
export function parseArgs(argv) {
  const out = { mode: 'help', target: null, dryRun: false, only: null };
  const positional = [];
  for (const a of argv) {
    if (a === '--list' || a === '-l') out.mode = 'list';
    else if (a === '--history' || a === '-h') out.mode = 'history';
    else if (a === '--all' || a === '-a') out.mode = 'all';
    else if (a === '--regen-index') out.mode = 'regen';
    else if (a === '--check') out.mode = 'check';
    else if (a === '--dry-run' || a === '-n') out.dryRun = true;
    else if (a === '--help') out.mode = 'help';
    else if (a.startsWith('--only=')) out.only = a.slice('--only='.length);
    else if (!a.startsWith('-')) positional.push(a);
  }
  if (positional.length > 0) {
    if (out.mode === 'history') out.target = positional[0];
    else {
      out.mode = out.mode === 'all' ? 'all' : 'run';
      out.target = positional[0];
    }
  }
  return out;
}

/**
 * detectInfra - descubre que infra esta disponible AHORA. Best-effort, rapido.
 * Las comprobaciones de red usan timeouts cortos; si no hay nada, devuelve false
 * sin colgar. Inyectable para tests (probe).
 *
 * @param {object} [opts]
 * @param {(label:string)=>boolean} [opts.probe]  override por etiqueta (tests).
 * @returns {Object<string, boolean>}
 */
export function detectInfra({ probe } = {}) {
  const result = { ninguna: true, corpus: true };
  const check = (label, fn) => {
    if (probe) {
      result[label] = probe(label);
      return;
    }
    try {
      result[label] = fn();
    } catch {
      result[label] = false;
    }
  };
  check('ollama', () => {
    const r = spawnSync(
      'bash',
      ['-lc', 'curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null'],
      { stdio: 'ignore' },
    );
    return r.status === 0;
  });
  check('sidecar', () => {
    const r = spawnSync(
      'bash',
      ['-lc', 'curl -fsS --max-time 2 http://127.0.0.1:7880/healthz >/dev/null'],
      { stdio: 'ignore' },
    );
    return r.status === 0;
  });
  // GPU: si ollama esta arriba en alpha asumimos GPU; senal debil pero util.
  check('gpu', () => result.ollama === true);
  check('claude-cli', () => {
    const r = spawnSync('bash', ['-lc', 'command -v claude-code >/dev/null'], { stdio: 'ignore' });
    return r.status === 0;
  });
  check('anthropic-key', () => {
    if (process.env.ANTHROPIC_API_KEY) return true;
    return existsSync(join(process.env.HOME || '', '.config', 'chagra-anthropic-judge-key'));
  });
  check('fixtures-privadas', () => {
    // Ruta de fixtures privadas configurable por env; default relativo al HOME
    // del operador (no hardcodear el path absoluto de una máquina concreta).
    const dir = process.env.CHAGRA_FIXTURES_DIR
      || join(process.env.HOME || '', 'Workspace', 'Chagra-strategy', 'deepresearch');
    return existsSync(dir);
  });
  check('farmos', () => result.sidecar === true);
  check('age', () => {
    const r = spawnSync(
      'bash',
      ['-lc', 'sudo -n podman exec -i postgres-farm psql -U farmos -d chagra_kg -tAc "SELECT 1" >/dev/null 2>&1'],
      { stdio: 'ignore' },
    );
    return r.status === 0;
  });
  return result;
}

/**
 * missingInfra - devuelve la infra que le falta a una entrada. PURO.
 *
 * @param {object} entry
 * @param {Object<string,boolean>} available
 * @returns {string[]}
 */
export function missingInfra(entry, available) {
  return (entry.infra || []).filter((inf) => available[inf] !== true);
}

// ── Render de listas (puro-ish, escribe a un sink inyectable) ──

function printList(index, records, log = console.log) {
  log('');
  log('BENCHES Y SUITES DE CHAGRA  (fuente: bench/index.json)');
  log('='.repeat(70));
  const benches = index.entries.filter((e) => e.type !== 'test-suite');
  const suites = index.entries.filter((e) => e.type === 'test-suite');
  log('');
  log(`BENCHES (${benches.length}):`);
  for (const e of benches) {
    const last = latestRunFor(records, e.id);
    const lastTxt = last ? String(last.date).slice(0, 10) + (last.seed ? ' [semilla]' : '') : 'sin corridas';
    const tag = e.protected ? ' [NO ROMPER]' : '';
    log('');
    log(`  ${e.id}${tag}  (${e.cluster})`);
    log(`    ${e.title}`);
    log(`    infra: ${(e.infra || []).join(', ') || 'ninguna'}`);
    log(`    correr: ${e.manualCmd ? e.manualCmd : (e.cmd ? 'node bench/run.mjs ' + e.id : 'n/a')}`);
    log(`    ultima corrida: ${lastTxt}`);
  }
  log('');
  log(`SUITES DE TEST (${suites.length}):`);
  for (const e of suites) {
    log('');
    log(`  ${e.id}  (${e.cluster})`);
    log(`    ${e.title}`);
    log(`    correr: node bench/run.mjs ${e.id}`);
    if (e.ci) log(`    CI: ${e.ci}`);
  }
  log('');
  log('Tendencia: node bench/run.mjs --history    |    Detalle: bench/INDEX.md');
  log('');
}

function printHistory(records, target, log = console.log) {
  const filtered = target ? records.filter((r) => r.bench.includes(target)) : records;
  const series = summarizeAllTrends(filtered);
  log('');
  log('TENDENCIA DEL HISTORIAL' + (target ? ` (filtro: ${target})` : ''));
  log('='.repeat(70));
  if (series.length === 0) {
    log('  Sin registros en bench/history/. Corre un bench o agrega semillas.');
    log('');
    return;
  }
  for (const s of series) {
    log('');
    log(`  ${s.bench}  ::  ${s.model}   (n=${s.n} corridas)`);
    if (s.n < 2) {
      log('    (n<2: se necesita >=2 corridas para tendencia)');
      const m = s.trend.latest?.metrics || {};
      for (const [k, v] of Object.entries(m)) log(`      ${k}: ${v} (unica corrida)`);
      continue;
    }
    for (const [metric, info] of Object.entries(s.trend.metrics)) {
      const tot = info.totalDelta != null ? `, total ${info.totalDelta >= 0 ? '+' : ''}${info.totalDelta}` : '';
      log(`      ${metric}: ${info.previous} -> ${info.current}  ${trendArrow(info.verdict)}${tot}`);
    }
  }
  log('');
}

/**
 * runEntry - ejecuta UNA entrada (con efectos). Devuelve {status, skipped}.
 */
function runEntry(entry, available, { dryRun, log = console.log } = {}) {
  const cmd = resolveCommand(entry, REPO_ROOT);
  if (!cmd) {
    log(`  [SKIP] ${entry.id}: no ejecutable directo (${entry.manualCmd ? 'usar: ' + entry.manualCmd : 'meta/manual'}).`);
    return { status: 'skip', reason: 'no-cmd' };
  }
  const missing = missingInfra(entry, available);
  if (missing.length > 0) {
    log(`  [SKIP] ${entry.id}: falta infra -> ${missing.join(', ')}`);
    return { status: 'skip', reason: 'infra', missing };
  }
  log(`  [RUN ] ${entry.id}: ${cmd.argv.join(' ')}`);
  if (dryRun) return { status: 'dry', argv: cmd.argv };
  const r = spawnSync(cmd.argv[0], cmd.argv.slice(1), {
    cwd: cmd.cwd,
    stdio: 'inherit',
    env: process.env,
  });
  const ok = r.status === 0;
  log(`  [${ok ? 'OK  ' : 'FAIL'}] ${entry.id} (exit ${r.status})`);
  return { status: ok ? 'ok' : 'fail', exit: r.status };
}

function printHelp(log = console.log) {
  log(`bench/run.mjs - punto de entrada unico de benches y suites de Chagra

  node bench/run.mjs --list             lista todo (benches + suites)
  node bench/run.mjs --history [id]     tendencia por bench y modelo
  node bench/run.mjs <id>               corre un bench/suite (id o sufijo unico)
  node bench/run.mjs --all [--dry-run]  corre todo lo ejecutable con infra disponible
  node bench/run.mjs --regen-index      regenera bench/INDEX.md desde index.json
  node bench/run.mjs --check            valida el indice + verifica INDEX.md sincronizado

Ejemplos:
  node bench/run.mjs rag-retrieve       corre solo el bench de latencia RAG
  node bench/run.mjs --history borde    tendencia del bench borde-alucinacion
  node bench/run.mjs --all --dry-run    muestra que correria sin ejecutar
`);
}

/**
 * main - orquesta segun los args. Con efectos.
 */
export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const index = loadIndex();
  const records = readHistory();

  if (args.mode === 'help') {
    printHelp();
    return 0;
  }

  if (args.mode === 'check') {
    const problems = validateIndex(index, { checkScript: true });
    if (problems.length > 0) {
      console.error('INDICE INVALIDO:');
      for (const p of problems) console.error('  - ' + p);
      return 2;
    }
    const expected = renderIndexMarkdown(index, []);
    const actual = existsSync(INDEX_MD_PATH) ? readFileSync(INDEX_MD_PATH, 'utf-8') : '';
    if (normalizeMd(expected) !== normalizeMd(actual)) {
      console.error('INDEX.md DESINCRONIZADO con index.json. Corre: node bench/run.mjs --regen-index');
      return 3;
    }
    console.log('OK: indice valido + INDEX.md sincronizado.');
    return 0;
  }

  if (args.mode === 'regen') {
    const md = renderIndexMarkdown(index, []);
    writeFileSync(INDEX_MD_PATH, md, 'utf-8');
    console.log(`INDEX.md regenerado (${index.entries.length} entradas).`);
    return 0;
  }

  if (args.mode === 'list') {
    printList(index, records);
    return 0;
  }

  if (args.mode === 'history') {
    printHistory(records, args.target);
    return 0;
  }

  const available = detectInfra();

  if (args.mode === 'all') {
    console.log('Corriendo TODO lo ejecutable con infra disponible...');
    console.log('Infra detectada: ' +
      Object.entries(available).filter(([, v]) => v).map(([k]) => k).join(', '));
    const results = [];
    for (const entry of index.entries) {
      if (entry.type === 'test-suite' && entry.id !== 'suite-bench-framework') {
        // Por defecto --all no dispara las suites pesadas (e2e/full); solo el
        // framework de bench, que es barato. Las demas se corren por id.
        if (entry.id !== args.only) continue;
      }
      results.push({ id: entry.id, ...runEntry(entry, available, { dryRun: args.dryRun }) });
    }
    const ok = results.filter((r) => r.status === 'ok').length;
    const fail = results.filter((r) => r.status === 'fail').length;
    const skip = results.filter((r) => r.status === 'skip').length;
    const dry = results.filter((r) => r.status === 'dry').length;
    console.log(`\nResumen: ${ok} ok, ${fail} fail, ${skip} skip` + (dry ? `, ${dry} dry-run` : ''));
    return fail > 0 ? 1 : 0;
  }

  if (args.mode === 'run') {
    const entry = findEntry(index, args.target);
    if (!entry) {
      console.error(`No encontre bench/suite "${args.target}". Lista: node bench/run.mjs --list`);
      return 2;
    }
    const r = runEntry(entry, available, { dryRun: args.dryRun });
    return r.status === 'fail' ? 1 : 0;
  }

  printHelp();
  return 0;
}

/** normalizeMd - normaliza saltos de linea finales para comparar INDEX.md. */
export function normalizeMd(s) {
  return String(s).replace(/\r\n/g, '\n').replace(/\n+$/, '\n');
}

// Auto-ejecucion solo si se corre como script (no en import de tests).
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (isMain) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error('[bench/run] FATAL:', err);
    process.exit(1);
  });
}
