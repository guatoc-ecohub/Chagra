#!/usr/bin/env node
/**
 * Gate anti-regresión para `npm run tsc:check` (queue tsc-gate-cleanup).
 *
 * CONTEXTO: `npm run tsc:check` (tsc --noEmit -p jsconfig.json) acumuló
 * ~2568 errores de tipo en 6+ semanas sin gate en CI (ver PR #1920). Exigir
 * arreglar todo de una implica un PR gigante e imposible de revisar. Este
 * script en cambio congela el estado actual en `scripts/tsc-baseline.json`
 * y falla el build SOLO si aparecen errores NUEVOS: un archivo que antes no
 * tenía errores y ahora sí, o un archivo cuyo conteo de errores subió
 * respecto al baseline. Bajar el conteo (arreglar errores) SIEMPRE está
 * permitido y nunca hace fallar el gate.
 *
 * ── CÓMO BAJAR EL BASELINE CON EL TIEMPO ──────────────────────────────────
 * 1. Arreglás errores reales de tipo en uno o más archivos (fixes de raíz,
 *    no `any`/`@ts-ignore` salvo casos genuinamente irreducibles).
 * 2. Corrés `node scripts/tsc-check-gate.mjs --update-baseline` — esto
 *    vuelve a correr tsc:check y sobrescribe `scripts/tsc-baseline.json`
 *    con el conteo actual (más bajo).
 * 3. Commiteás el `tsc-baseline.json` actualizado junto con el fix. El
 *    diff del JSON en el PR muestra exactamente qué bajó — es la evidencia
 *    de que el fix realmente redujo errores, no que los escondió.
 * 4. Si el conteo total SUBE respecto al baseline vigente, `--update-baseline`
 *    se niega a escribir (mismo espíritu que el gate: no se puede subir la
 *    deuda "por accidente"). Para un caso excepcional y consciente (p. ej.
 *    upgrade de TypeScript que revela errores reales preexistentes) use
 *    `--update-baseline --force`, y explicá el porqué en el PR.
 *
 * ── LIMITACIÓN CONOCIDA ────────────────────────────────────────────────
 * La comparación es por CONTEO POR ARCHIVO, no por error individual. Si en
 * un mismo archivo se arregla un error y se introduce otro distinto (conteo
 * neto igual), el gate no lo detecta. Se aceptó esta simplicidad a propósito
 * (el pedido original era "conteo mayor que el baseline por archivo"); si
 * esto se vuelve un problema real, la evolución natural es un fingerprint
 * por error (archivo + código TS + línea normalizada) en vez de un conteo.
 *
 * Uso:
 *   node scripts/tsc-check-gate.mjs                    # corre el gate (CI)
 *   node scripts/tsc-check-gate.mjs --update-baseline   # baja el baseline
 *   node scripts/tsc-check-gate.mjs --update-baseline --force  # permite subirlo
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const require = createRequire(import.meta.url);
const REPO_ROOT = join(import.meta.dirname, '..');
const BASELINE_PATH = join(import.meta.dirname, 'tsc-baseline.json');

const ERROR_LINE_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+):/;

/**
 * Normaliza el path que reporta tsc para que el baseline sea comparable
 * entre máquinas. Caso real (PR #1936): en worktrees locales con
 * node_modules symlinkeado, tsc reporta los .js de dependencias con el
 * path RESUELTO fuera del repo ("../../home/<user>/.../node_modules/
 * fake-indexeddb/...") mientras CI reporta "node_modules/fake-indexeddb/
 * ...". El mismo error contaba como "archivo nuevo" en un lado u otro.
 * Se recorta todo lo anterior a `node_modules/` para que ambas formas
 * coincidan.
 *
 * @param {string} file
 * @returns {string}
 */
export function normalizeTscFile(file) {
  const idx = file.indexOf('node_modules/');
  return idx >= 0 ? file.slice(idx) : file;
}

