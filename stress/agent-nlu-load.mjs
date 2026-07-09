#!/usr/bin/env node
/**
 * stress/agent-nlu-load.mjs — Frente 1: carga concurrente del agente/NLU.
 *
 * Simula muchos operadores preguntándole al agente AL MISMO TIEMPO y mide
 * p50/p90/p95/p99 + tasa de HTTP 503 (señal de saturación de Ollama/GPU) +
 * tasa de error/timeout. Dos rutas, seleccionables con MODE:
 *
 *   - sidecar-nlu (default): POST {SIDECAR_URL}/nlu — el planner real que usa
 *     el AgentScreen en prod (ver src/services/sidecarClient.js#planNlu).
 *   - ollama-chat: POST {OLLAMA_URL}/api/chat contra el modelo de chat
 *     (granite3.3:8b por defecto) — satura la GPU directamente, sin pasar
 *     por el sidecar. Útil para aislar si la saturación es del sidecar o de
 *     Ollama.
 *   - both: corre las dos fases, una tras otra, con reportes separados.
 *
 * USO:
 *   node stress/agent-nlu-load.mjs                    # sidecar-nlu, defaults
 *   MODE=ollama-chat TOTAL=60 CONCURRENCY=12 node stress/agent-nlu-load.mjs
 *   DRY_RUN=1 node stress/agent-nlu-load.mjs           # sin red real (self-test)
 *
 * Ver stress/README.md para la tabla completa de variables de entorno y qué
 * umbrales vigilar.
 */
import { performance } from 'node:perf_hooks';
import { runPool } from './lib/pool.mjs';
import { buildReport, printReport, writeReportJson, normalizeResults } from './lib/report.mjs';
import { getSidecarToken } from './lib/sidecarAuth.mjs';
import { makeMockFetch } from './lib/mockFetch.mjs';

// ── Config desde env, con defaults seguros para un smoke local ─────────────
const MODE = process.env.MODE || 'sidecar-nlu'; // sidecar-nlu | ollama-chat | both
const SIDECAR_URL = (process.env.SIDECAR_URL || 'http://localhost:7880').replace(/\/+$/, '');
const SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || getSidecarToken();
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'granite3.3:8b';
const OLLAMA_MAX_TOKENS = Number(process.env.OLLAMA_MAX_TOKENS || 200);
const TOTAL = Number(process.env.TOTAL || 40);
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 20_000);
const RAMP_MS = Number(process.env.RAMP_MS || 0);
const DRY_RUN = process.env.DRY_RUN === '1';
const OUT_JSON = process.env.OUT_JSON || '';
const SAVE_OUTCOMES = process.env.SAVE_OUTCOMES === '1';

// Umbrales opcionales — si no se setean, el script solo informa (no falla).
const thresholds = {
  p95Ms: process.env.P95_THRESHOLD_MS ? Number(process.env.P95_THRESHOLD_MS) : undefined,
  p99Ms: process.env.P99_THRESHOLD_MS ? Number(process.env.P99_THRESHOLD_MS) : undefined,
  maxErrorRate: process.env.MAX_ERROR_RATE ? Number(process.env.MAX_ERROR_RATE) : undefined,
  max503Rate: process.env.MAX_503_RATE ? Number(process.env.MAX_503_RATE) : undefined,
};

// Preguntas representativas del uso real del agente (especies, plagas,
// biopreparados, piso térmico, clima) — NO son afirmaciones, solo carga.
const PROMPTS = [
  '¿Qué compañeras le sirven al café en piso térmico frío?',
  '¿Cómo controlo la broca del café de forma orgánica?',
  '¿Cuándo siembro aguacate Hass en clima templado?',
  '¿El caldo bordelés sirve para el moho del cacao?',
  '¿Qué plagas afectan al plátano en tierra caliente?',
  '¿Cómo hago biopreparado de ortiga para la roya?',
  '¿La uchuva se da bien a 2600 msnm?',
  '¿Qué asocios de milpa funcionan con maíz y frijol?',
  '¿Cuál es el calendario de siembra de la quinua en Nariño?',
  '¿Cómo curo la yuca después de cosechar para que no se dañe?',
  '¿Qué controla al gorgojo del maíz almacenado?',
  '¿El aguacate y los cítricos son compatibles en el mismo lote?',
  '¿Qué altitud necesita el fique para producir bien?',
  '¿Cómo preparo un biopreparado contra la mosca de la fruta?',
  '¿Qué especies toleran suelos ácidos de páramo?',
  '¿Cuál es la humedad ideal para secar café en marquesina?',
];

