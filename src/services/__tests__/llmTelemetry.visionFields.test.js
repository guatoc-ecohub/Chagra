/**
 * llmTelemetry.visionFields.test.js — V-12 2026-05-27.
 *
 * Cobertura del schema extendido de `recordLLMEvent` para audit visión:
 * - `confidence` (number 0-1, opcional): persistido cuando el caller lo provee
 *   tras parsear el JSON del modelo de visión.
 * - `grounded_status` (string|null, opcional): persistido tal cual, distinguiendo
 *   `'verified'` / `'rejected'` / `null` (sidecar offline / no-grounding flow).
 *
 * Backward-compat strict: si el caller no pasa los campos, NO deben aparecer
 * en el record. Esto preserva el shape histórico para eventos no-visión
 * (chat/extract/summarize) y evita pollution del store IDB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('llmTelemetryService — campos visión V-12', () => {
  let inMemoryStore;
  let llmTelemetry;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    inMemoryStore = new Map();

    const asyncReq = (resultFactory) => {
      const req = { onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        req.result = resultFactory();
        req.onsuccess?.({ target: req });
      });
      return req;
    };

    const stubStore = {
      add: (record) => asyncReq(() => {
        inMemoryStore.set(record.id, record);
        return record;
      }),
      count: () => asyncReq(() => inMemoryStore.size),
      clear: () => asyncReq(() => { inMemoryStore.clear(); return undefined; }),
      index: () => ({ openCursor: () => asyncReq(() => null) }),
    };

    const stubTx = () => {
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => stubStore,
        error: null,
      };
      Promise.resolve().then(() => tx.oncomplete?.());
      return tx;
    };

    const stubDb = { transaction: () => stubTx() };

    vi.doMock('../../db/dbCore.js', () => ({
      openDB: vi.fn().mockResolvedValue(stubDb),
      STORES: { LLM_TELEMETRY: 'llm_telemetry' },
    }));

    localStorage.clear();
    llmTelemetry = await import('../llmTelemetryService.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste confidence cuando el caller lo provee (number 0-1)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'llama3.2-vision:11b',
      endpoint: '/api/ollama/api/generate',
      flujo: 'vision',
      status: 'success',
      total_ms: 4321,
      confidence: 0.87,
    });

    expect(record).not.toBeNull();
    expect(record.confidence).toBe(0.87);
  });

  it('persiste confidence = 0 (caso edge: modelo no identifica con seguridad)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'gemma3:4b',
      flujo: 'vision',
      confidence: 0,
    });

    expect(record.confidence).toBe(0);
  });

  it('omite confidence del payload cuando el caller no lo pasa (backward-compat)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'gemma3:4b',
      flujo: 'chat',
      status: 'success',
    });

    expect(Object.prototype.hasOwnProperty.call(record, 'confidence')).toBe(false);
  });

  it('omite confidence cuando el caller pasa un valor no-number (defensivo)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'gemma3:4b',
      flujo: 'vision',
      confidence: 'high', // shape inválido — debe ignorarse
    });

    expect(Object.prototype.hasOwnProperty.call(record, 'confidence')).toBe(false);
  });

  it('persiste grounded_status = "verified" cuando el catálogo valida', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'llama3.2-vision:11b',
      flujo: 'vision',
      grounded_status: 'verified',
    });

    expect(record.grounded_status).toBe('verified');
  });

  it('persiste grounded_status = "rejected" cuando el modelo alucinó', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'llama3.2-vision:11b',
      flujo: 'vision',
      grounded_status: 'rejected',
    });

    expect(record.grounded_status).toBe('rejected');
  });

  it('persiste grounded_status = null cuando sidecar disabled / offline', async () => {
    // null explícito ES distinto de undefined: el caller intentó grounding
    // pero degradó. Telemetría debe reflejar ese intento.
    const record = await llmTelemetry.recordLLMEvent({
      model: 'llama3.2-vision:11b',
      flujo: 'vision',
      grounded_status: null,
    });

    expect(Object.prototype.hasOwnProperty.call(record, 'grounded_status')).toBe(true);
    expect(record.grounded_status).toBeNull();
  });

  it('omite grounded_status cuando el caller no lo pasa (flujos no-vision)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'gemma3:4b',
      flujo: 'extract',
      status: 'success',
    });

    expect(Object.prototype.hasOwnProperty.call(record, 'grounded_status')).toBe(false);
  });

  it('confidence + grounded_status conviven en el mismo record (caso normal V-12)', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'llama3.2-vision:11b',
      endpoint: '/api/ollama/api/generate',
      flujo: 'vision',
      status: 'success',
      total_ms: 5200,
      eval_count: 42,
      confidence: 0.92,
      grounded_status: 'verified',
    });

    expect(record.confidence).toBe(0.92);
    expect(record.grounded_status).toBe('verified');
    expect(record.model).toBe('llama3.2-vision:11b');
    expect(record.flujo).toBe('vision');
  });

  it('shape histórico preservado: campos legacy intactos cuando no se pasa nada V-12', async () => {
    const record = await llmTelemetry.recordLLMEvent({
      model: 'gemma3:4b',
      endpoint: '/api/ollama/api/chat',
      flujo: 'chat',
      status: 'success',
      total_ms: 1000,
      eval_count: 50,
      processor: 'gpu',
    });

    // Sanity check: ningún campo V-12 contamina records no-vision.
    expect(record.confidence).toBeUndefined();
    expect(record.grounded_status).toBeUndefined();
    // Legacy intacto.
    expect(record.rag_passages_used).toBeNull();
    expect(record.error_kind).toBeNull();
    expect(record.synced).toBe(false);
  });
});