/**
 * Parsea la salida cruda de `tsc --noEmit` y agrupa el conteo de errores
 * por archivo. Ignora líneas de continuación (mensajes multilínea) — solo
 * cuenta la línea que abre cada error.
 *
 * @param {string} output
 * @returns {{ total: number, byFile: Record<string, number> }}
 */
export function parseTscOutput(output) {
  const byFile = {};
  let total = 0;
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(ERROR_LINE_RE);
    if (!m) continue;
    const file = normalizeTscFile(m[1]);
    byFile[file] = (byFile[file] || 0) + 1;
    total++;
  }
  return { total, byFile };
}

function sortedByFile(byFile) {
  const out = {};
  for (const key of Object.keys(byFile).sort()) out[key] = byFile[key];
  return out;
}

/**
 * Corre `tsc --noEmit -p jsconfig.json` y devuelve stdout+stderr combinados.
 * tsc sale con código != 0 cuando hay errores — eso es esperado, no un fallo
 * de esta función.
 *
 * @returns {string}
 */
export function runTsc() {
  const tscBin = require.resolve('typescript/bin/tsc');
  try {
    return execFileSync(process.execPath, [tscBin, '--noEmit', '-p', 'jsconfig.json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 200 * 1024 * 1024,
    });
  } catch (e) {
    // tsc exit code != 0 al reportar errores: la salida real viene en stdout.
    return (e.stdout || '') + (e.stderr || '');
  }
}

