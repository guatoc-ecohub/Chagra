#!/usr/bin/env node
/**
 * rejudge-borde-unjudged.mjs — re-juzga SOLO los records `unjudged` del bench
 * borde-alucinacion con el juez claude-cli (suscripción), parchea el JSONL en
 * sitio y reescribe el summary con el AH% real de los 12 prompts.
 *
 * NO regenera respuestas (granite no se toca). Juzga el `guarded_response` contra
 * must_include / red_flags del fixture — idéntico a bench-complejos-juez-independiente.
 *
 * USO:
 *   node scripts/rejudge-borde-unjudged.mjs \
 *     --jsonl  data/bench-runs/borde-alucinacion-2026-06-03.jsonl \
 *     --fixture "$CHAGRA_STRATEGY_DIR/deepresearch/TEST_PROMPTS_BORDE_ALUCINACION_2026-06-03.json"
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { makeClaudeCliJudgeCall, scoreAntiHallucBatch } from './lib/bench-scorer.mjs';

function argVal(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return def;
}

const JSONL_FILE = argVal('--jsonl', '');
const FIXTURE_FILE = argVal('--fixture', '');

function readJsonFileIfPresent(path, fallback = {}) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    if (err && err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function fail(msg) {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

async function main() {
  if (!JSONL_FILE || !existsSync(JSONL_FILE)) fail(`JSONL no encontrado: '${JSONL_FILE}'`);
  if (!FIXTURE_FILE || !existsSync(FIXTURE_FILE)) fail(`fixture no encontrado: '${FIXTURE_FILE}'`);

  const fixture = JSON.parse(readFileSync(FIXTURE_FILE, 'utf-8'));
  const promptsById = new Map((fixture.prompts || []).map((p) => [p.id, p]));

  const lines = readFileSync(JSONL_FILE, 'utf-8').split('\n').filter((l) => l.trim());
  const rows = lines.map((l) => JSON.parse(l));

  const unjudged = rows.filter((r) => r.judge && r.judge.source === 'unjudged');
  console.log(`[rejudge] rows totales:    ${rows.length}`);
  console.log(`[rejudge] unjudged a juzgar: ${unjudged.length} (${unjudged.map((r) => r.id).join(', ')})`);

  if (unjudged.length === 0) {
    console.log('[rejudge] nada unjudged — no-op.');
    return;
  }

  // Construir items para el juez: SE JUZGA guarded_response (igual que el generador).
  const items = unjudged.map((r) => {
    const p = promptsById.get(r.id);
    if (!p) fail(`prompt ${r.id} no está en el fixture`);
    return {
      id: r.id,
      query: r.prompt,
      response: r.guarded_response,
      mustInclude: p.must_include || [],
      redFlags: p.red_flags || [],
    };
  });

  const judgeCall = makeClaudeCliJudgeCall({ timeoutMs: 600_000 });
  console.log('[rejudge] juez: claude-code -p (suscripción, SECUENCIAL, 1 batch)');
  const verdicts = await scoreAntiHallucBatch(items, { judgeCall });

  const stillUnjudged = verdicts.filter((v) => v.source !== 'judge').map((v) => v.id);
  if (stillUnjudged.length > 0) {
    fail(`el juez claude-cli no produjo veredicto para: ${stillUnjudged.join(', ')}. ` +
      `NO se inventan scores — revisá claude-code -p / quota.`);
  }

  // Parchear cada row unjudged con su veredicto real.
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  for (const r of unjudged) {
    const v = byId.get(r.id);
    r.judge = { model: r.judge.model || 'claude-code-subscription', source: 'judge' };
    r.ah_pass = v.pass;
    r.ah_must_covered = v.mustCovered;
    r.ah_must_total = v.mustTotal ?? r.ah_must_total;
    r.ah_red_flags_hit = v.redFlagsHit;
    console.log(`  ${r.id}: ${v.pass ? 'PASS' : 'FAIL'}  must=${v.mustCovered}/${v.mustTotal}  red_flags_hit=${v.redFlagsHit}`);
  }

  // ── reescribir JSONL en sitio (orden preservado) ──
  writeFileSync(JSONL_FILE, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`[rejudge] JSONL actualizado: ${JSONL_FILE}`);

  // ── recomputar summary (misma forma que el existente) ──
  const judged = rows.filter((r) => r.judge && r.judge.source === 'judge');
  const pass = judged.filter((r) => r.ah_pass === true).length;
  const failCt = judged.filter((r) => r.ah_pass === false).length;
  const unjudgedCt = rows.filter((r) => !r.judge || r.judge.source === 'unjudged').length;
  const ahPct = judged.length > 0 ? Number(((100 * pass) / judged.length).toFixed(1)) : 0;

  const axisKey = (r) => (Array.isArray(r.axes) && r.axes.length ? r.axes[0] : 'sin_eje');
  const groupAgg = (keyFn) => {
    const out = {};
    for (const r of judged) {
      const k = keyFn(r);
      out[k] = out[k] || { pass: 0, total: 0 };
      out[k].total += 1;
      if (r.ah_pass === true) out[k].pass += 1;
    }
    for (const k of Object.keys(out)) {
      out[k].ah_pct = out[k].total ? Number(((100 * out[k].pass) / out[k].total).toFixed(1)) : 0;
    }
    return out;
  };

  const byAxis = groupAgg(axisKey);
  const byRegion = groupAgg((r) => r.region || 'sin_region');

  const failed = judged
    .filter((r) => r.ah_pass === false)
    .map((r) => ({
      id: r.id,
      axes: r.axes,
      red_flags_hit: r.ah_red_flags_hit,
      must: `${r.ah_must_covered}/${r.ah_must_total}`,
    }));

  const passed = judged
    .filter((r) => r.ah_pass === true)
    .map((r) => ({
      id: r.id,
      axes: r.axes,
      red_flags_hit: r.ah_red_flags_hit,
      must: `${r.ah_must_covered}/${r.ah_must_total}`,
  }));

  const summaryPath = JSONL_FILE.replace(/\.jsonl$/, '.summary.json');
  const prev = readJsonFileIfPresent(summaryPath, {});

  const summary = {
    ...prev,
    generated_at: new Date().toISOString(),
    rejudged_at: new Date().toISOString(),
    rejudged_ids: unjudged.map((r) => r.id),
    n_prompts: rows.length,
    pass,
    fail: failCt,
    unjudged: unjudgedCt,
    judged: judged.length,
    ah_pct: ahPct,
    by_axis: byAxis,
    by_region: byRegion,
    passed,
    failed,
    unjudged_ids: rows.filter((r) => !r.judge || r.judge.source === 'unjudged').map((r) => r.id),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(`[rejudge] SUMMARY actualizado: ${summaryPath}`);

  console.log('\n══════════════════════════════════════════════════');
  console.log(`AH% (${rows.length} prompts, juez claude-cli) = ${ahPct}%   PASS=${pass} FAIL=${failCt} UNJUDGED=${unjudgedCt}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
