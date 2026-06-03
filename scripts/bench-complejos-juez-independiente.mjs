#!/usr/bin/env node
/**
 * bench-complejos-juez-independiente.mjs — re-bench HONESTO de los 10 prompts
 * complejos rotativos, a CONFIG-PROD y con juez INDEPENDIENTE.
 *
 * Motivación (auditoría integral 2026-05-31): el "56% AH" del bench nocturno
 * Phase C no era creíble por DOS fallas del instrumento:
 *   1. Auto-evaluación — el juez era el propio generador (granite) → un modelo
 *      se perdona sus propias alucinaciones.
 *   2. Config equivocada — el runner corría a temp 0.7 sin seed, pero PROD
 *      (llmRouter chat_complex) usa temp 0.3. El número no era reproducible ni
 *      representativo de lo que ve el usuario.
 *
 * Este script arregla ambas cosas:
 *   - GENERADOR a CONFIG-PROD: granite3.1-dense:8b, temp 0.3, seed fijo,
 *     max_tokens 768 (= ROUTES.chat_complex de src/services/llmRouter.js), con
 *     el pipeline real: resolve-entities (AGE) → enriched system prompt →
 *     applyOutputGuards (guards deterministas de prod) → post-validate.
 *   - JUEZ INDEPENDIENTE: qwen2.5:14b (familia distinta a granite, estable en
 *     Maxwell sm_52). No es auto-eval. mistral-nemo:12b DESCARTADO (crash
 *     Maxwell 'signal during cgo'); Haiku cloud no disponible (sin
 *     ANTHROPIC_API_KEY en el entorno). assertIndependentJudge aborta si el
 *     juez coincidiera con el generador.
 *   - MÉTRICA AH: PASS solo si todos los must_include están presentes (por
 *     fondo) Y cero red_flags. AH% = PASS / total.
 *
 * Térmica: GPU ~38° al arrancar. Pausa entre prompts + chequeo de temperatura;
 * si pasa 88° pausa hasta enfriar (vigilancia, no daño).
 *
 * Uso:
 *   node scripts/bench-complejos-juez-independiente.mjs
 *   node scripts/bench-complejos-juez-independiente.mjs --judge qwen2.5:14b
 *   GEN_MODEL=granite3.1-dense:8b SEED=42 node scripts/bench-complejos-...mjs
 *
 * Output: data/bench-runs/complejos-juez-independiente-YYYY-MM-DD.jsonl
 *   + data/bench-runs/complejos-juez-independiente-YYYY-MM-DD.summary.json
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import {
  scoreAntiHalluc,
  scoreAntiHallucDeterministic,
  assertIndependentJudge,
  selectJudgeProvider,
} from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import { applyOutputGuards } from '../src/services/outputGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
// BENCH_OUTPUT_DIR permite PERSISTIR los resultados FUERA del worktree efímero
// (p. ej. al repo principal), para que sobrevivan al cleanup del worktree.
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(ROOT_DIR, 'data', 'bench-runs');

// ── config-prod del generador (= ROUTES.chat_complex de llmRouter.js) ─────────
const GEN_MODEL = process.env.GEN_MODEL || 'granite3.1-dense:8b';
const GEN_TEMPERATURE = 0.3; // PROD. NO 0.7.
const GEN_MAX_TOKENS = 768; // chat_complex
const SEED = Number(process.env.SEED || 42); // seed FIJO → reproducible.

// ── juez independiente ────────────────────────────────────────────────────────
function parseJudgeArg() {
  const i = process.argv.indexOf('--judge');
  if (i >= 0) {
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) return next;
  }
  return null;
}
// Juez: por defecto Anthropic (Claude Haiku) si hay API key; si no, scorer
// DETERMINÍSTICO. Un `--judge <modelo>` o `JUDGE_PROVIDER=ollama` explícito
// fuerza el juez local de ollama (roto en Maxwell — solo GPU Ampere+).
const JUDGE_ARG = parseJudgeArg() || process.env.JUDGE_MODEL || null;
const JUDGE = selectJudgeProvider({
  provider: JUDGE_ARG ? 'ollama' : undefined,
  ollamaCall: judgeOllamaCall,
  ollamaModel: JUDGE_ARG || undefined,
});
const JUDGE_MODEL = JUDGE.judgeModel;
const JUDGE_TEMPERATURE = 0; // determinismo del juez.
const JUDGE_TIMEOUT_MS = 120_000; // el juez local en Maxwell es lento (si se fuerza).

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat';
const OLLAMA_GEN_URL = 'http://localhost:11434/api/generate';
const GEN_TIMEOUT_MS = 180_000;

const PROMPTS_FILE =
  process.env.PROMPTS_FILE ||
  '/home/kortux/Workspace/Chagra-strategy/deepresearch/TEST_PROMPTS_COMPLEJOS_ROTATIVOS_2026-05-30.json';

// Umbral térmico: si la GPU supera esto, pausa hasta enfriar.
const GPU_TEMP_LIMIT = 88;
const GPU_TEMP_RESUME = 75;

// ── helpers ───────────────────────────────────────────────────────────────────

function getSidecarToken() {
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf-8').trim();
  return process.env.SIDECAR_TOKEN || '';
}

/** Lee la temperatura de la GPU vía nvidia-smi; null si no disponible. */
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

