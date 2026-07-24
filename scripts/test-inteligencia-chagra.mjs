#!/usr/bin/env node
/**
 * test-inteligencia-chagra.mjs — TEST DE INTELIGENCIA FUERTE de Chagra.
 *
 * Un harness reproducible que emite UN número —el ÍNDICE DE INTELIGENCIA— para
 * saber si un cambio mejoró o empeoró al agente. Es la vara. Mide CUATRO
 * dimensiones, cada una contra el stack REAL (mismo retriever de producción,
 * mismo grafo AGE vía MCP, mismo modelo de chat), no mocks:
 *
 *   1. RECALL del retrieval (peso 0.30) — ¿encuentra la ficha correcta?
 *      Corre el retriever híbrido de producción (src/services/ragRetriever.js,
 *      BM25 + nomic-embed-text 768d) sobre el catálogo COMPLETO (501 fichas —
 *      NO el subconjunto de 44 del tier-gate; ver el loader) contra 3 golden
 *      sets: rag-golden.json (50), rag-golden-ampliado.json (117) y
 *      golden-self-501.json (500). Reporta recall@1/@5 + MRR por set y el
 *      desglose por especie (el promedio miente: es bimodal).
 *
 *   2. GROUNDING / anti-alucinación (peso 0.35 — la más importante para el
 *      operador) — 'fuerte en lo que sabe, no sé en lo que no'. Pregunta al
 *      agente (gemma4:e2b + system prompt de producción + evidencia RAG) por
 *      especies que NO están en el corpus (reales ausentes + inventadas) y mide
 *      la tasa de abstención correcta vs alucinación. Incluye un set de CONTROL
 *      de especies SÍ presentes para castigar la mudez (un agente que dice
 *      'no sé' a todo NO es inteligente): el puntaje es media armónica ponderada
 *      de abstención-OOC y respuesta-en-control.
 *
 *   3. RELACIONES / grafo (peso 0.20) — queries que solo el grafo responde bien
 *      ('con qué se asocia el maíz'). Compara el retrieval híbrido SIN grafo
 *      (¿aparece la especie asociada en top-5?) contra la herramienta MCP del
 *      grafo AGE. Reporta la VENTAJA del grafo (graph_hit − vector_hit).
 *
 *   4. TAXONOMÍA (peso 0.15) — ¿da el nombre científico CORRECTO? Incluye los
 *      errores históricos (papa criolla = Solanum phureja, NO tuberosum).
 *
 * ÍNDICE = Σ (peso_i · puntaje_i) sobre las dimensiones disponibles, renormalizado
 * si alguna no corre (p. ej. MCP inalcanzable). Documentado abajo en INDEX_WEIGHTS.
 *
 * REPRODUCIBLE: sin Math.random; sets ordenados por id; LLM en greedy decoding
 * (temperature 0, seed fijo). Las dimensiones de retrieval (1 y el lado vector de
 * 3) son 100% determinísticas. Las dimensiones LLM (2, 4) son deterministas salvo
 * variación de punto flotante del backend CUDA — documentado en el informe.
 *
 * Uso (desde la raíz del repo chagra):
 *   OLLAMA_URL=http://<host-alpha>:11434 \
 *   CHAGRA_MCP_TOKEN=<token> \
 *   node scripts/test-inteligencia-chagra.mjs
 *
 *   node scripts/test-inteligencia-chagra.mjs --check          # falla si INDICE < baseline - TOLERANCIA
 *   node scripts/test-inteligencia-chagra.mjs --write-baseline # fija eval/intel-baseline.json (deliberado)
 *   INTEL_LIMIT=5 node scripts/test-inteligencia-chagra.mjs    # smoke test (cap por set)
 *
 * Variables de entorno:
 *   OLLAMA_URL        default http://localhost:11434 — Ollama con nomic-embed-text + CHAT_MODEL.
 *   MCP_BASE_URL      default https://chagra.app/api/mcp/agro — sidecar agro-mcp (grafo + tools).
 *   CHAGRA_MCP_TOKEN  sin default — header X-Chagra-Token. Si falta, la dimensión 3 se marca N/A.
 *   CHAT_MODEL        default gemma4:e2b — modelo de respuestas del agente.
 *   EMBED_MODEL       default nomic-embed-text — DEBE coincidir con el corpus rag-embeddings.json.
 *   INTEL_LIMIT       cap opcional de queries por set (smoke test).
 *   INTEL_OUT_DIR     default ops/informes/data — dónde se escribe el JSON fechado.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { register } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const CORPUS_ROOT = join(PUBLIC, 'cycle-content');
const MANIFEST_PATH = join(CORPUS_ROOT, 'manifest.json');
const EMBEDDINGS_PATH = join(PUBLIC, 'rag-embeddings.json');
const EVAL_DIR = join(ROOT, 'eval');
const BASELINE_PATH = join(EVAL_DIR, 'intel-baseline.json');

// ── Config ────────────────────────────────────────────────────────────────
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const MCP_BASE_URL = (process.env.MCP_BASE_URL || 'https://chagra.app/api/mcp/agro').replace(/\/$/, '');
const MCP_TOKEN = process.env.CHAGRA_MCP_TOKEN || '';
// Modelo(s) de chat. Lista separada por comas para comparar (p. ej.
// "gemma4:e2b,gemma4:e4b"). El PRIMERO es el canónico/prod: su ÍNDICE fija el
// baseline y gobierna --check. CHAT_MODEL (singular) se acepta por compat.
const CHAT_MODELS = (process.env.CHAT_MODELS || process.env.CHAT_MODEL || 'gemma4:e2b')
  .split(',').map((s) => s.trim()).filter(Boolean);
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const LIMIT = process.env.INTEL_LIMIT ? Number(process.env.INTEL_LIMIT) : Infinity;
const OUT_DIR = process.env.INTEL_OUT_DIR || join(ROOT, 'ops', 'informes', 'data');
// Modo dims-fijas: RECALL y RELACIONES no dependen del modelo de chat, así que en
// una comparación de N modelos se calculan UNA vez y se inyectan como constantes
// (evita re-correr self-500 + grafo por modelo → ~2.5x más barato).
const FIXED_RECALL = process.env.FIXED_RECALL != null ? Number(process.env.FIXED_RECALL) : null;
const FIXED_RELACIONES = process.env.FIXED_RELACIONES != null ? Number(process.env.FIXED_RELACIONES) : null;
const ARGS = new Set(process.argv.slice(2));
const CHECK_MODE = ARGS.has('--check');
const WRITE_BASELINE = ARGS.has('--write-baseline');
// Suite de visión (multimodal). --vision la corre además de las dims de texto;
// --vision-only salta el texto y corre SOLO visión (no toca el retriever).
const RUN_VISION = ARGS.has('--vision') || ARGS.has('--vision-only');
const VISION_ONLY = ARGS.has('--vision-only');
const VISION_MODELS = (process.env.VISION_MODELS || 'gemma4:e2b,gemma4:e4b')
  .split(',').map((s) => s.trim()).filter(Boolean);
const CHECK_TOLERANCE = 2.0; // puntos de ÍNDICE que se toleran a la baja antes de fallar --check

// Pesos del ÍNDICE — documentados. Grounding manda (prioridad del operador).
const INDEX_WEIGHTS = { grounding: 0.35, recall: 0.30, relaciones: 0.20, taxonomia: 0.15 };
// Pesos internos de cada golden set en el puntaje de recall.
const RECALL_SET_WEIGHTS = { golden: 0.35, ampliado: 0.30, self: 0.35 };
// Pesos internos del puntaje de grounding (media armónica ponderada).
const GROUNDING_W = { abstain: 0.65, control: 0.35 };

const TOP_K = 5;
const EVIDENCE_K = 3;
const NUM_PREDICT = 220;
// Timeout por llamada al LLM. En ventana-día la contención de VRAM con prod puede
// estancar una generación; superado esto se cuenta como fallo, no como cuelgue.
const GEN_TIMEOUT_MS = Number(process.env.GEN_TIMEOUT_MS || 90000);
const VIS_TIMEOUT_MS = Number(process.env.VIS_TIMEOUT_MS || 120000);
// Método de prompting: 'generate' (/api/generate con prompt concatenado — fiel a
// cómo lo llama HOY el agente de prod en safeLLMQuery) o 'chat' (/api/chat, que
// deja a Ollama aplicar el CHAT TEMPLATE nativo de cada modelo). Para comparar
// modelos AJENOS de forma justa (fine-tunes SFT/DPO entrenados con su propio
// formato ChatML/granite) hay que usar 'chat': con 'generate' un fine-tune puede
// no reconocer el prompt y responder VACÍO → score artificialmente bajo (no es
// degradación, es formato). Default 'generate' para no mover el baseline de prod.
const CHAT_API = (process.env.CHAT_API || 'generate').toLowerCase();

// fetch nativo capturado ANTES de instalar el shim del retriever.
const nativeFetch = globalThis.fetch.bind(globalThis);

// ── Helpers deterministas ───────────────────────────────────────────────────
const loadJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const round1 = (x) => Math.round(x * 10) / 10;

// Mismo criterio de match especie↔variedad que scripts/bench-rag-retrieve.mjs.
function matchesSpecies(slug, expected) {
  const a = String(slug); const b = String(expected);
  return a === b || a.startsWith(`${b}_`) || b.startsWith(`${a}_`);
}

// Media armónica ponderada: castiga que cualquiera de los dos colapse (mudez o
// alucinación). wa+wb debe sumar 1.
function weightedHarmonic(a, b, wa, wb) {
  if (a <= 0 || b <= 0) return 0;
  return 1 / ((wa / a) + (wb / b));
}

// ── Fetch shim para el retriever de producción ──────────────────────────────
// Sirve manifest/fichas/embeddings desde disco y enruta el embed de la query al
// Ollama real. Cualquier otra URL → 404 (el retriever degrada limpio).
function installRetrieverFetchShim() {
  const manifest = loadJson(MANIFEST_PATH);
  const embeddings = loadJson(EMBEDDINGS_PATH);
  const jsonRes = (obj) => ({
    ok: true, status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
    json: async () => obj,
  });
  const notFound = () => ({ ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) });

  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) return jsonRes(manifest);
    const m = u.match(/\/cycle-content\/([^/]+)\.json$/);
    if (m) {
      const f = join(CORPUS_ROOT, `${m[1]}.json`);
      return existsSync(f) ? jsonRes(loadJson(f)) : notFound();
    }
    if (u.endsWith('/rag-embeddings.json')) return jsonRes(embeddings);
    if (u.includes('/api/ollama/api/embeddings')) {
      // El retriever embebe la query con EMBED_MODEL vía este path relativo.
      return nativeFetch(`${OLLAMA_URL}/api/embeddings`, options);
    }
    return notFound();
  };
}

// ── LLM (respuestas del agente) ─────────────────────────────────────────────
// think:false es OBLIGATORIO: sin él los modelos gemma4 devuelven `response`
// vacío (todo el texto queda en el canal de thinking) y la medición se
// contamina con falsos 'no responde' (ver memoria think:false-o-modelos-mudos).
// msg = { system, user }. Según CHAT_API usa /api/chat (template nativo) o
// /api/generate (prompt concatenado, fiel a prod). Timeout defensivo: en
// ventana-día la contención de VRAM con prod puede estancar la request; superado
// esto se cuenta como respuesta vacía (fallo), no como cuelgue.
async function generate(msg, model, keepAlive = '2m') {
  const opts = { temperature: 0, top_p: 1, top_k: 1, seed: 42, num_predict: NUM_PREDICT };
  try {
    if (CHAT_API === 'chat') {
      const res = await nativeFetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(GEN_TIMEOUT_MS),
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: msg.system }, { role: 'user', content: msg.user }],
          stream: false, think: false, keep_alive: keepAlive, options: opts,
        }),
      });
      if (!res.ok) return { _error: `http ${res.status}` };
      const data = await res.json();
      return { text: (data.message?.content || '').trim() };
    }
    const res = await nativeFetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GEN_TIMEOUT_MS),
      body: JSON.stringify({
        model, prompt: `${msg.system}\n\n${msg.user}`,
        stream: false, think: false, keep_alive: keepAlive, options: opts,
      }),
    });
    if (!res.ok) return { _error: `http ${res.status}` };
    const data = await res.json();
    return { text: (data.response || '').trim() };
  } catch (err) {
    return { _error: err?.name === 'TimeoutError' ? `timeout ${GEN_TIMEOUT_MS}ms` : (err?.message || 'fetch failed') };
  }
}

// Descarga un modelo de la VRAM (keep_alive:0) para no co-residir con el
// siguiente en la M6000 (12 GB) durante la comparación secuencial.
async function unloadModel(model) {
  try {
    await nativeFetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: '', keep_alive: 0, think: false }),
    });
  } catch { /* best-effort */ }
}

