/**
 * bench/lib/registry.mjs - carga y consulta del registro de benches/suites.
 *
 * El registro vive en `bench/index.json` (UNICA fuente de verdad). Describe,
 * para cada entrada:
 *   - id, titulo, tipo (bench-llm | bench-latencia | meta | test-suite)
 *   - script: path relativo al repo
 *   - cmd: como correrlo (array argv para `node`, o null si no es ejecutable directo)
 *   - infra: dependencias (gpu, ollama, sidecar, anthropic-key, claude-cli, fixtures-privadas)
 *   - cluster: agrupacion logica (model-comparison, anti-hallucination, vision, rag, ...)
 *   - metrics: nombres de metricas que reporta (alineados con history METRIC_DIRECTION)
 *   - status: active | deprecated | meta
 *
 * Este modulo NO ejecuta nada - solo carga, valida y resuelve. `run.mjs` es
 * quien ejecuta. Asi el registro es testeable sin tocar procesos.
 *
 * @module bench/lib/registry
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path canonico del registro. */
export const INDEX_PATH = join(__dirname, '..', 'index.json');

/** Raiz del repo (bench/ esta un nivel debajo). */
export const REPO_ROOT = join(__dirname, '..', '..');

/** Tipos de entrada validos. */
export const ENTRY_TYPES = new Set([
  'bench-llm',
  'bench-latencia',
  'bench-vision',
  'meta',
  'test-suite',
]);

/** Etiquetas de infra reconocidas (para la columna "infra requerida"). */
export const KNOWN_INFRA = new Set([
  'gpu',
  'ollama',
  'sidecar',
  'anthropic-key',
  'claude-cli',
  'fixtures-privadas',
  'corpus',
  'farmos',
  'ninguna',
]);

/**
 * loadIndex - lee y parsea bench/index.json.
 *
 * @param {string} [path]
 * @returns {{version:number, entries:object[]}}
 */
export function loadIndex(path = INDEX_PATH) {
  if (!existsSync(path)) {
    throw new Error(`registry: no existe el indice en ${path}`);
  }
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('registry: index.json invalido (falta "entries" array).');
  }
  return data;
}

/**
 * validateEntry - valida una entrada del registro. Lanza con un mensaje claro
 * si algo falta. Logica PURA (no toca FS salvo si checkScript=true).
 *
 * @param {object} entry
 * @param {object} [opts]
 * @param {boolean} [opts.checkScript=false]  ademas verifica que el script exista.
 * @param {string} [opts.repoRoot=REPO_ROOT]
 * @returns {string[]} lista de problemas (vacia = OK).
 */
export function validateEntry(entry, { checkScript = false, repoRoot = REPO_ROOT } = {}) {
  const problems = [];
  if (!entry || typeof entry !== 'object') return ['entrada no es objeto'];
  if (!entry.id || typeof entry.id !== 'string') problems.push('falta id');
  if (!entry.title) problems.push(`[${entry.id}] falta title`);
  if (!ENTRY_TYPES.has(entry.type)) problems.push(`[${entry.id}] type invalido: ${entry.type}`);
  if (!entry.cluster) problems.push(`[${entry.id}] falta cluster`);
  if (!Array.isArray(entry.infra)) {
    problems.push(`[${entry.id}] infra debe ser array`);
  } else {
    for (const inf of entry.infra) {
      if (!KNOWN_INFRA.has(inf)) problems.push(`[${entry.id}] infra desconocida: ${inf}`);
    }
  }
  if (entry.type !== 'test-suite' && entry.type !== 'meta' && !entry.script) {
    problems.push(`[${entry.id}] falta script`);
  }
  if (checkScript && entry.script) {
    const p = join(repoRoot, entry.script);
    if (!existsSync(p)) problems.push(`[${entry.id}] script no existe: ${entry.script}`);
  }
  return problems;
}

/**
 * validateIndex - valida el registro completo: entradas + ids unicos.
 *
 * @param {object} index  salida de loadIndex.
 * @param {object} [opts]  pasado a validateEntry.
 * @returns {string[]} problemas (vacia = OK).
 */
export function validateIndex(index, opts = {}) {
  const problems = [];
  const seen = new Set();
  for (const entry of index.entries) {
    problems.push(...validateEntry(entry, opts));
    if (entry.id) {
      if (seen.has(entry.id)) problems.push(`id duplicado: ${entry.id}`);
      seen.add(entry.id);
    }
  }
  return problems;
}

/**
 * findEntry - resuelve una entrada por id exacto o por sufijo unico (atajo CLI).
 *
 * @param {object} index
 * @param {string} idOrAlias
 * @returns {object|null}
 */
export function findEntry(index, idOrAlias) {
  if (!idOrAlias) return null;
  const exact = index.entries.find((e) => e.id === idOrAlias);
  if (exact) return exact;
  // Atajo: match unico por substring (p. ej. "borde" -> "borde-alucinacion").
  const matches = index.entries.filter((e) => e.id.includes(idOrAlias));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * listEntries - entradas filtradas por tipo/cluster/status. Util para el indice.
 *
 * @param {object} index
 * @param {object} [filter]
 * @param {string} [filter.type]
 * @param {string} [filter.cluster]
 * @param {string} [filter.status]
 * @returns {object[]}
 */
export function listEntries(index, filter = {}) {
  return index.entries.filter((e) => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.cluster && e.cluster !== filter.cluster) return false;
    if (filter.status && e.status !== filter.status) return false;
    return true;
  });
}

/**
 * resolveCommand - arma el argv ejecutable de una entrada. Devuelve null si la
 * entrada no es ejecutable directamente (test-suite, meta sin cmd).
 *
 * Soporta placeholders en `cmd`:
 *   - `{{script}}` -> path absoluto del script.
 *
 * @param {object} entry
 * @param {string} [repoRoot=REPO_ROOT]
 * @returns {{argv:string[], cwd:string}|null}
 */
export function resolveCommand(entry, repoRoot = REPO_ROOT) {
  if (!entry || !Array.isArray(entry.cmd) || entry.cmd.length === 0) return null;
  const scriptAbs = entry.script ? join(repoRoot, entry.script) : '';
  const argv = entry.cmd.map((tok) => tok.replaceAll('{{script}}', scriptAbs));
  return { argv, cwd: repoRoot };
}
