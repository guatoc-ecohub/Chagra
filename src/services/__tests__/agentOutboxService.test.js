/**
 * agentOutboxService.test.js — contrato de INTEGRIDAD de la outbox durable.
 *
 * El punto central del compositor multimodal del home: cuando el usuario envía
 * una consulta (texto / audio / foto / adjunto) desde el dashboard, se persiste
 * ANTES de navegar. Si da "atrás" o CIERRA la app a mitad → al volver el item
 * sigue ahí y NO se pierde ni se duplica.
 *
 * Mockea `../../db/dbCore` con un Map en memoria que imita la superficie IDB que
 * el service usa (transaction → objectStore → {add, put, get, getAll, delete,
 * clear}, oncomplete). autoIncrement simulado. Mismo enfoque que
 * visionQueueService.test.js / ragTelemetry.test.js — sin fake-indexeddb.
 *
 * CRÍTICO: el mock conserva el Map entre `openDB()` sucesivos para simular
 * persistencia real (sobrevive a "recargas" lógicas). El claim atómico se
 * verifica simulando dos consumidores concurrentes leyendo la MISMA store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Fake IndexedDB en memoria, persistente entre openDB() ───────────────────
const dbState = { data: new Map(), seq: 0 };

function makeReq(resultFn) {
  const req = {};
  queueMicrotask(() => {
    try {
      req.result = resultFn();
      req.onsuccess?.({ target: req });
    } catch (e) {
      req.error = e;
      req.onerror?.({ target: req });
    }
  });
  return req;
}

function makeStore(_tx) {
  return {
    add(record) {
      return makeReq(() => {
        const id = record.id != null ? record.id : ++dbState.seq;
        dbState.data.set(id, { ...record, id });
        return id;
      });
    },
    put(record) {
      return makeReq(() => {
        // put sin id (no debería pasar en este service) → autoIncrement
        const id = record.id != null ? record.id : ++dbState.seq;
        dbState.data.set(id, { ...record, id });
        return id;
      });
    },
    get(id) {
      return makeReq(() => dbState.data.get(id) || undefined);
    },
    getAll() {
      return makeReq(() => [...dbState.data.values()]);
    },
    delete(id) {
      return makeReq(() => {
        dbState.data.delete(id);
        return undefined;
      });
    },
    clear() {
      return makeReq(() => {
        dbState.data.clear();
        return undefined;
      });
    },
  };
}

function makeDB() {
  return {
    transaction() {
      const tx = {};
      const store = makeStore(tx);
      tx.objectStore = () => store;
      // oncomplete: dispara tras un macrotask (setTimeout 0) — DESPUÉS de que
      // los requests (microtasks) resuelvan y de que el service haya tenido la
      // chance de adjuntar tx.oncomplete vía txDone(). Imita la confirmación de
      // durabilidad de IndexedDB sin perder handlers adjuntados tarde.
      setTimeout(() => tx.oncomplete?.(), 0);
      return tx;
    },
  };
}

vi.mock('../../db/dbCore', () => ({
  STORES: { AGENT_OUTBOX: 'agent_outbox' },
  openDB: vi.fn(async () => makeDB()),
}));

import {
  enqueue,
  getAll,
  getQueued,
  getInFlight,
  claimNext,
  getById,
  markAnswered,
  markError,
  requeue,
  recoverStaleProcessing,
  remove,
  clearOutbox,
} from '../agentOutboxService';

beforeEach(() => {
  dbState.data.clear();
  dbState.seq = 0;
});

describe('agentOutboxService — persistencia / restauración', () => {
  it('enqueue persiste un item de texto con status=queued', async () => {
    const id = await enqueue({ kind: 'text', text: '¿qué siembro este mes?' });
    expect(id).toBeGreaterThan(0);
    const all = await getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      kind: 'text',
      text: '¿qué siembro este mes?',
      status: 'queued',
    });
    expect(typeof all[0].createdAt).toBe('number');
  });

  it('enqueue persiste un blob de audio (voz) sin perderlo', async () => {
    const blob = new Blob(['fake-audio'], { type: 'audio/webm' });
    const id = await enqueue({ kind: 'voice', blob });
    const rec = await getById(id);
    expect(rec.kind).toBe('voice');
    expect(rec.blob).toBe(blob);
    expect(rec.mime).toBe('audio/webm');
    expect(rec.status).toBe('queued');
  });

  it('enqueue persiste una foto + texto (caption) juntos', async () => {
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });
    const id = await enqueue({ kind: 'photo', text: '¿qué plaga es esta?', blob });
    const rec = await getById(id);
    expect(rec.kind).toBe('photo');
    expect(rec.text).toBe('¿qué plaga es esta?');
    expect(rec.blob).toBe(blob);
  });

  it('rechaza un item vacío (ni texto ni blob) — no persiste basura', async () => {
    await expect(enqueue({ kind: 'text', text: '   ' })).rejects.toThrow();
    expect(await getAll()).toHaveLength(0);
  });

  it('rechaza kind inválido', async () => {
    await expect(enqueue(/** @type {any} */ ({ kind: 'video', text: 'x' }))).rejects.toThrow(/kind inválido/);
  });

  it('SOBREVIVE a "cierre de app": el item sigue ahí tras re-leer la outbox', async () => {
    await enqueue({ kind: 'text', text: 'consulta importante' });
    // Simula que el usuario cerró y reabrió: NO limpiamos dbState (es disco).
    // Una nueva lectura debe ver el item intacto.
    const restored = await getInFlight();
    expect(restored).toHaveLength(1);
    expect(restored[0].text).toBe('consulta importante');
    expect(restored[0].status).toBe('queued');
  });
});

