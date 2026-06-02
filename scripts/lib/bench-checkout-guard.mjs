/**
 * bench-checkout-guard.mjs — guarda ANTI-STALE para los benches.
 *
 * Motivación (2026-05-31, 3 incidentes): el bench corrió 3 veces sobre código
 * VIEJO (re-bench nocturno, auditoría, bench de la mañana) porque el checkout
 * estaba ATRÁS de origin/main. El "10% AH" resultante fue un ARTEFACTO del bug
 * stale (#1240 ausente: outputGuards inventaba inviabilidad por altitud nula),
 * NO una medición real de la curación. Un bench que corre código que el usuario
 * ya no ve no mide nada.
 *
 * Este módulo provee `assertCheckoutCurrent`, que ANTES de generar cualquier
 * respuesta:
 *   1) `git fetch origin` (silencioso) para conocer el verdadero origin/main.
 *   2) compara `HEAD` local vs `origin/<branch>`.
 *   3) si el HEAD local está ATRÁS (origin tiene commits que el local no):
 *        - si el working tree está LIMPIO y `autoPull` está activo → `git pull`.
 *        - si no → ABORTA con un error claro ("checkout stale, hacé git pull").
 *
 * El runner de git se INYECTA (`opts.git`) para que el test no toque el repo
 * real ni la red. Módulo PURO/testeable: no auto-ejecuta nada.
 *
 * @module bench-checkout-guard
 */
import { execSync } from 'node:child_process';

/**
 * Runner de git por defecto: ejecuta el comando en el repo y devuelve stdout
 * recortado. Lanza si git falla (el caller decide qué hacer con el throw).
 *
 * @param {string} cmd  comando git completo, p. ej. 'git rev-parse HEAD'.
 * @param {string} cwd  directorio del repo.
 * @returns {string}
 */
