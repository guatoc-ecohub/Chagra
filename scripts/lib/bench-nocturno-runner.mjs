import { createHash } from 'node:crypto';

export const HTTP_REPEAT_ELIMINATION_THRESHOLD = 2;

const OOM_PATTERNS = ['oom', 'out of memory', 'cuda error', 'memory allocation'];
const HTTP_PATTERNS = ['http ', 'status ', 'bad gateway', 'gateway timeout'];
const CRASH_PATTERNS = ['econnreset', 'socket hang up', 'unexpected end', 'crash'];

export function parseBenchModels(raw, fallback) {
  if (typeof raw !== 'string' || raw.trim() === '') return [...fallback];
  const values = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : [...fallback];
}

export function buildManifest({ models, scenarios, mode, runId, resume = false }) {
  const manifest = {
    schema_version: 1,
    run_id: runId,
    mode,
    resume,
    models,
    scenario_ids: scenarios.map((scenario) => scenario.id),
    scenarios,
    created_at: new Date().toISOString(),
  };
  manifest.manifest_id = hashManifest(manifest);
  return manifest;
}

export function hashManifest(manifest) {
  const stable = JSON.stringify({
    schema_version: manifest.schema_version,
    mode: manifest.mode,
    models: manifest.models,
    scenarios: manifest.scenarios,
  });
  return createHash('sha256').update(stable).digest('hex');
}

export function classifyFailure(errorMessage) {
  const text = String(errorMessage || '').toLowerCase();
  if (!text) return 'unknown';
  if (text.includes('timeout')) return 'timeout';
  if (OOM_PATTERNS.some((pattern) => text.includes(pattern))) return 'oom';
  if (HTTP_PATTERNS.some((pattern) => text.includes(pattern))) return 'http';
  if (CRASH_PATTERNS.some((pattern) => text.includes(pattern))) return 'crash';
  if (text.includes('empty response') || text.includes('blank response')) return 'empty';
  return 'unknown';
}

export function createInitialModelState(models) {
  return Object.fromEntries(
    models.map((model) => [
      model,
      {
        eliminated: false,
        elimination_reason: null,
        http_failures: 0,
        completed_pairs: 0,
      },
    ]),
  );
}

export function applyFailureToModelState(modelState, model, errorMessage) {
  const next = structuredClone(modelState);
  const entry = next[model] || {
    eliminated: false,
    elimination_reason: null,
    http_failures: 0,
    completed_pairs: 0,
  };
  const failureType = classifyFailure(errorMessage);

  if (failureType === 'http') {
    entry.http_failures += 1;
    if (entry.http_failures >= HTTP_REPEAT_ELIMINATION_THRESHOLD) {
      entry.eliminated = true;
      entry.elimination_reason = `http_repeated:${entry.http_failures}`;
    }
  } else if (['timeout', 'oom', 'crash', 'empty'].includes(failureType)) {
    entry.eliminated = true;
    entry.elimination_reason = failureType;
  }

  next[model] = entry;
  return next;
}

export function markCompletedPair(modelState, model) {
  const next = structuredClone(modelState);
  const entry = next[model];
  if (!entry) return next;
  entry.completed_pairs += 1;
  entry.http_failures = 0;
  next[model] = entry;
  return next;
}

export function extractJsonObject(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function getValueAtPath(target, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), target);
}

export function scoreScenarioResponse(scenario, responseText) {
  const text = String(responseText || '').trim();
  if (!text) {
    return {
      score: 0,
      maxScore: 1,
      checks: [{ type: 'empty', passed: false }],
      error: 'empty response',
    };
  }

  const checks = [];
  let passed = 0;
  let maxScore = 0;

  if (Array.isArray(scenario.requiredPhrases)) {
    for (const phrase of scenario.requiredPhrases) {
      maxScore += 1;
      const ok = text.toLowerCase().includes(String(phrase).toLowerCase());
      checks.push({ type: 'requiredPhrase', phrase, passed: ok });
      if (ok) passed += 1;
    }
  }

  if (Array.isArray(scenario.forbiddenPhrases)) {
    for (const phrase of scenario.forbiddenPhrases) {
      maxScore += 1;
      const ok = !text.toLowerCase().includes(String(phrase).toLowerCase());
      checks.push({ type: 'forbiddenPhrase', phrase, passed: ok });
      if (ok) passed += 1;
    }
  }

  if (scenario.format === 'json') {
    const parsed = extractJsonObject(text);
    maxScore += 1;
    checks.push({ type: 'jsonParse', passed: Boolean(parsed) });
    if (parsed) passed += 1;

    for (const rule of scenario.jsonExpectations || []) {
      maxScore += 1;
      const value = parsed ? getValueAtPath(parsed, rule.path) : undefined;
      let ok = false;
      if (Object.prototype.hasOwnProperty.call(rule, 'equals')) {
        ok = value === rule.equals;
      } else if (Object.prototype.hasOwnProperty.call(rule, 'includes')) {
        ok = String(value || '').toLowerCase().includes(String(rule.includes).toLowerCase());
      } else if (Object.prototype.hasOwnProperty.call(rule, 'equalsLength')) {
        ok = Array.isArray(value) && value.length === rule.equalsLength;
      }
      checks.push({ type: 'jsonRule', path: rule.path, passed: ok, expected: rule });
      if (ok) passed += 1;
    }
  }

  return {
    score: passed,
    maxScore: Math.max(maxScore, 1),
    checks,
    error: null,
  };
}

export function aggregateCapabilityScores(records) {
  const byCapability = {};
  for (const record of records) {
    if (!record.ok) continue;
    for (const capability of record.capabilities) {
      byCapability[capability] ||= {};
      byCapability[capability][record.model] ||= { total: 0, count: 0 };
      byCapability[capability][record.model].total += record.normalized_score;
      byCapability[capability][record.model].count += 1;
    }
  }

  const summary = {};
  for (const [capability, modelScores] of Object.entries(byCapability)) {
    const ranked = Object.entries(modelScores)
      .map(([model, values]) => ({
        model,
        avg_score: values.count > 0 ? values.total / values.count : 0,
        samples: values.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score);
    summary[capability] = ranked;
  }
  return summary;
}

export function buildCandidateConfig({ manifest, capabilityScores, primaryModels }) {
  const capability_models = {};
  for (const [capability, ranked] of Object.entries(capabilityScores)) {
    if (ranked.length > 0) capability_models[capability] = ranked[0].model;
  }

  const defaultChatModel = capability_models.correction_confirmation || capability_models.farm_process || primaryModels[0] || null;
  const nluModel = capability_models.voice_extraction || primaryModels[0] || null;

  return {
    generated_at: new Date().toISOString(),
    manifest_id: manifest.manifest_id,
    source_run_id: manifest.run_id,
    primary_models: primaryModels,
    default_chat_model: defaultChatModel,
    nlu_model: nluModel,
    capability_models,
    capability_scores: capabilityScores,
  };
}