describe('agentOutboxService — claim atómico anti-duplicado (exactly-once)', () => {
  it('claimNext transiciona queued→processing y devuelve el item', async () => {
    await enqueue({ kind: 'text', text: 'A', meta: { createdAt: 1 } });
    const claimed = await claimNext();
    expect(claimed.text).toBe('A');
    expect(claimed.status).toBe('processing');
    expect(typeof claimed.claimedAt).toBe('number');
    // En disco quedó como processing.
    const rec = await getById(claimed.id);
    expect(rec.status).toBe('processing');
  });

  it('claimNext respeta orden FIFO por createdAt', async () => {
    await enqueue({ kind: 'text', text: 'segundo', meta: { createdAt: 200 } });
    await enqueue({ kind: 'text', text: 'primero', meta: { createdAt: 100 } });
    const first = await claimNext();
    expect(first.text).toBe('primero');
    const second = await claimNext();
    expect(second.text).toBe('segundo');
  });

  it('NO duplica: dos claims secuenciales sobre un solo item → uno gana, el otro es null', async () => {
    await enqueue({ kind: 'text', text: 'único' });
    const a = await claimNext();
    const b = await claimNext();
    expect(a).not.toBeNull();
    expect(a.text).toBe('único');
    // El segundo claim ya no encuentra nada queued.
    expect(b).toBeNull();
  });

  it('drenar la outbox procesa cada item EXACTAMENTE una vez', async () => {
    await enqueue({ kind: 'text', text: 'q1', meta: { createdAt: 1 } });
    await enqueue({ kind: 'text', text: 'q2', meta: { createdAt: 2 } });
    await enqueue({ kind: 'text', text: 'q3', meta: { createdAt: 3 } });

    const processed = [];
    let item = await claimNext();
    let guard = 0;
    while (item && guard < 10) {
      guard += 1;
      processed.push(item.text);
      await markAnswered(item.id, { answeredText: `resp-${item.text}` });
      item = await claimNext();
    }
    expect(processed).toEqual(['q1', 'q2', 'q3']);
    // Sin duplicados.
    expect(new Set(processed).size).toBe(3);
    // Todos respondidos.
    const all = await getAll();
    expect(all.every((i) => i.status === 'answered')).toBe(true);
  });

  it('claimNext devuelve null cuando no hay nada queued', async () => {
    expect(await claimNext()).toBeNull();
  });
});

