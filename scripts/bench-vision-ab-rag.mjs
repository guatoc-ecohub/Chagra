#!/usr/bin/env node
/**
 * bench-vision-ab-rag.mjs — Bench V-03 audit visión.
 *
 * Mide si inyectar contexto del catálogo Chagra al prompt de visión
 * (RAG-by-prompt) agrega valor sobre el prompt vanilla. Por cada fixture
 * corre el mismo modelo de visión dos veces:
 *
 *   - Variante A (con RAG): prompt enriched con bloque <CATALOGO_CHAGRA>
 *     que lista los binomials disponibles + nombre común. Idea: cerrar el
 *     espacio de hipótesis del modelo a especies que sí están en el
 *     catálogo, esperando reducir hallucination de binomials inventados.
 *   - Variante B (sin RAG): SPECIES_PROMPT vanilla (idéntico al usado por
 *     `src/services/aiService.js:recognizeSpecies` hoy).
 *
 * Por cada variante calcula:
 *   - parse_rate: % de outputs con JSON válido
 *   - common_name_accuracy: % match exacto contra ground-truth nombre_comun
 *   - sci_name_accuracy: % match exacto binomial vs scientific (normalizado)
 *   - hallucination_rate: % binomials que NO existen en catálogo
 *     (validate_visual_match con valid:false)
 *   - verified_rate: % con _grounded.status === verified
 *   - latency p50 / p95
 *
 * Pipeline:
 *   imageBlob → POST /api/generate Ollama (vision model + prompt A o B)
 *     → parse JSON → scientificToSpeciesId → POST sidecar
 *     /tools/validate_visual_match → resultado
 *
 * NOTA: la versión actual de `recognizeSpecies` NO inyecta RAG en el
 * prompt. El catalog hint que A inyecta es la propuesta de mejora que
 * este bench evalúa empíricamente.
 *
 * Output: data/bench-runs/vision-ab-rag-<ts>/{raw.jsonl, summary.md}
 *
 * Refs: audit-vision-chagra-2026-05-26.md V-03
 *
 * Uso:
 *   CHAGRA_MCP_TOKEN=$(sudo cat /run/secrets/chagra-agro-mcp-env | cut -d= -f2) \
 *   node --max-old-space-size=4096 scripts/bench-vision-ab-rag.mjs \
 *     [--ground-truth-only] [--limit N]
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const FIXTURES_DIR = "/home/kortux/Workspace/Chagra-strategy/ops/antigravity/fixtures-fotos";
const EXTENDED_DIR = "/home/kortux/Workspace/chagra/data/bench-vision-fixtures-extended";
const GROUND_TRUTH_PATH = "/home/kortux/Workspace/chagra/data/bench-vision-fixtures-ground-truth.json";
const EXTENDED_MANIFEST_PATH = path.join(EXTENDED_DIR, "manifest.json");
const CATALOG_PATH = "/home/kortux/Workspace/chagra/catalog/chagra-catalog-oss-subset-v3.2.json";

const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const SIDECAR = process.env.SIDECAR_URL || "http://127.0.0.1:7880";
const VISION_MODEL = process.env.VISION_MODEL || "llama3.2-vision:11b";
const BENCH_LIMIT = parseInt(process.env.BENCH_LIMIT || "0", 10);

// Token: env var primero, sino lee del secret SOPS-managed local (alpha).
function resolveToken() {
  if (process.env.CHAGRA_MCP_TOKEN) return process.env.CHAGRA_MCP_TOKEN;
  const SECRET_PATH = "/run/secrets/chagra-agro-mcp-env";
  if (fs.existsSync(SECRET_PATH)) {
    try {
      const content = fs.readFileSync(SECRET_PATH, "utf-8");
      const match = content.match(/^CHAGRA_MCP_TOKEN=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // No leyó secret — caller verá error abajo.
    }
  }
  return "";
}
const TOKEN = resolveToken();

const args = new Set(process.argv.slice(2));
const GROUND_TRUTH_ONLY = args.has("--ground-truth-only") || args.has("--no-extended");

if (!TOKEN) {
  console.error("CHAGRA_MCP_TOKEN env var required (read from /run/secrets/chagra-agro-mcp-env)");
  process.exit(2);
}
if (!fs.existsSync(GROUND_TRUTH_PATH)) {
  console.error(`Ground truth file not found: ${GROUND_TRUTH_PATH}`);
  process.exit(2);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT_DIR = path.join("/home/kortux/Workspace/chagra/data/bench-runs", `vision-ab-rag-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });
const RAW_PATH = path.join(OUT_DIR, "raw.jsonl");

// Prompt vanilla — coincide con SPECIES_PROMPT de aiService.js
// (sin el bloque `alternatives` extendido para mantener parse robusto).
const BASE_PROMPT =
  'Identify the plant species in the image. Output JSON ONLY: {"common_name_es": "<nombre comun en español, lowercase>", "scientific_name": "<genus species>", "confidence": <0-1>, "alternatives": []}.';

// Cargar catalog y construir hint RAG (lista de binomials únicos + nombre común).
// Esto es el "contexto" que la variante A inyecta al prompt.
function loadCatalogHint() {
  const data = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
  const species = data.species || [];
  const seen = new Set();
  const lines = [];
  for (const sp of species) {
    const sci = (sp.nombre_cientifico || "").trim();
    const com = (sp.nombre_comun || "").trim();
    if (!sci || !com) continue;
    // Tomar binomial (género + epíteto), dropear autoría/variedad.
    const parts = sci.split(/\s+/).filter((w) => /^[A-Za-z'×-]+$/.test(w));
    if (parts.length < 2) continue;
    const binomial = `${parts[0]} ${parts[1].replace(/'/g, "")}`;
    if (seen.has(binomial)) continue;
    seen.add(binomial);
    lines.push(`${binomial} (${com.split(" / ")[0]})`);
  }
  return lines.sort().join("\n");
}

const CATALOG_HINT = loadCatalogHint();

function buildRagPrompt(catalogHint) {
  return (
    `<CATALOGO_CHAGRA>\nEspecies disponibles en el catálogo Chagra (binomial + nombre común). ` +
    `Si la planta de la imagen coincide con una de estas, devuelve EXACTAMENTE ese binomial y nombre común. ` +
    `Si no coincide con ninguna, devuelve tu mejor identificación general.\n\n${catalogHint}\n</CATALOGO_CHAGRA>\n\n` +
    BASE_PROMPT
  );
}

const RAG_PROMPT = buildRagPrompt(CATALOG_HINT);

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
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

function extractBinomial(scientific) {
  if (typeof scientific !== "string") return "";
  const parts = scientific.trim().split(/\s+/);
  if (parts.length < 2) return "";
  return `${parts[0]} ${parts[1]}`.toLowerCase();
}

async function inferVisionOnce(model, prompt, imageBase64) {
  const t0 = performance.now();
  let latency_ms;
  let res;
  try {
    res = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        images: [imageBase64],
        stream: false,
        format: "json",
        // V-03: bumpear ctx a 8192 para que el catalog hint (~1400 toks)
        // + image tokens + prompt no degraden a 4096 default (truncated).
        options: { temperature: 0.2, num_predict: 300, num_ctx: 8192 },
        keep_alive: "30m",
      }),
    });
  } catch (err) {
    latency_ms = Math.round(performance.now() - t0);
    return { latency_ms, parsed: null, raw: null, error: `fetch_error: ${err.message}` };
  }
  latency_ms = Math.round(performance.now() - t0);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { latency_ms, parsed: null, raw: null, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
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

async function inferVision(model, prompt, imagePath) {
  const buf = fs.readFileSync(imagePath);
  const imageBase64 = buf.toString("base64");
  // Retry hasta 3 veces si Ollama devuelve HTTP 5xx (típico cuando swap
  // de modelos en VRAM o backend bajo carga concurrente con bench texto).
  let last = null;
  for (let i = 0; i < 3; i += 1) {
    const r = await inferVisionOnce(model, prompt, imageBase64);
    last = r;
    if (!r.error || !/^HTTP 5/.test(r.error)) return r;
    // Backoff 2s, 5s
    await new Promise((res) => setTimeout(res, 2000 + i * 3000));
  }
  return last;
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

async function runVariant(label, prompt, fixture, imagePath) {
  const vision = await inferVision(VISION_MODEL, prompt, imagePath);
  if (!vision.parsed) {
    return {
      variant: label,
      file: fixture.file,
      vision_latency_ms: vision.latency_ms,
      vision_parse_error: vision.error,
      raw: vision.raw,
      _grounded: { status: "no-binomial", reason: "vision did not produce parseable JSON" },
    };
  }
  const speciesId = scientificToSpeciesId(vision.parsed.scientific_name);
  if (!speciesId) {
    return {
      variant: label,
      file: fixture.file,
      vision_latency_ms: vision.latency_ms,
      pred_nombre: vision.parsed.common_name_es,
      pred_sci: vision.parsed.scientific_name,
      _grounded: { status: "no-binomial", reason: "binomial malformed" },
    };
  }
  const validation = await validateVisualMatch(
    speciesId,
    vision.parsed.confidence,
    vision.parsed.scientific_name,
  );
  if (validation.error) {
    return {
      variant: label,
      file: fixture.file,
      vision_latency_ms: vision.latency_ms,
      sidecar_latency_ms: validation.latency_ms,
      sidecar_error: validation.error,
      pred_nombre: vision.parsed.common_name_es,
      pred_sci: vision.parsed.scientific_name,
      species_id: speciesId,
      _grounded: { status: "sidecar-error", reason: validation.error },
    };
  }
  const primary = (validation.results || []).find((r) => r.species_id === speciesId);
  const status = primary?.valid === true ? "verified" : "rejected";
  return {
    variant: label,
    file: fixture.file,
    gt_nombre: fixture.nombre_comun,
    gt_sci: fixture.scientific,
    gt_in_catalog: fixture.in_catalog,
    pred_nombre: vision.parsed.common_name_es,
    pred_sci: vision.parsed.scientific_name,
    confidence_vision: vision.parsed.confidence,
    species_id: speciesId,
    vision_latency_ms: vision.latency_ms,
    sidecar_latency_ms: validation.latency_ms,
    name_match: normalize(vision.parsed.common_name_es) === normalize(fixture.nombre_comun),
    sci_match: normalize(extractBinomial(vision.parsed.scientific_name)) === normalize(fixture.scientific),
    _grounded: { status, validation: primary },
  };
}

function loadFixtures() {
  const gt = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, "utf-8"));
  let fixtures = gt.fixtures.map((f) => ({ ...f, source: "ground-truth" }));
  if (!GROUND_TRUTH_ONLY && fs.existsSync(EXTENDED_MANIFEST_PATH)) {
    const ext = JSON.parse(fs.readFileSync(EXTENDED_MANIFEST_PATH, "utf-8"));
    for (const f of ext.fixtures || []) {
      const jpgPath = path.join(EXTENDED_DIR, f.file);
      if (fs.existsSync(jpgPath)) {
        fixtures.push({
          file: f.file,
          nombre_comun: (f.nombre_comun || "").toLowerCase(),
          scientific: (f.nombre_cientifico || "").split(" ").slice(0, 2).join(" "),
          species_id: f.species_id,
          in_catalog: true,
          source: "extended",
        });
      }
    }
  }
  if (BENCH_LIMIT > 0) fixtures = fixtures.slice(0, BENCH_LIMIT);
  return fixtures;
}

function resolveImagePath(fixture) {
  if (fixture.source === "extended") return path.join(EXTENDED_DIR, fixture.file);
  return path.join(FIXTURES_DIR, fixture.file);
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p)] || 0;
}

function summarize(rows) {
  const n = rows.length;
  if (n === 0) return { n: 0 };
  const valid = rows.filter((r) => !r.vision_parse_error);
  const parseRate = (100 * valid.length) / n;
  const nameMatch = rows.filter((r) => r.name_match).length;
  const sciMatch = rows.filter((r) => r.sci_match).length;
  const verified = rows.filter((r) => r._grounded?.status === "verified").length;
  const rejected = rows.filter((r) => r._grounded?.status === "rejected").length;
  const noBinomial = rows.filter((r) => r._grounded?.status === "no-binomial").length;
  const visionLats = rows
    .filter((r) => typeof r.vision_latency_ms === "number")
    .map((r) => r.vision_latency_ms);
  // Hallucination = el modelo dio binomial parseable pero el catálogo lo rechazó.
  // (rejected == hallucinated o == correcto-pero-fuera-de-catálogo. Para fixtures
  // con in_catalog:true, rejected SI es hallucination. Para in_catalog:false, no.)
  const halluc = rows.filter(
    (r) => r._grounded?.status === "rejected" && r.gt_in_catalog === true,
  ).length;
  const inCatalogN = rows.filter((r) => r.gt_in_catalog === true).length;
  return {
    n,
    parse_rate: parseRate,
    name_match_pct: (100 * nameMatch) / n,
    sci_match_pct: (100 * sciMatch) / n,
    verified_pct: (100 * verified) / n,
    rejected_pct: (100 * rejected) / n,
    no_binomial_pct: (100 * noBinomial) / n,
    hallucination_pct: inCatalogN > 0 ? (100 * halluc) / inCatalogN : 0,
    halluc_count: halluc,
    in_catalog_n: inCatalogN,
    p50_ms: pct(visionLats, 0.5),
    p95_ms: pct(visionLats, 0.95),
  };
}

function fmt(v, suffix = "") {
  if (typeof v !== "number") return "n/a";
  return `${v.toFixed(1)}${suffix}`;
}

async function main() {
  const fixtures = loadFixtures();
  console.log(`[bench-vision-ab-rag] Run ${RUN_ID} → ${OUT_DIR}`);
  console.log(`Model: ${VISION_MODEL}, Fixtures: ${fixtures.length}, ground-truth-only=${GROUND_TRUTH_ONLY}`);
  console.log(`Catalog hint: ${CATALOG_HINT.split("\n").length} binomials, ${CATALOG_HINT.length} chars\n`);

  const allA = [];
  const allB = [];

  for (const fx of fixtures) {
    const imagePath = resolveImagePath(fx);
    if (!fs.existsSync(imagePath)) {
      console.log(`  ${fx.nombre_comun}: SKIP (file not found: ${imagePath})`);
      continue;
    }
    process.stdout.write(`  ${fx.nombre_comun} (${fx.file})\n`);

    // Variante A — con RAG (catalog hint)
    const a = await runVariant("A_with_rag", RAG_PROMPT, fx, imagePath);
    fs.appendFileSync(RAW_PATH, JSON.stringify(a) + "\n");
    allA.push(a);
    console.log(
      `    A: vis=${a.vision_latency_ms ?? "?"}ms [${a._grounded?.status || "?"}] ${a.pred_sci || "?"}`,
    );

    // Variante B — sin RAG (prompt vanilla actual)
    const b = await runVariant("B_no_rag", BASE_PROMPT, fx, imagePath);
    fs.appendFileSync(RAW_PATH, JSON.stringify(b) + "\n");
    allB.push(b);
    console.log(
      `    B: vis=${b.vision_latency_ms ?? "?"}ms [${b._grounded?.status || "?"}] ${b.pred_sci || "?"}`,
    );
  }

  const sumA = summarize(allA);
  const sumB = summarize(allB);

  const summary = `# Bench Vision A/B RAG vs No-RAG — ${RUN_ID}

**Model**: ${VISION_MODEL}
**Fixtures**: ${sumA.n} (ground-truth-only=${GROUND_TRUTH_ONLY})
**Catalog hint**: ${CATALOG_HINT.split("\n").length} binomials, ${CATALOG_HINT.length} chars
**Sidecar**: ${SIDECAR}

## Resultados

| Métrica | A (con RAG) | B (sin RAG) | Δ (A − B) |
|---|---:|---:|---:|
| Parse rate | ${fmt(sumA.parse_rate, "%")} | ${fmt(sumB.parse_rate, "%")} | ${fmt(sumA.parse_rate - sumB.parse_rate, "pp")} |
| Common name accuracy | ${fmt(sumA.name_match_pct, "%")} | ${fmt(sumB.name_match_pct, "%")} | ${fmt(sumA.name_match_pct - sumB.name_match_pct, "pp")} |
| Sci name accuracy (binomial) | ${fmt(sumA.sci_match_pct, "%")} | ${fmt(sumB.sci_match_pct, "%")} | ${fmt(sumA.sci_match_pct - sumB.sci_match_pct, "pp")} |
| Verified rate (sidecar) | ${fmt(sumA.verified_pct, "%")} | ${fmt(sumB.verified_pct, "%")} | ${fmt(sumA.verified_pct - sumB.verified_pct, "pp")} |
| Hallucination rate (rejected entre in-catalog) | ${fmt(sumA.hallucination_pct, "%")} (${sumA.halluc_count}/${sumA.in_catalog_n}) | ${fmt(sumB.hallucination_pct, "%")} (${sumB.halluc_count}/${sumB.in_catalog_n}) | ${fmt(sumA.hallucination_pct - sumB.hallucination_pct, "pp")} |
| No binomial | ${fmt(sumA.no_binomial_pct, "%")} | ${fmt(sumB.no_binomial_pct, "%")} | ${fmt(sumA.no_binomial_pct - sumB.no_binomial_pct, "pp")} |
| Latencia p50 | ${sumA.p50_ms}ms | ${sumB.p50_ms}ms | ${sumA.p50_ms - sumB.p50_ms}ms |
| Latencia p95 | ${sumA.p95_ms}ms | ${sumB.p95_ms}ms | ${sumA.p95_ms - sumB.p95_ms}ms |

## Interpretación

- **A (con RAG)** prepends al prompt un bloque <CATALOGO_CHAGRA> con ~${CATALOG_HINT.split("\n").length} binomials del catálogo Chagra v3.2 + nombre común. La idea es cerrar el espacio de hipótesis del modelo a especies conocidas.
- **B (sin RAG)** usa el SPECIES_PROMPT vanilla idéntico al de \`src/services/aiService.js:recognizeSpecies\` en producción hoy.
- **Sidecar validation** (\`POST /tools/validate_visual_match\`) corre igual en ambas variantes — no es parte del A/B, es la métrica que captura hallucination.

### ¿RAG ayuda?

${(() => {
  const sciDelta = sumA.sci_match_pct - sumB.sci_match_pct;
  const verDelta = sumA.verified_pct - sumB.verified_pct;
  const hallucDelta = sumA.hallucination_pct - sumB.hallucination_pct;
  const latDelta = sumA.p50_ms - sumB.p50_ms;
  const lines = [];
  if (verDelta > 5) lines.push(`- **Verified rate sube ${verDelta.toFixed(1)}pp** — el modelo elige más binomials que SÍ existen en catálogo cuando ve la lista.`);
  else if (verDelta < -5) lines.push(`- **Verified rate baja ${Math.abs(verDelta).toFixed(1)}pp** — la lista parece confundir al modelo (escoge binomial random del catálogo en vez de identificar correctamente).`);
  else lines.push(`- Verified rate prácticamente igual (Δ ${verDelta.toFixed(1)}pp).`);
  if (hallucDelta < -5) lines.push(`- **Hallucination baja ${Math.abs(hallucDelta).toFixed(1)}pp** — el catalog hint reduce binomials inventados.`);
  else if (hallucDelta > 5) lines.push(`- **Hallucination SUBE ${hallucDelta.toFixed(1)}pp** — el hint induce confusión.`);
  if (sciDelta > 5) lines.push(`- **Sci accuracy sube ${sciDelta.toFixed(1)}pp** vs ground-truth.`);
  else if (sciDelta < -5) lines.push(`- **Sci accuracy baja ${Math.abs(sciDelta).toFixed(1)}pp**.`);
  if (Math.abs(latDelta) > 1000) lines.push(`- Latencia p50 ${latDelta > 0 ? "sube" : "baja"} ${Math.abs(latDelta)}ms con el hint (~${(CATALOG_HINT.length / 1000).toFixed(1)}KB extra al prompt).`);
  return lines.join("\n");
})()}

### Recomendación

${(() => {
  const verDelta = sumA.verified_pct - sumB.verified_pct;
  const hallucDelta = sumA.hallucination_pct - sumB.hallucination_pct;
  if (verDelta > 10 && hallucDelta < -5) {
    return "**Adoptar RAG-by-prompt en recognizeSpecies**. El hint de catálogo reduce hallucination y sube verified rate más que compensa la latencia extra.";
  }
  if (verDelta < -5 || hallucDelta > 5) {
    return "**Mantener vanilla (sin RAG-by-prompt)**. El hint degrada precisión — el modelo escoge entries random del catálogo en vez de identificar de cero. El post-validation sidecar (ya en producción) sigue siendo el grounding correcto.";
  }
  return "**Refinar RAG**: el delta no justifica el cost en latencia/tokens. Probar: (a) top-K por familia botánica detectada vía pre-pass, (b) hint solo de las 20 species más comunes en la región del operador, o (c) confiar en post-validation sidecar (status quo).";
})()}

## Archivos

- raw.jsonl: 2 líneas por fixture (variant A y B).
- summary.md: este reporte.
`;

  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), summary);
  console.log("\n" + summary);
  console.log(`Resultados: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
