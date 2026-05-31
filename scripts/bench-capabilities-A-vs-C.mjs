#!/usr/bin/env node
/**
 * bench-capabilities-A-vs-C.mjs — bench HONESTO de capacidades (2026-05-31).
 *
 * Mide cuánto aportó la curación + el wiring de las últimas 48h, comparando dos
 * configuraciones sobre el MISMO pool de capacidades (grounded contra el grafo
 * vivo chagra_kg, generado por gen-bench-capabilities-pool.mjs):
 *
 *   - CONFIG A (piso real): granite3.1-dense:8b CRUDO. System prompt base, SIN
 *     resolve-entities (sin grounding AGE), SIN applyOutputGuards, SIN
 *     post-validate. Es lo que el modelo sabe solo.
 *   - CONFIG C (estado de HOY): pipeline real de prod →
 *       resolve-entities (AGE, con finca_altitud)  →
 *       system prompt enriquecido con las entidades →
 *       granite temp 0.3 + seed fijo                →
 *       applyOutputGuards (los 8 guards + térmico, con fincaAltitud) →
 *       post-validate (detector de alucinaciones del sidecar).
 *
 * Juez INDEPENDIENTE: qwen2.5:14b (familia distinta a granite). Métrica AH: PASS
 * si todos los must_include presentes (por fondo) Y cero red_flags. Para los
 * prompts con `expects_abstention:true`, el must_include ES la abstención ("no
 * tengo dato verificado") → PASS = el agente NO inventó.
 *
 * Δ(C−A) por capacidad = el LIFT real de la curación.
 *
 * Guarda ANTI-STALE primero (no medir código viejo). Vigilancia térmica GPU<88°.
 *
 * Uso:
 *   node scripts/bench-capabilities-A-vs-C.mjs \
 *     --pool data/bench-runs/capabilities-pool-2026-05-31.json
 *   node scripts/bench-capabilities-A-vs-C.mjs --pool <f> --configs A,C
 *   node scripts/bench-capabilities-A-vs-C.mjs --pool <f> --configs C   # solo C
 *
 * Output: data/bench-runs/capabilities-A-vs-C-<ts>.{jsonl,summary.json}
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { scoreAntiHalluc, assertIndependentJudge, RECOMMENDED_JUDGE_MODEL } from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import { applyOutputGuards } from '../src/services/outputGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BENCH_RUNS_DIR = join(ROOT_DIR, 'data', 'bench-runs');

const GEN_MODEL = process.env.GEN_MODEL || 'granite3.1-dense:8b';
const GEN_TEMPERATURE = 0.3;
const GEN_MAX_TOKENS = 768;
const SEED = Number(process.env.SEED || 42);

const JUDGE_MODEL = process.env.JUDGE_MODEL || RECOMMENDED_JUDGE_MODEL;
const JUDGE_TEMPERATURE = 0;
const JUDGE_TIMEOUT_MS = 120_000;

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat';
const OLLAMA_GEN_URL = 'http://localhost:11434/api/generate';
const GEN_TIMEOUT_MS = 180_000;

const GPU_TEMP_LIMIT = 88;
const GPU_TEMP_RESUME = 75;

function argVal(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return def;
}
const POOL_FILE = argVal('--pool', process.env.POOL || '');
const CONFIGS = argVal('--configs', 'A,C')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter((c) => c === 'A' || c === 'C');

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

const BASE_PROMPT = `Eres un asistente agroecológico experto para Colombia. Responde en español claro, práctico para agricultores.

Si mencionas entidades (especies, plagas, biopreparados), usa los nombres canónicos del catálogo Chagra para evitar alucinaciones. Si NO tienes un dato verificado (por ejemplo una dosis numérica), dilo explícitamente en vez de inventarlo.`;

function buildEnrichedSystemPrompt(entities) {
  if (!entities || entities.length === 0) return BASE_PROMPT;
  const entityContext = entities
    .map((e) => {
      if (e.kind === 'species') return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})`;
      if (e.kind === 'pest') return `- ${e.mentioned} = plaga: ${e.nombre_cientifico || e.nombre_comun}`;
      if (e.kind === 'biopreparado') return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}`;
      return null;
    })
    .filter(Boolean)
    .join('\n');
  return `${BASE_PROMPT}

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

async function judgeOllamaCall(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_GEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        prompt,
        stream: false,
        options: { temperature: JUDGE_TEMPERATURE, seed: SEED, num_predict: 160 },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`judge HTTP ${res.status}`);
    const data = await res.json();
    return data.response || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ejecuta un prompt en una config dada y devuelve el registro evaluado.
 * CONFIG A: granite crudo (sin grounding/guards/validate).
 * CONFIG C: pipeline completo de prod.
 */
