#!/usr/bin/env node
/* Chagra · NLU BENCH SÓLIDO — grade-decision routing bench.
 *
 * Mide accuracy (modelo-solo y modelo+corrector), latencia WARM p50/p95 y
 * estabilidad de candidatos de NLU, ejecutando la PIPELINE REAL de prod:
 * importa el system prompt (buildSystemPrompt + FALLBACK_TOOL_SCHEMAS) y el
 * corrector heurístico (correctRouting) del `dist/` compilado del sidecar —
 * NO reimplementa la clasificación. Habla con el Ollama real (alpha:11434).
 *
 * NO toca el servicio de prod agro-mcp-sidecar.service: solo hace llamadas
 * /api/chat directas a Ollama, igual que haría el sidecar.
 *
 * Uso:
 *   node nlu-bench.mjs                 # todos los candidatos + cascade
 *   node nlu-bench.mjs --reps 3        # repeticiones por query (latencia)
 *   node nlu-bench.mjs --only granite3.1-dense:8b
 *
 * Al terminar re-pinea granite3.1-dense:8b (keep_alive:-1) — chat+NLU de prod.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- import EXACTO de la pipeline de prod desde el dist compilado -----------
const DIST_NLU = resolve(
  __dirname,
  "../../../chagra-pro/modules/agro-mcp/sidecar/dist/src/nlu.js",
);
const {
  buildSystemPrompt,
  FALLBACK_TOOL_SCHEMAS,
  correctRouting,
  tolerantParseJsonObject,
} = await import(DIST_NLU);

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

// Allow-list de rutas CONECTADAS (verificada contra sidecarClient.js + spec).
// Cualquier tool fuera de esto se trata como "no conectada" → se considera
// que el modelo NO produjo una ruta válida (out-of-catalog para el bench).
const CONNECTED_TOOLS = new Set([
  "get_species",
  "get_companions",
  "get_multihop_companions",
  "get_biopreparados",
  "get_pest_controllers",
  "get_precio_sipsa",
  "get_normativa_ica",
  "get_subgrafo_relacional",
  "get_diseno_restauracion",
  "get_clima_ideam",
  "get_enso_status",
  "get_alertas_clima_zona",
]);

// El system prompt de prod incluye TODAS las tools del catálogo (incluidas las
// no-conectadas como get_diseno_silvopastoril). Usamos el MISMO catálogo que
// prod (FALLBACK_TOOL_SCHEMAS == lo que el MCP listTools mapea) para fidelidad.
const SYSTEM_PROMPT = buildSystemPrompt(FALLBACK_TOOL_SCHEMAS);

const CASES = JSON.parse(
  readFileSync(resolve(__dirname, "nlu-bench-cases.json"), "utf8"),
).cases;

// --- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
function argVal(flag, def) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const REPS = Number(argVal("--reps", "3"));
const ONLY = argVal("--only", null);

const CANDIDATES = [
  "granite3.3:8b",       // PROD actual (chat+NLU unificado tras fix #93)
  "granite3.1-dense:8b", // baseline previo
  "ministral-3:latest",  // ganó NLU (0.90); candidato unificado NLU+visión+tools
  "ministral-3:14b",     // ganó NLU (0.95) pero p95 alto
  // --- INTEGRADOS 2026-06-23 (gemma + cuantizados nuevos / perdidos de vista) ---
  "gemma3:4b",           // CO-RESIDE con granite3.3 (visión OK); medir como NLU
  "gemma3:12b",          // gemma grande
  "qwen3.5:9b",          // NUEVO, pulled pero NUNCA benchado (perdido de vista)
  "qwen3.5:4b",          // qwen3.5 chico
  "command-r7b:7b",      // Cohere, tool-calling-first, multilingüe — sin benchar
  "gemma4:e2b",          // gemma4 chico (7.2GB) — pulled, sin benchar (e4b dio 0.45)
  // descartados por bench previo (acc<0.7): gemma4:e4b 0.45, granite3.1-moe:1b 0.55, qwen2.5:1.5b 0.70
].filter((m) => !ONLY || m === ONLY);

// --- llamada a Ollama: MISMO requestBody que planNlu en prod ----------------
async function callOllama(model, userMessage, timeoutMs = 30000) {
  const url = `${OLLAMA_URL.replace(/\/+$/, "")}/api/chat`;
  const requestBody = {
    model,
    stream: false,
    keep_alive: "60s",
    format: "json",
    options: { temperature: 0, num_predict: 150 },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const latency = Date.now() - t0;
    if (!res.ok) return { ok: false, latency, reason: `http_${res.status}` };
    const json = await res.json();
    const content = json?.message?.content ?? "";
    return { ok: true, latency, content };
  } catch (err) {
    return { ok: false, latency: Date.now() - t0, reason: err.name };
  } finally {
    clearTimeout(timer);
  }
}

// --- parseo del plan crudo del modelo (modelo-solo) -------------------------
// Replica EXACTO el path de validación de planNlu PERO sin correctRouting:
// objeto JSON tolerante → use_tool/tool/tool_chain → allow-list. Esto es la
// decisión del MODELO SOLO (antes del corrector heurístico).
function decideModelSolo(content) {
  if (!content || content.indexOf("{") < 0) {
    return { use_tool: false, tool: null, chain: null, reason: "no_json" };
  }
  const parsed = tolerantParseJsonObject(content);
  if (!parsed.ok) {
    return { use_tool: false, tool: null, chain: null, reason: "malformed_json" };
  }
  const plan = parsed.value;
  const wantsTool = plan.use_tool === true;
  const toolName = typeof plan.tool === "string" ? plan.tool : null;
  const chainRaw = plan.tool_chain;
  if (wantsTool && Array.isArray(chainRaw) && !toolName) {
    const chain = chainRaw
      .filter((s) => s && typeof s.tool === "string" && CONNECTED_TOOLS.has(s.tool))
      .map((s) => s.tool);
    if (chain.length > 0) return { use_tool: true, tool: chain[0], chain, reason: "chain" };
    return { use_tool: false, tool: null, chain: [], reason: "chain_invalid" };
  }
  if (wantsTool && toolName && CONNECTED_TOOLS.has(toolName)) {
    return { use_tool: true, tool: toolName, chain: null, reason: "tool" };
  }
  if (wantsTool && toolName) {
    // El modelo pidió una tool fuera de las CONECTADAS (p.ej. silvopastoril,
    // calendario, viables): para el bench cuenta como ruta no válida.
    return { use_tool: false, tool: null, chain: null, reason: "tool_not_connected" };
  }
  return { use_tool: false, tool: null, chain: null, reason: "no_tool" };
}

// --- decisión modelo+corrector (pipeline de prod completa) ------------------
// Aplica correctRouting (idéntico a planNlu) sobre el plan crudo, luego valida
// allow-list de conectadas.
function decideModelCorrector(userMessage, content) {
  if (!content || content.indexOf("{") < 0) {
    // Sin JSON el corrector igual puede forzar (R0/R0c/R0d2/R0e operan sobre el
    // plan; con plan vacío use_tool=false y el corrector evalúa keywords).
    return applyCorrector(userMessage, { use_tool: false });
  }
  const parsed = tolerantParseJsonObject(content);
  const plan = parsed.ok ? parsed.value : { use_tool: false };
  return applyCorrector(userMessage, plan);
}

function applyCorrector(userMessage, plan) {
  const corrected = correctRouting(userMessage, plan).plan;
  const wantsTool = corrected.use_tool === true;
  const toolName = typeof corrected.tool === "string" ? corrected.tool : null;
  const chainRaw = corrected.tool_chain;
  if (wantsTool && Array.isArray(chainRaw) && !toolName) {
    const chain = chainRaw
      .filter((s) => s && typeof s.tool === "string" && CONNECTED_TOOLS.has(s.tool))
      .map((s) => s.tool);
    if (chain.length > 0) return { use_tool: true, tool: chain[0], chain };
    return { use_tool: false, tool: null, chain: [] };
  }
  if (wantsTool && toolName && CONNECTED_TOOLS.has(toolName)) {
    return { use_tool: true, tool: toolName, chain: null };
  }
  return { use_tool: false, tool: null, chain: null };
}

// --- evaluación de un caso vs su label --------------------------------------
function gradeCase(c, decision) {
  // chat esperado → acierta si use_tool=false
  if (c.expected_tool === "chat") {
    return decision.use_tool === false;
  }
  // cadena esperada → acierta si trae chain con el conjunto esperado
  if (c.expected_chain) {
    if (!decision.chain || decision.chain.length === 0) return false;
    const got = new Set(decision.chain);
    return c.expected_chain.every((t) => got.has(t));
  }
  // tool simple esperado
  if (c.expected_tool) {
    return decision.use_tool === true && decision.tool === c.expected_tool;
  }
  return false;
}

function expectedLabel(c) {
  if (c.expected_tool === "chat") return "chat";
  if (c.expected_chain) return `chain[${c.expected_chain.join("+")}]`;
  return c.expected_tool;
}

function gotLabel(decision) {
  if (decision.use_tool === false) return "chat/none";
  if (decision.chain && decision.chain.length) return `chain[${decision.chain.join("+")}]`;
  return decision.tool ?? "?";
}

// --- estadística ------------------------------------------------------------
function pct(arr, p) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

async function warm(model) {
  process.stdout.write(`  warming ${model} ... `);
  const r = await callOllama(model, "café", 60000);
  console.log(r.ok ? `ok (${r.latency}ms cold)` : `FALLO (${r.reason})`);
  return r.ok;
}

// --- corrida de un candidato single-model -----------------------------------
async function runCandidate(model) {
  console.log(`\n=== Candidato: ${model} ===`);
  const ok = await warm(model);
  if (!ok) {
    console.log(`  ${model} no responde — se omite.`);
    return null;
  }

  const perCase = [];
  let crashes = 0;
  const allLatencies = [];

  for (const c of CASES) {
    // Una corrida "de referencia" (decisión) con temp 0 es determinista; las
    // REPS extra sirven para latencia/estabilidad. Usamos el content de la
    // primera rep para la decisión y promediamos latencias.
    let firstContent = null;
    let firstOk = false;
    const lat = [];
    let caseCrashes = 0;
    for (let r = 0; r < REPS; r++) {
      const res = await callOllama(model, c.query);
      if (!res.ok) {
        caseCrashes++;
        continue;
      }
      lat.push(res.latency);
      allLatencies.push(res.latency);
      if (firstContent === null) {
        firstContent = res.content;
        firstOk = true;
      }
    }
    crashes += caseCrashes;

    const solo = firstOk
      ? decideModelSolo(firstContent)
      : { use_tool: false, tool: null, chain: null, reason: "crash" };
    const corr = firstOk
      ? decideModelCorrector(c.query, firstContent)
      : { use_tool: false, tool: null, chain: null };

    const soloHit = gradeCase(c, solo);
    const corrHit = gradeCase(c, corr);

    perCase.push({
      id: c.id,
      expected: expectedLabel(c),
      solo: gotLabel(solo),
      soloHit,
      corr: gotLabel(corr),
      corrHit,
      crashes: caseCrashes,
      rawContent: firstContent,
      soloDecision: solo,
    });
  }

  const soloAcc = perCase.filter((x) => x.soloHit).length / perCase.length;
  const corrAcc = perCase.filter((x) => x.corrHit).length / perCase.length;

  return {
    model,
    soloAcc,
    corrAcc,
    p50: pct(allLatencies, 50),
    p95: pct(allLatencies, 95),
    minLat: Math.min(...allLatencies),
    maxLat: Math.max(...allLatencies),
    crashes,
    totalCalls: CASES.length * REPS,
    perCase,
  };
}

// --- CASCADE doble-LLM + conjuez --------------------------------------------
// Disparadores de escalamiento (probamos los 3 de la spec, combinados):
//  (a) el modelo pequeño emite JSON inválido / tool fuera del catálogo conectado
//  (b) DESACUERDO modelo-pequeño ↔ corrector heurístico (la decisión solo != corr)
//  (c) DESACUERDO entre DOS pequeños (granite-moe vs qwen1.5b)
// Si CUALQUIERA dispara → escala a granite3.1-dense:8b (conjuez) y se usa su
// decisión (modelo+corrector). Mide accuracy + % escalado + latencia efectiva.
async function runCascade(results) {
  console.log(`\n=== CASCADE doble-LLM + conjuez ===`);
  const SMALL_A = "granite3.1-moe:1b";
  const SMALL_B = "qwen2.5:1.5b";
  const JUDGE = "granite3.1-dense:8b";

  for (const m of [SMALL_A, SMALL_B, JUDGE]) await warm(m);

  const perCase = [];
  let escalated = 0;
  const effLatencies = [];

  for (const c of CASES) {
    // 1er pase: small A (granite-moe:1b)
    const rA = await callOllama(SMALL_A, c.query);
    const latA = rA.ok ? rA.latency : 0;
    const soloA = rA.ok ? decideModelSolo(rA.content) : { use_tool: false, tool: null, chain: null, reason: "crash" };
    const corrA = rA.ok ? decideModelCorrector(c.query, rA.content) : { use_tool: false, tool: null, chain: null };

    // Trigger (a): small A no produjo ruta válida (JSON malo / out-of-catalog)
    const triggerA = !rA.ok || soloA.reason === "malformed_json" ||
      soloA.reason === "no_json" || soloA.reason === "tool_not_connected" ||
      soloA.reason === "chain_invalid";
    // Trigger (b): desacuerdo small-A ↔ corrector
    const triggerB = gotLabel(soloA) !== gotLabel(corrA);

    // 2do pase para trigger (c): small B (qwen1.5b). Solo lo corremos si aún no
    // escalamos por (a)/(b), para reflejar el costo real del cascade.
    let triggerC = false;
    let latB = 0;
    if (!triggerA && !triggerB) {
      const rB = await callOllama(SMALL_B, c.query);
      latB = rB.ok ? rB.latency : 0;
      const corrB = rB.ok ? decideModelCorrector(c.query, rB.content) : { use_tool: false, tool: null, chain: null };
      // (c): los dos pequeños (vía corrector) difieren
      triggerC = !rB.ok || gotLabel(corrA) !== gotLabel(corrB);
    }

    const mustEscalate = triggerA || triggerB || triggerC;

    let finalDecision = corrA;
    let latJ = 0;
    let trigger = "none";
    if (triggerA) trigger = "a:invalid";
    else if (triggerB) trigger = "b:small-vs-corrector";
    else if (triggerC) trigger = "c:small-vs-small";

    if (mustEscalate) {
      escalated++;
      const rJ = await callOllama(JUDGE, c.query);
      latJ = rJ.ok ? rJ.latency : 0;
      finalDecision = rJ.ok ? decideModelCorrector(c.query, rJ.content) : corrA;
    }

    // Latencia efectiva = costo real del camino que tomó este caso.
    const effLat = latA + latB + latJ;
    effLatencies.push(effLat);

    const hit = gradeCase(c, finalDecision);
    perCase.push({
      id: c.id,
      expected: expectedLabel(c),
      got: gotLabel(finalDecision),
      hit,
      escalated: mustEscalate,
      trigger,
      effLat,
    });
  }

  const acc = perCase.filter((x) => x.hit).length / perCase.length;
  return {
    name: "cascade(moe1b → [qwen1.5b] → granite8b conjuez)",
    acc,
    escalatedPct: escalated / CASES.length,
    p50: pct(effLatencies, 50),
    p95: pct(effLatencies, 95),
    meanEff: Math.round(effLatencies.reduce((a, b) => a + b, 0) / effLatencies.length),
    perCase,
  };
}

// --- re-pin granite (chat+NLU de prod) --------------------------------------
async function repinGranite() {
  console.log("\n=== Re-pin granite3.1-dense:8b (keep_alive:-1) ===");
  const url = `${OLLAMA_URL.replace(/\/+$/, "")}/api/chat`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "granite3.1-dense:8b",
        stream: false,
        keep_alive: -1,
        messages: [{ role: "user", content: "ok" }],
        options: { num_predict: 1 },
      }),
    });
    console.log(res.ok ? "  granite re-pinneado (keep_alive:-1) ✓" : `  FALLO http_${res.status}`);
  } catch (e) {
    console.log(`  FALLO re-pin: ${e.name}`);
  }
}

// --- main -------------------------------------------------------------------
(async () => {
  console.log("NLU BENCH SÓLIDO — pipeline real de prod (system prompt + corrector)");
  console.log(`Ollama: ${OLLAMA_URL} · casos: ${CASES.length} · reps/query: ${REPS}`);
  console.log(`System prompt: ${SYSTEM_PROMPT.length} chars · catálogo: ${FALLBACK_TOOL_SCHEMAS.length} tools`);

  const results = {};
  for (const model of CANDIDATES) {
    const r = await runCandidate(model);
    if (r) results[model] = r;
  }

  let cascade = null;
  if (!ONLY) {
    cascade = await runCascade(results);
  }

  await repinGranite();

  // --- reporte tabular ------------------------------------------------------
  console.log("\n\n========================= RESULTADOS =========================");
  console.log("\nTABLA POR CANDIDATO (single-model):");
  console.log(
    "modelo".padEnd(22),
    "acc-solo".padEnd(9),
    "acc+corr".padEnd(9),
    "p50ms".padEnd(7),
    "p95ms".padEnd(7),
    "min".padEnd(6),
    "max".padEnd(7),
    "crashes",
  );
  for (const m of Object.keys(results)) {
    const r = results[m];
    console.log(
      m.padEnd(22),
      `${(r.soloAcc * 100).toFixed(0)}%`.padEnd(9),
      `${(r.corrAcc * 100).toFixed(0)}%`.padEnd(9),
      String(r.p50).padEnd(7),
      String(r.p95).padEnd(7),
      String(r.minLat).padEnd(6),
      String(r.maxLat).padEnd(7),
      `${r.crashes}/${r.totalCalls}`,
    );
  }

  if (cascade) {
    console.log("\nCASCADE:");
    console.log(`  accuracy (model+corrector, decisión final): ${(cascade.acc * 100).toFixed(0)}%`);
    console.log(`  % escalado al conjuez (granite8b): ${(cascade.escalatedPct * 100).toFixed(0)}%`);
    console.log(`  latencia efectiva p50/p95/mean: ${cascade.p50} / ${cascade.p95} / ${cascade.meanEff} ms`);
    console.log("  detalle escalamiento:");
    for (const x of cascade.perCase) {
      console.log(
        `    ${x.id} exp=${x.expected.padEnd(28)} got=${x.got.padEnd(28)} ${x.hit ? "OK " : "XX "} ${x.escalated ? "ESC[" + x.trigger + "]" : "small"} ${x.effLat}ms`,
      );
    }
  }

  // --- detalle por caso (solo/corr) para auditoría --------------------------
  console.log("\nDETALLE POR CASO (cada candidato — modelo-solo / +corrector):");
  for (const m of Object.keys(results)) {
    console.log(`\n  ${m}:`);
    for (const x of results[m].perCase) {
      console.log(
        `    ${x.id} exp=${x.expected.padEnd(26)} solo=${x.solo.padEnd(24)}${x.soloHit ? "OK" : "XX"} corr=${x.corr.padEnd(24)}${x.corrHit ? "OK" : "XX"}`,
      );
    }
  }

  // dump JSON para post-análisis
  const out = { results, cascade, meta: { reps: REPS, cases: CASES.length, promptLen: SYSTEM_PROMPT.length } };
  const { writeFileSync } = await import("node:fs");
  const outPath = resolve(__dirname, "nlu-bench-results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nResultados JSON → ${outPath}`);
})();