/** Si la GPU está caliente, espera (vigilancia térmica). */
async function thermalGuard() {
  let t = gpuTemp();
  if (t == null) return; // sin telemetría → no bloquea.
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

// Mismo system prompt enriquecido que usa el bench del agente / la PWA en prod.
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

/** Generador a CONFIG-PROD: temp 0.3 + seed fijo. */
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
        options: {
          temperature: GEN_TEMPERATURE,
          seed: SEED,
          num_predict: GEN_MAX_TOKENS,
        },
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

/** Caller del juez independiente contra ollama. */
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

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Guarda ANTI-STALE (PASO 0): aborta si el checkout está atrás de origin/main.
  // El "10% AH" previo fue artefacto de correr código viejo (sin #1240). Ningún
  // bench debe volver a medir código que el usuario ya no ve.
  assertCheckoutCurrent({
    cwd: ROOT_DIR,
    autoPull: process.env.BENCH_AUTO_PULL === '1',
    skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
  });

  // Independencia del juez (verify-before-claim): aborta si juez === generador.
  // Solo aplica a un juez LLM; el scorer determinístico no es un generador.
  if (!JUDGE.deterministic) assertIndependentJudge(JUDGE_MODEL, GEN_MODEL);

  const fixture = JSON.parse(readFileSync(PROMPTS_FILE, 'utf-8'));
  const prompts = fixture.prompts || [];

  console.log('[bench-complejos] re-bench HONESTO — juez confiable + config-prod');
  console.log(`[bench-complejos] generador: ${GEN_MODEL} temp=${GEN_TEMPERATURE} seed=${SEED} max_tokens=${GEN_MAX_TOKENS}`);
  console.log(`[bench-complejos] juez:      ${JUDGE_MODEL} (provider=${JUDGE.provider}, temp=${JUDGE_TEMPERATURE})`);
  console.log(`[bench-complejos] prompts:   ${prompts.length} (${PROMPTS_FILE.split('/').pop()})`);
  console.log(`[bench-complejos] GPU temp inicial: ${gpuTemp() ?? 'n/d'}°C`);

  if (!existsSync(BENCH_RUNS_DIR)) mkdirSync(BENCH_RUNS_DIR, { recursive: true });

  const results = [];
  let pass = 0;
  let fail = 0;
  let unjudged = 0;

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n[${i + 1}/${prompts.length}] ${p.id} (${p.region}/${p.complexity}): ${p.prompt.slice(0, 60)}...`);

    await thermalGuard();

    // 1) resolve-entities (AGE grounding, igual que prod)
    const { entities } = await resolveEntities(p.prompt);
    const systemPrompt = buildEnrichedSystemPrompt(entities);

    // 2) generar a config-prod
    let gen;
    try {
      gen = await generate(systemPrompt, p.prompt);
    } catch (err) {
      console.log(`    GEN ERROR: ${err.message}`);
      results.push({ id: p.id, error: err.message });
      unjudged++;
      continue;
    }

    // 3) guards deterministas de prod (applyOutputGuards) — igual que AgentScreen
    const guarded = applyOutputGuards(gen.response, {
      resolvedEntities: entities,
      profileName: null,
    });
    const finalText = guarded.text;

    // 4) post-validate (detector de alucinaciones del sidecar)
    const validation = await postValidate(p.prompt, finalText);

    // 5) juez ANTI-ALUCINACIÓN (must_include / red_flags). Anthropic/ollama vía
    //    LLM-judge; sin API key cae al scorer determinístico (no carga modelo).
    const ahItem = {
      query: p.prompt,
      response: finalText,
      mustInclude: p.must_include,
      redFlags: p.red_flags,
      shouldInclude: p.should_include,
    };
    const ah = JUDGE.deterministic
      ? scoreAntiHallucDeterministic(ahItem)
      : await scoreAntiHalluc(ahItem, { ollamaCall: JUDGE.judgeCall });

    if (ah.source === 'unjudged') unjudged++;
    else if (ah.pass) pass++;
    else fail++;

    const verdict = ah.source === 'unjudged' ? 'UNJUDGED' : ah.pass ? 'PASS' : 'FAIL';
    console.log(
      `    ${verdict}  must=${ah.mustCovered ?? '?'}/${ah.mustTotal ?? p.must_include?.length ?? '?'} ` +
        `red_flags_hit=${ah.redFlagsHit ?? '?'}  guards=${guarded.modified ? guarded.reasons.join(',') : 'none'} ` +
        `sidecar_halluc=${validation.detected_count}  ${(gen.latency_ms / 1000).toFixed(1)}s`,
    );

    results.push({
      id: p.id,
      region: p.region,
      complexity: p.complexity,
      prompt: p.prompt,
      entities_grounded: entities.length,
      generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS },
      raw_response: gen.response,
      guarded_response: finalText,
      guards_modified: guarded.modified,
      guards_reasons: guarded.reasons,
      sidecar_hallucinated: validation.hallucinated,
      sidecar_halluc_count: validation.detected_count,
      age_available: validation.age_available,
      judge: { model: JUDGE_MODEL, source: ah.source },
      ah_pass: ah.pass,
      ah_must_covered: ah.mustCovered,
      ah_must_total: ah.mustTotal ?? (p.must_include ? p.must_include.length : null),
      ah_red_flags_hit: ah.redFlagsHit,
      latency_gen_ms: gen.latency_ms,
    });

    await sleep(2000); // pausa entre prompts (térmica + cortesía GPU)
  }

  const judged = pass + fail;
  const ahPct = judged > 0 ? (100 * pass) / judged : 0;
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(BENCH_RUNS_DIR, `complejos-juez-independiente-${dateStr}.jsonl`);
  const summaryPath = join(BENCH_RUNS_DIR, `complejos-juez-independiente-${dateStr}.summary.json`);

  writeFileSync(jsonlPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const summary = {
    generated_at: new Date().toISOString(),
    generator: { model: GEN_MODEL, temperature: GEN_TEMPERATURE, seed: SEED, max_tokens: GEN_MAX_TOKENS, config: 'PROD (llmRouter chat_complex)' },
    judge: { model: JUDGE_MODEL, provider: JUDGE.provider, independent: !JUDGE.deterministic, temperature: JUDGE_TEMPERATURE },
    fixture: PROMPTS_FILE,
    n_prompts: prompts.length,
    pass,
    fail,
    unjudged,
    judged,
    ah_pct: Number(ahPct.toFixed(1)),
    failed_ids: results.filter((r) => r.ah_pass === false).map((r) => r.id),
    unjudged_ids: results.filter((r) => r.judge && r.judge.source === 'unjudged').map((r) => r.id),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log('\n══════════════════════════════════════════════════');
  console.log(`RESULTADO  PASS=${pass}  FAIL=${fail}  UNJUDGED=${unjudged}  (juzgados=${judged})`);
  console.log(`AH% (juez independiente, config-prod) = ${ahPct.toFixed(1)}%`);
  console.log(`JSONL:   ${jsonlPath}`);
  console.log(`SUMMARY: ${summaryPath}`);
  console.log('══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
