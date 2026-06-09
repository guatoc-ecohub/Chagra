#!/usr/bin/env node
import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import {
  BENCH_SCENARIOS,
  getDefaultModels,
  getSmokeScenarios,
  PRIMARY_MODELS,
} from './lib/bench-nocturno-scenarios.mjs';
import {
  aggregateCapabilityScores,
  applyFailureToModelState,
  buildCandidateConfig,
  buildManifest,
  createInitialModelState,
  markCompletedPair,
  parseBenchModels,
  scoreScenarioResponse,
} from './lib/bench-nocturno-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BENCH_ROOT = join(ROOT_DIR, 'data', 'bench-runs');
const CONFIG_DIR = join(ROOT_DIR, 'config');
const CANDIDATE_CONFIG_PATH = join(CONFIG_DIR, 'setup-llm-prod.candidate.json');
const OLLAMA_CHAT_URL = process.env.OLLAMA_CHAT_URL || 'http://localhost:11434/api/chat';
const REQUEST_TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS || 120000);

function parseArgs(argv) {
  const args = {
    smokeOnly: argv.includes('--smoke-only'),
    resume: argv.includes('--resume'),
    runDir: null,
    runId: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--run-dir' && argv[i + 1]) args.runDir = argv[i + 1];
    if (argv[i] === '--run-id' && argv[i + 1]) args.runId = argv[i + 1];
  }
  return args;
}

