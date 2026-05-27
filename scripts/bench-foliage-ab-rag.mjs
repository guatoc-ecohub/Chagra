#!/usr/bin/env node
/**
 * bench-foliage-ab-rag.mjs — Bench A/B follow-up de V-03 sobre `analyzeFoliage`.
 *
 * V-03 (bench-vision-ab-rag.mjs) testeó `recognizeSpecies` (identificación)
 * con/sin catalog hint en el prompt y concluyó que RAG-by-prompt PERJUDICA
 * al modelo de visión. Este bench valida la misma hipótesis sobre la
 * función DIFERENTE `analyzeFoliage` (diagnóstico foliar, audit 2026-05-18
 * finding #4) que SÍ usa RAG con passages del corpus en producción.
 *
 * No-confirmado: si la conclusión de V-03 generaliza a este otro flow.
 *
 * Variants:
 *   A. Con RAG mock context (3 passages típicos del corpus agroecológico)
 *   B. DIAGNOSIS_BASE_PROMPT crudo (sin contexto)
 *
 * El RAG real (corpus IndexedDB + BM25) no se puede invocar desde Node CLI
 * — se mockea con 3 passages representativos del corpus público. La señal
 * direccional es válida aunque la magnitud absoluta no sea la de prod.
 *
 * Métricas:
 *   - parse_rate: % JSON válido (score, issues, treatment)
 *   - score_avg: avg numeric score del modelo
 *   - issues_count_avg: avg # issues reportadas
 *   - treatment_length_avg: caracteres
 *   - hallucination_proxy: % treatments que mencionan binomial sin "n/a" o "no determinable"
 *   - latency p50 / p95
 *
 * Refs: bench-vision-ab-rag.mjs (V-03), audit-vision-chagra-2026-05-26.md.
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
// Path absoluto siguiendo convención bench-vision-ab-rag.mjs (V-03).
// 16 fotos aportadas por operador para tests Antigravity.
const FIXTURES_DIR = "/home/kortux/Workspace/Chagra-strategy/ops/antigravity/fixtures-fotos";
const GT_FILE = path.join(ROOT, "data", "bench-vision-fixtures-ground-truth.json");
const RUNS_DIR = path.join(ROOT, "data", "bench-runs");

const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.MODEL || "llama3.2-vision:11b";
const LIMIT = Number(process.env.BENCH_LIMIT || 0); // 0 = todos
const KEEP_ALIVE = "5m";
const NUM_CTX = 8192;
const MAX_RETRIES = 4;

const DIAGNOSIS_BASE_PROMPT =
  'detect disease, nutrient deficiency, and overall plant health. Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

// Mock RAG: 3 passages reales del dominio agroecológico colombiano.
// No son específicos de cada species (esto es la limitación del bench),
// pero replican forma + contenido típico del corpus en prod.
const MOCK_RAG_PASSAGES = [
  {
    source: "manejo_agroecologico_general :: valor_pedagogico",
    text: "El manejo agroecológico privilegia el equilibrio del agroecosistema. Antes de cualquier intervención química o biopreparado, observar: humedad del suelo, sombra disponible, presencia de fauna benéfica (mariquitas, arañas, sírfidos). La rotación de cultivos y el cultivo asociado (milpa, café+banano+forrajeras) reducen presión de plagas sin insumo externo.",
  },
  {
    source: "biopreparados_restrepo_2007 :: caldo_supermagro",
    text: "Caldo Supermagro (Restrepo 2007): aplicación foliar quincenal en floración y fructificación. Diluir 1:20 en agua. Acción: aporta micronutrientes quelados (Zn, Cu, Mn, Fe, Mo, B, Co) vía fermentación anaeróbica de estiércol + melaza + leche cruda. NO mezclar con caldo bordelés en misma aplicación. Tiempo de carencia: 7 días.",
  },
  {
    source: "ica_resolucion_698_2011 :: regulacion_bioinsumos",
    text: "ICA Resolución 698/2011 regula bioinsumos en Colombia. Categorías: biofertilizantes, bioplaguicidas, bioremediadores. Productos comerciales requieren registro previo. Biopreparados artesanales (en finca, para uso propio) están permitidos sin registro siempre que no se comercialicen. Trichoderma harzianum y Bacillus subtilis son los activos más comunes.",
  },
];

const formatMockRagContext = () => {
  const blocks = MOCK_RAG_PASSAGES.map(
    (p, i) => `[Fuente ${i + 1} — ${p.source}]\n${p.text}`,
  );
  return `<CONTEXTO_CIENTÍFICO>\n${blocks.join("\n\n")}\n</CONTEXTO_CIENTÍFICO>\n\n`;
};

const buildPromptWithRag = () =>
  formatMockRagContext() +
  "Eres un agrónomo agroecológico colombiano. Usa el CONTEXTO_CIENTÍFICO " +
  'arriba + lo que observas en la imagen para diagnosticar. Cita la fuente ' +
  'numérica (ej. "Fuente 1") cuando aplique. Si el contexto no aplica a lo ' +
  "que ves, ignóralo y diagnostica solo por la imagen. " +
  'Output JSON: {"score": 0-100, "issues": [], "treatment": ""}';

const buildPromptBase = () => DIAGNOSIS_BASE_PROMPT;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const callOllamaVision = async (prompt, imageBase64, attempt = 0) => {
  const body = {
    model: MODEL,
    prompt,
    images: [imageBase64],
    stream: false,
    format: "json",
    keep_alive: KEEP_ALIVE,
    options: { num_ctx: NUM_CTX, temperature: 0.1 },
  };
  const t0 = performance.now();
  try {
    const res = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (attempt < MAX_RETRIES && /500|model|load|busy/i.test(txt)) {
        await sleep(2000 * Math.pow(2, attempt));
        return callOllamaVision(prompt, imageBase64, attempt + 1);
      }
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const latency = performance.now() - t0;
    return { raw: data.response, latency };
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      await sleep(2000 * Math.pow(2, attempt));
      return callOllamaVision(prompt, imageBase64, attempt + 1);
    }
    throw e;
  }
};

const parseDiagnosis = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      score: typeof parsed.score === "number" ? parsed.score : null,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      treatment: typeof parsed.treatment === "string" ? parsed.treatment : "",
    };
  } catch {
    return { ok: false, score: null, issues: [], treatment: "" };
  }
};

// Proxy heurístico de halucinación: treatment que cita binomial Latin-like
// (dos palabras capitalized) sin marcador "no aplica" / "no determinable".
const HALLUC_BINOMIAL_RE = /\b[A-Z][a-z]+\s+[a-z]{4,}\b/;
const NA_MARKERS_RE = /\b(no aplica|no determinable|no se puede|n\/a|sin diagn)/i;
const checkHallucProxy = (treatment) =>
  treatment.length > 30 && HALLUC_BINOMIAL_RE.test(treatment) && !NA_MARKERS_RE.test(treatment);

const summarize = (rows) => {
  const lat = rows.map((r) => r.latency).sort((a, b) => a - b);
  const p50 = lat[Math.floor(lat.length * 0.5)] || 0;
  const p95 = lat[Math.floor(lat.length * 0.95)] || 0;
  const parsed = rows.filter((r) => r.parsed.ok);
  const scores = parsed.map((r) => r.parsed.score).filter((s) => s !== null);
  const treatments = parsed.map((r) => r.parsed.treatment);
  return {
    n: rows.length,
    parse_rate: ((parsed.length / rows.length) * 100).toFixed(1) + "%",
    score_avg: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "n/a",
    issues_avg: parsed.length
      ? (parsed.reduce((a, r) => a + r.parsed.issues.length, 0) / parsed.length).toFixed(2)
      : "n/a",
    treatment_len_avg: treatments.length
      ? Math.round(treatments.reduce((a, t) => a + t.length, 0) / treatments.length)
      : 0,
    halluc_proxy_pct:
      ((parsed.filter((r) => checkHallucProxy(r.parsed.treatment)).length / Math.max(parsed.length, 1)) * 100).toFixed(1) +
      "%",
    p50_ms: Math.round(p50),
    p95_ms: Math.round(p95),
  };
};

const main = async () => {
  const gt = JSON.parse(fs.readFileSync(GT_FILE, "utf8"));
  let fixtures = gt.fixtures || gt;
  if (LIMIT > 0) fixtures = fixtures.slice(0, LIMIT);

  console.log(`[bench-foliage-ab] model=${MODEL} fixtures=${fixtures.length}`);

  const rowsA = [];
  const rowsB = [];

  for (let i = 0; i < fixtures.length; i++) {
    const fx = fixtures[i];
    const imgPath = path.join(FIXTURES_DIR, fx.file);
    if (!fs.existsSync(imgPath)) {
      console.warn(`[skip] no existe ${imgPath}`);
      continue;
    }
    const imgBase64 = fs.readFileSync(imgPath).toString("base64");
    process.stdout.write(`[${i + 1}/${fixtures.length}] ${fx.common_name_es || fx.file} `);

    // A: con RAG mock
    try {
      const r = await callOllamaVision(buildPromptWithRag(), imgBase64);
      const parsed = parseDiagnosis(r.raw);
      rowsA.push({ fixture: fx.file, latency: r.latency, parsed });
      process.stdout.write(`A:${parsed.ok ? "ok" : "parse-err"} `);
    } catch (e) {
      rowsA.push({ fixture: fx.file, latency: 0, parsed: parseDiagnosis("") });
      process.stdout.write(`A:err `);
    }

    // B: sin RAG
    try {
      const r = await callOllamaVision(buildPromptBase(), imgBase64);
      const parsed = parseDiagnosis(r.raw);
      rowsB.push({ fixture: fx.file, latency: r.latency, parsed });
      process.stdout.write(`B:${parsed.ok ? "ok" : "parse-err"}\n`);
    } catch (e) {
      rowsB.push({ fixture: fx.file, latency: 0, parsed: parseDiagnosis("") });
      process.stdout.write(`B:err\n`);
    }
  }

  const sumA = summarize(rowsA);
  const sumB = summarize(rowsB);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(RUNS_DIR, `foliage-ab-rag-${ts}`);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "raw.jsonl"),
    [
      ...rowsA.map((r) => JSON.stringify({ variant: "A", ...r })),
      ...rowsB.map((r) => JSON.stringify({ variant: "B", ...r })),
    ].join("\n"),
  );

  const md = `# bench-foliage-ab-rag ${ts}

Model: \`${MODEL}\` · fixtures: ${rowsA.length}

| Métrica | A (con RAG mock) | B (sin RAG) | Δ |
|---|---:|---:|---:|
| Parse rate | ${sumA.parse_rate} | ${sumB.parse_rate} | ${sumA.parse_rate === sumB.parse_rate ? "—" : "diff"} |
| Score avg | ${sumA.score_avg} | ${sumB.score_avg} | — |
| Issues avg | ${sumA.issues_avg} | ${sumB.issues_avg} | — |
| Treatment len avg | ${sumA.treatment_len_avg} | ${sumB.treatment_len_avg} | ${sumA.treatment_len_avg - sumB.treatment_len_avg} chars |
| Hallucination proxy | ${sumA.halluc_proxy_pct} | ${sumB.halluc_proxy_pct} | — |
| Latency p50 | ${sumA.p50_ms}ms | ${sumB.p50_ms}ms | ${sumA.p50_ms - sumB.p50_ms}ms |
| Latency p95 | ${sumA.p95_ms}ms | ${sumB.p95_ms}ms | ${sumA.p95_ms - sumB.p95_ms}ms |

## Interpretación

Si A peor en hallucination_proxy + accuracy proxies (score, issues, treatment len) y solo
gana en cite-source noise → confirma V-03 generaliza a analyzeFoliage. Recomendación: quitar RAG de \`analyzeFoliage\`.

Si A mejor o paritario en accuracy proxies → V-03 NO generaliza, mantener RAG.

NOTA: el RAG aquí es mock (3 passages fijos no species-specific). El RAG real
(BM25 species-specific) puede comportarse distinto. Bench directional, no absoluto.

Refs: bench-vision-ab-rag.mjs, audit-vision-chagra-2026-05-26.md.
`;
  fs.writeFileSync(path.join(outDir, "summary.md"), md);
  console.log(`\n[done] ${outDir}\n${md}`);
};

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