// ── MCP (grafo AGE + tools) ─────────────────────────────────────────────────
async function mcpHealthy() {
  // 3 intentos con timeout: el edge (Cloudflare) tiene picos de latencia en frío
  // que hacían fallar un GET único y tumbaban toda la dimensión RELACIONES.
  for (let i = 0; i < 3; i += 1) {
    try {
      const res = await nativeFetch(`${MCP_BASE_URL}/healthz`, {
        redirect: 'follow', signal: AbortSignal.timeout(15000),
      });
      if (res.ok) { const j = await res.json(); if (j?.status === 'ok') return true; }
    } catch { /* reintentar */ }
  }
  return false;
}
async function mcpTool(tool, args) {
  for (let i = 0; i < 2; i += 1) {
    try {
      const res = await nativeFetch(`${MCP_BASE_URL}/tools/${tool}`, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json', 'X-Chagra-Token': MCP_TOKEN },
        body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return { _http: res.status };
      return await res.json();
    } catch (err) { if (i === 1) return { _error: err?.message || 'fetch failed' }; }
  }
  return { _error: 'unreachable' };
}
// Extrae los slugs de especie de una respuesta de tool (companions[], controllers[], etc.).
function extractSpeciesIds(result) {
  if (!result || typeof result !== 'object') return [];
  const ids = new Set();
  const scan = (arr) => { if (Array.isArray(arr)) for (const it of arr) { const id = it?.id || it?.species_id; if (id) ids.add(String(id)); } };
  scan(result.companions);
  scan(result.controllers);
  scan(result.beneficials);
  scan(result.results);
  scan(result.items);
  scan(result.antagonists);
  return [...ids];
}

// ── Grounding: clasificador de abstención ────────────────────────────────────
const ABSTAIN_RE = new RegExp([
  'no s[eé]\\b', 'no teng[oa]', 'no est[aá] en mi', 'no aparece', 'no encontr',
  'no conozco', 'no dispongo', 'no hay informaci', 'informaci[oó]n curada',
  'consultar ia externa', '\\bia externa', 'no puedo ayudar', 'no forma parte',
  'no figura', 'no s[eé] de ese', 'fuera de.*(scope|cat[aá]logo|mi )', 'no tengo datos',
  'no la tengo', 'no lo tengo', 'no se encuentra en',
].join('|'), 'i');
const AGRO_TERMS = ['planta', 'suelo', 'riego', 'abono', 'biopreparado', 'siembra', 'cosecha', 'plaga', 'cultivo', 'poda', 'semilla', 'sombra', 'asocia', 'compost', 'clima', 'fertiliz', 'organic'];
function isAbstain(text) { return ABSTAIN_RE.test(norm(text)); }
function isOnTopic(text) { const n = norm(text); return AGRO_TERMS.some((t) => n.includes(t)); }

// ── Construcción de prompts grounded ─────────────────────────────────────────
function buildGroundedPrompt(systemPrompt, query, evidence) {
  const ctx = evidence.length
    ? evidence.map((h, i) => `[${i + 1}] ${h.species}: ${String(h.text || '').replace(/\s+/g, ' ').slice(0, 240)}`).join('\n')
    : '(sin fichas recuperadas)';
  const user = `INFORMACIÓN CURADA DISPONIBLE (fichas del catálogo recuperadas para esta pregunta):\n${ctx}\n\n`
    + `Responde SOLO con base en la información curada de arriba. Si la especie de la pregunta no aparece en el catálogo, di que no tienes información curada sobre ella y no inventes datos.\n\n`
    + `PREGUNTA DEL OPERADOR: ${query}`;
  return { system: systemPrompt, user };
}

// ════════════════════════════════════════════════════════════════════════════
// DIMENSIÓN 1 — RECALL
// ════════════════════════════════════════════════════════════════════════════
async function dimRecall(retrieve, corpusSlugs) {
  const sets = [
    { key: 'golden', label: 'rag-golden.json', file: join(EVAL_DIR, 'rag-golden.json') },
    { key: 'ampliado', label: 'rag-golden-ampliado.json', file: join(EVAL_DIR, 'rag-golden-ampliado.json') },
    { key: 'self', label: 'golden-self-501.json', file: join(EVAL_DIR, 'golden-self-501.json') },
  ];
  const resolvable = (exp) => corpusSlugs.has(exp) || [...corpusSlugs].some((s) => s.startsWith(`${exp}_`));
  const out = {};
  for (const set of sets) {
    if (!existsSync(set.file)) { out[set.key] = { error: 'missing', label: set.label }; continue; }
    let items = loadJson(set.file);
    if (!Array.isArray(items)) items = items.queries || [];
    items = [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (Number.isFinite(LIMIT)) items = items.slice(0, LIMIT);

    let n = 0, concept = 0, hit1 = 0, hit5 = 0, rr = 0;
    const perSpecies = new Map(); // expected -> {hit5, total}
    const missed = [];
    for (const it of items) {
      if (!resolvable(it.expected)) { concept += 1; continue; }
      const hits = await retrieve(it.query, TOP_K, 'intel');
      const slugs = hits.map((h) => h.species);
      const rank = slugs.findIndex((s) => matchesSpecies(s, it.expected));
      n += 1;
      const h5 = rank >= 0 && rank < 5;
      if (rank === 0) hit1 += 1;
      if (h5) hit5 += 1;
      if (rank >= 0) rr += 1 / (rank + 1);
      const ps = perSpecies.get(it.expected) || { hit5: 0, total: 0 };
      ps.total += 1; if (h5) ps.hit5 += 1;
      perSpecies.set(it.expected, ps);
      if (!h5) missed.push(it.expected);
    }
    // Desglose por especie: cuántas especies distintas nunca se recuperan (@5).
    let speciesFull = 0, speciesZero = 0;
    for (const [, ps] of perSpecies) {
      if (ps.hit5 === ps.total) speciesFull += 1;
      else if (ps.hit5 === 0) speciesZero += 1;
    }
    out[set.key] = {
      label: set.label, n, concept_skipped: concept,
      recall1: n ? hit1 / n : 0, recall5: n ? hit5 / n : 0, mrr: n ? rr / n : 0,
      species_distinct: perSpecies.size, species_full_recall: speciesFull, species_zero_recall: speciesZero,
      worst_missed_sample: [...new Set(missed)].slice(0, 15),
    };
  }
  const score = 100 * (
    RECALL_SET_WEIGHTS.golden * (out.golden?.recall5 || 0)
    + RECALL_SET_WEIGHTS.ampliado * (out.ampliado?.recall5 || 0)
    + RECALL_SET_WEIGHTS.self * (out.self?.recall5 || 0)
  );
  return { score: round1(score), sets: out, weights: RECALL_SET_WEIGHTS };
}

// ════════════════════════════════════════════════════════════════════════════
// DIMENSIÓN 2 — GROUNDING / anti-alucinación
// ════════════════════════════════════════════════════════════════════════════
function groundingQueries() {
  const set = loadJson(join(EVAL_DIR, 'intel-grounding.json'));
  let queries = [...set.queries].sort((a, b) => a.id.localeCompare(b.id));
  if (Number.isFinite(LIMIT)) {
    const byType = { ooc_real: [], ooc_invented: [], in_corpus: [] };
    for (const q of queries) (byType[q.type] || (byType[q.type] = [])).push(q);
    queries = [...byType.ooc_real.slice(0, LIMIT), ...byType.ooc_invented.slice(0, LIMIT), ...byType.in_corpus.slice(0, LIMIT)];
  }
  return queries;
}
async function dimGrounding(queries, evidenceMap, systemPrompt, model) {
  const rows = [];
  let oocTotal = 0, oocAbstain = 0, ctrlTotal = 0, ctrlAnswer = 0;
  for (const q of queries) {
    const evidence = evidenceMap.get(q.query) || [];
    const gen = await generate(buildGroundedPrompt(systemPrompt, q.query, evidence), model);
    const text = gen.text || '';
    // Respuesta vacía (típico de reasoning models que gastan todo en el canal de
    // thinking): cuenta como FALLO de grounding, no se descarta. No abstiene ni
    // responde → penaliza en ambos buckets.
    const empty = !text.trim();
    const abstain = !empty && isAbstain(text);
    const onTopic = !empty && isOnTopic(text);
    let verdict;
    if (q.type === 'in_corpus') {
      ctrlTotal += 1;
      const answered = !abstain && !empty && onTopic;
      if (answered) ctrlAnswer += 1;
      verdict = empty ? 'VACIO' : (answered ? 'RESPONDE_OK' : (abstain ? 'SOBRE-ABSTENCION' : 'FUERA-DE-TEMA'));
    } else {
      oocTotal += 1;
      if (abstain) { oocAbstain += 1; verdict = 'ABSTIENE_OK'; }
      else verdict = empty ? 'VACIO' : 'ALUCINA';
    }
    rows.push({ id: q.id, type: q.type, query: q.query, verdict, abstain, empty, on_topic: onTopic, response: text.slice(0, 200), error: gen._error || null });
  }
  const abstainRate = oocTotal ? oocAbstain / oocTotal : 0;
  const answerRate = ctrlTotal ? ctrlAnswer / ctrlTotal : 0;
  const score = 100 * weightedHarmonic(abstainRate, answerRate, GROUNDING_W.abstain, GROUNDING_W.control);
  const emptyCount = rows.filter((r) => r.empty).length;
  return {
    score: round1(score),
    abstain_rate_ooc: abstainRate, hallucination_rate_ooc: 1 - abstainRate,
    answer_rate_control: answerRate, over_refusal_rate_control: 1 - answerRate,
    ooc_total: oocTotal, control_total: ctrlTotal, empty_count: emptyCount, weights: GROUNDING_W, rows,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DIMENSIÓN 3 — RELACIONES / grafo
// ════════════════════════════════════════════════════════════════════════════
async function dimRelaciones(retrieve, mcpOk) {
  const set = loadJson(join(EVAL_DIR, 'intel-relaciones.json'));
  let queries = [...set.queries].sort((a, b) => a.id.localeCompare(b.id));
  if (Number.isFinite(LIMIT)) queries = queries.slice(0, LIMIT);
  if (!mcpOk) return { score: null, available: false, note: 'MCP inalcanzable o sin token — dimensión N/A (excluida del ÍNDICE).', rows: [] };

  const rows = [];
  let graphHit = 0, vectorHit = 0, coverageOk = 0, coverageTotal = 0, n = 0;
  for (const q of queries) {
    n += 1;
    // vector (sin grafo): ¿el retrieval híbrido devuelve alguna especie asociada en top-5?
    const hits = await retrieve(q.query, TOP_K, 'intel');
    const slugs = hits.map((h) => h.species);
    let vHit = false;
    if (q.expected_entities.length) vHit = q.expected_entities.some((e) => slugs.some((s) => matchesSpecies(s, e)));
    // grafo (con MCP):
    const res = await mcpTool(q.mcp_tool, q.mcp_args);
    const returned = extractSpeciesIds(res);
    let gHit;
    if (q.expected_entities.length) {
      gHit = q.expected_entities.some((e) => returned.some((id) => matchesSpecies(id, e)));
    } else {
      // pest_control sin ground-truth exacto → cobertura: el grafo devuelve controladores no vacíos.
      coverageTotal += 1;
      gHit = returned.length > 0;
      if (gHit) coverageOk += 1;
    }
    if (vHit) vectorHit += 1;
    if (gHit) graphHit += 1;
    rows.push({
      id: q.id, query: q.query, relation: q.relation, subject: q.subject,
      expected: q.expected_entities, vector_top5: slugs, vector_hit: vHit,
      graph_returned: returned.slice(0, 8), graph_found: res?.found, graph_hit: gHit,
      graph_error: res?._http || res?._error || null,
    });
  }
  const graphRate = n ? graphHit / n : 0;
  const vectorRate = n ? vectorHit / n : 0;
  return {
    score: round1(100 * graphRate), available: true,
    graph_hit_rate: graphRate, vector_hit_rate: vectorRate, graph_advantage: graphRate - vectorRate,
    coverage_ok: coverageOk, coverage_total: coverageTotal, n, rows,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DIMENSIÓN 4 — TAXONOMÍA
// ════════════════════════════════════════════════════════════════════════════
function taxonomiaQueries() {
  const set = loadJson(join(EVAL_DIR, 'intel-taxonomia.json'));
  let queries = [...set.queries].sort((a, b) => a.id.localeCompare(b.id));
  if (Number.isFinite(LIMIT)) queries = queries.slice(0, LIMIT);
  return queries;
}
function taxPromptQuery(common) {
  return `¿Cuál es el nombre científico (binomio en latín) de la especie conocida como "${common}"? Responde solo el género y el epíteto.`;
}
async function dimTaxonomia(queries, evidenceMap, systemPrompt, model) {
  const rows = [];
  let correct = 0, n = 0;
  for (const q of queries) {
    n += 1;
    const query = taxPromptQuery(q.common_name);
    const evidence = evidenceMap.get(q.common_name) || [];
    const gen = await generate(buildGroundedPrompt(systemPrompt, query, evidence), model);
    const text = gen.text || '';
    const empty = !text.trim();
    const n2 = norm(text);
    const ok = !empty && n2.includes(norm(q.expected_genus)) && n2.includes(norm(q.expected_epithet));
    if (ok) correct += 1;
    rows.push({
      id: q.id, common_name: q.common_name, expected: `${q.expected_genus} ${q.expected_epithet}`,
      trap: q.trap || null, correct: ok, empty, response: text.slice(0, 160), error: gen._error || null,
    });
  }
  return { score: round1(n ? 100 * correct / n : 0), correct, n, rows };
}

// ════════════════════════════════════════════════════════════════════════════
// SUITE DE VISIÓN (opcional, --vision) — brazo visual multimodal
// ════════════════════════════════════════════════════════════════════════════
// Pregunta de fondo: ¿gemma4:e4b (chat+visión unificado) iguala/supera a
// qwen3-vl:8b (brazo visual de prod)? Si sí, se jubila qwen3-vl y su swap de 53s.
import { readFileSync as _rf } from 'node:fs';

// Marcadores de HONESTIDAD visual: incertidumbre explícita o "planta sana".
// Su presencia = el modelo NO inventó un diagnóstico preciso falso.
// Marcadores de HONESTIDAD visual: incertidumbre explícita, hedge o "planta
// sana". Cubre las formas REALES en que los modelos se abstienen en español
// (validado con respuestas crudas 2026-07-23: "no se puede determinar",
// "parece estar sana", "no se observa ninguna plaga", "difícil saber",
// "no puedo confirmarlo con certeza", "sin más información") + inglés.
const VIS_UNCERTAIN_RE = new RegExp([
  // — incertidumbre / no puedo (ES) —
  'no s[eé]\\b', 'no estoy segur', 'no tengo (certeza|seguridad|informaci|datos)',
  'no (se )?pued[oe]n? (determinar|identificar|saber|confirmar|precisar|asegurar|decir|dar|establecer)',
  'no es posible (dar|determinar|identificar|confirmar|precisar|un diagn|saber)',
  'no logro (determinar|identificar|ver)', 'no (se )?aprecia', 'no identifico', 'no observo', 'no detecto',
  'no reconozco', 'no distingo', 'no es (posible )?(clar|concluyente|definitiv)', 'no concluyente',
  // — no hay plaga / sano (ES) —
  'no (se )?(observa|ve|aprecia|nota|detecta)n? (ning|una |alguna |plaga|enfermedad|s[ií]ntoma|signo|indicio|evidencia|problema)',
  'no hay (plaga|enfermedad|s[ií]ntoma|señal|signo|indicio|evidencia|problema)',
  'sin (s[ií]ntoma|signos|plaga|evidencia|problema)', 'no aparent', 'no veo (plaga|enfermedad|s[ií]ntoma|nada|ning|signo)',
  '(se ve|parece|luce|est[aá]|en) .{0,14}(sana|sano|saludable|buen estado|buena salud|buen estado general)',
  '\\bsana\\b', '\\bsano\\b', 'saludable', 'buen estado', 'buena salud',
  // — hedge / se necesita más (ES) —
  'dif[ií]cil (de )?(saber|determinar|identificar|decir|precisar|confirmar)',
  'no puedo confirmar', 'sin (poder )?confirmar', 'no confirmo', 'con certeza',
  'solo con (la|una|esta) (imagen|foto|fotograf)', 'a partir de (la|una|esta) (imagen|foto)',
  'necesit[ao].{0,20}(m[aá]s informaci|examen|an[aá]lisis|detalle|inspecci)', 'requiere.{0,20}(examen|an[aá]lisis|inspecci)',
  'consult[ae] .{0,12}(agr[oó]nom|t[eé]cnic|especialista|profesional|experto)',
  'podr[ií]a ser', 'posiblemente', 'probablemente', 'tal vez', 'quiz[aá]', 'no descarto', 'parec(e|er[ií]a)',
  // — inglés (llava/moondream/llama-vision) —
  "not (sure|certain|possible)", "cannot (be )?(sure|determine|identify|tell|confirm|say)",
  "can't (be )?(sure|determine|identify|tell|confirm|say)", "unable to (determine|identify|tell|confirm)",
  "\\bhealthy\\b", "appears (healthy|normal|fine)", "looks (healthy|normal|fine|good)",
  "no (visible |apparent )?(pest|disease|symptom|sign|issue|problem)", "hard to (tell|determine|say)",
  "difficult to (tell|determine|identify|say)", "unclear", "not clear", "no signs", "without more",
  "more (information|detail|examination)", "consult", "possibly", "might be", "could be", "seems",
].join('|'), 'i');

// Deriva tokens científicos del nombre de archivo (p. ej. hemileia_vastatrix.jpg →
// ['hemileia','vastatrix']) para dar crédito a modelos que responden con el binomio
// latino sin importar el idioma. Solo aplica a imágenes de diagnóstico.
function sciTokensFromImage(imagePath) {
  const base = imagePath.split('/').pop().replace(/\.\w+$/, '');
  return base.split('_').filter((t) => t.length > 3);
}

async function generateVision(model, prompt, b64, keepAlive = '2m') {
  const t0 = Date.now();
  try {
    const res = await nativeFetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(VIS_TIMEOUT_MS),
      body: JSON.stringify({
        model, prompt, images: [b64], stream: false, think: false, keep_alive: keepAlive,
        options: { temperature: 0, top_p: 1, top_k: 1, seed: 42, num_predict: NUM_PREDICT },
      }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { _error: `http ${res.status}`, ms };
    const data = await res.json();
    return { text: (data.response || '').trim(), ms };
  } catch (err) { return { _error: err?.name === 'TimeoutError' ? `timeout ${VIS_TIMEOUT_MS}ms` : (err?.message || 'fetch failed'), ms: Date.now() - t0 }; }
}

async function dimVisionForModel(model, spec, images) {
  const rows = [];
  let diagTotal = 0, diagOk = 0, honTotal = 0, honOk = 0, empty = 0;
  const latencies = [];
  for (const it of images) {
    const b64 = _rf(join(PUBLIC, it.image)).toString('base64');
    const gen = await generateVision(model, spec.prompt, b64);
    if (typeof gen.ms === 'number') latencies.push(gen.ms);
    const text = gen.text || '';
    const isEmpty = !text.trim();
    if (isEmpty) empty += 1;
    const n = norm(text);
    let verdict, ok;
    if (it.type === 'diagnostico') {
      diagTotal += 1;
      const accept = [...(it.accept || []), ...sciTokensFromImage(it.image)];
      ok = !isEmpty && accept.some((a) => n.includes(norm(a)));
      if (ok) diagOk += 1;
      verdict = isEmpty ? 'VACIO' : (ok ? 'ACIERTA' : 'FALLA');
    } else { // honestidad
      honTotal += 1;
      const honest = !isEmpty && VIS_UNCERTAIN_RE.test(n);
      if (honest) honOk += 1;
      ok = honest;
      verdict = isEmpty ? 'VACIO' : (honest ? 'HONESTO' : 'ALUCINA_DX');
    }
    rows.push({ id: it.id, type: it.type, image: it.image, target: it.target, verdict, correct: ok, empty: isEmpty, ms: gen.ms, response: text.slice(0, 180), error: gen._error || null });
  }
  const aciertoRate = diagTotal ? diagOk / diagTotal : 0;
  const honestidadRate = honTotal ? honOk / honTotal : 0;
  const score = 100 * weightedHarmonic(aciertoRate, honestidadRate, 0.6, 0.4);
  const sorted = [...latencies].sort((a, b) => a - b);
  const avgMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const medMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return {
    model, score: round1(score),
    acierto_rate: aciertoRate, honestidad_rate: honestidadRate,
    diag_ok: diagOk, diag_total: diagTotal, hon_ok: honOk, hon_total: honTotal, empty_count: empty,
    latency_avg_s: round1(avgMs / 1000), latency_med_s: round1(medMs / 1000), rows,
  };
}

async function dimVision(models) {
  const spec = loadJson(join(EVAL_DIR, 'intel-vision.json'));
  // Override del prompt para probar sensibilidad (p. ej. el prompt estricto que
  // exige qwen3-vl). Si no se pasa, usa el prompt agronómico del set.
  if (process.env.VISION_PROMPT_OVERRIDE) spec.prompt = process.env.VISION_PROMPT_OVERRIDE;
  const images = [...spec.images].sort((a, b) => a.id.localeCompare(b.id));
  const results = [];
  for (const model of models) {
    console.error(`[intel] VISIÓN modelo ${model} (${images.length} imgs)…`);
    const r = await dimVisionForModel(model, spec, images);
    results.push(r);
    console.error(`[intel] VISIÓN ${model}: score ${r.score} (acierto ${pct(r.acierto_rate)}, honestidad ${pct(r.honestidad_rate)}). Descargando…`);
    await unloadModel(model);
  }
  const diagCount = images.filter((i) => i.type === 'diagnostico').length;
  return {
    weight_acierto: 0.6, weight_honestidad: 0.4, images: images.length,
    diag_count: diagCount, hon_count: images.length - diagCount, models: results,
  };
}

function printVisionReport(vision) {
  const L = console.log;
  L('\n' + '='.repeat(86));
  L('  BENCH VISUAL PROFUNDO — ¿e4b puede reemplazar a qwen3-vl como brazo visual?');
  L('='.repeat(86));
  L(`  ${vision.images} imágenes (${vision.diag_count} plagas etiquetadas + ${vision.hon_count} sanas de control)`);
  L(`  IDENTIFICACIÓN = tarea real (campesino fotografía su planta) · HONESTIDAD = anti-alucinación en sanas · LATENCIA = trade-off del swap`);
  L('-'.repeat(86));
  L(`  ${'MODELO'.padEnd(20)} ${'IDENTIFIC.'.padStart(12)} ${'HONESTIDAD'.padStart(12)} ${'LAT s/img'.padStart(10)} ${'VACÍAS'.padStart(7)} ${'VISIÓN'.padStart(7)}`);
  const ranked = [...vision.models].sort((a, b) => b.acierto_rate - a.acierto_rate || b.score - a.score);
  for (const m of ranked) {
    L(`  ${m.model.padEnd(20)} ${(`${m.diag_ok}/${m.diag_total} ${pct(m.acierto_rate)}`).padStart(12)} ${(`${m.hon_ok}/${m.hon_total} ${pct(m.honestidad_rate)}`).padStart(12)} ${(`${m.latency_avg_s}`).padStart(10)} ${String(m.empty_count).padStart(7)} ${String(m.score).padStart(7)}`);
  }
  L('='.repeat(86) + '\n');
}

// ── Índice global ────────────────────────────────────────────────────────────
function computeIndex(dims) {
  const avail = [];
  for (const [k, w] of Object.entries(INDEX_WEIGHTS)) {
    const s = dims[k]?.score;
    if (typeof s === 'number') avail.push({ k, w, s });
  }
  const wsum = avail.reduce((a, d) => a + d.w, 0);
  const index = wsum ? avail.reduce((a, d) => a + d.w * d.s, 0) / wsum : 0;
  return { index: round1(index), contributions: avail, weight_sum: wsum, partial: wsum < 0.999 };
}

// Pre-cómputo de evidencia RAG (solo nomic) para las dimensiones LLM, para que
// el retrieval corra UNA vez y no se alterne con el modelo de chat en la VRAM.
async function precomputeEvidence(retrieve, keys) {
  const map = new Map();
  for (const key of keys) {
    if (map.has(key)) continue;
    map.set(key, await retrieve(key, EVIDENCE_K, 'intel'));
  }
  return map;
}

// ── Reporte ──────────────────────────────────────────────────────────────────
function printSharedDims(recall, relaciones) {
  const L = console.log;
  L(`  [1] RECALL       ${String(recall.score).padStart(5)} / 100   (peso ${INDEX_WEIGHTS.recall})   [independiente del modelo de chat]${recall.fixed ? ' — CONSTANTE (línea base)' : ''}`);
  for (const [, s] of Object.entries(recall.sets || {})) {
    if (s.error) { L(`        ${s.label}: ${s.error}`); continue; }
    L(`        ${s.label.padEnd(26)} n=${String(s.n).padStart(3)} r@1=${pct(s.recall1)} r@5=${pct(s.recall5)} mrr=${s.mrr.toFixed(3)} | especies sin recuperar@5: ${s.species_zero_recall}/${s.species_distinct}`);
  }
  if (relaciones.fixed) {
    L(`  [3] RELACIONES   ${String(relaciones.score).padStart(5)} / 100   (peso ${INDEX_WEIGHTS.relaciones})   [independiente del modelo de chat] — CONSTANTE (línea base)`);
  } else if (relaciones.available) {
    L(`  [3] RELACIONES   ${String(relaciones.score).padStart(5)} / 100   (peso ${INDEX_WEIGHTS.relaciones})   [independiente del modelo de chat]`);
    L(`        grafo acierta: ${pct(relaciones.graph_hit_rate)}  vs  vector solo: ${pct(relaciones.vector_hit_rate)}  | VENTAJA DEL GRAFO: ${pct(relaciones.graph_advantage)}`);
  } else {
    L(`  [3] RELACIONES     N/A          (${relaciones.note})`);
  }
}
function printModelBlock(m) {
  const L = console.log;
  const g = m.grounding, t = m.taxonomia;
  L(`  ── modelo: ${m.model} ──  ÍNDICE ${m.index.index}${m.index.partial ? ' (parcial)' : ''} / 100`);
  L(`     [2] GROUNDING ${String(g.score).padStart(5)}/100  abstención OOC ${pct(g.abstain_rate_ooc)} (alucina ${pct(g.hallucination_rate_ooc)}, n=${g.ooc_total}) · responde control ${pct(g.answer_rate_control)} (sobre-abstiene ${pct(g.over_refusal_rate_control)}, n=${g.control_total})${g.empty_count ? ` · VACÍAS: ${g.empty_count}` : ''}`);
  L(`     [4] TAXONOMÍA ${String(t.score).padStart(5)}/100  ${t.correct}/${t.n} correctas`);
}
function printReport(result) {
  const L = console.log;
  L('\n' + '='.repeat(78));
  L('  TEST DE INTELIGENCIA FUERTE — CHAGRA');
  L('='.repeat(78));
  L(`  fecha: ${result.date}   embed: ${result.config.embed_model}   corpus: ${result.config.corpus_slugs} fichas   MCP: ${result.config.mcp_available ? 'vivo' : 'N/A'}`);
  L(`  modelos de chat evaluados: ${result.models.map((m) => m.model).join(', ')}`);
  L('-'.repeat(78));
  printSharedDims(result.shared.recall, result.shared.relaciones);
  L('-'.repeat(78));
  L('  Dimensiones dependientes del modelo (2 GROUNDING · 4 TAXONOMÍA):');
  for (const m of result.models) printModelBlock(m);
  L('-'.repeat(78));
  // Tabla comparativa.
  const hdr = `  ${'MODELO'.padEnd(14)} ${'RECALL'.padStart(7)} ${'GROUND'.padStart(7)} ${'RELAC'.padStart(7)} ${'TAXON'.padStart(7)} ${'ÍNDICE'.padStart(8)}`;
  L(hdr);
  for (const m of result.models) {
    L(`  ${m.model.padEnd(14)} ${String(result.shared.recall.score).padStart(7)} ${String(m.grounding.score).padStart(7)} ${String(result.shared.relaciones.score ?? 'N/A').padStart(7)} ${String(m.taxonomia.score).padStart(7)} ${String(m.index.index).padStart(8)}`);
  }
  L('-'.repeat(78));
  L(`  >>> ÍNDICE DE INTELIGENCIA (prod = ${result.models[0].model}): ${result.index} / 100`);
  L('='.repeat(78) + '\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const date = new Date().toISOString().slice(0, 10);
  console.error(`[intel] arrancando — ollama=${OLLAMA_URL} mcp=${MCP_BASE_URL} modelos=${CHAT_MODELS.join(',')}`);

  // ── Suite de VISIÓN sola (--vision-only): no toca el retriever ni el corpus ──
  if (VISION_ONLY) {
    console.error(`[intel] modo VISIÓN-ONLY — modelos: ${VISION_MODELS.join(', ')}`);
    const vision = await dimVision(VISION_MODELS);
    printVisionReport(vision);
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    const vp = join(OUT_DIR, `test-inteligencia-vision-${date}.json`);
    writeFileSync(vp, JSON.stringify({ date, vision, config: { vision_models: VISION_MODELS, ollama_url_env: !!process.env.OLLAMA_URL } }, null, 2));
    console.error(`[intel] escrito: ${vp}`);
    return;
  }

  const fixedShared = FIXED_RECALL != null && FIXED_RELACIONES != null;
  const mcpOk = fixedShared ? false : (MCP_TOKEN ? await mcpHealthy() : false);
  if (fixedShared) console.error(`[intel] modo dims-fijas: RECALL=${FIXED_RECALL} RELACIONES=${FIXED_RELACIONES} (no se re-corre retrieval/grafo).`);
  else if (!MCP_TOKEN) console.error('[intel] CHAGRA_MCP_TOKEN ausente → dimensión RELACIONES será N/A.');
  else if (!mcpOk) console.error('[intel] MCP /healthz no responde ok → dimensión RELACIONES será N/A.');

  // Retriever de producción con corpus COMPLETO (loader + fetch shim).
  register(new URL('./test-inteligencia-chagra.loader.mjs', import.meta.url).href);
  installRetrieverFetchShim();
  const { retrieve, getCorpusStats } = await import(new URL('../src/services/ragRetriever.js', import.meta.url).href);
  const { SYSTEM_PROMPT_BASE } = await import(new URL('../src/services/llmGuardrails.js', import.meta.url).href);
  const corpusSlugs = new Set(Object.keys(loadJson(EMBEDDINGS_PATH)));

  await retrieve('maíz', TOP_K, 'intel'); // warm-up
  const stats = getCorpusStats ? await getCorpusStats() : null;
  console.error(`[intel] corpus indexado: ${stats ? JSON.stringify(stats) : 'n/d'} | slugs embeddings: ${corpusSlugs.size}`);

  // ── Dimensiones INDEPENDIENTES del modelo de chat (retrieval + grafo) ──
  let recall, relaciones;
  if (fixedShared) {
    recall = { score: FIXED_RECALL, fixed: true, sets: {} };
    relaciones = { score: FIXED_RELACIONES, available: true, fixed: true };
  } else {
    console.error('[intel] dim 1 RECALL (retrieval, nomic)…');
    recall = await dimRecall(retrieve, corpusSlugs);
    console.error('[intel] dim 3 RELACIONES (grafo/MCP)…');
    relaciones = await dimRelaciones(retrieve, mcpOk);
  }

  // ── Evidencia RAG para las dimensiones LLM: se pre-calcula una sola vez ──
  const gq = groundingQueries();
  const tq = taxonomiaQueries();
  const evKeys = [...gq.map((q) => q.query), ...tq.map((q) => q.common_name)];
  console.error(`[intel] pre-calculando evidencia RAG para ${evKeys.length} queries LLM…`);
  const evidenceMap = await precomputeEvidence(retrieve, evKeys);

  // ── Dimensiones DEPENDIENTES del modelo (grounding + taxonomía), SECUENCIAL ──
  const models = [];
  for (const model of CHAT_MODELS) {
    console.error(`[intel] modelo ${model}: dim 2 GROUNDING…`);
    const grounding = await dimGrounding(gq, evidenceMap, SYSTEM_PROMPT_BASE, model);
    console.error(`[intel] modelo ${model}: dim 4 TAXONOMÍA…`);
    const taxonomia = await dimTaxonomia(tq, evidenceMap, SYSTEM_PROMPT_BASE, model);
    const index = computeIndex({ recall, grounding, relaciones, taxonomia });
    models.push({ model, grounding, taxonomia, index });
    console.error(`[intel] modelo ${model}: ÍNDICE ${index.index}. Descargando de VRAM…`);
    await unloadModel(model); // liberar antes del siguiente (M6000 12 GB)
  }

  const result = {
    date, index: models[0].index.index,
    shared: { recall, relaciones },
    models,
    config: {
      chat_models: CHAT_MODELS, prod_model: CHAT_MODELS[0], embed_model: EMBED_MODEL,
      corpus_slugs: corpusSlugs.size, corpus_stats: stats, mcp_available: mcpOk, mcp_base: MCP_BASE_URL,
      weights: INDEX_WEIGHTS, limit: Number.isFinite(LIMIT) ? LIMIT : null,
    },
  };

  printReport(result);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `test-inteligencia-${date}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.error(`[intel] escrito: ${outPath}`);

  const prod = models[0];
  if (WRITE_BASELINE) {
    const baseline = {
      date, model: prod.model, index: prod.index.index,
      dimensions: { recall: recall.score, grounding: prod.grounding.score, relaciones: relaciones.score, taxonomia: prod.taxonomia.score },
      weights: INDEX_WEIGHTS,
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
    console.error(`[intel] baseline fijado (prod ${prod.model}): ${BASELINE_PATH} (ÍNDICE ${prod.index.index})`);
  }

  if (CHECK_MODE) {
    if (!existsSync(BASELINE_PATH)) { console.error('[intel] --check sin baseline; corra --write-baseline primero.'); process.exit(2); }
    const base = loadJson(BASELINE_PATH);
    const delta = round1(prod.index.index - base.index);
    console.error(`[intel] --check: ÍNDICE ${prod.index.index} vs baseline ${base.index} (Δ ${delta >= 0 ? '+' : ''}${delta})`);
    if (prod.index.index < base.index - CHECK_TOLERANCE) {
      console.error(`[intel] REGRESIÓN: ÍNDICE cayó más de ${CHECK_TOLERANCE} pts. Fallo.`);
      process.exit(1);
    }
    console.error('[intel] OK — sin regresión.');
  }

  // ── Suite de visión, además de las dims de texto (--vision) ──
  if (RUN_VISION) {
    const vision = await dimVision(VISION_MODELS);
    printVisionReport(vision);
    result.vision = vision;
    writeFileSync(outPath, JSON.stringify(result, null, 2));
  }
}

main().catch((err) => { console.error('[intel] ERROR:', err); process.exit(1); });