function toRunId() {
  return `farm-process-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`;
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function listLatestRunDir() {
  if (!existsSync(BENCH_ROOT)) return null;
  const names = readdirSync(BENCH_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('farm-process-'))
    .map((entry) => entry.name)
    .sort();
  if (names.length === 0) return null;
  return join(BENCH_ROOT, names[names.length - 1]);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function getRunPaths(runDir) {
  return {
    runDir,
    manifest: join(runDir, 'manifest.json'),
    state: join(runDir, 'state.json'),
    jsonl: join(runDir, 'results.jsonl'),
    summary: join(runDir, 'summary.md'),
    checkpoints: join(runDir, 'checkpoints'),
  };
}

function checkpointPath(paths, model, scenarioId) {
  return join(paths.checkpoints, model.replaceAll(':', '__'), `${scenarioId}.json`);
}

function buildInitialState(manifest) {
  return {
    manifest_id: manifest.manifest_id,
    created_at: manifest.created_at,
    updated_at: new Date().toISOString(),
    mode: manifest.mode,
    models: createInitialModelState(manifest.models),
    completed: [],
  };
}

async function callModel(model, scenario) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const res = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'Eres un evaluado del bench de Chagra. Sigue exactamente el formato pedido. ' +
              'No afirmes persistencia remota inexistente. Distingue estimación y observación.',
          },
          { role: 'user', content: scenario.prompt },
        ],
        options: {
          temperature: 0.2,
          num_predict: 400,
        },
        keep_alive: '15m',
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      throw new Error(`HTTP ${res.status}: ${details || res.statusText}`);
    }

    const data = await res.json();
    const responseText = String(data?.message?.content || '').trim();
    if (!responseText) throw new Error('empty response');

    return {
      ok: true,
      response_text: responseText,
      latency_ms: Math.round(performance.now() - startedAt),
      eval_count: data.eval_count || 0,
      prompt_eval_count: data.prompt_eval_count || 0,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: error.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function renderSummary({ manifest, capabilityScores, state }) {
  const lines = [
    `# Bench nocturno FarmProcess`,
    ``,
    `- Run: \`${manifest.run_id}\``,
    `- Manifest: \`${manifest.manifest_id}\``,
    `- Mode: \`${manifest.mode}\``,
    `- Models: ${manifest.models.join(', ')}`,
    ``,
    `## Eliminación temprana`,
    ...manifest.models.map((model) => {
      const entry = state.models[model];
      return `- ${model}: ${entry.eliminated ? `eliminado (${entry.elimination_reason})` : 'activo'}`;
    }),
    ``,
    `## Resultados por capacidad`,
  ];

  for (const [capability, ranked] of Object.entries(capabilityScores)) {
    lines.push(``);
    lines.push(`### ${capability}`);
    for (const item of ranked) {
      lines.push(`- ${item.model}: ${(item.avg_score * 100).toFixed(1)}% (${item.samples} muestras)`);
    }
  }

  return lines.join('\n') + '\n';
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  assertCheckoutCurrent({
    cwd: ROOT_DIR,
    autoPull: false,
    skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
  });

  const mode = args.smokeOnly ? 'smoke' : 'full';
  const scenarios = args.smokeOnly ? getSmokeScenarios() : BENCH_SCENARIOS;
  const modelFallback = getDefaultModels(mode);
  const models = parseBenchModels(process.env.BENCH_MODELS, modelFallback);

  const runId = args.runId || toRunId();
  const requestedRunDir = args.runDir
    ? resolve(args.runDir)
    : join(BENCH_ROOT, runId);
  const runDir = args.resume && !args.runDir ? listLatestRunDir() || requestedRunDir : requestedRunDir;
  const paths = getRunPaths(runDir);

  ensureDir(paths.runDir);
  ensureDir(paths.checkpoints);
  ensureDir(CONFIG_DIR);

  let manifest;
  let state;

  if (args.resume) {
    if (!existsSync(paths.manifest) || !existsSync(paths.state)) {
      throw new Error(`--resume requiere manifest y state existentes en ${paths.runDir}`);
    }
    manifest = loadJson(paths.manifest);
    const expectedManifest = buildManifest({ models, scenarios, mode, runId: manifest.run_id, resume: true });
    if (manifest.manifest_id !== expectedManifest.manifest_id) {
      throw new Error('manifest mismatch: BENCH_MODELS o escenarios cambiaron; no se puede resumir de forma segura');
    }
    state = loadJson(paths.state);
  } else {
    manifest = buildManifest({ models, scenarios, mode, runId, resume: false });
    state = buildInitialState(manifest);
    saveJson(paths.manifest, manifest);
    saveJson(paths.state, state);
  }

  for (const scenario of scenarios) {
    for (const model of manifest.models) {
      const entry = state.models[model];
      const cpath = checkpointPath(paths, model, scenario.id);
      if (entry?.eliminated) continue;
      if (existsSync(cpath)) continue;
      ensureDir(dirname(cpath));

      const raw = await callModel(model, scenario);
      let record;
      if (!raw.ok) {
        state.models = applyFailureToModelState(state.models, model, raw.error);
        record = {
          model,
          scenario_id: scenario.id,
          capabilities: scenario.capabilities,
          ok: false,
          normalized_score: 0,
          error: raw.error,
          completed_at: new Date().toISOString(),
        };
      } else {
        const scored = scoreScenarioResponse(scenario, raw.response_text);
        if (scored.error) {
          state.models = applyFailureToModelState(state.models, model, scored.error);
          record = {
            model,
            scenario_id: scenario.id,
            capabilities: scenario.capabilities,
            ok: false,
            normalized_score: 0,
            error: scored.error,
            response_text: raw.response_text,
            completed_at: new Date().toISOString(),
          };
        } else {
          state.models = markCompletedPair(state.models, model);
          record = {
            model,
            scenario_id: scenario.id,
            capabilities: scenario.capabilities,
            ok: true,
            score: scored.score,
            max_score: scored.maxScore,
            normalized_score: scored.score / scored.maxScore,
            checks: scored.checks,
            response_text: raw.response_text,
            latency_ms: raw.latency_ms,
            eval_count: raw.eval_count,
            prompt_eval_count: raw.prompt_eval_count,
            completed_at: new Date().toISOString(),
          };
        }
      }

      state.completed.push({ model, scenario_id: scenario.id });
      state.updated_at = new Date().toISOString();
      saveJson(cpath, record);
      appendFileSync(paths.jsonl, `${JSON.stringify(record)}\n`);
      saveJson(paths.state, state);

      const records = existsSync(paths.jsonl)
        ? readFileSync(paths.jsonl, 'utf8')
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        : [];
      const capabilityScores = aggregateCapabilityScores(records);
      const candidateConfig = buildCandidateConfig({
        manifest,
        capabilityScores,
        primaryModels: PRIMARY_MODELS,
      });
      saveJson(CANDIDATE_CONFIG_PATH, candidateConfig);
      writeFileSync(paths.summary, renderSummary({ manifest, capabilityScores, state }));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(`[bench-nocturno-farm-process] ${error.message}`);
    process.exit(1);
  });
}
