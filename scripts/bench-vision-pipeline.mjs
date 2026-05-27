#!/usr/bin/env node
/**
 * bench-vision-pipeline.mjs — Bench V-02 audit visión.
 *
 * Diferencia con `bench-vision-flora.mjs` (bench crudo):
 *
 *   - Crudo: imageBlob → POST /api/generate Ollama → modelo solo.
 *   - Pipeline: imageBlob → recognizeSpecies (Ollama vision) → resolver
 *     scientific_name a species_id → POST /tools/validate_visual_match
 *     al sidecar → resultado con _grounded.{status, validation}.
 *
 * Métricas adicionales sobre el crudo:
 *
 *   - validation_rate: % de inferencias con _grounded.status === "verified"
 *   - rejection_rate: % de inferencias con _grounded.status === "rejected"
 *     (modelo dijo binomial que NO existe en catálogo — anti-halluc clave)
 *   - sidecar_latency_ms p50/p95
 *
 * Output: data/bench-runs/vision-pipeline-<ts>/{raw.jsonl, summary.md}
 *
 * Refs: audit-vision-chagra-2026-05-26.md V-02
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const FIXTURES_DIR = "/home/kortux/Workspace/Chagra-strategy/ops/antigravity/fixtures-fotos";
const GROUND_TRUTH = JSON.parse(
  fs.readFileSync("/home/kortux/Workspace/chagra/data/bench-vision-fixtures-ground-truth.json", "utf-8"),
);
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const SIDECAR = process.env.SIDECAR_URL || "http://127.0.0.1:7880";
const TOKEN = process.env.CHAGRA_MCP_TOKEN || "";
const PRIMARY_MODEL = process.env.VISION_MODEL || "llama3.2-vision:11b";

if (!TOKEN) {
  console.error("CHAGRA_MCP_TOKEN env var required (read from /run/secrets/chagra-agro-mcp-env)");
  process.exit(2);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT_DIR = path.join("/home/kortux/Workspace/chagra/data/bench-runs", `vision-pipeline-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const SPECIES_PROMPT =
  'Identify the plant species in the image. Output JSON ONLY: {"common_name_es": "...", "scientific_name": "<genus species>", "confidence": <0-1>, "alternatives": []}.';

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function scientificToSpeciesId(scientific) {
  if (typeof scientific !== "string" || scientific.trim().length === 0) return null;
  const parts = scientific.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const genus = parts[0];
  const species = parts[1];
  if (!/^[A-Za-z-]+$/.test(genus) || !/^[a-z-]+$/.test(species)) return null;
  return `${genus}_${species}`.toLowerCase();
}

async function inferVision(model, imagePath) {
  const buf = fs.readFileSync(imagePath);
  const t0 = performance.now();
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: SPECIES_PROMPT,
      images: [buf.toString("base64")],
      stream: false,
      format: "json",
      options: { temperature: 0.2, num_predict: 300 },
    }),
  });
  const latency_ms = Math.round(performance.now() - t0);
  if (!res.ok) return { latency_ms, parsed: null, raw: null, error: `HTTP ${res.status}` };
  const data = await res.json();
  let parsed = null;
  try {
    parsed = JSON.parse(data.response);
  } catch {
    const m = (data.response || "").match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { /* swallow */ }
    }
  }
  return { latency_ms, parsed, raw: data.response, error: parsed ? null : "parse_error" };
}

