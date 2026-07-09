import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de la cola durable de requests al agente + telemetría rica (v20 2026-06-13).
 *
 * Garantiza que ninguna pregunta se pierda y captura metadata completa para
 * debuggear inteligencia + velocidad de Chagra. Tests cubren:
 * - enqueue persiste y devuelve id
 * - drainPending serializa uno a uno
 * - retry con backoff exponencial
 * - resumePending reactiva 'offline'
 * - captura latencia + grounding
 * - nunca pierde requests (tolerante a fallos)
 * - offline mantiene 'queued' (o los marca 'offline')
 */

import { makeFakeDB } from '../../test-utils/index.js';

let fakeDB;

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: { AGENT_REQUESTS: 'agent_requests' },
}));

import {
  enqueueRequest,
  listRequests,
  getRequest,
  markRequestOffline,
  resumePending,
  processRequest,
  drainPending,
  clearAgentRequests,
  aggregateRequestMetrics,
  finalizeRequest,
  failRequest,
} from '../agentRequestQueue.js';

import { setOnline } from '../../test-utils/index.js';

beforeEach(() => {
  fakeDB = makeFakeDB();
  setOnline(true);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('agentRequestQueue — enqueueRequest', () => {
  it('enqueueRequest persiste y devuelve id', async () => {
    const id = await enqueueRequest({ 
      prompt: '¿Qué le pasa a mi café?', 
      route: 'chat',
      model: 'llama3:70b'
    });
    
    expect(id).toBeTruthy();
    expect(typeof id).toBe('number');
    
    const all = await listRequests();
    expect(all).toHaveLength(1);
    expect(all[0].prompt).toBe('¿Qué le pasa a mi café?');
    expect(all[0].route).toBe('chat');
    expect(all[0].model).toBe('llama3:70b');
    expect(all[0].status).toBe('queued');
    expect(all[0].ts_submit).toBeTruthy();
    expect(all[0].grounding).toEqual({
      entities: [],
      tools: [],
      rag_chunks: 0,
      nlu_route: 'chat',
      grounded_status: 'none',
    });
    expect(all[0].latency).toEqual({
      t_first_token_ms: null,
      t_total_ms: null,
      queue_wait_ms: null,
    });
  });

  it('enqueueRequest usa defaults para route y model', async () => {
    const id = await enqueueRequest({ prompt: 'hola' });
    
    expect(id).toBeTruthy();
    const all = await listRequests();
    expect(all[0].route).toBe('unknown');
    expect(all[0].model).toBe('default');
  });

  it('enqueueRequest rechaza prompt inválido y devuelve null (NUNCA lanza)', async () => {
    const id1 = await enqueueRequest({ prompt: null });
    expect(id1).toBeNull();
    
    const id2 = await enqueueRequest({ prompt: '' });
    expect(id2).toBeNull();
    
    const id3 = await enqueueRequest({ prompt: /** @type {any} */ (123) }); // input inválido a propósito
    expect(id3).toBeNull();
    
    const all = await listRequests();
    expect(all).toHaveLength(0);
  });

  it('enqueueRequest sobrevive error de IndexedDB y devuelve null', async () => {
    // Simular error de IndexedDB
    fakeDB = null; // openDB devolverá null → transaction fallará
    const id = await enqueueRequest({ prompt: 'test' });
    expect(id).toBeNull();
  });
});

describe('agentRequestQueue — listRequests/getRequest', () => {
  it('listRequests devuelve todos los requests', async () => {
    await enqueueRequest({ prompt: 'a', route: 'chat' });
    await enqueueRequest({ prompt: 'b', route: 'foliage' });
    
    const all = await listRequests();
    expect(all).toHaveLength(2);
    expect(all[0].prompt).toBe('a');
    expect(all[1].prompt).toBe('b');
  });

  it('getRequest devuelve un request específico', async () => {
    const id = await enqueueRequest({ prompt: 'test' });
    const item = await getRequest(id);
    
    expect(item).toBeTruthy();
    expect(item.prompt).toBe('test');
    expect(item.id).toBe(id);
  });

  it('getRequest devuelve null si no existe', async () => {
    const item = await getRequest(9999);
    expect(item).toBeNull();
  });

  it('getRequest es tolerante a fallos', async () => {
    const item = await getRequest(null);
    expect(item).toBeNull();
    
    fakeDB = null;
    const item2 = await getRequest(1);
    expect(item2).toBeNull();
  });
});

describe('agentRequestQueue — processRequest', () => {
  it('processRequest delega al sender y marca done', async () => {
    const sender = vi.fn().mockResolvedValue({
      response: 'Respuesta del modelo',
      tokens_in: 10,
      tokens_out: 20,
      grounding: {
        entities: ['cafe'],
        tools: ['get_species'],
        rag_chunks: 3,
        grounded_status: 'verified',
      },
    });
    
    const id = await enqueueRequest({ prompt: 'test', route: 'chat' });
    
    const result = await processRequest({
      sender,
      req: { prompt: 'test', route: 'chat' },
      id,
    });
    
    expect(result.status).toBe('done');
    expect(result.response).toBe('Respuesta del modelo');
    expect(result.tokens_in).toBe(10);
    expect(result.tokens_out).toBe(20);
    expect(result.grounding.grounded_status).toBe('verified');
    expect(result.grounding.entities).toEqual(['cafe']);
    expect(result.latency.t_total_ms).toBeGreaterThanOrEqual(0); // Puede ser 0 en tests rápidos
    expect(result.latency.queue_wait_ms).toBeGreaterThanOrEqual(0);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it('processRequest reintenta con backoff exponencial', async () => {
    const sender = vi.fn()
      .mockRejectedValueOnce(new Error('falla 1'))
      .mockRejectedValueOnce(new Error('falla 2'))
      .mockResolvedValueOnce({ response: 'ok' });
    
    const id = await enqueueRequest({ prompt: 'test' });
    
    const startTime = Date.now();
    const result = await processRequest({
      sender,
      req: { prompt: 'test' },
      id,
    });
    const elapsed = Date.now() - startTime;
    
    expect(result.status).toBe('done');
    expect(sender).toHaveBeenCalledTimes(3);
    // Debió haber esperado al menos 1s + 2s = 3s de backoff
    expect(elapsed).toBeGreaterThanOrEqual(3000);
    expect(result.retries).toBe(2);
  });

  it('processRequest marca failed tras MAX_RETRIES', async () => {
    const sender = vi.fn().mockRejectedValue(new Error('siempre falla'));
    
    const id = await enqueueRequest({ prompt: 'test' });
    
    const result = await processRequest({
      sender,
      req: { prompt: 'test' },
      id,
    });
    
    expect(result.status).toBe('failed');
    expect(result.error).toBeTruthy();
    expect(result.retries).toBe(3);
    expect(sender).toHaveBeenCalledTimes(4); // 3 retries + 1 initial = 4 calls
  });

  it('processRequest captura latencia del sender', async () => {
    const sender = vi.fn().mockResolvedValue({
      response: 'ok',
      latency: {
        t_first_token_ms: 150,
      },
    });
    
    const id = await enqueueRequest({ prompt: 'test' });
    
    const result = await processRequest({
      sender,
      req: { prompt: 'test' },
      id,
    });
    
    expect(result.latency.t_first_token_ms).toBe(150);
    expect(result.latency.t_total_ms).toBeGreaterThanOrEqual(0); // Puede ser 0 en tests rápidos
  });

  it('processRequest rechaza sender inválido', async () => {
    const id = await enqueueRequest({ prompt: 'test' });
    
    await expect(
      processRequest({ sender: null, req: {}, id })
    ).rejects.toThrow();
  });

  it('processRequest rechaza request no encontrado', async () => {
    await expect(
      processRequest({ sender: vi.fn(), req: {}, id: 9999 })
    ).rejects.toThrow();
  });

  it('processRequest rechaza request no queued', async () => {
    const id = await enqueueRequest({ prompt: 'test' });
    // Marcar como done manualmente
    const item = await getRequest(id);
    item.status = 'done';
    await fakeDB.transaction().objectStore().put(item);
    
    await expect(
      processRequest({ sender: vi.fn(), req: {}, id })
    ).rejects.toThrow();
  });
});

describe('agentRequestQueue — drainPending', () => {
  it('drainPending procesa items queued en orden FIFO', async () => {
    const order = [];
    const sender = vi.fn(async (req) => {
      order.push(req.prompt);
      return { response: `ok: ${req.prompt}` };
    });
    
    // Encolar con timestamps explícitos para controlar orden
    await enqueueRequest({ prompt: 'primero', route: 'chat' });
    await enqueueRequest({ prompt: 'segundo', route: 'foliage' });
    
    const result = await drainPending({ sender });
    
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(order).toEqual(['primero', 'segundo']);
    
    const all = await listRequests();
    expect(all[0].status).toBe('done');
    expect(all[1].status).toBe('done');
  });

  it('drainPending solo procesa queued (no reprocesa done)', async () => {
    const sender = vi.fn().mockResolvedValue({ response: 'ok' });

    const id1 = await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });

    // Procesar primero
    await processRequest({ sender, req: { prompt: 'a' }, id: id1 });

    // Drain pendiente
    const result = await drainPending({ sender });

    expect(result.processed).toBe(1); // Solo 'b'
    expect(sender).toHaveBeenCalledTimes(2); // a + b
  });

  it('drainPending reintenta fallos sin abortar el resto', async () => {
    // Sender que falla siempre para 'a', tiene éxito para 'b'
    const sender = vi.fn((req) => {
      if (req.prompt === 'a') {
        throw new Error('fail a');
      }
      return Promise.resolve({ response: 'ok b' });
    });

    await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });

    const result = await drainPending({ sender });

    expect(result.processed).toBe(1); // b
    expect(result.failed).toBe(1); // a

    const all = await listRequests();
    const a = all.find((i) => i.prompt === 'a');
    const b = all.find((i) => i.prompt === 'b');
    expect(a.status).toBe('failed');
    expect(b.status).toBe('done');
  });

  it('drainPending marca offline cuando desconectado', async () => {
    const sender = vi.fn().mockResolvedValue({ response: 'ok' });
    
    await enqueueRequest({ prompt: 'test' });
    setOnline(false);
    
    const result = await drainPending({ sender });
    
    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(sender).not.toHaveBeenCalled();
    
    const all = await listRequests();
    expect(all[0].status).toBe('offline');
  });

  it('drainPending rechaza sender inválido', async () => {
    const result = await drainPending({ sender: null });
    
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('drainPending vacío retorna ceros', async () => {
    const sender = vi.fn();
    const result = await drainPending({ sender });
    
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });
});

describe('agentRequestQueue — resumePending', () => {
  it('resumePending reactiva items offline', async () => {
    await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });
    
    // Marcar como offline
    const all = await listRequests();
    for (const item of all) {
      await markRequestOffline(item.id);
    }
    
    const reactivated = await resumePending();
    
    expect(reactivated).toBe(2);
    
    const updated = await listRequests();
    expect(updated.every((i) => i.status === 'queued')).toBe(true);
  });

  it('resumePending no hace nada si no hay offline', async () => {
    const reactivated = await resumePending();
    expect(reactivated).toBe(0);
  });
});

