#!/usr/bin/env node
/**
 * bench-borde-alucinacion.mjs — busca el BORDE de alucinación de granite3.1-dense:8b
 * a CONFIG-PROD, con JUEZ FUERTE INDEPENDIENTE (claude-cli, Claude Code subscription).
 *
 * Por qué existe (2026-06-03): el bench-agente-completo medía cobertura por
 * keywords y su juez corría sobre MOCK; bench-complejos usaba juez local roto en
 * Maxwell o el scorer determinístico (que no detecta alucinaciones semánticas).
 * Este script cierra el bucle de medición REAL:
 *
 *   GENERADOR (config-PROD = ROUTES.chat_complex de llmRouter):
 *     granite3.1-dense:8b, temp 0.3, seed fijo, max_tokens 768.
 *     Pipeline real: resolve-entities (AGE) → enriched system prompt →
 *     applyOutputGuards (guards deterministas de prod) → post-validate (sidecar).
 *
 *   JUEZ (fuerte, independiente, NO auto-eval):
 *     selectJudgeProvider('claude-cli') → Claude Code (-p) BATCH. No requiere
 *     API key (suscripción del operador). Métrica AH: PASS solo si TODOS los
 *     must_include cubiertos por FONDO Y CERO red_flags. SECUENCIAL (un solo
 *     claude-code a la vez — límite de alpha).
 *     Si claude-cli no está → degrada al scorer DETERMINÍSTICO (substring) y lo
 *     ANOTA en el summary (limitación explícita, no número inflado).
 *
 *   FIXTURE (prompts adversariales — el borde):
 *     deepresearch/TEST_PROMPTS_BORDE_ALUCINACION_2026-06-03.json (12 prompts):
 *     confusión tóxica (yuca brava→cianuro), homonimia misma-especie (lulo==
 *     naranjilla), dosis específicas de biopreparados, viabilidad por altitud en
 *     casos límite, precio+clima combinados, multi-hop, y trampas que TIENTAN al
 *     modelo a inventar dosis/agroquímicos/variedades.
 *
 * Output (persistible FUERA del worktree con BENCH_OUTPUT_DIR):
 *   <dir>/borde-alucinacion-YYYY-MM-DD.jsonl
 *   <dir>/borde-alucinacion-YYYY-MM-DD.summary.json
 *
 * Uso:
 *   node scripts/bench-borde-alucinacion.mjs                         # juez claude-cli (default)
 *   JUDGE_PROVIDER=deterministic node scripts/bench-borde-alucinacion.mjs   # sin GPU del juez
 *   BENCH_OUTPUT_DIR=/repo/data/bench-runs node scripts/bench-borde-alucinacion.mjs
 *   PROMPTS_FILE=/ruta/otra.json node scripts/bench-borde-alucinacion.mjs
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import {
  scoreAntiHallucBatch,
  scoreAntiHallucDeterministic,
  selectJudgeProvider,
} from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import { applyOutputGuards } from '../src/services/outputGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
// Default FUERA del repo/worktree (`_bench-results`): así un agente que corre el
// bench en su worktree efímero NO pierde el artefacto al borrarse el worktree, y no
// ensucia el árbol git. Override con BENCH_OUTPUT_DIR. Fallback a data/bench-runs
// (gitignored) solo si el dir externo no es escribible. (retro worktrees 2026-06-04)
const BENCH_EXTERNAL_DIR = '/home/kortux/Workspace/_bench-results';
const BENCH_RUNS_DIR =
  process.env.BENCH_OUTPUT_DIR ||
  (existsSync(dirname(BENCH_EXTERNAL_DIR)) ? BENCH_EXTERNAL_DIR : join(ROOT_DIR, 'data', 'bench-runs'));

// ── generador config-PROD (= ROUTES.chat_complex de llmRouter.js) ─────────────
const GEN_MODEL = process.env.GEN_MODEL || 'granite3.1-dense:8b';
const GEN_TEMPERATURE = 0.3; // PROD. NO 0.7.
const GEN_MAX_TOKENS = 768; // chat_complex
const SEED = Number(process.env.SEED || 42);

// ── juez fuerte: claude-cli por defecto; degrada a determinístico ─────────────
const JUDGE = selectJudgeProvider({
  provider: process.env.JUDGE_PROVIDER || 'claude-cli',
});

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat';
const GEN_TIMEOUT_MS = 180_000;

const PROMPTS_FILE =
  process.env.PROMPTS_FILE ||
  '/home/kortux/Workspace/Chagra-strategy/deepresearch/TEST_PROMPTS_BORDE_ALUCINACION_2026-06-03.json';

// Tamaño de lote para el juez claude-cli (un spawn por lote, secuencial).
const JUDGE_BATCH_SIZE = Number(process.env.JUDGE_BATCH_SIZE || 6);

const GPU_TEMP_LIMIT = 88;
const GPU_TEMP_RESUME = 75;

// ── helpers ───────────────────────────────────────────────────────────────────

function getSidecarToken() {
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf-8').trim();
  return process.env.SIDECAR_TOKEN || '';
}

function gpuTemp() {
  try {
    const out = execSync('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits', {
      encoding: 'utf-8',
      timeout: 8000,
    });
    const t = parseInt(out.trim().split('\n')[0], 10);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function thermalGuard() {
  let t = gpuTemp();
  if (t == null) return;
  while (t >= GPU_TEMP_LIMIT) {
    console.log(`  [thermal] GPU ${t}°C ≥ ${GPU_TEMP_LIMIT}°C — pausando 30s hasta ≤${GPU_TEMP_RESUME}°C`);
    await sleep(30_000);
    t = gpuTemp();
    if (t == null) return;
    if (t <= GPU_TEMP_RESUME) break;
  }
}

async function resolveEntities(userMessage) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${SIDECAR_URL}/resolve-entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { entities: [] };
    const data = await res.json();
    return { entities: data.entities || [] };
  } catch (err) {
    console.log(`    [resolve-entities] ${err.message.slice(0, 60)}`);
    return { entities: [] };
  }
}

async function postValidate(userMessage, response) {
  const token = getSidecarToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetch(`${SIDECAR_URL}/post-validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage, response }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { hallucinated: [], detected_count: 0, age_available: false };
    const data = await res.json();
    return {
      hallucinated: data.hallucinated || [],
      detected_count: data.detected_count || 0,
      age_available: Boolean(data.age_available),
    };
  } catch {
    return { hallucinated: [], detected_count: 0, age_available: false };
  }
}

function buildEnrichedSystemPrompt(entities) {
  const basePrompt = `Eres un asistente agroecológico experto para Colombia. Responde en español claro, práctico para agricultores.

Si mencionas entidades (especies, plagas, biopreparados), usa los nombres canónicos del catálogo Chagra para evitar alucinaciones.`;
  if (!entities || entities.length === 0) return basePrompt;
  const entityContext = entities
    .map((e) => {
      if (e.kind === 'species') return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})`;
      if (e.kind === 'pest') return `- ${e.mentioned} = plaga: ${e.nombre_cientifico || e.nombre_comun}`;
      if (e.kind === 'biopreparado') return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}`;
      return null;
    })
    .filter(Boolean)
    .join('\n');
  return `${basePrompt}

ENTIDADES DEL CATÁLOGO (usa estos nombres canónicos):
${entityContext}`;
}

async function generate(systemPrompt, userPrompt) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEN_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: GEN_TEMPERATURE, seed: SEED, num_predict: GEN_MAX_TOKENS },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`gen HTTP ${res.status}`);
    const data = await res.json();
    return { response: data.message?.content || '', latency_ms: performance.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  assertCheckoutCurrent({
    cwd: ROOT_DIR,
    autoPull: process.env.BENCH_AUTO_PULL === '1',
    skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
  });

  const fixture = JSON.parse(readFileSync(PROMPTS_FILE, 'utf-8'));
  const prompts = fixture.prompts || [];

  console.log('[bench-borde] BORDE de alucinación — generador config-prod + juez fuerte');
  console.log(`[bench-borde] generador: ${GEN_MODEL} temp=${GEN_TEMPERATURE} seed=${SEED} max_tokens=${GEN_MAX_TOKENS}`);
  console.log(`[bench-borde] juez:      ${JUDGE.judgeModel} (provider=${JUDGE.provider}, deterministic=${JUDGE.deterministic})`);
  console.log(`[bench-borde] fixture:   ${PROMPTS_FILE.split('/').pop()} (${prompts.length} prompts)`);
  console.log(`[bench-borde] output:    ${BENCH_RUNS_DIR}`);
  console.log(`[bench-borde] GPU temp inicial: ${gpuTemp() ?? 'n/d'}°C`);

  if (!existsSync(BENCH_RUNS_DIR)) mkdirSync(BENCH_RUNS_DIR, { recursive: true });

  // ── Fase 1: GENERAR todas las respuestas (granite) ──────────────────────────
  const generated = [];
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n[gen ${i + 1}/${prompts.length}] ${p.id} (${p.region}/${p.complexity}): ${p.prompt.slice(0, 56)}...`);
    await thermalGuard();

    const { entities } = await resolveEntities(p.prompt);
    const systemPrompt = buildEnrichedSystemPrompt(entities);

    let gen;
    try {
      gen = await generate(systemPrompt, p.prompt);
    } catch (err) {
      console.log(`    GEN ERROR: ${err.message}`);
      generated.push({ p, entities, error: err.message });
      continue;
    }

    const guarded = applyOutputGuards(gen.response, { resolvedEntities: entities, profileName: null, userMessage: p.prompt });
    const finalText = guarded.text;
    const validation = await postValidate(p.prompt, finalText);

    console.log(
      `    gen ${(gen.latency_ms / 1000).toFixed(1)}s  entities=${entities.length}  ` +
        `guards=${guarded.modified ? guarded.reasons.join(',') : 'none'}  sidecar_halluc=${validation.detected_count}`,
    );

    generated.push({ p, entities, gen, finalText, guarded, validation });
    await sleep(1500);
  }

  // ── Fase 2: JUZGAR (batch claude-cli, secuencial) ───────────────────────────
  const judgeItems = generated
    .filter((g) => !g.error)
    .map((g) => ({
      id: g.p.id,
      query: g.p.prompt,
      response: g.finalText,
      mustInclude: g.p.must_include,
      redFlags: g.p.red_flags,
      shouldInclude: g.p.should_include,
    }));

  const verdictById = new Map();
  if (JUDGE.deterministic) {
    console.log(`\n[bench-borde] juez DETERMINÍSTICO (sin claude-cli) — limitación: no detecta alucinación semántica fina.`);
    for (const it of judgeItems) {
      const v = scoreAntiHallucDeterministic(it);
      verdictById.set(it.id, { ...v, source: 'deterministic' });
    }
  } else {
    console.log(`\n[bench-borde] juzgando ${judgeItems.length} respuestas con ${JUDGE.judgeModel} en lotes de ${JUDGE_BATCH_SIZE} (secuencial)...`);
    for (let i = 0; i < judgeItems.length; i += JUDGE_BATCH_SIZE) {
      const batch = judgeItems.slice(i, i + JUDGE_BATCH_SIZE);
      const t0 = performance.now();
      const verdicts = await scoreAntiHallucBatch(batch, { judgeCall: JUDGE.judgeCall });
      console.log(`  lote ${i / JUDGE_BATCH_SIZE + 1}: ${batch.length} items en ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      for (const v of verdicts) verdictById.set(v.id, v);
    }
  }

  // ── Fase 3: armar resultados + summary ──────────────────────────────────────
  const results = [];
  let pass = 0;
  let fail = 0;
  let unjudged = 0;

  for (const g of generated) {
    if (g.error) {
      results.push({ id: g.p.id, region: g.p.region, error: g.error });
      unjudged++;
      continue;
    }
    const v = verdictById.get(g.p.id) || { pass: null, source: 'unjudged' };
    const verdict = v.source === 'unjudged' || v.pass == null ? 'UNJUDGED' : v.pass ? 'PASS' : 'FAIL';
    if (verdict === 'PASS') pass++;
    else if (verdict === 'FAIL') fail++;
    else unjudged++;

    console.log(
      `  ${verdict.padEnd(8)} ${g.p.id} (${g.p.region}/${g.p.axes ? g.p.axes[0] : '?'})  ` +
        `must=${v.mustCovered ?? '?'}/${v.mustTotal ?? g.p.must_include?.length ?? '?'} red_flags_hit=${v.redFlagsHit ?? '?'} ` +
        `sidecar_halluc=${g.validation.detected_count}`,
    );

    results.push({
      id: g.p.id,
      region: g.p.region,
      axes: g.p.axes,
      complexity: g.p.complexity,
      prompt: g.p.prompt,
      entities_grounded: g.entities.length,
      generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS },
      raw_response: g.gen.response,
      guarded_response: g.finalText,
      guards_modified: g.guarded.modified,
      guards_reasons: g.guarded.reasons,
      sidecar_hallucinated: g.validation.hallucinated,
      sidecar_halluc_count: g.validation.detected_count,
      age_available: g.validation.age_available,
      judge: { model: JUDGE.judgeModel, provider: JUDGE.provider, source: v.source },
      ah_pass: v.pass,
      ah_must_covered: v.mustCovered,
      ah_must_total: v.mustTotal ?? (g.p.must_include ? g.p.must_include.length : null),
      ah_red_flags_hit: v.redFlagsHit,
      latency_gen_ms: g.gen.latency_ms,
    });
  }

  const judged = pass + fail;
  const ahPct = judged > 0 ? (100 * pass) / judged : 0;

  // AH% por eje (primer axis) y por región, para localizar el borde.
  const byAxis = {};
  const byRegion = {};
  for (const r of results) {
    if (r.ah_pass == null) continue;
    const axis = (r.axes && r.axes[0]) || 'sin_eje';
    byAxis[axis] = byAxis[axis] || { pass: 0, total: 0 };
    byAxis[axis].total++;
    if (r.ah_pass) byAxis[axis].pass++;
    const reg = r.region || 'sin_region';
    byRegion[reg] = byRegion[reg] || { pass: 0, total: 0 };
    byRegion[reg].total++;
    if (r.ah_pass) byRegion[reg].pass++;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(BENCH_RUNS_DIR, `borde-alucinacion-${dateStr}.jsonl`);
  const summaryPath = join(BENCH_RUNS_DIR, `borde-alucinacion-${dateStr}.summary.json`);

  writeFileSync(jsonlPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const summary = {
    generated_at: new Date().toISOString(),
    generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS, config: 'PROD (llmRouter chat_complex)' },
    judge: { model: JUDGE.judgeModel, provider: JUDGE.provider, independent: !JUDGE.deterministic },
    fixture: PROMPTS_FILE,
    n_prompts: prompts.length,
    pass,
    fail,
    unjudged,
    judged,
    ah_pct: Number(ahPct.toFixed(1)),
    by_axis: Object.fromEntries(
      Object.entries(byAxis).map(([k, v]) => [k, { pass: v.pass, total: v.total, ah_pct: Number(((100 * v.pass) / v.total).toFixed(1)) }]),
    ),
    by_region: Object.fromEntries(
      Object.entries(byRegion).map(([k, v]) => [k, { pass: v.pass, total: v.total, ah_pct: Number(((100 * v.pass) / v.total).toFixed(1)) }]),
    ),
    failed: results.filter((r) => r.ah_pass === false).map((r) => ({ id: r.id, axes: r.axes, red_flags_hit: r.ah_red_flags_hit, must: `${r.ah_must_covered}/${r.ah_must_total}` })),
    unjudged_ids: results.filter((r) => r.judge && r.judge.source === 'unjudged').map((r) => r.id),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════');
  console.log(`RESULTADO  PASS=${pass}  FAIL=${fail}  UNJUDGED=${unjudged}  (juzgados=${judged})`);
  console.log(`AH% (juez ${JUDGE.provider}, config-prod) = ${ahPct.toFixed(1)}%`);
  console.log(`Por eje:    ${JSON.stringify(summary.by_axis)}`);
  console.log(`JSONL:   ${jsonlPath}`);
  console.log(`SUMMARY: ${summaryPath}`);
  console.log('══════════════════════════════════════════════════');
}

const INVOKED_DIRECTLY = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (INVOKED_DIRECTLY) {
  main().catch((err) => {
    console.error('FATAL:', err.message);
    process.exit(1);
  });
}

export { main };