async function validateVisualMatch(speciesId, confidence, sourceLabel) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${SIDECAR}/tools/validate_visual_match`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Chagra-Token": TOKEN },
      body: JSON.stringify({
        candidates: [{ species_id: speciesId, confidence: confidence ?? 0.5, source_label: sourceLabel }],
      }),
    });
    const latency_ms = Math.round(performance.now() - t0);
    if (!res.ok) return { latency_ms, results: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { latency_ms, results: data.results || [], error: null };
  } catch (err) {
    return { latency_ms: Math.round(performance.now() - t0), results: null, error: err.message };
  }
}

async function pipelineInfer(fixture) {
  const imagePath = path.join(FIXTURES_DIR, fixture.file);
  if (!fs.existsSync(imagePath)) {
    return { skipped: true, reason: "file_not_found" };
  }
  // 1. Vision inference
  const visionResult = await inferVision(PRIMARY_MODEL, imagePath);
  if (!visionResult.parsed) {
    return {
      file: fixture.file,
      vision_latency_ms: visionResult.latency_ms,
      vision_parse_error: visionResult.error,
      _grounded: { status: "no-binomial", reason: "vision did not produce parseable JSON" },
    };
  }

  // 2. Derive species_id
  const speciesId = scientificToSpeciesId(visionResult.parsed.scientific_name);
  if (!speciesId) {
    return {
      file: fixture.file,
      vision_latency_ms: visionResult.latency_ms,
      pred_nombre: visionResult.parsed.common_name_es,
      pred_sci: visionResult.parsed.scientific_name,
      _grounded: { status: "no-binomial", reason: "binomial malformed" },
    };
  }

  // 3. Sidecar validate_visual_match
  const validation = await validateVisualMatch(
    speciesId,
    visionResult.parsed.confidence,
    visionResult.parsed.scientific_name,
  );
  if (validation.error) {
    return {
      file: fixture.file,
      vision_latency_ms: visionResult.latency_ms,
      sidecar_latency_ms: validation.latency_ms,
      sidecar_error: validation.error,
      pred_nombre: visionResult.parsed.common_name_es,
      pred_sci: visionResult.parsed.scientific_name,
      _grounded: { status: "sidecar-error", reason: validation.error },
    };
  }
  const primary = validation.results.find((r) => r.species_id === speciesId);
  const status = primary?.valid === true ? "verified" : "rejected";

  return {
    file: fixture.file,
    gt_nombre: fixture.nombre_comun,
    gt_sci: fixture.scientific,
    pred_nombre: visionResult.parsed.common_name_es,
    pred_sci: visionResult.parsed.scientific_name,
    confidence_vision: visionResult.parsed.confidence,
    species_id: speciesId,
    vision_latency_ms: visionResult.latency_ms,
    sidecar_latency_ms: validation.latency_ms,
    name_match: normalize(visionResult.parsed.common_name_es) === normalize(fixture.nombre_comun),
    sci_match: normalize(visionResult.parsed.scientific_name) === normalize(fixture.scientific),
    _grounded: { status, validation: primary },
  };
}

async function main() {
  console.log(`[bench-vision-pipeline] Run ${RUN_ID} → ${OUT_DIR}`);
  console.log(`Model: ${PRIMARY_MODEL}, Fixtures: ${GROUND_TRUTH.fixtures.length}\n`);

  const results = [];
  for (const fx of GROUND_TRUTH.fixtures) {
    process.stdout.write(`  ${fx.nombre_comun}... `);
    const r = await pipelineInfer(fx);
    results.push(r);
    if (r.skipped) {
      console.log(`SKIP (${r.reason})`);
    } else {
      const status = r._grounded?.status || "no-status";
      const lat = `vis=${r.vision_latency_ms}ms${r.sidecar_latency_ms ? ` side=${r.sidecar_latency_ms}ms` : ""}`;
      console.log(`${lat} [${status}] ${r.pred_nombre || "?"} / ${r.pred_sci || "?"}`);
    }
    fs.appendFileSync(path.join(OUT_DIR, "raw.jsonl"), JSON.stringify(r) + "\n");
  }

  const n = results.filter((r) => !r.skipped).length;
  const nameMatch = results.filter((r) => r.name_match).length;
  const sciMatch = results.filter((r) => r.sci_match).length;
  const verified = results.filter((r) => r._grounded?.status === "verified").length;
  const rejected = results.filter((r) => r._grounded?.status === "rejected").length;
  const noBinomial = results.filter((r) => r._grounded?.status === "no-binomial").length;
  const sidecarErr = results.filter((r) => r._grounded?.status === "sidecar-error").length;
  const visionLats = results.filter((r) => typeof r.vision_latency_ms === "number").map((r) => r.vision_latency_ms);
  const sideLats = results.filter((r) => typeof r.sidecar_latency_ms === "number").map((r) => r.sidecar_latency_ms);
  const sortedV = [...visionLats].sort((a, b) => a - b);
  const sortedS = [...sideLats].sort((a, b) => a - b);
  const pct = (arr, p) => arr[Math.floor(arr.length * p)] || 0;

  const summary = `# Bench Vision Pipeline — ${RUN_ID}

**Model**: ${PRIMARY_MODEL}
**Fixtures**: ${n}
**Pipeline**: vision → resolveSpeciesId → sidecar validate_visual_match

## Métricas

| Métrica | Valor |
|---|---|
| Nombre común correcto | ${((100 * nameMatch) / n).toFixed(1)}% (${nameMatch}/${n}) |
| Nombre científico correcto | ${((100 * sciMatch) / n).toFixed(1)}% (${sciMatch}/${n}) |
| **Grounded: verified** | **${((100 * verified) / n).toFixed(1)}%** (${verified}/${n}) |
| Grounded: rejected (anti-halluc) | ${((100 * rejected) / n).toFixed(1)}% (${rejected}/${n}) |
| Grounded: no-binomial | ${((100 * noBinomial) / n).toFixed(1)}% (${noBinomial}/${n}) |
| Sidecar error | ${((100 * sidecarErr) / n).toFixed(1)}% (${sidecarErr}/${n}) |
| Vision latency p50 / p95 | ${pct(sortedV, 0.5)}ms / ${pct(sortedV, 0.95)}ms |
| Sidecar latency p50 / p95 | ${pct(sortedS, 0.5)}ms / ${pct(sortedS, 0.95)}ms |

## Comparación con bench crudo (sin grounding)

| | Crudo (vision-flora-2026-05-27) | Pipeline (este run) |
|---|---|---|
| Nombre común | 18.8% | ${((100 * nameMatch) / n).toFixed(1)}% |
| Sci match (full) | 18.8% | ${((100 * sciMatch) / n).toFixed(1)}% |
| Anti-halluc (rejected o no-binomial) | n/a | ${((100 * (rejected + noBinomial)) / n).toFixed(1)}% |

## Interpretación

- **verified** = vision dijo X, sidecar confirma X existe en catálogo Chagra → seguro mostrar al user.
- **rejected** = vision dijo X, sidecar dice X NO existe → anti-halluc clave. Frontend debe mostrar warning amber.
- **no-binomial** = vision falló JSON o devolvió binomial inválido → mostrar "no se identificó".
- **sidecar-error** = sidecar timeout/5xx → degradar al vision result sin grounding.
`;

  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), summary);
  console.log("\n" + summary);
  console.log(`Resultados: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
