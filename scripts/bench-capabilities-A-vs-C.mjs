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
import {
  scoreAntiHalluc,
  scoreAntiHallucDeterministic,
  assertIndependentJudge,
  selectJudgeProvider,
} from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import {
  getSidecarToken as sidecarToken,
  gpuTemp as gpuTempLib,
  thermalGuard as thermalGuardLib,
  resolveEntities as resolveEntitiesLib,
  postValidate as postValidateLib,
  generateChat,
  makeJudgeOllamaCall,
} from './lib/bench-sidecar.mjs';
import { applyOutputGuards } from '../src/services/outputGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BENCH_RUNS_DIR = join(ROOT_DIR, 'data', 'bench-runs');

const GEN_MODEL = process.env.GEN_MODEL || 'granite3.1-dense:8b';
const GEN_TEMPERATURE = 0.3;
const GEN_MAX_TOKENS = 768;
const SEED = Number(process.env.SEED || 42);

// Juez: Anthropic (Claude Haiku) si hay API key; si no, scorer DETERMINÍSTICO.
// `JUDGE_PROVIDER=ollama` fuerza el juez local (roto en Maxwell, solo Ampere+).
const JUDGE = selectJudgeProvider({ ollamaCall: judgeOllamaCall });
const JUDGE_MODEL = process.env.JUDGE_MODEL || JUDGE.judgeModel;
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
// ── helpers de sidecar/GPU (delegan al lib scripts/lib/bench-sidecar.mjs) ─────
// Antes COPIADOS byte-a-byte aca, en bench-borde y en bench-complejos. Ahora una
// sola vez en el lib. buildEnrichedSystemPrompt NO se reconecta: capabilities usa
// una version mas rica (hechos curados del grafo para CONFIG C). bench-borde
// tampoco se reconecta (contrato sellado).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getSidecarToken() {
  return sidecarToken();
}

function gpuTemp() {
  return gpuTempLib();
}

async function thermalGuard() {
  return thermalGuardLib({ limit: GPU_TEMP_LIMIT, resume: GPU_TEMP_RESUME });
}

async function resolveEntities(userMessage) {
  return resolveEntitiesLib(userMessage, { sidecarUrl: SIDECAR_URL });
}

async function postValidate(userMessage, response) {
  return postValidateLib(userMessage, response, { sidecarUrl: SIDECAR_URL });
}

function _liftNames(arr, max = 5) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const a of arr) {
    let n = null;
    if (typeof a === 'string') n = a.trim();
    else if (a && typeof a === 'object') n = (a.nombre_comun || a.nombre || a.name || '').toString().trim();
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Arma el system prompt enriquecido con los HECHOS CURADOS del grafo que el
 * sidecar /resolve-entities ya devuelve por entidad — NO solo el nombre. Es el
 * cambio que mide el LIFT real de la curación: para que granite CITE la dosis
 * verificada del biopreparado y la helada_letal/altitud de la especie en vez de
 * inventarlas. Solo emite campos presentes (degrada con gracia).
 *
 * Mismo principio que prod (AgentScreen + buildCuratedFactsContext).
 */
function buildEnrichedSystemPrompt(entities) {
  if (!entities || entities.length === 0) return BASE_PROMPT;
  const entityContext = entities
    .map((e) => {
      if (e.kind === 'species') {
        const facts = [];
        if (e.altitud_min != null && e.altitud_max != null) {
          facts.push(`altitud ${e.altitud_min}-${e.altitud_max} msnm`);
        }
        if (e.helada_letal != null && e.helada_letal !== '') {
          facts.push(`muere por helada bajo ${Number(e.helada_letal)}°C`);
        }
        if (e.viabilidad) {
          const delta = e.delta_altitud != null ? ` (${e.delta_altitud}m del rango)` : '';
          facts.push(`viabilidad a la altitud de la finca: ${e.viabilidad}${delta}`);
        }
        const tail = facts.length ? ` — ${facts.join('; ')}` : '';
        return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})${tail}`;
      }
      if (e.kind === 'pest') return `- ${e.mentioned} = plaga: ${e.nombre_cientifico || e.nombre_comun}`;
      if (e.kind === 'biopreparado') {
        const facts = [];
        if (e.dosis_aplicacion) facts.push(`dosis verificada: ${e.dosis_aplicacion}`);
        if (e.ingredientes_resumen) facts.push(`ingredientes: ${e.ingredientes_resumen}`);
        if (e.preparacion) facts.push(`preparación: ${e.preparacion}`);
        const target = _liftNames(e.target, 5);
        if (target.length) facts.push(`controla: ${target.join(', ')}`);
        if (e.precauciones) facts.push(`precauciones: ${e.precauciones}`);
        if (e.fuente) facts.push(`fuente: ${e.fuente}`);
        const tail = facts.length ? ` — ${facts.join('; ')}` : '';
        return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}${tail}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
  return `${BASE_PROMPT}

ENTIDADES DEL CATÁLOGO (usa estos nombres canónicos Y CITA los hechos verificados; JAMÁS inventes dosis ni recetas):
${entityContext}`;
}

async function generate(systemPrompt, userPrompt) {
  return generateChat({
    model: GEN_MODEL,
    systemPrompt,
    userPrompt,
    temperature: GEN_TEMPERATURE,
    seed: SEED,
    maxTokens: GEN_MAX_TOKENS,
    ollamaUrl: OLLAMA_CHAT_URL,
    timeoutMs: GEN_TIMEOUT_MS,
  });
}

function judgeOllamaCall(prompt) {
  // Hoisted (selectJudgeProvider lo referencia en carga de modulo). Build perezoso.
  return makeJudgeOllamaCall({
    model: JUDGE_MODEL,
    temperature: JUDGE_TEMPERATURE,
    seed: SEED,
    maxTokens: 160,
    timeoutMs: JUDGE_TIMEOUT_MS,
    ollamaUrl: OLLAMA_GEN_URL,
  })(prompt);
}


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

/**
 * FASE 2 — juzga la respuesta ya generada. Con proveedor Anthropic/ollama usa el
 * LLM-judge; sin API key (determinístico) usa `scoreAntiHallucDeterministic` (no
 * carga ningún modelo).
 */
async function judgePhase(p, res) {
  if (!res || res.error) return res;
  const item = {
    query: p.prompt,
    response: res.final_response,
    mustInclude: p.must_include,
    redFlags: p.red_flags,
    shouldInclude: p.should_include,
  };
  const ah = JUDGE.deterministic
    ? scoreAntiHallucDeterministic(item)
    : await scoreAntiHalluc(item, { ollamaCall: JUDGE.judgeCall });
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
  // Independencia solo aplica a un juez LLM (no al scorer determinístico).
  if (!JUDGE.deterministic) assertIndependentJudge(JUDGE_MODEL, GEN_MODEL);

  if (!POOL_FILE || !existsSync(POOL_FILE)) {
    console.error(`FATAL: pool no encontrado. Pasá --pool <archivo>. (recibido: '${POOL_FILE}')`);
    process.exit(1);
  }
  const pool = JSON.parse(readFileSync(POOL_FILE, 'utf-8'));
  const prompts = pool.prompts || [];

  console.log('[bench-cap] bench HONESTO de capacidades — juez independiente + config-prod');
  console.log(`[bench-cap] generador: ${GEN_MODEL} temp=${GEN_TEMPERATURE} seed=${SEED}`);
  console.log(`[bench-cap] juez:      ${JUDGE_MODEL} (provider=${JUDGE.provider})`);
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
    judge: { model: JUDGE_MODEL, provider: JUDGE.provider, independent: !JUDGE.deterministic },
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
