#!/usr/bin/env node
/**
 * bench-rescore-claude-cli.mjs — re-puntúa un JSONL existente del bench
 * capabilities-A-vs-C con el juez `claude-code -p` (suscripción del operador).
 *
 * USO:
 *   JUDGE_PROVIDER=claude-cli \
 *   node scripts/bench-rescore-claude-cli.mjs \
 *     --jsonl data/bench-runs/capabilities-A-vs-C-<ts>.jsonl \
 *     --pool  data/bench-runs/capabilities-pool-2026-05-31.json
 *
 *   # Re-score solo config C:
 *   node scripts/bench-rescore-claude-cli.mjs \
 *     --jsonl <jsonl> --pool <pool> --configs C
 *
 * QUÉ HACE:
 *   1. Lee el JSONL ya generado (con respuestas A y/o C de granite3.1).
 *   2. Lee el pool para obtener must_include / red_flags / expects_abstention.
 *   3. Re-juzga SECUENCIALMENTE con claude-code -p en batches de BATCH_SIZE items
 *      (default 8) para minimizar spawns (límite alpha = 2 procesos TOTAL).
 *   4. Escribe un nuevo JSONL y summary con sufijo `.rescore-cli.<ts>`.
 *
 * RESTRICCIONES:
 *   - NUNCA lanza `claude-code` en paralelo.
 *   - No regenera respuestas (granite no se toca).
 *   - No requiere Anthropic API key — usa la suscripción vía `claude-code -p`.
 *
 * SEGURIDAD DE PROCESOS (alpha, Maxwell M6000):
 *   - BATCH_SIZE=8 → ~1-2 spawns totales para un pool de 66 prompts × 2 configs.
 *   - Hay 30s de sleep entre batches para evitar presión de memoria simultánea.
 */

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  makeClaudeCliJudgeCall,
  scoreAntiHallucBatch,
} from './lib/bench-scorer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────
function argVal(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return def;
}

