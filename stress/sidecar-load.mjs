#!/usr/bin/env node
/**
 * stress/sidecar-load.mjs — Frente 3: sidecar agro-mcp bajo carga.
 *
 * Golpea el sidecar en 127.0.0.1:7880 (bind local, ver
 * Chagra-strategy/ops/INFRA_FACTS.md) mezclando:
 *   - GET /healthz — liveness check, debería responder rápido SIEMPRE.
 *   - POST /tools/<toolName> — las mismas tools que llama el AgentScreen en
 *     prod (src/services/sidecarClient.js#callTool), con args reales.
 *
 * Mide p95/p99 por separado para /healthz vs /tools/*, y la tasa de error
 * por tool (una tool caída no debería tumbar el healthz).
 *
 * USO:
 *   node stress/sidecar-load.mjs
 *   TOTAL=150 CONCURRENCY=20 node stress/sidecar-load.mjs
 *   DRY_RUN=1 node stress/sidecar-load.mjs
 */
import { performance } from 'node:perf_hooks';
import { runPool } from './lib/pool.mjs';
import { buildReport, printReport, writeReportJson, normalizeResults } from './lib/report.mjs';
import { getSidecarToken } from './lib/sidecarAuth.mjs';
import { makeMockFetch } from './lib/mockFetch.mjs';
import { histogram } from './lib/stats.mjs';

const SIDECAR_URL = (process.env.SIDECAR_URL || 'http://localhost:7880').replace(/\/+$/, '');
const SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || getSidecarToken();
const TOTAL = Number(process.env.TOTAL || 80);
const CONCURRENCY = Number(process.env.CONCURRENCY || 15);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 8_000);
const RAMP_MS = Number(process.env.RAMP_MS || 0);
const HEALTHZ_RATIO = Number(process.env.HEALTHZ_RATIO ?? 0.25); // fracción de requests que van a /healthz
const DRY_RUN = process.env.DRY_RUN === '1';
const OUT_JSON = process.env.OUT_JSON || '';
const SAVE_OUTCOMES = process.env.SAVE_OUTCOMES === '1';

const thresholds = {
  p95Ms: process.env.P95_THRESHOLD_MS ? Number(process.env.P95_THRESHOLD_MS) : undefined,
  p99Ms: process.env.P99_THRESHOLD_MS ? Number(process.env.P99_THRESHOLD_MS) : undefined,
  maxErrorRate: process.env.MAX_ERROR_RATE ? Number(process.env.MAX_ERROR_RATE) : undefined,
  max503Rate: process.env.MAX_503_RATE ? Number(process.env.MAX_503_RATE) : undefined,
};

// Args reales — mismos shapes que usan los callers de producción (ver
// src/services/plantDossierService.js y sidecarClient.js).
const TOOL_CALLS = [
  { tool: 'get_species', args: { query: 'café' } },
  { tool: 'get_species', args: { query: 'aguacate hass' } },
  { tool: 'get_companions', args: { species_id: 'coffea-arabica' } },
  { tool: 'get_biopreparados', args: { species_id: 'coffea-arabica' } },
  { tool: 'get_clima_ideam', args: { action: 'forecast' } },
  { tool: 'get_enso_status', args: {} },
  { tool: 'get_alertas_clima_zona', args: { lat: 4.6, lng: -74.1 } },
];

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (SIDECAR_TOKEN) h['X-Chagra-Token'] = SIDECAR_TOKEN;
  return h;
}