export function defaultGitRunner(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

/**
 * computeStaleDecision — lógica PURA de la guarda (sin efectos). Decide, a
 * partir de los hashes y el estado del working tree, qué acción tomar.
 *
 * Casos:
 *   - localHead === remoteHead            → 'current' (seguir).
 *   - remoteHead es ancestro del local    → 'ahead'   (local adelantado: seguir,
 *                                            p. ej. un branch de bench sin push).
 *   - local es ancestro del remoteHead    → 'behind'  (STALE): 'pull' si limpio y
 *                                            autoPull, si no 'abort'.
 *   - diverged (ninguno ancestro)         → 'abort'   (estado raro, no adivinar).
 *
 * @param {object} a
 * @param {string} a.localHead
 * @param {string} a.remoteHead
 * @param {boolean} a.localIsAncestorOfRemote  ¿local es ancestro de remote?
 * @param {boolean} a.remoteIsAncestorOfLocal  ¿remote es ancestro de local?
 * @param {boolean} a.workingTreeClean
 * @param {boolean} a.autoPull
 * @returns {{state:'current'|'ahead'|'behind'|'diverged', action:'continue'|'pull'|'abort', reason:string}}
 */
export function computeStaleDecision({
  localHead,
  remoteHead,
  localIsAncestorOfRemote,
  remoteIsAncestorOfLocal,
  workingTreeClean,
  autoPull,
}) {
  if (localHead && remoteHead && localHead === remoteHead) {
    return { state: 'current', action: 'continue', reason: 'HEAD local == origin (checkout current)' };
  }
  // Local adelantado respecto a origin (branch de bench sin push): no es stale.
  if (remoteIsAncestorOfLocal && !localIsAncestorOfRemote) {
    return { state: 'ahead', action: 'continue', reason: 'HEAD local adelantado a origin (no stale)' };
  }
  // Local ATRÁS de origin: STALE — origin tiene commits que el local no.
  if (localIsAncestorOfRemote && !remoteIsAncestorOfLocal) {
    if (workingTreeClean && autoPull) {
      return { state: 'behind', action: 'pull', reason: 'checkout stale → working tree limpio + autoPull: git pull' };
    }
    return {
      state: 'behind',
      action: 'abort',
      reason: workingTreeClean
        ? 'checkout STALE: HEAD local está ATRÁS de origin. Hacé `git pull` antes de benchear (autoPull desactivado).'
        : 'checkout STALE: HEAD local está ATRÁS de origin y el working tree tiene cambios. Commiteá/stasheá y hacé `git pull` antes de benchear.',
    };
  }
  // Divergencia (ramas distintas, rebase pendiente): no adivinar.
  return {
    state: 'diverged',
    action: 'abort',
    reason: 'checkout DIVERGIDO de origin (ni ancestro ni descendiente). Resolvé el git antes de benchear.',
  };
}

/**
 * assertCheckoutCurrent — guarda ANTI-STALE con efectos (fetch/pull/abort).
 * Llamala como PRIMER paso de `main()` en cualquier bench.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd=process.cwd()]   repo a verificar.
 * @param {string} [opts.branch='main']        rama remota de referencia.
 * @param {string} [opts.remote='origin']      nombre del remoto.
 * @param {boolean} [opts.autoPull=false]      si true y limpio, hace git pull en vez de abortar.
 * @param {boolean} [opts.skip=false]          BENCH_SKIP_STALE_GUARD: salta la guarda (debug).
 * @param {(cmd:string, cwd:string)=>string} [opts.git=defaultGitRunner]  runner inyectable.
 * @param {(msg:string)=>void} [opts.log=console.log]
 * @returns {{state:string, action:string, reason:string, localHead:string, remoteHead:string}}
 * @throws {Error} si el checkout está stale/divergido y no se pudo (o no se quiso) actualizar.
 */
export function assertCheckoutCurrent(opts = {}) {
  const {
    cwd = process.cwd(),
    branch = 'main',
    remote = 'origin',
    autoPull = false,
    skip = false,
    git = defaultGitRunner,
    log = console.log,
  } = opts;

  if (skip) {
    log('[anti-stale] BENCH_SKIP_STALE_GUARD activo — guarda SALTADA (no recomendado).');
    return { state: 'skipped', action: 'continue', reason: 'skip flag', localHead: '', remoteHead: '' };
  }

  const ref = `${remote}/${branch}`;

  // 1) fetch (best-effort: si no hay red, avisamos y seguimos con lo que haya).
  try {
    git(`git fetch ${remote} ${branch} --quiet`, cwd);
  } catch (err) {
    log(`[anti-stale] WARN: 'git fetch ${ref}' falló (${String(err.message).slice(0, 80)}). Comparando con el ${ref} en caché local.`);
  }

  // 2) leer hashes + relación de ancestría + estado del working tree.
  const localHead = git('git rev-parse HEAD', cwd);
  let remoteHead;
  try {
    remoteHead = git(`git rev-parse ${ref}`, cwd);
  } catch (err) {
    throw new Error(`[anti-stale] No pude resolver ${ref} (${String(err.message).slice(0, 80)}). ¿Existe el remoto/rama?`);
  }

  const isAncestor = (a, b) => {
    try {
      git(`git merge-base --is-ancestor ${a} ${b}`, cwd);
      return true;
    } catch {
      return false;
    }
  };
  const localIsAncestorOfRemote = isAncestor(localHead, remoteHead);
  const remoteIsAncestorOfLocal = isAncestor(remoteHead, localHead);

  let workingTreeClean = true;
  try {
    workingTreeClean = git('git status --porcelain', cwd).length === 0;
  } catch {
    workingTreeClean = false;
  }

  const decision = computeStaleDecision({
    localHead,
    remoteHead,
    localIsAncestorOfRemote,
    remoteIsAncestorOfLocal,
    workingTreeClean,
    autoPull,
  });

  log(
    `[anti-stale] HEAD=${localHead.slice(0, 7)} ${ref}=${remoteHead.slice(0, 7)} ` +
      `→ ${decision.state.toUpperCase()} (${decision.action})`,
  );

  if (decision.action === 'pull') {
    log(`[anti-stale] ${decision.reason}`);
    git(`git pull ${remote} ${branch} --ff-only`, cwd);
    const newHead = git('git rev-parse HEAD', cwd);
    log(`[anti-stale] git pull OK → HEAD ahora ${newHead.slice(0, 7)}`);
    return { ...decision, localHead: newHead, remoteHead };
  }

  if (decision.action === 'abort') {
    throw new Error(`[anti-stale] ${decision.reason}`);
  }

  log(`[anti-stale] ${decision.reason} — bench arranca sobre código current.`);
  return { ...decision, localHead, remoteHead };
}