const JSONL_FILE = argVal('--jsonl', process.env.JSONL || '');
const POOL_FILE = argVal('--pool', process.env.POOL || '');
const CONFIGS = argVal('--configs', 'A,C')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter((c) => c === 'A' || c === 'C');
const BATCH_SIZE = Number(argVal('--batch-size', process.env.BATCH_SIZE || '8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── aggregate helper (igual que el bench principal) ───────────────────────────
function aggregate(rows, config) {
  const byCap = {};
  let pass = 0;
  let judged = 0;
  let unjudged = 0;
  for (const r of rows) {
    const res = r.results[config];
    if (!res || res.error) continue;
    if (res.ah_source === 'unjudged') { unjudged += 1; continue; }
    judged += 1;
    byCap[r.cap] = byCap[r.cap] || { pass: 0, total: 0 };
    byCap[r.cap].total += 1;
    if (res.ah_pass) {
      pass += 1;
      byCap[r.cap].pass += 1;
    }
  }
  return { pass, judged, unjudged, ah_pct: judged > 0 ? Number(((100 * pass) / judged).toFixed(1)) : 0, byCap };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!JSONL_FILE || !existsSync(JSONL_FILE)) {
    console.error(`FATAL: JSONL no encontrado. Pasá --jsonl <archivo>. (recibido: '${JSONL_FILE}')`);
    process.exit(1);
  }
  if (!POOL_FILE || !existsSync(POOL_FILE)) {
    console.error(`FATAL: pool no encontrado. Pasá --pool <archivo>. (recibido: '${POOL_FILE}')`);
    process.exit(1);
  }

  const pool = JSON.parse(readFileSync(POOL_FILE, 'utf-8'));
  const promptsPool = pool.prompts || [];

  // Indexar pool por id para lookup rápido.
  const poolById = new Map(promptsPool.map((p) => [p.id, p]));

  // Leer JSONL existente.
  const rawLines = readFileSync(JSONL_FILE, 'utf-8').split('\n').filter((l) => l.trim());
  const rows = rawLines.map((l) => JSON.parse(l));

  console.log('[rescore] bench-rescore-claude-cli');
  console.log(`[rescore] JSONL:    ${JSONL_FILE}`);
  console.log(`[rescore] pool:     ${promptsPool.length} prompts`);
  console.log(`[rescore] rows:     ${rows.length}`);
  console.log(`[rescore] configs:  ${CONFIGS.join(', ')}`);
  console.log(`[rescore] batch:    ${BATCH_SIZE} items/llamada`);
  console.log('[rescore] juez:     claude-code -p (suscripción — SECUENCIAL)');

  // Fabricar el caller de juez (spawnImpl por defecto = spawnClaudeCode real).
  const judgeCall = makeClaudeCliJudgeCall({ timeoutMs: 600_000 });

  const t0 = performance.now();

  for (const config of CONFIGS) {
    console.log(`\n══ CONFIG ${config} ══`);

    // Construir los items a juzgar desde el JSONL + pool.
    const items = rows
      .map((row) => {
        const res = row.results?.[config];
        if (!res || res.error || !res.final_response) return null;
        const p = poolById.get(row.id);
        if (!p) return null;
        return {
          id: row.id,
          query: row.prompt,
          response: res.final_response,
          mustInclude: p.must_include || [],
          redFlags: p.red_flags || [],
        };
      })
      .filter(Boolean);

    console.log(`[rescore] items válidos config ${config}: ${items.length}`);

    // Procesar en batches secuenciales.
    let totalJudged = 0;
    let totalUnjudged = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batchTotal = Math.ceil(items.length / BATCH_SIZE);
      console.log(`  [batch ${batchNum}/${batchTotal}] items ${i + 1}-${Math.min(i + BATCH_SIZE, items.length)} — llamando claude-code -p…`);

      const batchStart = performance.now();
      const verdicts = await scoreAntiHallucBatch(batch, { judgeCall });
      const batchMs = performance.now() - batchStart;

      // Pegar veredictos de vuelta en rows.
      for (const v of verdicts) {
        const row = rows.find((r) => r.id === v.id);
        if (!row || !row.results[config]) continue;
        row.results[config].ah_pass = v.pass;
        row.results[config].ah_source = v.source;
        row.results[config].ah_must_covered = v.mustCovered;
        row.results[config].ah_must_total = v.mustTotal ?? row.results[config].ah_must_total;
        row.results[config].ah_red_flags_hit = v.redFlagsHit;
      }

      const judged = verdicts.filter((v) => v.source === 'judge').length;
      const unjudged = verdicts.filter((v) => v.source === 'unjudged').length;
      totalJudged += judged;
      totalUnjudged += unjudged;
      const passCount = verdicts.filter((v) => v.pass === true).length;
      console.log(`    → ${judged} juzgados (${passCount} PASS, ${judged - passCount} FAIL), ${unjudged} unjudged — ${(batchMs / 1000).toFixed(1)}s`);

      // Sleep entre batches para no presionar memoria (claude-code es pesado).
      if (i + BATCH_SIZE < items.length) {
        console.log('    [sleep] 30s antes del siguiente batch…');
        await sleep(30_000);
      }
    }

    console.log(`[rescore] config ${config}: ${totalJudged} juzgados, ${totalUnjudged} unjudged`);
  }

  const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);

  // ── escribir outputs ────────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = basename(JSONL_FILE, '.jsonl');
  const outDir = dirname(JSONL_FILE);
  const rescoreJsonlPath = join(outDir, `${base}.rescore-cli.${ts}.jsonl`);
  const rescoreSummaryPath = join(outDir, `${base}.rescore-cli.${ts}.summary.json`);

  writeFileSync(rescoreJsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

  // ── aggregar y mostrar tabla ────────────────────────────────────────────────
  const aggA = CONFIGS.includes('A') ? aggregate(rows, 'A') : null;
  const aggC = CONFIGS.includes('C') ? aggregate(rows, 'C') : null;

  const caps = [...new Set(rows.map((r) => r.cap).filter(Boolean))];
  const perCap = caps.map((cap) => {
    const a = aggA?.byCap[cap];
    const c = aggC?.byCap[cap];
    const aPct = a && a.total ? (100 * a.pass) / a.total : null;
    const cPct = c && c.total ? (100 * c.pass) / c.total : null;
    return {
      cap,
      A: a ? { pass: a.pass, total: a.total, pct: Number(aPct.toFixed(1)) } : null,
      C: c ? { pass: c.pass, total: c.total, pct: Number(cPct.toFixed(1)) } : null,
      lift_pp: aPct != null && cPct != null ? Number((cPct - aPct).toFixed(1)) : null,
    };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    source_jsonl: JSONL_FILE,
    pool: POOL_FILE,
    judge: { provider: 'claude-cli', model: 'claude-code-subscription', independent: true },
    configs: CONFIGS,
    batch_size: BATCH_SIZE,
    elapsed_sec: Number(elapsedSec),
    overall: { A: aggA, C: aggC },
    per_capability: perCap,
  };
  writeFileSync(rescoreSummaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('TABLA POR CAPACIDAD — juez: claude-code (suscripción)');
  console.log('cap                      A          C          lift');
  for (const r of perCap) {
    const a = r.A ? `${r.A.pass}/${r.A.total} ${String(r.A.pct).padStart(5)}%` : '      —  ';
    const c = r.C ? `${r.C.pass}/${r.C.total} ${String(r.C.pct).padStart(5)}%` : '      —  ';
    const lift = r.lift_pp != null ? `${r.lift_pp >= 0 ? '+' : ''}${r.lift_pp}pp` : '—';
    console.log(`${r.cap.padEnd(24)} ${a.padEnd(11)} ${c.padEnd(11)} ${lift}`);
  }
  console.log('──────────────────────────────────────────────────────────────────');
  if (aggA) console.log(`GLOBAL A: ${aggA.pass}/${aggA.judged} = ${aggA.ah_pct}% AH  (${aggA.unjudged} unjudged)`);
  if (aggC) console.log(`GLOBAL C: ${aggC.pass}/${aggC.judged} = ${aggC.ah_pct}% AH  (${aggC.unjudged} unjudged)`);
  if (aggA && aggC) console.log(`LIFT GLOBAL C−A: ${(aggC.ah_pct - aggA.ah_pct).toFixed(1)}pp`);
  console.log(`JSONL re-scoreado: ${rescoreJsonlPath}`);
  console.log(`SUMMARY:           ${rescoreSummaryPath}`);
  console.log(`Tiempo total:      ${elapsedSec}s`);
  console.log('══════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