describe('agentRequestQueue — aggregateRequestMetrics', () => {
  it('aggregateRequestMetrics calcula totales', async () => {
    // Crear requests con diferentes estados
    await enqueueRequest({ prompt: 'done1', route: 'chat' });
    await enqueueRequest({ prompt: 'done2', route: 'foliage' });
    await enqueueRequest({ prompt: 'queued1', route: 'species' });
    
    const all = await listRequests();
    // Marcar dos como done
    all[0].status = 'done';
    all[0].latency.t_total_ms = 100;
    all[1].status = 'done';
    all[1].latency.t_total_ms = 200;
    
    const metrics = aggregateRequestMetrics(all);
    
    expect(metrics.totals.total).toBe(3);
    expect(metrics.totals.done).toBe(2);
    expect(metrics.totals.queued).toBe(1);
    expect(metrics.totals.successRate).toBe(1); // 2/2 done
    expect(metrics.avgLatency.avgTotalMs).toBe(150); // (100+200)/2
  });

  it('aggregateRequestMetrics agrupa por modelo', async () => {
    await enqueueRequest({ prompt: 'a', model: 'llama3:70b' });
    await enqueueRequest({ prompt: 'b', model: 'gpt-4o' });
    await enqueueRequest({ prompt: 'c', model: 'llama3:70b' });
    
    const all = await listRequests();
    all[0].status = 'done';
    all[0].latency.t_total_ms = 100;
    all[1].status = 'done';
    all[1].latency.t_total_ms = 200;
    all[2].status = 'done';
    all[2].latency.t_total_ms = 150;
    
    const metrics = aggregateRequestMetrics(all);
    
    expect(metrics.byModel['llama3:70b'].count).toBe(2);
    expect(metrics.byModel['llama3:70b'].avgLatencyMs).toBe(125);
    expect(metrics.byModel['gpt-4o'].count).toBe(1);
    expect(metrics.byModel['gpt-4o'].avgLatencyMs).toBe(200);
  });

  it('aggregateRequestMetrics agrupa por route', async () => {
    await enqueueRequest({ prompt: 'a', route: 'chat' });
    await enqueueRequest({ prompt: 'b', route: 'foliage' });
    
    const all = await listRequests();
    all[0].status = 'done';
    all[0].latency.t_total_ms = 100;
    all[1].status = 'done';
    all[1].latency.t_total_ms = 200;
    
    const metrics = aggregateRequestMetrics(all);
    
    expect(metrics.byRoute['chat'].count).toBe(1);
    expect(metrics.byRoute['chat'].avgLatencyMs).toBe(100);
    expect(metrics.byRoute['foliage'].count).toBe(1);
    expect(metrics.byRoute['foliage'].avgLatencyMs).toBe(200);
  });
});

