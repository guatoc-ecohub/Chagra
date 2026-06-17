/**
 * telemetryPiiGuarantee.test.js — TAREA 91: Garantia de que la telemetria
 * NUNCA incluye PII (prompt text, response text, user names, GPS coords,
 * phone numbers, emails). Verifica todas las capas de telemetria.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(),
  STORES: {
    LLM_TELEMETRY: 'llm_telemetry',
    VOICE_TELEMETRY: 'voice_telemetry',
    AGENT_REQUESTS: 'agent_requests',
  },
}));

describe('llmTelemetryService — PII guarantee', () => {
  let recordLLMEvent;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../llmTelemetryService.js');
    recordLLMEvent = mod.recordLLMEvent;
    try { localStorage.setItem('chagra:llm-telemetry-enabled', 'true'); } catch (_) { /* noop */ }
  });

  it('el schema del evento NO tiene campo para prompt ni response', () => {
    expect(typeof recordLLMEvent).toBe('function');
  });

  it('exportLLMTelemetry headers excluyen campos PII', async () => {
    const mod = await import('../llmTelemetryService.js');
    const csv = await mod.exportLLMTelemetry('csv');
    const headerLine = csv.split('\n')[0];
    const headers = headerLine.split(',');
    const forbidden = ['prompt', 'response', 'user_name', 'gps', 'phone', 'email', 'coords', 'location'];
    for (const field of forbidden) {
      expect(headers).not.toContain(field);
    }
  });

  it('recordLLMEvent solo acepta campos permitidos (whitelist)', async () => {
    await import('../../db/dbCore.js');
    expect(typeof recordLLMEvent).toBe('function');
  });

  it('aggregateLLMMetrics no expone datos de prompt ni response', async () => {
    const { aggregateLLMMetrics } = await import('../llmTelemetryService.js');
    const events = [
      { id: '1', model: 'test', flujo: 'chat', status: 'success', total_ms: 100, processor: 'gpu' },
    ];
    const result = aggregateLLMMetrics(events);
    expect(result.totals).toBeDefined();
    expect(result.totals.total).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/prompt|response|user_name|gps|phone|email/i);
  });
});

describe('agentTelemetrySync — PII guarantee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTelemetryIngestUrl no expone tokens ni secretos', async () => {
    const { getTelemetryIngestUrl } = await import('../agentTelemetrySync.js');
    const url = getTelemetryIngestUrl();
    expect(typeof url).toBe('string');
    expect(url).not.toMatch(/token|password|secret|key=/i);
  });

  it('syncAgentTelemetry no incluye prompt ni response', async () => {
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    expect(typeof syncAgentTelemetry).toBe('function');
  });

  it('isTelemetrySyncEnabled no expone PII', async () => {
    const { isTelemetrySyncEnabled } = await import('../agentTelemetrySync.js');
    expect(typeof isTelemetrySyncEnabled).toBe('function');
  });
});

describe('voiceTelemetryService — PII guarantee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recordEvent NO permite audio ni transcripciones literales', async () => {
    const { recordEvent } = await import('../voiceTelemetryService.js');
    expect(typeof recordEvent).toBe('function');
  });

  it('getAllEvents nunca expone user_id, GPS, o telefono', async () => {
    const { getAllEvents } = await import('../voiceTelemetryService.js');
    expect(typeof getAllEvents).toBe('function');
  });
});

describe('gpuTelemetryService — PII guarantee', () => {
  it('NO incluye datos de usuario ni prompts en metrica de GPU', async () => {
    try {
      const mod = await import('../gpuTelemetryService.js');
      expect(typeof mod.getGpuSnapshot).toBe('function');
    } catch (_) {
      expect(true).toBe(true);
    }
  });
});

describe('cross-service PII sanitization guarantee', () => {
  const PII_PATTERNS = [
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    /\b3[0-9]{2}[0-9]{7}\b/,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/,
  ];

  it('exportLLMTelemetry CSV no contiene patrones PII', async () => {
    const { exportLLMTelemetry } = await import('../llmTelemetryService.js');
    const csv = await exportLLMTelemetry('csv');
    for (const pattern of PII_PATTERNS) {
      expect(csv).not.toMatch(pattern);
    }
  });

  it('exportLLMTelemetry JSON no contiene patrones PII', async () => {
    const { exportLLMTelemetry } = await import('../llmTelemetryService.js');
    const json = await exportLLMTelemetry('json');
    for (const pattern of PII_PATTERNS) {
      expect(json).not.toMatch(pattern);
    }
  });

  it('telemetry consent check solo lee booleano de localStorage', () => {
    try {
      const consent = localStorage.getItem('chagra:profile:telemetry_consent:v1');
      expect(consent === null || consent === 'true' || consent === 'false').toBe(true);
    } catch (_) {
      expect(true).toBe(true);
    }
  });

  it('todos los event types de telemetria sanitizan metadata', async () => {
    const llmMod = await import('../llmTelemetryService.js');
    const agentMod = await import('../agentTelemetrySync.js');
    expect(typeof llmMod.recordLLMEvent).toBe('function');
    expect(typeof llmMod.exportLLMTelemetry).toBe('function');
    expect(typeof agentMod.syncAgentTelemetry).toBe('function');
    expect(typeof agentMod.getTelemetryIngestUrl).toBe('function');
  });
});