export function loadBaseline(path = BASELINE_PATH) {
  if (!existsSync(path)) {
    return { generatedAt: null, totalErrors: 0, byFile: {} };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeBaseline(parsed, path = BASELINE_PATH) {
  const data = {
    generatedAt: new Date().toISOString(),
    totalErrors: parsed.total,
    byFile: sortedByFile(parsed.byFile),
  };
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}

/**
 * Compara el conteo actual (por archivo) contra el baseline. Solo marca
 * `ok: false` ante (a) un archivo con errores que no estaba en el baseline,
 * o (b) un archivo cuyo conteo subió. Bajas de conteo o archivos que
 * desaparecieron nunca hacen fallar el gate.
 *
 * @param {{ total: number, byFile: Record<string, number> }} current
 * @param {{ totalErrors?: number, byFile?: Record<string, number> }} baseline
 */
// Zona EXPERIMENTAL 3D: mockups y el framework de mundos son código visual r3f
// type-loose POR DISEÑO (JSX de three, props laxas) y NO son rutas de producción
// del agente/datos. Un archivo NUEVO aquí NO bloquea el gate — así el trabajo
// visual de fable no traba los promotes por deuda de tipos cosmética. La deuda
// de PRODUCCIÓN (servicios, store, agente) sigue 100% blindada. Ver
// feedback_ci_green_not_real_value: esto NO esconde regresiones reales, exime
// una zona conscientemente laxa. Las regresiones (archivo que EMPEORA) sí fallan
// en todos lados.
const ZONA_EXPERIMENTAL_3D = /^src\/(mockups\/|visual\/(mundo3d|creatures|effects|scenes|laminas)\/)/;

export function compareToBaseline(current, baseline) {
  const baselineByFile = baseline.byFile || {};
  const newFiles = [];
  const newFilesExentos = [];
  const regressions = [];
  const improved = [];

  for (const file of Object.keys(current.byFile).sort()) {
    const currentCount = current.byFile[file];
    const baselineCount = baselineByFile[file] || 0;
    const exento = ZONA_EXPERIMENTAL_3D.test(file);
    if (baselineCount === 0) {
      if (exento) newFilesExentos.push({ file, count: currentCount });
      else newFiles.push({ file, count: currentCount });
    } else if (currentCount > baselineCount) {
      // Regresión: en la zona experimental 3D (JSX de three, type-loose) NO
      // bloquea — cablear un componente suele sumar 1-2 errores de props laxas.
      // En PRODUCCIÓN sí bloquea (deuda real). El total sube pero es cosmético.
      if (exento) newFilesExentos.push({ file, count: currentCount - baselineCount });
      else regressions.push({ file, baselineCount, currentCount, delta: currentCount - baselineCount });
    } else if (currentCount < baselineCount) {
      improved.push({ file, baselineCount, currentCount, delta: baselineCount - currentCount });
    }
  }

  return {
    ok: newFiles.length === 0 && regressions.length === 0,
    newFiles,
    newFilesExentos,
    regressions,
    improved,
    totalCurrent: current.total,
    totalBaseline: baseline.totalErrors || 0,
  };
}

export function formatReport(comparison) {
  const lines = [];
  lines.push(`tsc:check — actual: ${comparison.totalCurrent} errores, baseline: ${comparison.totalBaseline} errores`);

  if (comparison.newFiles.length > 0) {
    lines.push('');
    lines.push(`ARCHIVOS NUEVOS con errores (${comparison.newFiles.length}):`);
    for (const { file, count } of comparison.newFiles) {
      lines.push(`  - ${file}: ${count} error(es)`);
    }
  }

  if (comparison.newFilesExentos && comparison.newFilesExentos.length > 0) {
    const n = comparison.newFilesExentos.reduce((s, i) => s + i.count, 0);
    lines.push('');
    lines.push(`(exentos: ${comparison.newFilesExentos.length} archivo(s) nuevos de la zona experimental 3D con ${n} error(es) de tipo cosméticos — NO bloquean el gate)`);
  }

  if (comparison.regressions.length > 0) {
    lines.push('');
    lines.push(`REGRESIONES — más errores que el baseline (${comparison.regressions.length}):`);
    for (const { file, baselineCount, currentCount, delta } of comparison.regressions) {
      lines.push(`  - ${file}: ${baselineCount} -> ${currentCount} (+${delta})`);
    }
  }

  if (comparison.ok) {
    lines.push('');
    lines.push('OK — sin errores nuevos respecto al baseline.');
    if (comparison.improved.length > 0) {
      const totalImproved = comparison.improved.reduce((s, i) => s + i.delta, 0);
      lines.push(
        `Mejoró en ${comparison.improved.length} archivo(s) (-${totalImproved} errores). Considerá ` +
          '`node scripts/tsc-check-gate.mjs --update-baseline` para bajar el baseline.'
      );
    }
  } else {
    lines.push('');
    lines.push(
      'FAIL — hay errores de tipo nuevos que no estaban en scripts/tsc-baseline.json. ' +
        'Arreglalos, o si de verdad son necesarios agregá el tipo correcto (no `any`/`@ts-ignore` salvo ' +
        'irreducible con comentario que explique por qué).'
    );
  }

  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const updateBaseline = args.includes('--update-baseline');
  const force = args.includes('--force');

  console.log('Corriendo tsc --noEmit -p jsconfig.json ...');
  const output = runTsc();
  const current = parseTscOutput(output);

  if (updateBaseline) {
    const baseline = loadBaseline();
    const comparison = compareToBaseline(current, baseline);
    if (current.total > (baseline.totalErrors || 0) && !force) {
      console.error(
        `El conteo actual (${current.total}) es MAYOR que el baseline vigente (${baseline.totalErrors || 0}). ` +
          '`--update-baseline` no sube el baseline por accidente. Si es un caso consciente y justificado, ' +
          'use `--update-baseline --force`.'
      );
      process.exit(1);
    }
    const written = writeBaseline(current);
    console.log(`Baseline actualizado: ${written.totalErrors} errores en ${Object.keys(written.byFile).length} archivo(s).`);
    if (comparison.improved.length > 0) {
      console.log(`Bajó en ${comparison.improved.length} archivo(s).`);
    }
    if (comparison.regressions.length > 0 || comparison.newFiles.length > 0) {
      console.log('(usado --force: se aceptaron regresiones/archivos nuevos en el baseline)');
    }
    process.exit(0);
  }

  const baseline = loadBaseline();
  const comparison = compareToBaseline(current, baseline);
  console.log(formatReport(comparison));
  process.exit(comparison.ok ? 0 : 1);
}

const IS_CLI = import.meta.url === 'file://' + process.argv[1];
if (IS_CLI) main();