describe('agentRequestQueue — clearAgentRequests', () => {
  it('clearAgentRequests vacía la cola', async () => {
    await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });
    expect(await listRequests()).toHaveLength(2);
    
    await clearAgentRequests();
    expect(await listRequests()).toHaveLength(0);
  });

  it('clearAgentRequests es no-op si ya está vacío', async () => {
    await clearAgentRequests(); // No debe lanzar
    expect(await listRequests()).toHaveLength(0);
  });
});

describe('agentRequestQueue — integración offline/online', () => {
  it('flujocompleto: enqueue → offline → online → resume → drain', async () => {
    // 1. Enqueue requests
    await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });
    expect(await listRequests()).toHaveLength(2);
    
    // 2. Detectar offline (simulado)
    setOnline(false);
    await drainPending({ sender: vi.fn() });
    expect((await listRequests())[0].status).toBe('offline');
    
    // 3. Volver online
    setOnline(true);
    await resumePending();
    expect((await listRequests())[0].status).toBe('queued');
    
    // 4. Drain y procesar
    const sender = vi.fn().mockResolvedValue({ response: 'ok' });
    const result = await drainPending({ sender });
    
    expect(result.processed).toBe(2);
    expect(sender).toHaveBeenCalledTimes(2);
    expect((await listRequests()).every((i) => i.status === 'done')).toBe(true);
  });
});