/**
 * FASE 1 — genera la respuesta (granite) + guards/post-validate (config C). NO
 * juzga: así granite queda cargado todo el run y el juez (qwen) se carga UNA vez
 * en la fase 2. En Maxwell (12GB) granite+qwen no caben juntos → evitar el swap
 * por-prompt baja el run de ~10h a ~2-3h.
 */
async function generatePhase(p, config) {
  let entities = [];
  let systemPrompt = BASE_PROMPT;

  if (config === 'C') {
    const r = await resolveEntities(p.prompt);
    entities = r.entities;
    systemPrompt = buildEnrichedSystemPrompt(entities);
  }

  let gen;
  try {
    gen = await generate(systemPrompt, p.prompt);
  } catch (err) {
    return { config, error: err.message };
  }

  let finalText = gen.response;
  let guarded = { modified: false, reasons: [] };
  let validation = { hallucinated: [], detected_count: 0, age_available: false };

  if (config === 'C') {
    const g = applyOutputGuards(gen.response, {
      resolvedEntities: entities,
      fincaAltitud: p.finca_altitud ?? null,
      profileName: null,
    });
    finalText = g.text;
    guarded = { modified: g.modified, reasons: g.reasons };
    validation = await postValidate(p.prompt, finalText);
  }

  return {
    config,
    entities_grounded: entities.length,
    raw_response: gen.response,
    final_response: finalText,
    guards_modified: guarded.modified,
    guards_reasons: guarded.reasons,
    sidecar_halluc_count: validation.detected_count,
    age_available: validation.age_available,
    latency_gen_ms: gen.latency_ms,
    // se completan en la fase 2 (juez):
    ah_pass: null,
    ah_source: 'pending',
    ah_must_covered: null,
    ah_must_total: p.must_include ? p.must_include.length : null,
    ah_red_flags_hit: null,
  };
}

/** FASE 2 — juzga (qwen, cargado una sola vez) la respuesta ya generada. */
async function judgePhase(p, res) {
  if (!res || res.error) return res;
  const ah = await scoreAntiHalluc(
    {
      query: p.prompt,
      response: res.final_response,
      mustInclude: p.must_include,
      redFlags: p.red_flags,
      shouldInclude: p.should_include,
    },
    { ollamaCall: judgeOllamaCall },
  );
  res.ah_pass = ah.pass;
  res.ah_source = ah.source;
  res.ah_must_covered = ah.mustCovered;
  res.ah_must_total = ah.mustTotal ?? res.ah_must_total;
  res.ah_red_flags_hit = ah.redFlagsHit;
  return res;
}