async function callHealthz(fetchImpl) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${SIDECAR_URL}/healthz`, { method: 'GET', headers: headers(), signal: controller.signal });
    const latencyMs = performance.now() - start;
    if (!res.ok) return { latencyMs, status: res.status, ok: false, errorKind: `http_${res.status}`, meta: { kind: 'healthz' } };
    await res.json().catch(() => ({}));
    return { latencyMs, status: res.status, ok: true, errorKind: null, meta: { kind: 'healthz' } };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const kind = err?.name === 'AbortError' ? 'timeout' : 'network_error';
    return { latencyMs, status: kind, ok: false, errorKind: `${kind}: ${String(err?.message || err).slice(0, 80)}`, meta: { kind: 'healthz' } };
  } finally {
    clearTimeout(timer);
  }
}

async function callTool(toolCall, fetchImpl) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${SIDECAR_URL}/tools/${toolCall.tool}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(toolCall.args),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - start;
    if (!res.ok) return { latencyMs, status: res.status, ok: false, errorKind: `http_${res.status}`, meta: { kind: 'tool', tool: toolCall.tool } };
    await res.json().catch(() => ({}));
    return { latencyMs, status: res.status, ok: true, errorKind: null, meta: { kind: 'tool', tool: toolCall.tool } };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const kind = err?.name === 'AbortError' ? 'timeout' : 'network_error';
    return {
      latencyMs,
      status: kind,
      ok: false,
      errorKind: `${kind}: ${String(err?.message || err).slice(0, 80)}`,
      meta: { kind: 'tool', tool: toolCall.tool },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(
    `[stress] sidecar-load total=${TOTAL} concurrency=${CONCURRENCY} healthzRatio=${HEALTHZ_RATIO} timeout=${TIMEOUT_MS}ms dryRun=${DRY_RUN}`,
  );
  const fetchImpl = DRY_RUN ? makeMockFetch() : fetch;
  if (DRY_RUN) console.log('[stress] DRY_RUN=1 — usando backend simulado, no se toca el sidecar real.');

  const t0 = performance.now();
  const poolResults = await runPool({
    total: TOTAL,
    concurrency: CONCURRENCY,
    rampUpMs: RAMP_MS,
    worker: (i) => {
      const isHealthz = (i / TOTAL) < HEALTHZ_RATIO || Math.random() < HEALTHZ_RATIO;
      if (isHealthz) return callHealthz(fetchImpl);
      const toolCall = TOOL_CALLS[i % TOOL_CALLS.length];
      return callTool(toolCall, fetchImpl);
    },
    onProgress: (done, total) => process.stdout.write(`\r[stress] sidecar: ${done}/${total}`),
  });
  process.stdout.write('\n');
  const durationMs = performance.now() - t0;

  // Los workers nunca lanzan (atrapan sus propios errores), así que r.value
  // siempre viene poblado con meta.kind — no hace falta un fallback por
  // excepción de pool aquí.
  const healthzResults = poolResults.filter((r) => r.value?.meta?.kind === 'healthz');
  const toolResults = poolResults.filter((r) => r.value?.meta?.kind === 'tool');

  const outcomesAll = normalizeResults(poolResults);
  const reportAll = buildReport({ title: 'Sidecar agro-mcp — combinado (/healthz + /tools/*)', durationMs, outcomes: outcomesAll, thresholds });
  printReport(reportAll);

  if (healthzResults.length > 0) {
    const outcomesHealthz = normalizeResults(healthzResults);
    const reportHealthz = buildReport({ title: 'Sidecar agro-mcp — solo /healthz', durationMs, outcomes: outcomesHealthz });
    printReport(reportHealthz);
  }
  if (toolResults.length > 0) {
    const outcomesTools = normalizeResults(toolResults);
    const reportTools = buildReport({ title: 'Sidecar agro-mcp — solo /tools/*', durationMs, outcomes: outcomesTools });
    printReport(reportTools);
    const perTool = histogram(toolResults.map((r) => r.value?.meta?.tool || 'unknown'));
    const perToolErrors = histogram(toolResults.filter((r) => !r.value?.ok).map((r) => r.value?.meta?.tool || 'unknown'));
    console.log('\n  Requests por tool:');
    for (const [tool, count] of Object.entries(perTool).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${tool}: ${count} (errores: ${perToolErrors[tool] || 0})`);
    }
  }

  if (OUT_JSON || SAVE_OUTCOMES) {
    const path = writeReportJson(reportAll, { outPath: OUT_JSON || undefined, outcomes: SAVE_OUTCOMES ? outcomesAll : undefined });
    console.log(`\n  reporte guardado en: ${path}`);
  }

  if (reportAll.checks.length > 0 && !reportAll.allChecksPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[stress] error fatal:', err);
  process.exitCode = 1;
});