describe('agentRequestQueue — nunca pierde requests', () => {
  it('persiste aunque falle el sender', async () => {
    const sender = vi.fn().mockRejectedValue(new Error('fail'));
    
    await enqueueRequest({ prompt: 'test' });
    await drainPending({ sender });
    
    // El request sigue ahí, aunque falló
    const all = await listRequests();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('failed');
    expect(all[0].prompt).toBe('test'); // Prompt intacto
  });

  it('persiste aunque haya error de IndexedDB en enqueue', async () => {
    // Esto ya está cubierto en "enqueueRequest sobrevive error de IndexedDB"
    // pero confirmamos que no lanza
    const id = await enqueueRequest({ prompt: null });
    expect(id).toBeNull(); // Devuelve null, no lanza
  });

  it('recupera tras recarga de página (simulada)', async () => {
    // Crear requests
    await enqueueRequest({ prompt: 'a' });
    await enqueueRequest({ prompt: 'b' });

    // Guardar datos actuales (simulando persistencia IDB)
    const oldData = new Map(fakeDB.__data);

    // "Recargar página" → nuevo fakeDB
    fakeDB = makeFakeDB();

    // Copiar datos del viejo al nuevo (simulando persistencia IDB)
    oldData.forEach((value, key) => {
      fakeDB.__data.set(key, value);
    });

    // Verificar que los datos persistieron
    const all = await listRequests();
    expect(all).toHaveLength(2);
    expect(all[0].prompt).toBe('a');
    expect(all[1].prompt).toBe('b');
  });
});