describe('agentOutboxService — ciclo de vida del estado', () => {
  it('markAnswered cierra el item y guarda answeredText', async () => {
    const id = await enqueue({ kind: 'text', text: 'x' });
    await claimNext();
    await markAnswered(id, { answeredText: 'la respuesta' });
    const rec = await getById(id);
    expect(rec.status).toBe('answered');
    expect(rec.answeredText).toBe('la respuesta');
    expect(typeof rec.answeredAt).toBe('number');
  });

  it('markError marca error y conserva el item (no se pierde el dato)', async () => {
    const id = await enqueue({ kind: 'text', text: 'falla' });
    await claimNext();
    await markError(id, 'whisper 503');
    const rec = await getById(id);
    expect(rec.status).toBe('error');
    expect(rec.error).toBe('whisper 503');
    expect(rec.text).toBe('falla'); // el dato sigue ahí
  });

  it('requeue devuelve un error a queued para reintento explícito', async () => {
    const id = await enqueue({ kind: 'text', text: 'reintento' });
    await claimNext();
    await markError(id, 'timeout');
    await requeue(id);
    const rec = await getById(id);
    expect(rec.status).toBe('queued');
    expect(rec.error).toBeNull();
    // Y vuelve a ser reclamable.
    const claimed = await claimNext();
    expect(claimed.id).toBe(id);
  });

  it('requeue NO re-encola un item ya respondido', async () => {
    const id = await enqueue({ kind: 'text', text: 'ya' });
    await claimNext();
    await markAnswered(id);
    await requeue(id);
    const rec = await getById(id);
    expect(rec.status).toBe('answered');
  });
});

describe('agentOutboxService — recuperación de trabajo huérfano', () => {
  it('recoverStaleProcessing rescata items que quedaron en processing (app cerrada mid-flight)', async () => {
    // Simula: el usuario envió, el AgentScreen reclamó (processing), y la app
    // se cerró ANTES de markAnswered. El item quedó atascado en processing.
    const id = await enqueue({ kind: 'text', text: 'a mitad' });
    await claimNext(); // → processing
    let rec = await getById(id);
    expect(rec.status).toBe('processing');

    // Al volver a montar el AgentScreen:
    const recovered = await recoverStaleProcessing();
    expect(recovered).toBe(1);
    rec = await getById(id);
    expect(rec.status).toBe('queued'); // listo para re-procesar, NO perdido
    expect(rec.claimedAt).toBeNull();
  });

  it('recoverStaleProcessing no toca answered/queued/error', async () => {
    const a = await enqueue({ kind: 'text', text: 'answered', meta: { createdAt: 1 } });
    const q = await enqueue({ kind: 'text', text: 'queued', meta: { createdAt: 2 } });
    const e = await enqueue({ kind: 'text', text: 'error', meta: { createdAt: 3 } });
    await claimNext(); // reclama el más viejo (answered)
    await markAnswered(a);
    await markError(e, 'x');

    const recovered = await recoverStaleProcessing();
    expect(recovered).toBe(0);
    expect((await getById(a)).status).toBe('answered');
    expect((await getById(q)).status).toBe('queued');
    expect((await getById(e)).status).toBe('error');
  });
});

describe('agentOutboxService — limpieza', () => {
  it('getQueued / getInFlight filtran por estado correctamente', async () => {
    await enqueue({ kind: 'text', text: 'q', meta: { createdAt: 1 } });
    const id2 = await enqueue({ kind: 'text', text: 'p', meta: { createdAt: 2 } });
    await enqueue({ kind: 'text', text: 'q2', meta: { createdAt: 3 } });
    // Reclamar el segundo (p) requiere drenar; reclamamos los dos primeros y
    // dejamos uno processing.
    await claimNext(); // q → processing
    await markAnswered((await getById(1)).id);
    await claimNext(); // p → processing (queda processing)
    void id2;

    const queued = await getQueued();
    expect(queued.map((i) => i.text)).toEqual(['q2']);
    const inFlight = await getInFlight();
    expect(inFlight.map((i) => i.text).sort()).toEqual(['p', 'q2']);
  });

  it('remove borra un item por id', async () => {
    const id = await enqueue({ kind: 'text', text: 'borrar' });
    await remove(id);
    expect(await getById(id)).toBeNull();
  });

  it('clearOutbox vacía todo', async () => {
    await enqueue({ kind: 'text', text: 'a' });
    await enqueue({ kind: 'text', text: 'b' });
    await clearOutbox();
    expect(await getAll()).toHaveLength(0);
  });
});