function aggregate(rows, config) {
  const byCap = {};
  let pass = 0;
  let judged = 0;
  for (const r of rows) {
    const res = r.results[config];
    if (!res || res.error || res.ah_source === 'unjudged') continue;
    judged += 1;
    byCap[r.cap] = byCap[r.cap] || { pass: 0, total: 0 };
    byCap[r.cap].total += 1;
    if (res.ah_pass) {
      pass += 1;
      byCap[r.cap].pass += 1;
    }
  }
  return { pass, judged, ah_pct: judged > 0 ? Number(((100 * pass) / judged).toFixed(1)) : 0, byCap };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  assertCheckoutCurrent({
    cwd: ROOT_DIR,
    autoPull: process.env.BENCH_AUTO_PULL === '1',
    skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
  });
  assertIndependentJudge(JUDGE_MODEL, GEN_MODEL);

  if (!POOL_FILE || !existsSync(POOL_FILE)) {
    console.error(`FATAL: pool no encontrado. Pasá --pool <archivo>. (recibido: '${POOL_FILE}')`);
    process.exit(1);
  }
  const pool = JSON.parse(readFileSync(POOL_FILE, 'utf-8'));
  const prompts = pool.prompts || [];

  console.log('[bench-cap] bench HONESTO de capacidades — juez independiente + config-prod');
  console.log(`[bench-cap] generador: ${GEN_MODEL} temp=${GEN_TEMPERATURE} seed=${SEED}`);
  console.log(`[bench-cap] juez:      ${JUDGE_MODEL} (independiente)`);
  console.log(`[bench-cap] pool:      ${prompts.length} prompts (${POOL_FILE.split('/').pop()})`);
  console.log(`[bench-cap] configs:   ${CONFIGS.join(', ')}`);
  console.log(`[bench-cap] GPU temp inicial: ${gpuTemp() ?? 'n/d'}°C`);

  if (!existsSync(BENCH_RUNS_DIR)) mkdirSync(BENCH_RUNS_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonlPath = join(BENCH_RUNS_DIR, `capabilities-A-vs-C-${ts}.jsonl`);
  const summaryPath = join(BENCH_RUNS_DIR, `capabilities-A-vs-C-${ts}.summary.json`);

  const rows = prompts.map((p) => ({
    id: p.id,
    cap: p.cap,
    prompt: p.prompt,
    expects_abstention: !!p.expects_abstention,
    results: {},
  }));

  // ── FASE 1: generación (granite cargado todo el run) ────────────────────────
  // Orden por config: todas las A, luego todas las C → cero swaps de generador.
  console.log('\n========== FASE 1: GENERACIÓN (granite) ==========');
  for (const config of CONFIGS) {
    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      await thermalGuard();
      const res = await generatePhase(p, config);
      rows[i].results[config] = res;
      const tag = res.error ? `ERR ${res.error.slice(0, 40)}` : `${(res.latency_gen_ms / 1000).toFixed(1)}s guards=${res.guards_modified ? (res.guards_reasons || []).join(',') : 'none'}`;
      console.log(`  [gen ${config}] [${i + 1}/${prompts.length}] ${p.id} (${p.cap}) ${tag}`);
      await sleep(800);
    }
  }
  // Persistir respuestas ANTES de juzgar (si el juez muere, no perdemos la gen).
  writeFileSync(jsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`[fase1] respuestas persistidas en ${jsonlPath}`);

  // ── FASE 2: juicio (qwen cargado UNA vez) ───────────────────────────────────
  console.log('\n========== FASE 2: JUICIO (qwen2.5:14b independiente) ==========');
  for (const config of CONFIGS) {
    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      await thermalGuard();
      const res = await judgePhase(p, rows[i].results[config]);
      const verdict = !res || res.error ? 'ERR' : res.ah_source === 'unjudged' ? 'UNJ' : res.ah_pass ? 'PASS' : 'FAIL';
      console.log(
        `  [judge ${config}] [${i + 1}/${prompts.length}] ${p.id} (${p.cap}) ${verdict} ` +
          `must=${res?.ah_must_covered ?? '?'}/${res?.ah_must_total ?? '?'} rf=${res?.ah_red_flags_hit ?? '?'}`,
      );
      await sleep(600);
    }
    // re-persistir tras juzgar cada config.
    writeFileSync(jsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }

  const aggA = CONFIGS.includes('A') ? aggregate(rows, 'A') : null;
  const aggC = CONFIGS.includes('C') ? aggregate(rows, 'C') : null;

  // tabla por capacidad A vs C
  const caps = [...new Set(prompts.map((p) => p.cap))];
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
    pool: POOL_FILE,
    generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS },
    judge: { model: JUDGE_MODEL, independent: true },
    configs: CONFIGS,
    n_prompts: prompts.length,
    overall: { A: aggA, C: aggC },
    per_capability: perCap,
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════');
  console.log('TABLA POR CAPACIDAD (AH% — juez independiente, config-prod)');
  console.log('cap                      A          C          lift');
  for (const r of perCap) {
    const a = r.A ? `${r.A.pass}/${r.A.total} ${String(r.A.pct).padStart(5)}%` : '   —    ';
    const c = r.C ? `${r.C.pass}/${r.C.total} ${String(r.C.pct).padStart(5)}%` : '   —    ';
    const lift = r.lift_pp != null ? `${r.lift_pp >= 0 ? '+' : ''}${r.lift_pp}pp` : '—';
    console.log(`${r.cap.padEnd(24)} ${a.padEnd(11)} ${c.padEnd(11)} ${lift}`);
  }
  console.log('──────────────────────────────────────────────────');
  if (aggA) console.log(`GLOBAL A: ${aggA.pass}/${aggA.judged} = ${aggA.ah_pct}% AH`);
  if (aggC) console.log(`GLOBAL C: ${aggC.pass}/${aggC.judged} = ${aggC.ah_pct}% AH`);
  if (aggA && aggC) console.log(`LIFT GLOBAL C−A: ${(aggC.ah_pct - aggA.ah_pct).toFixed(1)}pp`);
  console.log(`JSONL:   ${jsonlPath}`);
  console.log(`SUMMARY: ${summaryPath}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