function nowIso() {
  return new Date().toISOString();
}

async function callSidecarNlu(prompt, { fetchImpl }) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SIDECAR_TOKEN) headers['X-Chagra-Token'] = SIDECAR_TOKEN;
    const res = await fetchImpl(`${SIDECAR_URL}/nlu`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: prompt }),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - start;
    if (!res.ok) return { latencyMs, status: res.status, ok: false, errorKind: `http_${res.status}` };
    const data = await res.json();
    return {
      latencyMs,
      status: res.status,
      ok: true,
      errorKind: null,
      meta: { useTool: Boolean(data.use_tool), tool: data.tool || null },
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const kind = err?.name === 'AbortError' ? 'timeout' : 'network_error';
    return { latencyMs, status: kind, ok: false, errorKind: `${kind}: ${String(err?.message || err).slice(0, 80)}` };
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaChat(prompt, { fetchImpl }) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: 'Eres un asistente agroecológico experto para Colombia. Responde breve.' },
          { role: 'user', content: prompt },
        ],
        options: { temperature: 0.3, num_predict: OLLAMA_MAX_TOKENS },
        keep_alive: '10m',
      }),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - start;
    if (!res.ok) return { latencyMs, status: res.status, ok: false, errorKind: `http_${res.status}` };
    await res.json();
    return { latencyMs, status: res.status, ok: true, errorKind: null };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const kind = err?.name === 'AbortError' ? 'timeout' : 'network_error';
    return { latencyMs, status: kind, ok: false, errorKind: `${kind}: ${String(err?.message || err).slice(0, 80)}` };
  } finally {
    clearTimeout(timer);
  }
}

async function runPhase(title, callFn, fetchImpl) {
  console.log(`\n[stress] arrancando fase "${title}" — total=${TOTAL} concurrency=${CONCURRENCY} timeout=${TIMEOUT_MS}ms dryRun=${DRY_RUN} (${nowIso()})`);
  const t0 = performance.now();
  const poolResults = await runPool({
    total: TOTAL,
    concurrency: CONCURRENCY,
    rampUpMs: RAMP_MS,
    worker: (i) => callFn(PROMPTS[i % PROMPTS.length], { fetchImpl }),
    onProgress: (done, total) => {
      if (done % Math.max(1, Math.floor(total / 10)) === 0 || done === total) {
        process.stdout.write(`\r[stress] ${title}: ${done}/${total}`);
      }
    },
  });
  process.stdout.write('\n');
  const durationMs = performance.now() - t0;
  const outcomes = normalizeResults(poolResults);
  const report = buildReport({ title: `Agente/NLU — ${title}`, durationMs, outcomes, thresholds });
  printReport(report);
  if (OUT_JSON || SAVE_OUTCOMES) {
    const path = writeReportJson(report, {
      outPath: OUT_JSON ? `${OUT_JSON}.${title}.json` : undefined,
      outcomes: SAVE_OUTCOMES ? outcomes : undefined,
    });
    console.log(`  reporte guardado en: ${path}`);
  }
  return report;
}

async function main() {
  const fetchImpl = DRY_RUN ? makeMockFetch() : fetch;
  if (DRY_RUN) {
    console.log('[stress] DRY_RUN=1 — usando backend simulado, no se toca red real (ni sidecar ni ollama).');
  }

  const reports = [];
  if (MODE === 'sidecar-nlu' || MODE === 'both') {
    reports.push(await runPhase('sidecar /nlu', callSidecarNlu, fetchImpl));
  }
  if (MODE === 'ollama-chat' || MODE === 'both') {
    reports.push(await runPhase(`ollama /api/chat (${OLLAMA_CHAT_MODEL})`, callOllamaChat, fetchImpl));
  }
  if (reports.length === 0) {
    console.error(`[stress] MODE="${MODE}" desconocido. Usa sidecar-nlu | ollama-chat | both.`);
    process.exitCode = 2;
    return;
  }

  const anyFailedThresholds = reports.some((r) => r.checks.length > 0 && !r.allChecksPassed);
  if (anyFailedThresholds) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[stress] error fatal:', err);
  process.exitCode = 1;
});
