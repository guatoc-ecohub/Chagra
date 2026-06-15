import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test de INTEGRACIÓN del wire durable end-to-end (#5, 2026-06-13):
 *   enqueueRequest → offline → resumePending → drainPending(sender headless)
 * con el sender REAL (createAgentRequestSender) + un llmCall inyectado.
 *
 * Prueba la garantía del operador: una pregunta hecha sin señal en el campo
 * NUNCA se pierde — sobrevive la recarga (IndexedDB) y se responde sola al
 * volver la conexión, capturando telemetría. Es el camino que AgentScreen
 * dispara en mount + evento 'online'.
 */

import { makeFakeDB } from '../../test-utils/index.js';

let fakeDB;

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: { AGENT_REQUESTS: 'agent_requests' },
}));

vi.mock('../llmRouter.js', () => ({
  selectChatRoute: vi.fn(() => 'chat'),
  buildLLMRequest: vi.fn(() => ({ url: '/api/ollama/v1/chat/completions', body: { model: 'granite3.3:8b' } })),
}));

import {
  enqueueRequest,
  listRequests,
  drainPending,
  resumePending,
} from '../agentRequestQueue.js';
import { createAgentRequestSender } from '../agentRequestSender.js';

import { setOnline } from '../../test-utils/index.js';

beforeEach(() => {
  fakeDB = makeFakeDB();
  setOnline(true);
  vi.clearAllMocks();
});

afterEach(() => {
  setOnline(true);
});

describe('wire durable end-to-end — pregunta sin señal NUNCA se pierde', () => {
  it('offline → recarga → online → resume → drain(sender real) responde y captura telemetría', async () => {
    // 1. El campesino pregunta SIN señal: se encola durable.
    setOnline(false);
    await enqueueRequest({ prompt: '¿cuándo siembro maíz?', route: 'chat', model: 'granite3.3:8b' });

    // El drain offline marca 'offline' (no procesa).
    const sender0 = createAgentRequestSender({ llmCall: vi.fn() });
    const off = await drainPending({ sender: sender0 });
    expect(off.skipped).toBe(1);
    expect((await listRequests())[0].status).toBe('offline');

    // 2. "Recarga" — los datos persisten (simulamos copiando al nuevo DB).
    const old = new Map(fakeDB.__data);
    fakeDB = makeFakeDB();
    old.forEach((v, k) => fakeDB.__data.set(k, v));
    // El prompt sobrevivió la recarga.
    expect((await listRequests())[0].prompt).toBe('¿cuándo siembro maíz?');

    // 3. Vuelve la conexión → resume + drain con el sender REAL.
    setOnline(true);
    await resumePending(); // 'offline' → 'queued'

    const llmCall = vi.fn(async () => ({
      fullText: 'Siembra el maíz al iniciar las lluvias de abril.',
      stats: { first_token_ms: 110, response_len: 44 },
    }));
    const sender = createAgentRequestSender({ llmCall });
    const result = await drainPending({ sender });

    expect(result.processed).toBe(1);
    expect(llmCall).toHaveBeenCalledTimes(1);

    // 4. El request quedó 'done' con respuesta + telemetría capturada.
    const final = (await listRequests())[0];
    expect(final.status).toBe('done');
    expect(final.response).toBe('Siembra el maíz al iniciar las lluvias de abril.');
    expect(final.latency.t_first_token_ms).toBe(110);
    expect(final.latency.queue_wait_ms).toBeGreaterThanOrEqual(0);
    expect(final.grounding.nlu_route).toBe('chat');
    expect(typeof final.tokens_out).toBe('number');
  });

  it('si el LLM sigue caído, NO pierde el prompt (queda failed conservando texto)', async () => {
    await enqueueRequest({ prompt: 'pregunta importante', route: 'chat' });
    const llmCall = vi.fn(async () => { throw new Error('LLM caído'); });
    const sender = createAgentRequestSender({ llmCall });

    const result = await drainPending({ sender });
    expect(result.failed).toBe(1);

    const item = (await listRequests())[0];
    expect(item.status).toBe('failed');
    expect(item.prompt).toBe('pregunta importante'); // el dato NUNCA se pierde
  });
});