describe('agentRequestQueue — finalizeRequest (camino VIVO del AgentScreen)', () => {
  it('cierra el request con telemetría de un LLM YA ejecutado (sin sender)', async () => {
    const id = await enqueueRequest({ prompt: '¿qué le pasa al café?', route: 'chat' });

    const item = await finalizeRequest({
      id,
      result: {
        response: 'Tu café tiene roya. Aplica caldo bordelés.',
        latency: { t_first_token_ms: 120 },
        grounding: {
          entities: ['cafe'],
          tools: ['get_pest_controllers'],
          rag_chunks: 2,
          grounded_status: 'verified',
        },
        tokens_in: 30,
        tokens_out: 40,
      },
    });

    expect(item.status).toBe('done');
    expect(item.response).toBe('Tu café tiene roya. Aplica caldo bordelés.');
    expect(item.latency.t_first_token_ms).toBe(120);
    expect(item.latency.queue_wait_ms).toBeGreaterThanOrEqual(0);
    expect(item.latency.t_total_ms).toBeGreaterThanOrEqual(0);
    expect(item.grounding.grounded_status).toBe('verified');
    expect(item.grounding.entities).toEqual(['cafe']);
    expect(item.tokens_in).toBe(30);
    expect(item.tokens_out).toBe(40);
    expect(item.error).toBeNull();

    // Persistió en IDB (sobrevive recarga).
    const reread = await getRequest(id);
    expect(reread.status).toBe('done');
    expect(reread.response).toBe('Tu café tiene roya. Aplica caldo bordelés.');
  });

  it('finalizeRequest tolera id inexistente (devuelve null, no lanza)', async () => {
    const out = await finalizeRequest({ id: 9999, result: { response: 'x' } });
    expect(out).toBeNull();
  });
});

describe('agentRequestQueue — failRequest (camino VIVO)', () => {
  it('marca failed conservando el prompt intacto', async () => {
    const id = await enqueueRequest({ prompt: 'cómo combato la broca', route: 'chat' });

    const item = await failRequest({ id, error: new Error('LLM caído') });

    expect(item.status).toBe('failed');
    expect(item.error).toBe('LLM caído');
    expect(item.prompt).toBe('cómo combato la broca'); // prompt NUNCA se pierde

    const reread = await getRequest(id);
    expect(reread.status).toBe('failed');
    expect(reread.prompt).toBe('cómo combato la broca');
  });

  it('failRequest tolera id inexistente (devuelve null, no lanza)', async () => {
    const out = await failRequest({ id: 9999, error: 'x' });
    expect(out).toBeNull();
  });
});
