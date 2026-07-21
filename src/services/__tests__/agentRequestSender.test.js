import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del sender headless para la cola durable de requests al agente.
 *
 * `agentRequestSender` es el adaptador que `drainPending({sender})` usa para
 * reanudar requests que sobrevivieron una recarga / sesión anterior (status
 * 'queued'/'offline'). Corre la llamada real al LLM SIN React (headless) y
 * devuelve el shape de telemetría que `processRequest` persiste:
 *   { response, latency:{ t_first_token_ms }, grounding, tokens_in, tokens_out }
 *
 * La llamada cruda al LLM se inyecta (`llmCall`) para que el test no toque red.
 */

vi.mock('../llmRouter.js', () => ({
  selectChatRoute: vi.fn(() => 'chat'),
  buildLLMRequest: vi.fn(() => ({
    url: '/api/ollama/v1/chat/completions',
    body: { model: 'granite3.3:8b', temperature: 0.3, max_tokens: 512 },
  })),
}));

import { createAgentRequestSender, buildSenderMessages } from '../agentRequestSender.js';

describe('agentRequestSender — buildSenderMessages', () => {
  it('arma mensajes system + user mínimos a partir del req', () => {
    const msgs = buildSenderMessages({ prompt: '¿qué le pasa al café?' });
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '¿qué le pasa al café?' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content.length).toBeGreaterThan(0);
  });
});

describe('agentRequestSender — createAgentRequestSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el shape de telemetría que processRequest espera', async () => {
    const llmCall = vi.fn(async ({ onToken }) => {
      // Simula el primer token (mide t_first_token).
      onToken?.('Hola', 'Hola');
      onToken?.(' campesino', 'Hola campesino');
      return {
        fullText: 'Hola campesino',
        stats: { first_token_ms: 142, eval_rate: 24.5, response_len: 14 },
      };
    });
    const sender = createAgentRequestSender({ llmCall });

    const result = await sender({ prompt: 'hola', route: 'chat', model: 'granite3.3:8b' });

    expect(result.response).toBe('Hola campesino');
    expect(result.latency.t_first_token_ms).toBe(142);
    expect(result.grounding).toBeTruthy();
    expect(result.grounding.nlu_route).toBe('chat');
    // tokens: si el backend no los da, estimación de respaldo numérica.
    expect(typeof result.tokens_out).toBe('number');
    expect(llmCall).toHaveBeenCalledTimes(1);
  });

  it('propaga el prompt del req al llmCall', async () => {
    const llmCall = vi.fn(async () => ({ fullText: 'ok', stats: {} }));
    const sender = createAgentRequestSender({ llmCall });
    await sender({ prompt: 'cómo siembro maíz', route: 'chat' });

    const callArg = /** @type {any[]} */ (llmCall.mock.calls[0])[0];
    const lastMsg = /** @type {any[]} */ (callArg.messages)[/** @type {any[]} */ (callArg.messages).length - 1];
    expect(lastMsg.content).toBe('cómo siembro maíz');
  });

  it('lanza si el llmCall falla (para que processRequest reintente)', async () => {
    const llmCall = vi.fn(async () => { throw new Error('LLM caído'); });
    const sender = createAgentRequestSender({ llmCall });

    await expect(sender({ prompt: 'x', route: 'chat' })).rejects.toThrow('LLM caído');
  });

  it('lanza si el LLM devuelve texto vacío (recuperable → reintento)', async () => {
    const llmCall = vi.fn(async () => ({ fullText: '   ', stats: {} }));
    const sender = createAgentRequestSender({ llmCall });

    await expect(sender({ prompt: 'x', route: 'chat' })).rejects.toThrow();
  });
});
